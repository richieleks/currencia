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

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

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

  app.patch('/api/auth/user/role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { role } = req.body;
      
      if (!role || !["subscriber", "bidder"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await storage.upsertUser({
        ...user,
        role,
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch('/api/auth/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await storage.updateUserProfile(userId, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update user profile" });
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

      const exchangeRequest = await storage.createExchangeRequest(requestData);
      
      // Create chat message for the request
      const rateInfo = requestData.desiredRate ? ` at rate ${requestData.desiredRate}` : '';
      await storage.createChatMessage({
        userId,
        messageType: "request",
        content: `Exchange request: ${requestData.amount} ${requestData.fromCurrency} to ${requestData.toCurrency}${rateInfo}`,
        exchangeRequestId: exchangeRequest.id,
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

      res.json({ message: "Rate offer accepted successfully" });
    } catch (error) {
      console.error("Error accepting rate offer:", error);
      res.status(500).json({ message: "Failed to accept rate offer" });
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

  // User transactions
  app.get("/api/transactions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactions = await storage.getUserTransactions(userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time chat
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

  return httpServer;
}
