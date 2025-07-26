import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertExchangeRequestSchema,
  insertRateOfferSchema,
  insertChatMessageSchema,
  insertVerificationRequestSchema,
  insertVerificationDocumentSchema,
  insertVerificationCheckSchema,
} from "@shared/schema";
import { AuditLogger, SecurityAuditLogger, BusinessAuditLogger, auditMiddleware } from "./auditLogger";

// Admin access middleware
const isAdmin = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUser(userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    next();
  } catch (error) {
    console.error("Error checking admin role:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  try {
    await setupAuth(app);
  } catch (error) {
    console.error("Auth setup failed:", error);
    throw error;
  }

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });



  // Admin-only user profile update endpoint
  app.patch('/api/admin/user/:targetUserId/profile', isAuthenticated, isAdmin, auditMiddleware, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const targetUserId = req.params.targetUserId;
      const updates = req.body;
      
      console.log("Admin profile update request by:", adminUserId, "for user:", targetUserId);
      console.log("Profile update data:", updates);

      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        await SecurityAuditLogger.logSecurityEvent(
          adminUserId,
          "ADMIN_ACTION_FAILED",
          `Failed to update profile for non-existent user: ${targetUserId}`,
          { targetUserId, updates: Object.keys(updates) }
        );
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await storage.updateUserProfile(targetUserId, updates);
      
      // Log successful admin profile update
      await AuditLogger.logAction(
        adminUserId,
        "USER_PROFILE_UPDATED_BY_ADMIN",
        `Admin updated user profile for ${targetUser.email}`,
        { 
          targetUserId, 
          targetUserEmail: targetUser.email,
          updatedFields: Object.keys(updates),
          previousValues: {
            firstName: targetUser.firstName,
            lastName: targetUser.lastName,
            companyName: targetUser.companyName,
            businessType: targetUser.businessType,
            licenseNumber: targetUser.licenseNumber
          },
          newValues: updates
        }
      );
      
      console.log("Profile updated successfully by admin:", updatedUser);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update user profile", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Read-only user profile endpoint for traders
  app.get('/api/auth/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return only profile data (excluding sensitive admin fields)
      const profileData = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        companyName: user.companyName,
        businessType: user.businessType,
        licenseNumber: user.licenseNumber,
        specializations: user.specializations,
        status: user.status,
        role: user.role,
        createdAt: user.createdAt,
        lastActiveAt: user.lastActiveAt
      };
      
      res.json(profileData);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Exchange request routes
  app.post("/api/exchange-requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const requestData = insertExchangeRequestSchema.parse({
        ...req.body,
        userId,
      });

      // Check for existing active request with same currency pair
      const existingRequest = await storage.getExistingCurrencyRequest(
        userId, 
        requestData.fromCurrency, 
        requestData.toCurrency
      );
      
      if (existingRequest) {
        return res.status(400).json({ 
          message: `You already have an active ${requestData.fromCurrency} to ${requestData.toCurrency} exchange request. Please cancel or complete it before creating a new one.` 
        });
      }

      const exchangeRequest = await storage.createExchangeRequest(requestData);
      
      // Create chat message for the request
      const rateInfo = requestData.desiredRate ? ` at rate ${requestData.desiredRate}` : '';
      const chatMessage = await storage.createChatMessage({
        userId,
        messageType: "general",
        content: `Exchange request: ${requestData.amount} ${requestData.fromCurrency} to ${requestData.toCurrency}${rateInfo}`,
        exchangeRequestId: exchangeRequest.id,
      });

      // Create notification for all traders about new exchange request
      const requester = await storage.getUser(userId);
      const requesterName = requester?.companyName || requester?.firstName || "Someone";
      await storage.createNotificationMessage(
        userId,
        `${requesterName} posted a new ${requestData.fromCurrency}/${requestData.toCurrency} exchange request`
      );

      // Broadcast to WebSocket clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ 
            type: 'newExchangeRequest', 
            data: { exchangeRequest, chatMessage }
          }));
          // Also send notification broadcast
          client.send(JSON.stringify({
            type: 'notification',
            data: { type: 'new_exchange_request', exchangeRequestId: exchangeRequest.id }
          }));
        }
      });

      res.json(exchangeRequest);
    } catch (error) {
      console.error("Error creating exchange request:", error);
      res.status(500).json({ message: "Failed to create exchange request" });
    }
  });

  app.get("/api/exchange-requests", isAuthenticated, async (req, res) => {
    try {
      const requests = await storage.getExchangeRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching exchange requests:", error);
      res.status(500).json({ message: "Failed to fetch exchange requests" });
    }
  });

  // Rate offer routes
  app.post("/api/rate-offers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const offerData = insertRateOfferSchema.parse({
        ...req.body,
        bidderId: userId,
      });

      const rateOffer = await storage.createRateOffer(offerData);
      
      // Create chat message for the offer
      await storage.createChatMessage({
        userId,
        messageType: "offer",
        content: `Rate offer: ${offerData.rate} (Total: ${offerData.totalAmount})`,
        exchangeRequestId: offerData.exchangeRequestId,
        rateOfferId: rateOffer.id,
      });

      // Get the exchange request to find the requester
      const exchangeRequest = await storage.getExchangeRequestById(offerData.exchangeRequestId);
      
      if (exchangeRequest) {
        // Create notification for the exchange request owner
        const bidder = await storage.getUser(userId);
        const bidderName = bidder?.companyName || bidder?.firstName || "Someone";
        await storage.createNotificationMessage(
          userId,
          `${bidderName} made an offer on your ${exchangeRequest.fromCurrency}/${exchangeRequest.toCurrency} exchange request`,
          exchangeRequest.userId
        );
        
        // Broadcast notification via WebSocket
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'notification',
              targetUserId: exchangeRequest.userId,
              data: { type: 'new_offer', exchangeRequestId: offerData.exchangeRequestId }
            }));
          }
        });
      }

      res.json(rateOffer);
    } catch (error) {
      console.error("Error creating rate offer:", error);
      res.status(500).json({ message: "Failed to create rate offer" });
    }
  });

  app.get("/api/rate-offers/:requestId", isAuthenticated, async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const offers = await storage.getRateOffersByRequestId(requestId);
      res.json(offers);
    } catch (error) {
      console.error("Error fetching rate offers:", error);
      res.status(500).json({ message: "Failed to fetch rate offers" });
    }
  });

  // Get bidder's own bids
  app.get("/api/rate-offers/my-bids", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const bids = await storage.getBidderRateOffers(userId);
      res.json(bids);
    } catch (error) {
      console.error("Error fetching bidder's bids:", error);
      res.status(500).json({ message: "Failed to fetch bids" });
    }
  });

  // Accept rate offer
  app.post("/api/rate-offers/:id/accept", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const offerId = parseInt(req.params.id);
      const { exchangeRequestId, termsAccepted } = req.body;
      
      // Validate terms acceptance
      if (!termsAccepted) {
        return res.status(400).json({ message: "Terms and conditions must be accepted" });
      }
      
      console.log("Accept offer request:", { userId, offerId, exchangeRequestId, termsAccepted });
      
      // Get the rate offer and exchange request
      const offers = await storage.getRateOffersByRequestId(exchangeRequestId);
      console.log("Found offers:", offers);
      const offer = offers.find((o: any) => o.id === offerId);
      console.log("Matching offer:", offer);
      
      if (!offer) {
        console.log("Offer not found for ID:", offerId, "in offers:", offers);
        return res.status(404).json({ message: "Rate offer not found" });
      }

      const exchangeRequest = await storage.getExchangeRequestById(offer.exchangeRequestId);
      console.log("Exchange request:", exchangeRequest);
      console.log("Auth check:", { exchangeRequestUserId: exchangeRequest?.userId, currentUserId: userId });
      
      if (!exchangeRequest || exchangeRequest.userId !== userId) {
        console.log("Authorization failed - user cannot accept this offer");
        return res.status(403).json({ message: "Unauthorized" });
      }

      console.log("Authorization passed, proceeding with offer acceptance");

      // Update offer status
      await storage.updateRateOfferStatus(offerId, "accepted");
      
      // Update exchange request status
      await storage.updateExchangeRequestStatus(offer.exchangeRequestId, "completed", offerId);
      
      // Create transactions (mock debit/credit)
      const user = await storage.getUser(userId);
      if (user && user.balance) {
        const currentBalance = parseFloat(user.balance);
        const transactionAmount = parseFloat(offer.totalAmount);
        
        // Debit from subscriber
        await storage.createTransaction({
          userId,
          type: "debit",
          amount: transactionAmount.toString(),
          description: `Exchange: ${exchangeRequest.amount} ${exchangeRequest.fromCurrency} to ${exchangeRequest.toCurrency}`,
          exchangeRequestId: offer.exchangeRequestId,
        });
        
        // Credit to bidder
        await storage.createTransaction({
          userId: offer.bidderId,
          type: "credit",
          amount: transactionAmount.toString(),
          description: `Exchange payment: ${exchangeRequest.amount} ${exchangeRequest.fromCurrency} to ${exchangeRequest.toCurrency}`,
          exchangeRequestId: offer.exchangeRequestId,
        });
        
        // Update subscriber balance
        const newBalance = currentBalance - transactionAmount;
        await storage.updateUserBalance(userId, newBalance.toString());
        
        // Update bidder balance
        const bidder = await storage.getUser(offer.bidderId);
        if (bidder && bidder.balance) {
          const bidderBalance = parseFloat(bidder.balance);
          await storage.updateUserBalance(offer.bidderId, (bidderBalance + transactionAmount).toString());
        }
      }

      // Create bid action message in chat
      await storage.createBidActionMessage(userId, "accept", offerId, offer.exchangeRequestId, offer.bidderId);
      
      // Create notification for the bidder
      const currentUser = await storage.getUser(userId);
      const userName = currentUser?.companyName || currentUser?.firstName || "Someone";
      await storage.createNotificationMessage(
        userId,
        `${userName} accepted your bid on ${exchangeRequest.fromCurrency}/${exchangeRequest.toCurrency} exchange`,
        offer.bidderId
      );
      
      // Broadcast the notification via WebSocket
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'notification',
            targetUserId: offer.bidderId,
            data: { type: 'bid_accepted', exchangeRequestId: offer.exchangeRequestId, rateOfferId: offerId }
          }));
        }
      });

      res.json({ message: "Rate offer accepted successfully" });
    } catch (error) {
      console.error("Error accepting rate offer:", error);
      res.status(500).json({ message: "Failed to accept rate offer" });
    }
  });

  // Decline rate offer
  app.post("/api/rate-offers/:id/decline", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const offerId = parseInt(req.params.id);
      
      // Get the rate offer and exchange request
      const offers = await storage.getRateOffersByRequestId(req.body.exchangeRequestId);
      const offer = offers.find((o: any) => o.id === offerId);
      
      if (!offer) {
        return res.status(404).json({ message: "Rate offer not found" });
      }

      const exchangeRequest = await storage.getExchangeRequestById(offer.exchangeRequestId);
      
      if (!exchangeRequest || exchangeRequest.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Update offer status to rejected
      await storage.updateRateOfferStatus(offerId, "rejected");
      
      // Create bid action message in chat
      await storage.createBidActionMessage(userId, "reject", offerId, offer.exchangeRequestId, offer.bidderId);
      
      // Create notification for the bidder
      const currentUser = await storage.getUser(userId);
      const userName = currentUser?.firstName || "Someone";
      await storage.createNotificationMessage(
        userId,
        `${userName} declined your bid on ${exchangeRequest.fromCurrency}/${exchangeRequest.toCurrency} exchange`,
        offer.bidderId
      );
      
      // Broadcast the notification via WebSocket
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'notification',
            targetUserId: offer.bidderId,
            data: { type: 'bid_rejected', exchangeRequestId: offer.exchangeRequestId, rateOfferId: offerId }
          }));
        }
      });
      
      res.json({ message: "Rate offer declined successfully" });
    } catch (error) {
      console.error("Error declining rate offer:", error);
      res.status(500).json({ message: "Failed to decline rate offer" });
    }
  });

  // Chat routes
  app.get("/api/chat/messages", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getChatMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  // Private messaging routes
  app.post("/api/private-messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { targetUserId, content, exchangeRequestId, rateOfferId } = req.body;
      
      if (!targetUserId || !content) {
        return res.status(400).json({ message: "Target user ID and content are required" });
      }
      
      const message = await storage.createPrivateMessage(userId, targetUserId, content, exchangeRequestId, rateOfferId);
      res.json(message);
    } catch (error) {
      console.error("Error creating private message:", error);
      res.status(500).json({ message: "Failed to create private message" });
    }
  });

  app.get("/api/private-messages/:targetUserId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { targetUserId } = req.params;
      
      const messages = await storage.getPrivateMessages(userId, targetUserId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching private messages:", error);
      res.status(500).json({ message: "Failed to fetch private messages" });
    }
  });

  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations/:conversationId/mark-read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { conversationId } = req.params;
      
      await storage.markMessagesAsRead(userId, conversationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  app.post("/api/chat/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const messageData = insertChatMessageSchema.parse({
        ...req.body,
        userId,
      });

      const message = await storage.createChatMessage(messageData);
      res.json(message);
    } catch (error) {
      console.error("Error creating chat message:", error);
      res.status(500).json({ message: "Failed to create chat message" });
    }
  });

  // Market stats
  app.get("/api/market-stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getMarketStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching market stats:", error);
      res.status(500).json({ message: "Failed to fetch market stats" });
    }
  });



  // Admin routes
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/users/:id/activity", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const activity = await storage.getUserActivity(userId);
      res.json(activity);
    } catch (error) {
      console.error("Error fetching user activity:", error);
      res.status(500).json({ message: "Failed to fetch user activity" });
    }
  });

  app.get("/api/admin/system-stats", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching system stats:", error);
      res.status(500).json({ message: "Failed to fetch system stats" });
    }
  });

  app.patch("/api/admin/users/:id/role", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const { role } = req.body;
      
      if (!["trader", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await storage.updateUserRole(userId, role);
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.post("/api/admin/users/:id/suspend", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      await storage.suspendUser(userId);
      res.json({ message: "User suspended successfully" });
    } catch (error) {
      console.error("Error suspending user:", error);
      res.status(500).json({ message: "Failed to suspend user" });
    }
  });

  app.post("/api/admin/users/:id/unsuspend", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      await storage.unsuspendUser(userId);
      res.json({ message: "User unsuspended successfully" });
    } catch (error) {
      console.error("Error unsuspending user:", error);
      res.status(500).json({ message: "Failed to unsuspend user" });
    }
  });

  // User trades and transactions
  app.get("/api/user/transactions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactions = await storage.getUserTransactions(userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching user transactions:", error);
      res.status(500).json({ message: "Failed to fetch user transactions" });
    }
  });

  app.get("/api/user/trades", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trades = await storage.getUserTrades(userId);
      res.json(trades);
    } catch (error) {
      console.error("Error fetching user trades:", error);
      res.status(500).json({ message: "Failed to fetch user trades" });
    }
  });

  // Transfer funds between accounts
  app.post("/api/user/transfer", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { currency, amount, direction } = req.body;

      if (!currency || !amount || !direction) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const validCurrencies = ['ugx', 'usd', 'kes', 'eur', 'gbp'];
      if (!validCurrencies.includes(currency.toLowerCase())) {
        return res.status(400).json({ message: "Invalid currency" });
      }

      const validDirections = ['operational-to-wallet', 'wallet-to-operational'];
      if (!validDirections.includes(direction)) {
        return res.status(400).json({ message: "Invalid transfer direction" });
      }

      await storage.transferBetweenAccounts(
        userId,
        currency.toLowerCase(),
        amount,
        direction
      );

      res.json({ message: "Transfer completed successfully" });
    } catch (error: any) {
      console.error("Error transferring funds:", error);
      res.status(400).json({ message: error.message || "Failed to transfer funds" });
    }
  });

  // Portfolio management routes
  app.post("/api/user/portfolio/add", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { currency } = req.body;
      
      if (!currency) {
        return res.status(400).json({ message: "Currency is required" });
      }
      
      const user = await storage.addCurrencyToPortfolio(userId, currency);
      res.json(user);
    } catch (error) {
      console.error("Error adding currency to portfolio:", error);
      res.status(500).json({ message: "Failed to add currency to portfolio" });
    }
  });

  app.post("/api/user/portfolio/remove", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { currency } = req.body;
      
      if (!currency) {
        return res.status(400).json({ message: "Currency is required" });
      }
      
      const user = await storage.removeCurrencyFromPortfolio(userId, currency);
      res.json(user);
    } catch (error) {
      console.error("Error removing currency from portfolio:", error);
      res.status(500).json({ message: "Failed to remove currency from portfolio" });
    }
  });

  // WebSocket setup
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        
        // Broadcast message to all connected clients
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });

  // Create thread reply
  app.post("/api/chat/messages/:id/reply", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parentMessageId = parseInt(req.params.id);
      const { content } = req.body;
      
      if (!content || !content.trim()) {
        return res.status(400).json({ message: "Content is required" });
      }
      
      console.log("Creating reply:", { userId, parentMessageId, content });
      
      const reply = await storage.createThreadReply(userId, content.trim(), parentMessageId);
      
      // Broadcast to WebSocket clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ 
            type: 'newReply', 
            data: reply 
          }));
        }
      });
      
      res.json(reply);
    } catch (error) {
      console.error("Error creating thread reply:", error);
      res.status(500).json({ message: "Failed to create reply" });
    }
  });

  // RBAC Admin Routes
  // System Activity Monitoring routes
  app.get("/api/admin/active-sessions", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      // Mock data for now - in real implementation, this would fetch from session store and user activity
      const activeSessions = [
        {
          id: "sess_1",
          userId: "43104392",
          userName: "Dennis Leku",
          userEmail: "dennisleku@gmail.com", 
          ipAddress: "192.168.1.100",
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          lastActivity: new Date().toISOString(),
          isOnline: true,
          sessionDuration: 3600, // 1 hour in seconds
          location: "Kampala, Uganda"
        },
        {
          id: "sess_2",
          userId: "42908557",
          userName: "John Smith",
          userEmail: "john@example.com",
          ipAddress: "192.168.1.101", 
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
          lastActivity: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          isOnline: true,
          sessionDuration: 2400, // 40 minutes
          location: "New York, USA"
        }
      ];
      
      res.json(activeSessions);
    } catch (error) {
      console.error("Error fetching active sessions:", error);
      res.status(500).json({ message: "Failed to fetch active sessions" });
    }
  });

  app.get("/api/admin/system-metrics", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      // In real implementation, these would be actual system metrics
      const metrics = {
        totalSessions: 15,
        activeSessions: 7,
        websocketConnections: connectedClients.size,
        avgSessionDuration: 2700, // 45 minutes in seconds
        peakConcurrentUsers: 12,
        systemUptime: process.uptime(),
        databaseConnections: 5,
        memoryUsage: process.memoryUsage().heapUsed,
        cpuUsage: Math.random() * 30 + 10 // Mock CPU usage
      };
      
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching system metrics:", error);
      res.status(500).json({ message: "Failed to fetch system metrics" });
    }
  });

  app.get("/api/admin/recent-activity", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      // Mock recent activity data - in real implementation, this would come from audit logs
      const recentActivity = [
        {
          id: "act_1",
          timestamp: new Date().toISOString(),
          type: "login",
          userId: "43104392",
          userName: "Dennis Leku",
          description: "Logged into admin panel",
          ipAddress: "192.168.1.100"
        },
        {
          id: "act_2", 
          timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          type: "action",
          userId: "42908557",
          userName: "John Smith",
          description: "Created new exchange request",
          ipAddress: "192.168.1.101"
        },
        {
          id: "act_3",
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), 
          type: "action",
          userId: "43104392",
          userName: "Dennis Leku",
          description: "Updated user role permissions",
          ipAddress: "192.168.1.100"
        }
      ];
      
      res.json(recentActivity);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });

  // User management routes
  app.post("/api/admin/users/create", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const userData = req.body;
      
      // Validate required fields
      if (!userData.id || !userData.email || !userData.firstName || !userData.lastName) {
        return res.status(400).json({ message: "Missing required fields: id, email, firstName, lastName" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUser(userData.id);
      if (existingUser) {
        return res.status(400).json({ message: "User with this ID already exists" });
      }
      
      // Create user with proper defaults
      const newUser = await storage.upsertUser({
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        companyName: userData.companyName || `${userData.firstName} ${userData.lastName}`,
        phoneNumber: userData.phoneNumber || null,
        address: userData.address || null,
        businessType: userData.businessType || null,
        tradingExperience: userData.tradingExperience || null,
        specializedCurrencies: userData.specializedCurrencies || null,
        role: userData.role || "trader",
        status: userData.status || "active",
        profileImageUrl: null,
        lastActiveAt: new Date(),
      });
      
      // Log audit trail
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "user_create",
        resource: "user",
        resourceId: newUser.id,
        details: { createdUser: userData },
        success: true,
      });
      
      res.json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const userId = req.params.id;
      const updates = req.body;
      
      const user = await storage.updateUserProfile(userId, updates);
      
      // Log audit trail
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "user_update",
        resource: "user",
        resourceId: userId,
        details: { updates },
        success: true,
      });
      
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.post("/api/admin/users/:id/suspend", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const userId = req.params.id;
      await storage.suspendUser(userId);
      
      // Log audit trail
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "user_suspend",
        resource: "user",
        resourceId: userId,
        success: true,
      });
      
      res.json({ message: "User suspended successfully" });
    } catch (error) {
      console.error("Error suspending user:", error);
      res.status(500).json({ message: "Failed to suspend user" });
    }
  });

  app.post("/api/admin/users/:id/unsuspend", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const userId = req.params.id;
      await storage.unsuspendUser(userId);
      
      // Log audit trail
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "user_unsuspend",
        resource: "user",
        resourceId: userId,
        success: true,
      });
      
      res.json({ message: "User unsuspended successfully" });
    } catch (error) {
      console.error("Error unsuspending user:", error);
      res.status(500).json({ message: "Failed to unsuspend user" });
    }
  });

  app.delete("/api/admin/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const userId = req.params.id;
      
      // Note: In a real system, you'd want soft delete and cleanup of related data
      // For now, we'll just update the user status to inactive
      await storage.updateUserProfile(userId, { status: "inactive" });
      
      // Log audit trail
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "user_delete",
        resource: "user",
        resourceId: userId,
        success: true,
      });
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Role management routes
  app.get("/api/admin/roles", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  app.post("/api/admin/roles", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const roleData = req.body;
      const role = await storage.createRole(roleData);
      
      // Log audit trail
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "role_create",
        resource: "role",
        resourceId: role.id.toString(),
        details: roleData,
        success: true,
      });
      
      res.json(role);
    } catch (error) {
      console.error("Error creating role:", error);
      res.status(500).json({ message: "Failed to create role" });
    }
  });

  app.patch("/api/admin/roles/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const roleId = parseInt(req.params.id);
      const updates = req.body;
      
      const role = await storage.updateRole(roleId, updates);
      
      // Log audit trail
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "role_update",
        resource: "role",
        resourceId: roleId.toString(),
        details: { updates },
        success: true,
      });
      
      res.json(role);
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  app.delete("/api/admin/roles/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const roleId = parseInt(req.params.id);
      
      // Check if role is system role
      const role = await storage.getRoleById(roleId);
      if (role?.isSystemRole) {
        return res.status(400).json({ message: "Cannot delete system role" });
      }
      
      await storage.deleteRole(roleId);
      
      // Log audit trail
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "role_delete",
        resource: "role",
        resourceId: roleId.toString(),
        success: true,
      });
      
      res.json({ message: "Role deleted successfully" });
    } catch (error) {
      console.error("Error deleting role:", error);
      res.status(500).json({ message: "Failed to delete role" });
    }
  });

  // Permission management routes
  app.get("/api/admin/permissions", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const permissions = await storage.getPermissions();
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });

  // Audit logs routes
  app.get("/api/admin/audit-logs", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const filters: any = {};
      if (req.query.userId) filters.userId = req.query.userId;
      if (req.query.action) filters.action = req.query.action;
      if (req.query.resource) filters.resource = req.query.resource;
      
      const auditLogs = await storage.getAuditLogs(filters);
      res.json(auditLogs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Audit log routes
  app.get("/api/admin/audit-logs", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const { userId, action, resource } = req.query;
      const filters: any = {};
      
      if (userId) filters.userId = userId as string;
      if (action) filters.action = action as string;
      if (resource) filters.resource = resource as string;
      
      const logs = await storage.getAuditLogs(filters);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Forex Rates routes
  app.post("/api/forex-rates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const rateData = {
        ...req.body,
        traderId: userId,
      };

      const rate = await storage.createForexRate(rateData);
      res.json(rate);
    } catch (error: any) {
      console.error("Error creating forex rate:", error);
      if (error.message?.includes("unique")) {
        res.status(409).json({ error: "Rate for this currency pair already exists for today" });
      } else {
        res.status(500).json({ error: "Failed to create forex rate" });
      }
    }
  });

  app.get("/api/forex-rates", async (req, res) => {
    try {
      const { traderId, fromCurrency, toCurrency, date } = req.query;
      const filters: any = {};
      
      if (traderId) filters.traderId = traderId as string;
      if (fromCurrency) filters.fromCurrency = fromCurrency as string;
      if (toCurrency) filters.toCurrency = toCurrency as string;
      if (date) filters.date = date as string;

      const rates = await storage.getForexRates(filters);
      res.json(rates);
    } catch (error) {
      console.error("Error fetching forex rates:", error);
      res.status(500).json({ error: "Failed to fetch forex rates" });
    }
  });

  app.put("/api/forex-rates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const rateId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Verify ownership
      const existingRates = await storage.getForexRates({ traderId: userId });
      const existingRate = existingRates.find(r => r.id === rateId);
      
      if (!existingRate) {
        return res.status(404).json({ error: "Forex rate not found or unauthorized" });
      }

      const updateData = req.body;
      const updatedRate = await storage.updateForexRate(rateId, updateData);
      
      res.json(updatedRate);
    } catch (error) {
      console.error("Error updating forex rate:", error);
      res.status(500).json({ error: "Failed to update forex rate" });
    }
  });

  app.delete("/api/forex-rates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const rateId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Verify ownership
      const existingRates = await storage.getForexRates({ traderId: userId });
      const existingRate = existingRates.find(r => r.id === rateId);
      
      if (!existingRate) {
        return res.status(404).json({ error: "Forex rate not found or unauthorized" });
      }

      await storage.deleteForexRate(rateId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting forex rate:", error);
      res.status(500).json({ error: "Failed to delete forex rate" });
    }
  });

  app.get("/api/market-rates/:fromCurrency/:toCurrency", async (req, res) => {
    try {
      const { fromCurrency, toCurrency } = req.params;
      const summary = await storage.getMarketRatesSummary(fromCurrency, toCurrency);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching market rates summary:", error);
      res.status(500).json({ error: "Failed to fetch market rates summary" });
    }
  });

  // Layout Settings API routes
  app.get("/api/admin/layout-settings", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const settings = await storage.getLayoutSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching layout settings:", error);
      res.status(500).json({ message: "Failed to fetch layout settings" });
    }
  });

  app.get("/api/layout-settings/active", async (req, res) => {
    try {
      const setting = await storage.getActiveLayoutSetting();
      res.json(setting);
    } catch (error) {
      console.error("Error fetching active layout setting:", error);
      res.status(500).json({ message: "Failed to fetch active layout setting" });
    }
  });

  app.post("/api/admin/layout-settings", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const settingData = req.body;
      const setting = await storage.createLayoutSetting(settingData);
      
      // Log audit trail
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "layout_setting_create",
        resource: "layout_setting",
        resourceId: setting.id.toString(),
        details: settingData,
        success: true,
      });
      
      res.json(setting);
    } catch (error) {
      console.error("Error creating layout setting:", error);
      res.status(500).json({ message: "Failed to create layout setting" });
    }
  });

  app.patch("/api/admin/layout-settings/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const settingId = parseInt(req.params.id);
      const updates = req.body;
      
      const setting = await storage.updateLayoutSetting(settingId, updates);
      
      // Log audit trail
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "layout_setting_update",
        resource: "layout_setting",
        resourceId: settingId.toString(),
        details: { updates },
        success: true,
      });
      
      res.json(setting);
    } catch (error) {
      console.error("Error updating layout setting:", error);
      res.status(500).json({ message: "Failed to update layout setting" });
    }
  });

  app.post("/api/admin/layout-settings/:id/set-default", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const settingId = parseInt(req.params.id);
      console.log("Setting default layout setting:", settingId);
      
      if (isNaN(settingId)) {
        return res.status(400).json({ message: "Invalid layout setting ID" });
      }
      
      await storage.setDefaultLayoutSetting(settingId);
      console.log("Successfully set default layout setting:", settingId);
      
      // Log audit trail
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "layout_setting_set_default",
        resource: "layout_setting",
        resourceId: settingId.toString(),
        success: true,
      });
      
      res.json({ message: "Default layout setting updated successfully" });
    } catch (error) {
      console.error("Error setting default layout setting:", error);
      res.status(500).json({ 
        message: "Failed to set default layout setting", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.delete("/api/admin/layout-settings/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const settingId = parseInt(req.params.id);
      await storage.deleteLayoutSetting(settingId);
      
      // Log audit trail
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "layout_setting_delete",
        resource: "layout_setting",
        resourceId: settingId.toString(),
        success: true,
      });
      
      res.json({ message: "Layout setting deleted successfully" });
    } catch (error) {
      console.error("Error deleting layout setting:", error);
      res.status(500).json({ message: "Failed to delete layout setting" });
    }
  });

  // ========================================
  // REPORTS MODULE API ROUTES
  // ========================================

  // Report Templates
  app.get("/api/reports/templates", isAuthenticated, async (req: any, res) => {
    try {
      const templates = await storage.getReportTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching report templates:", error);
      res.status(500).json({ message: "Failed to fetch report templates" });
    }
  });

  app.get("/api/reports/templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getReportTemplateById(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Report template not found" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching report template:", error);
      res.status(500).json({ message: "Failed to fetch report template" });
    }
  });

  app.post("/api/reports/templates", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const templateData = {
        ...req.body,
        createdBy: req.user.claims.sub,
      };
      
      const template = await storage.createReportTemplate(templateData);
      
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "report_template_create",
        resource: "report_template",
        resourceId: template.id.toString(),
        details: templateData,
        success: true,
      });
      
      res.json(template);
    } catch (error) {
      console.error("Error creating report template:", error);
      res.status(500).json({ message: "Failed to create report template" });
    }
  });

  app.patch("/api/reports/templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const templateId = parseInt(req.params.id);
      const updates = req.body;
      
      const template = await storage.updateReportTemplate(templateId, updates);
      
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "report_template_update",
        resource: "report_template",
        resourceId: templateId.toString(),
        details: { updates },
        success: true,
      });
      
      res.json(template);
    } catch (error) {
      console.error("Error updating report template:", error);
      res.status(500).json({ message: "Failed to update report template" });
    }
  });

  app.delete("/api/reports/templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const templateId = parseInt(req.params.id);
      await storage.deleteReportTemplate(templateId);
      
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "report_template_delete",
        resource: "report_template",
        resourceId: templateId.toString(),
        success: true,
      });
      
      res.json({ message: "Report template deleted successfully" });
    } catch (error) {
      console.error("Error deleting report template:", error);
      res.status(500).json({ message: "Failed to delete report template" });
    }
  });

  // Report Generation
  app.post("/api/reports/generate", isAuthenticated, async (req: any, res) => {
    try {
      const { templateId, parameters, filters, name, description } = req.body;
      
      if (!templateId) {
        return res.status(400).json({ message: "Template ID is required" });
      }
      
      const template = await storage.getReportTemplateById(templateId);
      if (!template) {
        return res.status(404).json({ message: "Report template not found" });
      }
      
      // Generate report data based on template type
      let reportData: any = {};
      try {
        switch (template.type) {
          case "system_overview":
            reportData = await storage.generateSystemOverviewReport(parameters || {});
            break;
          case "user_activity":
            reportData = await storage.generateUserActivityReport(parameters || {});
            break;
          case "transaction_volume":
            reportData = await storage.generateTransactionVolumeReport(parameters || {});
            break;
          case "currency_analysis":
            reportData = await storage.generateCurrencyAnalysisReport(parameters || {});
            break;
          case "market_trends":
            reportData = await storage.generateMarketTrendsReport(parameters || {});
            break;
          default:
            return res.status(400).json({ message: "Unsupported report type" });
        }
      } catch (dataError) {
        console.error("Error generating report data:", dataError);
        
        // Create failed report instance
        const failedInstance = await storage.createReportInstance({
          templateId,
          name: name || `${template.displayName} - ${new Date().toLocaleDateString()}`,
          description: description || `Generated on ${new Date().toLocaleString()}`,
          generatedBy: req.user.claims.sub,
          parameters: parameters || {},
          filters: filters || {},
          data: {},
          status: "failed",
          error: dataError instanceof Error ? dataError.message : "Unknown error generating report",
        });
        
        return res.status(500).json({ 
          message: "Failed to generate report data",
          instanceId: failedInstance.id,
          error: dataError instanceof Error ? dataError.message : "Unknown error"
        });
      }
      
      // Create report instance with generated data
      const reportInstance = await storage.createReportInstance({
        templateId,
        name: name || `${template.displayName} - ${new Date().toLocaleDateString()}`,
        description: description || `Generated on ${new Date().toLocaleString()}`,
        generatedBy: req.user.claims.sub,
        parameters: parameters || {},
        filters: filters || {},
        data: reportData,
        summary: {
          recordCount: Array.isArray(reportData.data) ? reportData.data.length : 0,
          generatedAt: new Date(),
          templateName: template.displayName,
        },
        status: "completed",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });
      
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "report_generate",
        resource: "report_instance",
        resourceId: reportInstance.id.toString(),
        details: { templateId, parameters, filters },
        success: true,
      });
      
      res.json(reportInstance);
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  // Report Instances
  app.get("/api/reports/instances", isAuthenticated, async (req: any, res) => {
    try {
      const templateId = req.query.templateId ? parseInt(req.query.templateId as string) : undefined;
      const instances = await storage.getReportInstances(templateId);
      res.json(instances);
    } catch (error) {
      console.error("Error fetching report instances:", error);
      res.status(500).json({ message: "Failed to fetch report instances" });
    }
  });

  app.get("/api/reports/instances/:id", isAuthenticated, async (req: any, res) => {
    try {
      const instanceId = parseInt(req.params.id);
      const instance = await storage.getReportInstanceById(instanceId);
      
      if (!instance) {
        return res.status(404).json({ message: "Report instance not found" });
      }
      
      res.json(instance);
    } catch (error) {
      console.error("Error fetching report instance:", error);
      res.status(500).json({ message: "Failed to fetch report instance" });
    }
  });

  app.delete("/api/reports/instances/:id", isAuthenticated, async (req: any, res) => {
    try {
      const instanceId = parseInt(req.params.id);
      const instance = await storage.getReportInstanceById(instanceId);
      
      if (!instance) {
        return res.status(404).json({ message: "Report instance not found" });
      }
      
      // Check permissions - users can delete their own reports, admins can delete any
      if (instance.generatedBy !== req.user.claims.sub && req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Can only delete your own reports" });
      }
      
      await storage.deleteReportInstance(instanceId);
      
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "report_instance_delete",
        resource: "report_instance",
        resourceId: instanceId.toString(),
        success: true,
      });
      
      res.json({ message: "Report instance deleted successfully" });
    } catch (error) {
      console.error("Error deleting report instance:", error);
      res.status(500).json({ message: "Failed to delete report instance" });
    }
  });

  // Report Exports
  app.post("/api/reports/export", isAuthenticated, async (req: any, res) => {
    try {
      const { reportInstanceId, templateId, format, fileName } = req.body;
      
      if (!reportInstanceId && !templateId) {
        return res.status(400).json({ message: "Either reportInstanceId or templateId is required" });
      }
      
      const exportData = {
        reportInstanceId: reportInstanceId || null,
        templateId: templateId || null,
        exportedBy: req.user.claims.sub,
        format: format || "pdf",
        fileName: fileName || `report-${Date.now()}.${format || "pdf"}`,
        status: "generating" as const,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };
      
      const exportRecord = await storage.createReportExport(exportData);
      
      // In a real implementation, you would trigger actual file generation here
      // For now, we'll simulate successful generation
      setTimeout(async () => {
        try {
          await storage.updateReportExport(exportRecord.id, {
            status: "ready",
            filePath: `/exports/${exportRecord.fileName}`,
            fileSize: Math.floor(Math.random() * 1000000) + 100000, // Simulated file size
          });
        } catch (updateError) {
          console.error("Error updating export status:", updateError);
        }
      }, 2000);
      
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "report_export",
        resource: "report_export",
        resourceId: exportRecord.id.toString(),
        details: { format, fileName },
        success: true,
      });
      
      res.json(exportRecord);
    } catch (error) {
      console.error("Error creating report export:", error);
      res.status(500).json({ message: "Failed to create report export" });
    }
  });

  app.get("/api/reports/exports", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.role === "admin" ? undefined : req.user.claims.sub;
      const exports = await storage.getReportExports(userId);
      res.json(exports);
    } catch (error) {
      console.error("Error fetching report exports:", error);
      res.status(500).json({ message: "Failed to fetch report exports" });
    }
  });

  app.get("/api/reports/exports/:id/download", isAuthenticated, async (req: any, res) => {
    try {
      const exportId = parseInt(req.params.id);
      const exportRecord = await storage.getReportExports();
      const targetExport = exportRecord.find(exp => exp.id === exportId);
      
      if (!targetExport) {
        return res.status(404).json({ message: "Export not found" });
      }
      
      // Check permissions
      if (targetExport.exportedBy !== req.user.claims.sub && req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Can only download your own exports" });
      }
      
      if (targetExport.status !== "ready") {
        return res.status(400).json({ message: "Export not ready for download" });
      }
      
      // Update download count and last downloaded
      await storage.updateReportExport(exportId, {
        downloadCount: (targetExport.downloadCount || 0) + 1,
        lastDownloaded: new Date(),
      });
      
      // In a real implementation, you would stream the actual file
      res.json({ 
        message: "Download started",
        fileName: targetExport.fileName,
        fileSize: targetExport.fileSize,
        downloadUrl: targetExport.filePath
      });
    } catch (error) {
      console.error("Error downloading export:", error);
      res.status(500).json({ message: "Failed to download export" });
    }
  });

  // Report Schedules (Admin only)
  app.get("/api/reports/schedules", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const schedules = await storage.getReportSchedules();
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching report schedules:", error);
      res.status(500).json({ message: "Failed to fetch report schedules" });
    }
  });

  app.post("/api/reports/schedules", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const scheduleData = {
        ...req.body,
        createdBy: req.user.claims.sub,
      };
      
      const schedule = await storage.createReportSchedule(scheduleData);
      
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "report_schedule_create",
        resource: "report_schedule",
        resourceId: schedule.id.toString(),
        details: scheduleData,
        success: true,
      });
      
      res.json(schedule);
    } catch (error) {
      console.error("Error creating report schedule:", error);
      res.status(500).json({ message: "Failed to create report schedule" });
    }
  });

  app.patch("/api/reports/schedules/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const scheduleId = parseInt(req.params.id);
      const updates = req.body;
      
      const schedule = await storage.updateReportSchedule(scheduleId, updates);
      
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "report_schedule_update",
        resource: "report_schedule",
        resourceId: scheduleId.toString(),
        details: { updates },
        success: true,
      });
      
      res.json(schedule);
    } catch (error) {
      console.error("Error updating report schedule:", error);
      res.status(500).json({ message: "Failed to update report schedule" });
    }
  });

  app.delete("/api/reports/schedules/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.claims.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const scheduleId = parseInt(req.params.id);
      await storage.deleteReportSchedule(scheduleId);
      
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "report_schedule_delete",
        resource: "report_schedule",
        resourceId: scheduleId.toString(),
        success: true,
      });
      
      res.json({ message: "Report schedule deleted successfully" });
    } catch (error) {
      console.error("Error deleting report schedule:", error);
      res.status(500).json({ message: "Failed to delete report schedule" });
    }
  });

  // Verification system routes
  app.post('/api/verification/request', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const requestData = insertVerificationRequestSchema.parse({
        ...req.body,
        userId,
      });

      const verificationRequest = await storage.createVerificationRequest(requestData);
      
      await AuditLogger.log({
        action: "verification_request_created",
        userId,
        resourceType: "verification_request",
        resourceId: verificationRequest.id.toString(),
        details: { requestType: requestData.requestType },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json(verificationRequest);
    } catch (error) {
      console.error("Error creating verification request:", error);
      res.status(500).json({ message: "Failed to create verification request" });
    }
  });

  app.get('/api/verification/requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const requests = await storage.getUserVerificationRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching verification requests:", error);
      res.status(500).json({ message: "Failed to fetch verification requests" });
    }
  });

  app.get('/api/admin/verification/requests', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const status = req.query.status as string | undefined;
      const requests = await storage.getAllVerificationRequests(status);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching admin verification requests:", error);
      res.status(500).json({ message: "Failed to fetch verification requests" });
    }
  });

  app.patch('/api/admin/verification/request/:id/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const adminId = req.user.claims.sub;
      const { level } = req.body;
      
      if (!["basic", "enhanced", "premium"].includes(level)) {
        return res.status(400).json({ message: "Invalid verification level" });
      }

      await storage.approveVerificationRequest(requestId, adminId, level);
      
      await AuditLogger.log({
        action: "verification_request_approved",
        userId: adminId,
        resourceType: "verification_request",
        resourceId: requestId.toString(),
        details: { level },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({ message: "Verification request approved successfully" });
    } catch (error) {
      console.error("Error approving verification request:", error);
      res.status(500).json({ message: "Failed to approve verification request" });
    }
  });

  app.patch('/api/admin/verification/request/:id/reject', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const adminId = req.user.claims.sub;
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }

      await storage.rejectVerificationRequest(requestId, adminId, reason);
      
      await AuditLogger.log({
        action: "verification_request_rejected",
        userId: adminId,
        resourceType: "verification_request",
        resourceId: requestId.toString(),
        details: { reason },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({ message: "Verification request rejected successfully" });
    } catch (error) {
      console.error("Error rejecting verification request:", error);
      res.status(500).json({ message: "Failed to reject verification request" });
    }
  });

  app.get('/api/admin/verification/stats', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getVerificationStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching verification stats:", error);
      res.status(500).json({ message: "Failed to fetch verification stats" });
    }
  });

  return httpServer;
}
