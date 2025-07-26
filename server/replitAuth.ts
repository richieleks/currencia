import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    try {
      const issuerUrl = process.env.ISSUER_URL ?? "https://replit.com/oidc";
      console.log("Configuring OIDC with issuer:", issuerUrl, "client_id:", process.env.REPL_ID);
      return await client.discovery(
        new URL(issuerUrl),
        process.env.REPL_ID!
      );
    } catch (error) {
      console.error("OIDC configuration failed:", error);
      throw error;
    }
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  const firstName = claims["first_name"] || null;
  const lastName = claims["last_name"] || null;
  
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName,
    lastName,
    profileImageUrl: claims["profile_image_url"] || null,
    // Set default company name to first and last name if both are available
    companyName: firstName && lastName ? `${firstName} ${lastName}` : null,
    status: "active",
    lastActiveAt: new Date(),
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    
    // Check if user exists in database - don't auto-create
    const claims = tokens.claims();
    if (!claims) {
      return verified(new Error("No claims found in token"), null);
    }
    
    const existingUser = await storage.getUser(claims["sub"]);
    
    if (!existingUser) {
      // User is not registered - reject authentication
      return verified(new Error("User not registered. Please contact an administrator."), null);
    }
    
    // Update existing user's last activity
    await storage.updateUserActivity(claims["sub"]);
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Use the first available domain in development
    const domain = req.hostname === 'localhost' ? 
      process.env.REPLIT_DOMAINS!.split(",")[0] : 
      req.hostname;
    
    console.log("Login request for hostname:", req.hostname, "using domain:", domain);
    
    passport.authenticate(`replitauth:${domain}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    // Use the first available domain in development
    const domain = req.hostname === 'localhost' ? 
      process.env.REPLIT_DOMAINS!.split(",")[0] : 
      req.hostname;
      
    console.log("OAuth callback received for hostname:", req.hostname, "using domain:", domain);
    console.log("Callback query params:", req.query);
    
    passport.authenticate(`replitauth:${domain}`, (err, user, info) => {
      if (err) {
        console.error("Authentication error:", err);
        
        // Check if this is an unregistered user error
        if (err.message && err.message.includes("User not registered")) {
          // Redirect to a user-friendly unauthorized access page
          return res.redirect("/?error=unauthorized&message=" + encodeURIComponent("You are not registered in the system. Please contact an administrator to create an account for you."));
        }
        
        return res.status(400).json({ 
          message: "Authentication failed", 
          error: err.message,
          details: err.cause || err
        });
      }
      
      if (!user) {
        console.log("Authentication failed - no user:", info);
        return res.redirect("/api/login");
      }
      
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error("Login error:", loginErr);
          return res.status(500).json({ message: "Login failed" });
        }
        console.log("User logged in successfully");
        return res.redirect("/");
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    // Fetch current user data from database to get latest role
    try {
      const dbUser = await storage.getUser(user.claims.sub);
      if (dbUser) {
        user.claims.role = dbUser.role;
        user.claims.status = dbUser.status;
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
