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
  updateRateOfferStatus(id: number, status: string): Promise<void>;
  
  // Chat operations
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage & { user: User }>;
  getChatMessages(): Promise<(ChatMessage & { user: User })[]>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: string): Promise<Transaction[]>;
  updateUserBalance(userId: string, amount: string): Promise<void>;
  
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

  // Transaction operations
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    return newTransaction;
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  async updateUserBalance(userId: string, amount: string): Promise<void> {
    await db
      .update(users)
      .set({ balance: amount })
      .where(eq(users.id, userId));
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
      .where(eq(users.role, "bidder"));

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
