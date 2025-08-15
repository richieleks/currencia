import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";
import connectPg from "connect-pg-simple";

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: string;
      mustChangePassword?: boolean;
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  // Generate a session secret if not provided
  const sessionSecret = process.env.SESSION_SECRET || 'currencia-session-secret-key-development-mode';
  
  return session({
    secret: sessionSecret,
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

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: 'email' }, // Use email instead of username
      async (email, password, done) => {
        try {
          console.log("Login attempt for email:", email);
          
          const user = await storage.getUserByEmail(email);
          if (!user) {
            console.log("User not found:", email);
            return done(null, false, { message: "Invalid email or password" });
          }

          if (user.status === "suspended" || user.status === "inactive") {
            console.log("User account is suspended/inactive:", email);
            return done(null, false, { message: "Account is suspended or inactive" });
          }

          const isValidPassword = await comparePasswords(password, user.password);
          if (!isValidPassword) {
            console.log("Invalid password for user:", email);
            
            // Increment login attempts
            await storage.incrementLoginAttempts(user.id);
            return done(null, false, { message: "Invalid email or password" });
          }

          // Reset login attempts on successful login
          await storage.resetLoginAttempts(user.id);
          
          // Update last login timestamp
          await storage.updateLastLogin(user.id);

          console.log("Login successful for user:", email);
          return done(null, user);
        } catch (error) {
          console.error("Login error:", error);
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Login route
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Authentication error:", err);
        return res.status(500).json({ message: "Authentication failed" });
      }
      
      if (!user) {
        return res.status(401).json({ 
          message: info?.message || "Authentication failed" 
        });
      }

      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error("Login error:", loginErr);
          return res.status(500).json({ message: "Login failed" });
        }
        
        // Check if user needs to change password
        if (user.mustChangePassword) {
          return res.json({ 
            success: true, 
            user, 
            mustChangePassword: true,
            message: "Please change your default password to continue"
          });
        }
        
        console.log("User logged in successfully:", user.email);
        return res.json({ success: true, user });
      });
    })(req, res, next);
  });

  // Change password route
  app.post("/api/change-password", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters long" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isValidCurrentPassword = await comparePasswords(currentPassword, user.password);
      if (!isValidCurrentPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);
      
      // Update password in database
      await storage.updatePassword(userId, hashedNewPassword);

      console.log("Password changed successfully for user:", user.email);
      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Logout route
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ success: true, message: "Logged out successfully" });
    });
  });

  // Get current user route
  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}

// Authentication middleware
export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

// Generate default password for admin-created users
export function generateDefaultPassword(): string {
  return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
}

// Hash password utility (for admin user creation)
export { hashPassword };