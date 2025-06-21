import {
  users,
  exchangeRequests,
  rateOffers,
  chatMessages,
  transactions,
  type User,
  type UpsertUser,
  type ExchangeRequest,
  type InsertExchangeRequest,
  type RateOffer,
  type InsertRateOffer,
  type ChatMessage,
  type InsertChatMessage,
  type Transaction,
  type InsertTransaction,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, updates: Partial<UpsertUser>): Promise<User>;
  
  // Exchange request operations
  createExchangeRequest(request: InsertExchangeRequest): Promise<ExchangeRequest>;
  getExchangeRequests(): Promise<(ExchangeRequest & { user: User })[]>;
  getExchangeRequestById(id: number): Promise<(ExchangeRequest & { user: User }) | undefined>;
  updateExchangeRequestStatus(id: number, status: string, selectedOfferId?: number): Promise<void>;
  
  // Rate offer operations
  createRateOffer(offer: InsertRateOffer): Promise<RateOffer>;
  getRateOffersByRequestId(requestId: number): Promise<(RateOffer & { bidder: User })[]>;
  getBidderRateOffers(bidderId: string): Promise<(RateOffer & { exchangeRequest?: ExchangeRequest })[]>;
  updateRateOfferStatus(id: number, status: string): Promise<void>;
  
  // Chat operations
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage & { user: User }>;
  getChatMessages(): Promise<(ChatMessage & { user: User })[]>;
  createBidActionMessage(userId: string, action: "accept" | "reject", rateOfferId: number, exchangeRequestId: number, targetUserId: string): Promise<ChatMessage & { user: User }>;
  createNotificationMessage(userId: string, content: string, targetUserId?: string): Promise<ChatMessage & { user: User }>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: string): Promise<(Transaction & { exchangeRequest?: ExchangeRequest })[]>;
  getUserTrades(userId: string): Promise<{
    completedRequests: (ExchangeRequest & { user: User, acceptedOffer?: RateOffer & { bidder: User } })[];
    completedOffers: (RateOffer & { bidder: User, exchangeRequest: ExchangeRequest & { user: User } })[];
  }>;
  updateUserBalance(userId: string, amount: string): Promise<void>;
  updateUserCurrencyBalance(userId: string, currency: 'ugx' | 'usd' | 'kes' | 'eur' | 'gbp', amount: string): Promise<void>;
  transferBetweenAccounts(userId: string, currency: 'ugx' | 'usd' | 'kes' | 'eur' | 'gbp', amount: string, direction: 'operational-to-wallet' | 'wallet-to-operational'): Promise<void>;
  
  // Portfolio management
  updateUserActiveCurrencies(userId: string, currencies: string[]): Promise<User>;
  addCurrencyToPortfolio(userId: string, currency: string): Promise<User>;
  removeCurrencyFromPortfolio(userId: string, currency: string): Promise<User>;
  
  // Market stats
  getMarketStats(): Promise<{
    activeRequests: number;
    onlineBidders: number;
    avgResponseTime: string;
    todayVolume: string;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserProfile(id: string, updates: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Exchange request operations
  async createExchangeRequest(request: InsertExchangeRequest): Promise<ExchangeRequest> {
    const [exchangeRequest] = await db
      .insert(exchangeRequests)
      .values(request)
      .returning();
    return exchangeRequest;
  }

  async getExchangeRequests(): Promise<(ExchangeRequest & { user: User })[]> {
    const results = await db
      .select()
      .from(exchangeRequests)
      .innerJoin(users, eq(exchangeRequests.userId, users.id))
      .where(eq(exchangeRequests.status, "active"))
      .orderBy(desc(exchangeRequests.createdAt));
    
    return results.map(result => ({
      ...result.exchange_requests,
      user: result.users,
    }));
  }

  async getExchangeRequestById(id: number): Promise<(ExchangeRequest & { user: User }) | undefined> {
    const [result] = await db
      .select()
      .from(exchangeRequests)
      .innerJoin(users, eq(exchangeRequests.userId, users.id))
      .where(eq(exchangeRequests.id, id));
    
    if (!result) return undefined;
    
    return {
      ...result.exchange_requests,
      user: result.users,
    };
  }

  async updateExchangeRequestStatus(id: number, status: "active" | "completed" | "cancelled", selectedOfferId?: number): Promise<void> {
    await db
      .update(exchangeRequests)
      .set({ 
        status,
        ...(selectedOfferId && { selectedOfferId }),
      })
      .where(eq(exchangeRequests.id, id));
  }

  // Rate offer operations
  async createRateOffer(offer: InsertRateOffer): Promise<RateOffer> {
    const [rateOffer] = await db
      .insert(rateOffers)
      .values(offer)
      .returning();
    return rateOffer;
  }

  async getRateOffersByRequestId(requestId: number): Promise<(RateOffer & { bidder: User })[]> {
    const results = await db
      .select()
      .from(rateOffers)
      .innerJoin(users, eq(rateOffers.bidderId, users.id))
      .where(eq(rateOffers.exchangeRequestId, requestId))
      .orderBy(desc(rateOffers.createdAt));
    
    return results.map(result => ({
      ...result.rate_offers,
      bidder: result.users,
    }));
  }

  async getBidderRateOffers(bidderId: string): Promise<(RateOffer & { exchangeRequest?: ExchangeRequest })[]> {
    const results = await db
      .select()
      .from(rateOffers)
      .leftJoin(exchangeRequests, eq(rateOffers.exchangeRequestId, exchangeRequests.id))
      .where(eq(rateOffers.bidderId, bidderId))
      .orderBy(desc(rateOffers.createdAt));
    
    return results.map(result => ({
      ...result.rate_offers,
      exchangeRequest: result.exchange_requests || undefined,
    }));
  }

  async updateRateOfferStatus(id: number, status: "pending" | "accepted" | "rejected"): Promise<void> {
    await db
      .update(rateOffers)
      .set({ status })
      .where(eq(rateOffers.id, id));
  }

  // Chat operations
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage & { user: User }> {
    const [chatMessage] = await db
      .insert(chatMessages)
      .values(message)
      .returning();
    
    const user = await this.getUser(message.userId);
    if (!user) throw new Error("User not found");
    
    return {
      ...chatMessage,
      user,
    };
  }

  async getChatMessages(): Promise<(ChatMessage & { user: User })[]> {
    const results = await db
      .select()
      .from(chatMessages)
      .innerJoin(users, eq(chatMessages.userId, users.id))
      .orderBy(desc(chatMessages.createdAt))
      .limit(50);
    
    return results.map(result => ({
      ...result.chat_messages,
      user: result.users,
    })).reverse();
  }

  async createBidActionMessage(userId: string, action: "accept" | "reject", rateOfferId: number, exchangeRequestId: number, targetUserId: string): Promise<ChatMessage & { user: User }> {
    const actionText = action === "accept" ? "accepted" : "rejected";
    const content = `${actionText} a bid on exchange request #${exchangeRequestId}`;
    
    const [chatMessage] = await db
      .insert(chatMessages)
      .values({
        userId,
        messageType: "bid_action",
        content,
        exchangeRequestId,
        rateOfferId,
        actionType: action,
        targetUserId,
      })
      .returning();
    
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    return {
      ...chatMessage,
      user,
    };
  }

  async createNotificationMessage(userId: string, content: string, targetUserId?: string): Promise<ChatMessage & { user: User }> {
    const [chatMessage] = await db
      .insert(chatMessages)
      .values({
        userId,
        messageType: "notification",
        content,
        targetUserId,
      })
      .returning();
    
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    return {
      ...chatMessage,
      user,
    };
  }

  // Transaction operations
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    return newTransaction;
  }

  async getUserTransactions(userId: string): Promise<(Transaction & { exchangeRequest?: ExchangeRequest })[]> {
    const results = await db
      .select()
      .from(transactions)
      .leftJoin(exchangeRequests, eq(transactions.exchangeRequestId, exchangeRequests.id))
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
    
    return results.map(result => ({
      ...result.transactions,
      exchangeRequest: result.exchange_requests || undefined,
    }));
  }

  async getUserTrades(userId: string): Promise<{
    completedRequests: (ExchangeRequest & { user: User, acceptedOffer?: RateOffer & { bidder: User } })[];
    completedOffers: (RateOffer & { bidder: User, exchangeRequest: ExchangeRequest & { user: User } })[];
  }> {
    // Get completed exchange requests where user is the requester
    const bidderUsers = alias(users, 'bidder_users');
    const completedRequestsQuery = db
      .select({
        exchange_requests: exchangeRequests,
        users: users,
        rate_offers: rateOffers,
        bidder_users: bidderUsers,
      })
      .from(exchangeRequests)
      .innerJoin(users, eq(exchangeRequests.userId, users.id))
      .leftJoin(rateOffers, eq(exchangeRequests.selectedOfferId, rateOffers.id))
      .leftJoin(bidderUsers, eq(rateOffers.bidderId, bidderUsers.id))
      .where(
        and(
          eq(exchangeRequests.userId, userId),
          eq(exchangeRequests.status, "completed")
        )
      )
      .orderBy(desc(exchangeRequests.createdAt));

    // Get completed rate offers where user is the bidder
    const requesterUsers = alias(users, 'requester_users');
    const completedOffersQuery = db
      .select({
        rate_offers: rateOffers,
        users: users,
        exchange_requests: exchangeRequests,
        requester_users: requesterUsers,
      })
      .from(rateOffers)
      .innerJoin(users, eq(rateOffers.bidderId, users.id))
      .innerJoin(exchangeRequests, eq(rateOffers.exchangeRequestId, exchangeRequests.id))
      .innerJoin(requesterUsers, eq(exchangeRequests.userId, requesterUsers.id))
      .where(
        and(
          eq(rateOffers.bidderId, userId),
          eq(rateOffers.status, "accepted")
        )
      )
      .orderBy(desc(rateOffers.createdAt));

    const [completedRequests, completedOffers] = await Promise.all([
      completedRequestsQuery,
      completedOffersQuery
    ]);

    return {
      completedRequests: completedRequests.map(result => ({
        ...result.exchange_requests,
        user: result.users,
        acceptedOffer: result.rate_offers ? {
          ...result.rate_offers,
          bidder: result.bidder_users!
        } : undefined,
      })),
      completedOffers: completedOffers.map(result => ({
        ...result.rate_offers,
        bidder: result.users,
        exchangeRequest: {
          ...result.exchange_requests,
          user: result.requester_users!
        },
      })),
    };
  }

  async updateUserBalance(userId: string, amount: string): Promise<void> {
    await db
      .update(users)
      .set({ balance: amount })
      .where(eq(users.id, userId));
  }

  async updateUserCurrencyBalance(userId: string, currency: 'ugx' | 'usd' | 'kes' | 'eur' | 'gbp', amount: string): Promise<void> {
    const balanceField = {
      ugx: 'ugxBalance',
      usd: 'usdBalance',
      kes: 'kesBalance',
      eur: 'eurBalance',
      gbp: 'gbpBalance'
    }[currency];

    const updateObj: any = {};
    updateObj[balanceField] = amount;

    await db
      .update(users)
      .set(updateObj)
      .where(eq(users.id, userId));
  }

  async transferBetweenAccounts(userId: string, currency: 'ugx' | 'usd' | 'kes' | 'eur' | 'gbp', amount: string, direction: 'operational-to-wallet' | 'wallet-to-operational'): Promise<void> {
    // This is a placeholder implementation since we don't have separate wallet/operational accounts in the current schema
    // For now, this method will simply maintain the current balance without changes
    // In a real implementation, this would transfer between separate account types
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    // Implementation would depend on having separate wallet and operational balance fields
  }

  // Portfolio management methods
  async updateUserActiveCurrencies(userId: string, currencies: string[]): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ activeCurrencies: currencies })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async addCurrencyToPortfolio(userId: string, currency: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');
    
    const activeCurrencies = user.activeCurrencies || [];
    if (!activeCurrencies.includes(currency.toUpperCase())) {
      activeCurrencies.push(currency.toUpperCase());
      return await this.updateUserActiveCurrencies(userId, activeCurrencies);
    }
    return user;
  }

  async removeCurrencyFromPortfolio(userId: string, currency: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');
    
    const activeCurrencies = (user.activeCurrencies || []).filter(c => c !== currency.toUpperCase());
    return await this.updateUserActiveCurrencies(userId, activeCurrencies);
  }

  // Market stats
  async getMarketStats(): Promise<{
    activeRequests: number;
    onlineBidders: number;
    avgResponseTime: string;
    todayVolume: string;
  }> {
    const [activeRequestsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(exchangeRequests)
      .where(eq(exchangeRequests.status, "active"));

    const [biddersResult] = await db
      .select({ count: sql<number>`count(distinct ${users.id})` })
      .from(users)
      .where(sql`${users.role} = 'trader'`);

    const [volumeResult] = await db
      .select({ 
        volume: sql<string>`coalesce(sum(${exchangeRequests.amount}), 0)` 
      })
      .from(exchangeRequests)
      .where(
        and(
          eq(exchangeRequests.status, "completed"),
          sql`${exchangeRequests.createdAt} >= current_date`
        )
      );

    return {
      activeRequests: activeRequestsResult?.count || 0,
      onlineBidders: biddersResult?.count || 0,
      avgResponseTime: "2.3 min",
      todayVolume: `$${parseFloat(volumeResult?.volume || "0").toLocaleString()}`,
    };
  }
}

export const storage = new DatabaseStorage();
