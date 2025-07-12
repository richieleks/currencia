import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertExchangeRequestSchema,
  insertRateOfferSchema,
  insertChatMessageSchema,
} from "@shared/schema";
import { AuditLogger, SecurityAuditLogger, BusinessAuditLogger, auditMiddleware } from "./auditLogger";

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



  app.patch('/api/auth/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates = req.body;
      
      console.log("Profile update request for user:", userId);
      console.log("Profile update data:", updates);

      const user = await storage.getUser(userId);
      if (!user) {
        console.log("User not found:", userId);
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await storage.updateUserProfile(userId, updates);
      console.log("Profile updated successfully:", updatedUser);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update user profile", error: error.message });
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

  // Admin middleware
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
      await storage.setDefaultLayoutSetting(settingId);
      
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
      res.status(500).json({ message: "Failed to set default layout setting" });
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

  return httpServer;
}
