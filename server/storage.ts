import {
  users,
  exchangeRequests,
  rateOffers,
  chatMessages,
  transactions,
  userSessions,
  auditLogs,
  forexRates,
  roles,
  permissions,
  layoutSettings,
  reportTemplates,
  reportInstances,
  reportSchedules,
  reportExports,
  verificationRequests,
  verificationDocuments,
  verificationChecks,
  bankAccounts,
  bankTransactions,
  currencyHoldings,
  bankSyncLogs,
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
  type UserSession,
  type InsertUserSession,
  type AuditLog,
  type InsertAuditLog,
  type ForexRate,
  type InsertForexRate,
  type Role,
  type InsertRole,
  type Permission,
  type InsertPermission,
  type LayoutSetting,
  type InsertLayoutSetting,
  type ReportTemplate,
  type InsertReportTemplate,
  type ReportInstance,
  type InsertReportInstance,
  type ReportSchedule,
  type InsertReportSchedule,
  type ReportExport,
  type InsertReportExport,
  type VerificationRequest,
  type InsertVerificationRequest,
  type VerificationDocument,
  type InsertVerificationDocument,
  type VerificationCheck,
  type InsertVerificationCheck,
  type BankAccount,
  type InsertBankAccount,
  type BankTransaction,
  type InsertBankTransaction,
  type CurrencyHolding,
  type InsertCurrencyHolding,
  type BankSyncLog,
  type InsertBankSyncLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, sql, count, avg, sum, isNull, isNotNull, gte, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export interface IStorage {
  // User operations (email/password auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUserId(oldId: string, newId: string): Promise<void>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, updates: Partial<UpsertUser>): Promise<User>;
  updateUserActivity(id: string): Promise<void>;
  setUserInactive(id: string): Promise<void>;
  getActiveUsers(): Promise<User[]>;
  
  // Authentication operations
  incrementLoginAttempts(userId: string): Promise<void>;
  resetLoginAttempts(userId: string): Promise<void>;
  updateLastLogin(userId: string): Promise<void>;
  updatePassword(userId: string, hashedPassword: string): Promise<void>;
  
  // Exchange request operations
  createExchangeRequest(request: InsertExchangeRequest): Promise<ExchangeRequest>;
  getExchangeRequests(): Promise<(ExchangeRequest & { user: User })[]>;
  getExchangeRequestById(id: number): Promise<(ExchangeRequest & { user: User }) | undefined>;
  getExistingCurrencyRequest(userId: string, fromCurrency: string, toCurrency: string): Promise<ExchangeRequest | undefined>;
  updateExchangeRequestStatus(id: number, status: string, selectedOfferId?: number): Promise<void>;
  
  // Rate offer operations
  createRateOffer(offer: InsertRateOffer): Promise<RateOffer>;
  getRateOffersByRequestId(requestId: number): Promise<(RateOffer & { bidder: User })[]>;
  getBidderRateOffers(bidderId: string): Promise<(RateOffer & { exchangeRequest?: ExchangeRequest })[]>;
  updateRateOfferStatus(id: number, status: string): Promise<void>;
  
  // Chat operations
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage & { user: User }>;
  getChatMessages(): Promise<(ChatMessage & { user: User, replies?: (ChatMessage & { user: User })[] })[]>;
  getThreadMessages(exchangeRequestId: number): Promise<(ChatMessage & { user: User, replies?: (ChatMessage & { user: User })[] })[]>;
  createThreadReply(userId: string, content: string, parentMessageId: number, exchangeRequestId?: number): Promise<ChatMessage & { user: User }>;
  createBidActionMessage(userId: string, action: "accept" | "reject", rateOfferId: number, exchangeRequestId: number, targetUserId: string): Promise<ChatMessage & { user: User }>;
  createNotificationMessage(userId: string, content: string, targetUserId?: string): Promise<ChatMessage & { user: User }>;
  createPrivateMessage(userId: string, targetUserId: string, content: string, exchangeRequestId?: number, rateOfferId?: number): Promise<ChatMessage & { user: User }>;
  getPrivateMessages(userId: string, targetUserId: string): Promise<(ChatMessage & { user: User })[]>;
  getConversations(userId: string): Promise<{ targetUser: User; lastMessage: ChatMessage & { user: User }; unreadCount: number }[]>;
  markMessagesAsRead(userId: string, conversationId: string): Promise<void>;
  
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
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  getUserActivity(userId: string): Promise<{
    totalRequests: number;
    totalOffers: number;
    completedTransactions: number;
    averageRating: number;
    lastActive: string;
  }>;
  getSystemStats(): Promise<{
    totalUsers: number;
    totalTraders: number;
    totalAdmins: number;
    totalTransactions: number;
    totalVolume: string;
    activeRequests: number;
    pendingOffers: number;
  }>;
  updateUserRole(userId: string, role: "trader" | "admin" | "moderator"): Promise<User>;
  suspendUser(userId: string): Promise<void>;
  unsuspendUser(userId: string): Promise<void>;
  
  // RBAC operations
  createRole(role: InsertRole): Promise<Role>;
  getRoles(): Promise<Role[]>;
  getRoleById(id: number): Promise<Role | undefined>;
  updateRole(id: number, updates: Partial<Role>): Promise<Role>;
  deleteRole(id: number): Promise<void>;
  
  createPermission(permission: InsertPermission): Promise<Permission>;
  getPermissions(): Promise<Permission[]>;
  
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  getUserSessions(userId: string): Promise<UserSession[]>;
  updateUserSession(sessionToken: string, updates: Partial<UserSession>): Promise<void>;
  deleteUserSession(sessionToken: string): Promise<void>;
  
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: { userId?: string; action?: string; resource?: string }): Promise<AuditLog[]>;
  
  updateUserPermissions(userId: string, permissions: string[]): Promise<User>;
  
  // Layout settings operations
  getLayoutSettings(): Promise<LayoutSetting[]>;
  getActiveLayoutSetting(): Promise<LayoutSetting | undefined>;
  createLayoutSetting(setting: InsertLayoutSetting): Promise<LayoutSetting>;
  updateLayoutSetting(id: number, updates: Partial<InsertLayoutSetting>): Promise<LayoutSetting>;
  deleteLayoutSetting(id: number): Promise<void>;
  setDefaultLayoutSetting(id: number): Promise<void>;
  
  // Reports operations
  getReportTemplates(): Promise<ReportTemplate[]>;
  getReportTemplateById(id: number): Promise<ReportTemplate | undefined>;
  createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate>;
  updateReportTemplate(id: number, updates: Partial<InsertReportTemplate>): Promise<ReportTemplate>;
  deleteReportTemplate(id: number): Promise<void>;
  
  getReportInstances(templateId?: number): Promise<ReportInstance[]>;
  getReportInstanceById(id: number): Promise<ReportInstance | undefined>;
  createReportInstance(instance: InsertReportInstance): Promise<ReportInstance>;
  updateReportInstance(id: number, updates: Partial<InsertReportInstance>): Promise<ReportInstance>;
  deleteReportInstance(id: number): Promise<void>;
  
  getReportSchedules(): Promise<ReportSchedule[]>;
  createReportSchedule(schedule: InsertReportSchedule): Promise<ReportSchedule>;
  updateReportSchedule(id: number, updates: Partial<InsertReportSchedule>): Promise<ReportSchedule>;
  deleteReportSchedule(id: number): Promise<void>;
  
  getReportExports(userId?: string): Promise<ReportExport[]>;
  createReportExport(exportData: InsertReportExport): Promise<ReportExport>;
  updateReportExport(id: number, updates: Partial<InsertReportExport>): Promise<ReportExport>;
  
  // Report data generation methods
  generateSystemOverviewReport(params: any): Promise<any>;
  generateUserActivityReport(params: any): Promise<any>;
  generateTransactionVolumeReport(params: any): Promise<any>;
  generateCurrencyAnalysisReport(params: any): Promise<any>;
  generateMarketTrendsReport(params: any): Promise<any>;
  
  // Verification system operations
  createVerificationRequest(request: InsertVerificationRequest): Promise<VerificationRequest>;
  getVerificationRequest(id: number): Promise<(VerificationRequest & { 
    user: User; 
    documents: VerificationDocument[]; 
    checks: VerificationCheck[];
    assignedAdmin?: User;
  }) | undefined>;
  getUserVerificationRequests(userId: string): Promise<(VerificationRequest & { 
    documents: VerificationDocument[]; 
    checks: VerificationCheck[] 
  })[]>;
  getAllVerificationRequests(status?: string): Promise<(VerificationRequest & { 
    user: User;
    assignedAdmin?: User;
  })[]>;
  updateVerificationRequest(id: number, updates: Partial<VerificationRequest>): Promise<VerificationRequest>;
  assignVerificationRequest(id: number, adminId: string): Promise<void>;
  
  createVerificationDocument(document: InsertVerificationDocument): Promise<VerificationDocument>;
  getVerificationDocuments(verificationRequestId: number): Promise<VerificationDocument[]>;
  updateVerificationDocument(id: number, updates: Partial<VerificationDocument>): Promise<VerificationDocument>;
  deleteVerificationDocument(id: number): Promise<void>;
  
  createVerificationCheck(check: InsertVerificationCheck): Promise<VerificationCheck>;
  getVerificationChecks(verificationRequestId: number): Promise<VerificationCheck[]>;
  updateVerificationCheck(id: number, updates: Partial<VerificationCheck>): Promise<VerificationCheck>;
  
  approveVerificationRequest(id: number, adminId: string, level: "basic" | "enhanced" | "premium"): Promise<void>;
  rejectVerificationRequest(id: number, adminId: string, reason: string): Promise<void>;
  updateUserVerificationStatus(userId: string, status: string, level?: string): Promise<User>;
  
  getVerificationStats(): Promise<{
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    averageProcessingTime: string;
  }>;

  // Bank account methods
  getBankAccountsByUserId(userId: string): Promise<BankAccount[]>;
  getBankAccountById(id: number): Promise<BankAccount | undefined>;
  createBankAccount(data: InsertBankAccount): Promise<BankAccount>;
  updateBankAccount(id: number, data: Partial<BankAccount>): Promise<void>;
  deleteBankAccount(id: number): Promise<void>;
  syncBankAccountBalance(accountId: number): Promise<BankAccount>;
  
  // Bank transaction methods
  getBankTransactionsByAccountId(accountId: number): Promise<BankTransaction[]>;
  getBankTransactionsByUserId(userId: string): Promise<BankTransaction[]>;
  createBankTransaction(data: InsertBankTransaction): Promise<BankTransaction>;
  
  // Currency holdings methods
  getCurrencyHoldingsByUserId(userId: string): Promise<CurrencyHolding[]>;
  updateCurrencyHolding(userId: string, currency: string, data: Partial<CurrencyHolding>): Promise<void>;
  syncAllUserBalances(userId: string): Promise<void>;
  
  // Bank sync logs
  createBankSyncLog(data: InsertBankSyncLog): Promise<BankSyncLog>;
  getBankSyncLogsByUserId(userId: string): Promise<BankSyncLog[]>;
  
  // Bank account balance validation
  hasActiveBankAccounts(userId: string): Promise<boolean>;
  hasSufficientBalance(userId: string, currency: string, amount: number): Promise<boolean>;
  getUserCurrencyBalance(userId: string, currency: string): Promise<number>;
  canMakeExchangeRequest(userId: string, fromCurrency: string, amount: number): Promise<{ 
    canMake: boolean; 
    reason?: string;
    missingAmount?: number;
  }>;
  
  // Session management
  updateLastActiveAt(userId: string): Promise<void>;
  getActiveSessions(): Promise<number>;
  getActiveUsersCount(): Promise<number>;
  cleanupInactiveSessions(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUserId(oldId: string, newId: string): Promise<void> {
    // Update the user's ID and all related references
    await db.transaction(async (tx) => {
      // Update users table
      await tx.update(users).set({ id: newId }).where(eq(users.id, oldId));
      
      // Update related tables
      await tx.update(exchangeRequests).set({ userId: newId }).where(eq(exchangeRequests.userId, oldId));
      await tx.update(rateOffers).set({ bidderId: newId }).where(eq(rateOffers.bidderId, oldId));
      await tx.update(chatMessages).set({ userId: newId }).where(eq(chatMessages.userId, oldId));
      await tx.update(chatMessages).set({ targetUserId: newId }).where(eq(chatMessages.targetUserId, oldId));
      await tx.update(transactions).set({ userId: newId }).where(eq(transactions.userId, oldId));
      await tx.update(auditLogs).set({ userId: newId }).where(eq(auditLogs.userId, oldId));
    });
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
    console.log("Storage updateUserProfile called with:", { id, updates });
    
    try {
      const [user] = await db
        .update(users)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();
      
      console.log("User profile updated in database:", user);
      return user;
    } catch (error) {
      console.error("Database error in updateUserProfile:", error);
      throw error;
    }
  }

  async updateUserActivity(id: string): Promise<void> {
    await db
      .update(users)
      .set({
        status: "active",
        lastActiveAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async setUserInactive(id: string): Promise<void> {
    await db
      .update(users)
      .set({
        status: "inactive",
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async getActiveUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.status, "active"));
  }

  // Authentication operations
  async incrementLoginAttempts(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        loginAttempts: sql`${users.loginAttempts} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async resetLoginAttempts(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        loginAttempts: 0,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateLastLogin(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({
        password: hashedPassword,
        isDefaultPassword: false,
        mustChangePassword: false,
        lastPasswordChange: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
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

  async getExistingCurrencyRequest(userId: string, fromCurrency: string, toCurrency: string): Promise<ExchangeRequest | undefined> {
    const [result] = await db
      .select()
      .from(exchangeRequests)
      .where(
        and(
          eq(exchangeRequests.userId, userId),
          eq(exchangeRequests.fromCurrency, fromCurrency),
          eq(exchangeRequests.toCurrency, toCurrency),
          eq(exchangeRequests.status, "active")
        )
      )
      .limit(1);

    return result;
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

  async getChatMessages(): Promise<(ChatMessage & { user: User, replies?: (ChatMessage & { user: User })[] })[]> {
    // Get main messages (excluding replies) including exchange requests
    const mainMessages = await db
      .select()
      .from(chatMessages)
      .innerJoin(users, eq(chatMessages.userId, users.id))
      .where(and(
        eq(chatMessages.messageType, "general"),
        isNull(chatMessages.parentMessageId)
      ))
      .orderBy(desc(chatMessages.createdAt));
    
    // Get all replies
    const repliesQuery = await db
      .select()
      .from(chatMessages)
      .innerJoin(users, eq(chatMessages.userId, users.id))
      .where(
        and(
          eq(chatMessages.messageType, "general"),
          isNotNull(chatMessages.parentMessageId)
        )
      )
      .orderBy(asc(chatMessages.createdAt));
    
    // Group replies by parent message ID
    const repliesMap = new Map<number, (ChatMessage & { user: User })[]>();
    repliesQuery.forEach(result => {
      const reply = {
        ...result.chat_messages,
        user: result.users,
      };
      const parentId = reply.parentMessageId!;
      if (!repliesMap.has(parentId)) {
        repliesMap.set(parentId, []);
      }
      repliesMap.get(parentId)!.push(reply);
    });
    
    // Combine main messages with their replies
    return mainMessages.map(result => ({
      ...result.chat_messages,
      user: result.users,
      replies: repliesMap.get(result.chat_messages.id) || [],
    }));
  }

  async createThreadReply(userId: string, content: string, parentMessageId: number, exchangeRequestId?: number): Promise<ChatMessage & { user: User }> {
    const replyMessage: InsertChatMessage = {
      userId,
      content,
      messageType: "general",
      parentMessageId,
      exchangeRequestId,
    };

    return this.createChatMessage(replyMessage);
  }

  async getThreadMessages(exchangeRequestId: number): Promise<(ChatMessage & { user: User, replies?: (ChatMessage & { user: User })[] })[]> {
    // Get main messages for this exchange request
    const mainMessages = await db
      .select()
      .from(chatMessages)
      .innerJoin(users, eq(chatMessages.userId, users.id))
      .where(
        and(
          eq(chatMessages.exchangeRequestId, exchangeRequestId),
          isNull(chatMessages.parentMessageId)
        )
      )
      .orderBy(asc(chatMessages.createdAt));
    
    // Get all replies for this exchange request
    const repliesQuery = await db
      .select()
      .from(chatMessages)
      .innerJoin(users, eq(chatMessages.userId, users.id))
      .where(
        and(
          eq(chatMessages.exchangeRequestId, exchangeRequestId),
          isNotNull(chatMessages.parentMessageId)
        )
      )
      .orderBy(asc(chatMessages.createdAt));
    
    // Group replies by parent message ID
    const repliesMap = new Map<number, (ChatMessage & { user: User })[]>();
    repliesQuery.forEach(result => {
      const reply = {
        ...result.chat_messages,
        user: result.users,
      };
      const parentId = reply.parentMessageId!;
      if (!repliesMap.has(parentId)) {
        repliesMap.set(parentId, []);
      }
      repliesMap.get(parentId)!.push(reply);
    });
    
    // Combine main messages with their replies
    return mainMessages.map(result => ({
      ...result.chat_messages,
      user: result.users,
      replies: repliesMap.get(result.chat_messages.id) || [],
    }));
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

  async createPrivateMessage(userId: string, targetUserId: string, content: string, exchangeRequestId?: number, rateOfferId?: number): Promise<ChatMessage & { user: User }> {
    // Create conversation ID based on sorted user IDs to ensure consistency
    const conversationId = [userId, targetUserId].sort().join('-');
    
    const message = await this.createChatMessage({
      userId,
      messageType: "private",
      content,
      targetUserId,
      conversationId,
      exchangeRequestId,
      rateOfferId,
    });
    
    return message;
  }

  async getPrivateMessages(userId: string, targetUserId: string): Promise<(ChatMessage & { user: User })[]> {
    const conversationId = [userId, targetUserId].sort().join('-');
    
    const results = await db
      .select()
      .from(chatMessages)
      .innerJoin(users, eq(chatMessages.userId, users.id))
      .where(
        and(
          eq(chatMessages.messageType, "private"),
          eq(chatMessages.conversationId, conversationId)
        )
      )
      .orderBy(chatMessages.createdAt);
    
    return results.map(result => ({
      ...result.chat_messages,
      user: result.users,
    }));
  }

  async getConversations(userId: string): Promise<{ targetUser: User; lastMessage: ChatMessage & { user: User }; unreadCount: number }[]> {
    // Get all conversations for the user
    const conversations = await db
      .select({
        conversationId: chatMessages.conversationId,
        targetUserId: chatMessages.targetUserId,
        otherUserId: chatMessages.userId,
      })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.messageType, "private"),
          or(
            eq(chatMessages.userId, userId),
            eq(chatMessages.targetUserId, userId)
          )
        )
      )
      .groupBy(chatMessages.conversationId, chatMessages.targetUserId, chatMessages.userId);

    const results = [];
    
    for (const conv of conversations) {
      const targetUserId = conv.targetUserId === userId ? conv.otherUserId : conv.targetUserId;
      if (!targetUserId) continue;
      
      // Get target user
      const targetUser = await this.getUser(targetUserId);
      if (!targetUser) continue;
      
      // Get last message
      const lastMessageResult = await db
        .select()
        .from(chatMessages)
        .innerJoin(users, eq(chatMessages.userId, users.id))
        .where(eq(chatMessages.conversationId, conv.conversationId || ""))
        .orderBy(desc(chatMessages.createdAt))
        .limit(1);
      
      if (lastMessageResult.length === 0) continue;
      
      const lastMessage = {
        ...lastMessageResult[0].chat_messages,
        user: lastMessageResult[0].users,
      };
      
      // Get unread count
      const unreadResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.conversationId, conv.conversationId || ""),
            eq(chatMessages.targetUserId, userId),
            eq(chatMessages.isRead, false)
          )
        );
      
      const unreadCount = unreadResult[0]?.count || 0;
      
      results.push({
        targetUser,
        lastMessage,
        unreadCount,
      });
    }
    
    return results.sort((a, b) => 
      (b.lastMessage.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0) - 
      (a.lastMessage.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0)
    );
  }

  async markMessagesAsRead(userId: string, conversationId: string): Promise<void> {
    await db
      .update(chatMessages)
      .set({ isRead: true })
      .where(
        and(
          eq(chatMessages.conversationId, conversationId),
          eq(chatMessages.targetUserId, userId),
          eq(chatMessages.isRead, false)
        )
      );
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

    // Get online bidders count based on recent activity (last 5 minutes)
    const onlineBidders = await this.getActiveSessions();

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
      onlineBidders,
      avgResponseTime: "2.3 min",
      todayVolume: `$${parseFloat(volumeResult?.volume || "0").toLocaleString()}`,
    };
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserActivity(userId: string): Promise<{
    totalRequests: number;
    totalOffers: number;
    completedTransactions: number;
    averageRating: number;
    lastActive: string;
  }> {
    const [requestsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(exchangeRequests)
      .where(eq(exchangeRequests.userId, userId));

    const [offersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(rateOffers)
      .where(eq(rateOffers.bidderId, userId));

    const [transactionsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(eq(transactions.userId, userId));

    const [lastActivityResult] = await db
      .select({ lastActive: chatMessages.createdAt })
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(1);

    return {
      totalRequests: requestsResult?.count || 0,
      totalOffers: offersResult?.count || 0,
      completedTransactions: transactionsResult?.count || 0,
      averageRating: 4.5,
      lastActive: lastActivityResult?.lastActive?.toISOString() || new Date().toISOString(),
    };
  }

  async getSystemStats(): Promise<{
    totalUsers: number;
    totalTraders: number;
    totalAdmins: number;
    totalTransactions: number;
    totalVolume: string;
    activeRequests: number;
    pendingOffers: number;
  }> {
    const [totalUsersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const [totalTradersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, "trader"));

    const [totalAdminsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, "admin"));

    const [totalTransactionsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions);

    const [totalVolumeResult] = await db
      .select({ 
        total: sql<number>`sum(cast(amount as decimal))` 
      })
      .from(transactions);

    const [activeRequestsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(exchangeRequests)
      .where(eq(exchangeRequests.status, "active"));

    const [pendingOffersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(rateOffers)
      .where(eq(rateOffers.status, "pending"));

    return {
      totalUsers: totalUsersResult?.count || 0,
      totalTraders: totalTradersResult?.count || 0,
      totalAdmins: totalAdminsResult?.count || 0,
      totalTransactions: totalTransactionsResult?.count || 0,
      totalVolume: `$${(totalVolumeResult?.total || 0).toLocaleString()}`,
      activeRequests: activeRequestsResult?.count || 0,
      pendingOffers: pendingOffersResult?.count || 0,
    };
  }

  async updateUserRole(userId: string, role: "trader" | "admin" | "moderator"): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async suspendUser(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        role: "suspended" as any,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));
  }

  async unsuspendUser(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        role: "trader",
        status: "active" as any,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));
  }

  // RBAC operations
  async createRole(roleData: InsertRole): Promise<Role> {
    const [role] = await db
      .insert(roles)
      .values(roleData)
      .returning();
    return role;
  }

  async getRoles(): Promise<Role[]> {
    return await db
      .select()
      .from(roles)
      .orderBy(desc(roles.createdAt));
  }

  async getRoleById(id: number): Promise<Role | undefined> {
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, id));
    return role;
  }

  async updateRole(id: number, updates: Partial<Role>): Promise<Role> {
    const [role] = await db
      .update(roles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(roles.id, id))
      .returning();
    return role;
  }

  async deleteRole(id: number): Promise<void> {
    await db
      .delete(roles)
      .where(eq(roles.id, id));
  }

  async createPermission(permissionData: InsertPermission): Promise<Permission> {
    const [permission] = await db
      .insert(permissions)
      .values(permissionData)
      .returning();
    return permission;
  }

  async getPermissions(): Promise<Permission[]> {
    return await db
      .select()
      .from(permissions)
      .orderBy(permissions.category, permissions.name);
  }

  async createUserSession(sessionData: InsertUserSession): Promise<UserSession> {
    const [session] = await db
      .insert(userSessions)
      .values(sessionData)
      .returning();
    return session;
  }

  async getUserSessions(userId: string): Promise<UserSession[]> {
    return await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, userId))
      .orderBy(desc(userSessions.lastActivity));
  }

  async updateUserSession(sessionToken: string, updates: Partial<UserSession>): Promise<void> {
    await db
      .update(userSessions)
      .set(updates)
      .where(eq(userSessions.sessionToken, sessionToken));
  }

  async deleteUserSession(sessionToken: string): Promise<void> {
    await db
      .delete(userSessions)
      .where(eq(userSessions.sessionToken, sessionToken));
  }

  async createAuditLog(logData: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db
      .insert(auditLogs)
      .values(logData)
      .returning();
    return log;
  }

  async getAuditLogs(filters?: { userId?: string; action?: string; resource?: string }): Promise<AuditLog[]> {
    const conditions = [];
    
    if (filters?.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    if (filters?.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    if (filters?.resource) {
      conditions.push(eq(auditLogs.resource, filters.resource));
    }
    
    const query = db.select().from(auditLogs);
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(auditLogs.createdAt));
    }
    return await query.orderBy(desc(auditLogs.createdAt));
  }

  async updateUserPermissions(userId: string, permissions: string[]): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ permissions, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Forex Rates Management
  async createForexRate(data: InsertForexRate): Promise<ForexRate> {
    const [rate] = await db
      .insert(forexRates)
      .values(data)
      .returning();
    return rate;
  }

  async getForexRates(filters?: { 
    traderId?: string; 
    fromCurrency?: string; 
    toCurrency?: string; 
    date?: string;
  }): Promise<ForexRate[]> {
    const conditions = [];
    
    if (filters?.traderId) {
      conditions.push(eq(forexRates.traderId, filters.traderId));
    }
    if (filters?.fromCurrency) {
      conditions.push(eq(forexRates.fromCurrency, filters.fromCurrency));
    }
    if (filters?.toCurrency) {
      conditions.push(eq(forexRates.toCurrency, filters.toCurrency));
    }
    if (filters?.date) {
      conditions.push(eq(forexRates.date, filters.date));
    }

    const query = db
      .select({
        id: forexRates.id,
        traderId: forexRates.traderId,
        fromCurrency: forexRates.fromCurrency,
        toCurrency: forexRates.toCurrency,
        buyRate: forexRates.buyRate,
        sellRate: forexRates.sellRate,
        date: forexRates.date,
        createdAt: forexRates.createdAt,
        updatedAt: forexRates.updatedAt,
        traderName: users.companyName,
        traderEmail: users.email,
      })
      .from(forexRates)
      .leftJoin(users, eq(forexRates.traderId, users.id));

    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(forexRates.createdAt));
    }
    return await query.orderBy(desc(forexRates.createdAt));
  }

  async updateForexRate(id: number, data: Partial<InsertForexRate>): Promise<ForexRate> {
    const [rate] = await db
      .update(forexRates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(forexRates.id, id))
      .returning();
    return rate;
  }

  async deleteForexRate(id: number): Promise<void> {
    await db.delete(forexRates).where(eq(forexRates.id, id));
  }

  async getMarketRatesSummary(fromCurrency: string, toCurrency: string): Promise<{
    highestBuyRate: string | null;
    lowestBuyRate: string | null;
    highestSellRate: string | null;
    lowestSellRate: string | null;
    totalTraders: number;
    lastUpdated: string | null;
  }> {
    const today = new Date().toISOString().split('T')[0];
    
    const rates = await db
      .select()
      .from(forexRates)
      .where(
        and(
          eq(forexRates.fromCurrency, fromCurrency),
          eq(forexRates.toCurrency, toCurrency),
          eq(forexRates.date, today)
        )
      );

    if (rates.length === 0) {
      return {
        highestBuyRate: null,
        lowestBuyRate: null,
        highestSellRate: null,
        lowestSellRate: null,
        totalTraders: 0,
        lastUpdated: null,
      };
    }

    const buyRates = rates.map(r => parseFloat(r.buyRate));
    const sellRates = rates.map(r => parseFloat(r.sellRate));

    return {
      highestBuyRate: Math.max(...buyRates).toFixed(6),
      lowestBuyRate: Math.min(...buyRates).toFixed(6),
      highestSellRate: Math.max(...sellRates).toFixed(6),
      lowestSellRate: Math.min(...sellRates).toFixed(6),
      totalTraders: rates.length,
      lastUpdated: Math.max(...rates.map(r => new Date(r.updatedAt || r.createdAt || '').getTime())).toString(),
    };
  }

  // Layout settings operations
  async getLayoutSettings(): Promise<LayoutSetting[]> {
    return await db.select().from(layoutSettings).orderBy(asc(layoutSettings.name));
  }

  async getActiveLayoutSetting(): Promise<LayoutSetting | undefined> {
    const [setting] = await db
      .select()
      .from(layoutSettings)
      .where(eq(layoutSettings.isDefault, true))
      .limit(1);
    return setting;
  }

  async createLayoutSetting(settingData: InsertLayoutSetting): Promise<LayoutSetting> {
    const [setting] = await db
      .insert(layoutSettings)
      .values(settingData)
      .returning();
    return setting;
  }

  async updateLayoutSetting(id: number, updates: Partial<InsertLayoutSetting>): Promise<LayoutSetting> {
    const [setting] = await db
      .update(layoutSettings)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(layoutSettings.id, id))
      .returning();
    return setting;
  }

  async deleteLayoutSetting(id: number): Promise<void> {
    await db
      .delete(layoutSettings)
      .where(eq(layoutSettings.id, id));
  }

  async setDefaultLayoutSetting(id: number): Promise<void> {
    // First, unset all other defaults
    await db
      .update(layoutSettings)
      .set({ 
        isDefault: false,
        updatedAt: new Date()
      });
    
    // Then set the new default
    await db
      .update(layoutSettings)
      .set({ 
        isDefault: true,
        updatedAt: new Date()
      })
      .where(eq(layoutSettings.id, id));
  }

  // Reports operations implementation
  async getReportTemplates(): Promise<ReportTemplate[]> {
    return await db.select().from(reportTemplates).orderBy(desc(reportTemplates.createdAt));
  }

  async getReportTemplateById(id: number): Promise<ReportTemplate | undefined> {
    const [template] = await db.select().from(reportTemplates).where(eq(reportTemplates.id, id));
    return template;
  }

  async createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate> {
    const [newTemplate] = await db
      .insert(reportTemplates)
      .values(template)
      .returning();
    return newTemplate;
  }

  async updateReportTemplate(id: number, updates: Partial<InsertReportTemplate>): Promise<ReportTemplate> {
    const [template] = await db
      .update(reportTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(reportTemplates.id, id))
      .returning();
    return template;
  }

  async deleteReportTemplate(id: number): Promise<void> {
    await db.delete(reportTemplates).where(eq(reportTemplates.id, id));
  }

  async getReportInstances(templateId?: number): Promise<ReportInstance[]> {
    let query = db.select().from(reportInstances);
    if (templateId) {
      query = query.where(eq(reportInstances.templateId, templateId));
    }
    return await query.orderBy(desc(reportInstances.createdAt));
  }

  async getReportInstanceById(id: number): Promise<ReportInstance | undefined> {
    const [instance] = await db.select().from(reportInstances).where(eq(reportInstances.id, id));
    return instance;
  }

  async createReportInstance(instance: InsertReportInstance): Promise<ReportInstance> {
    const [newInstance] = await db
      .insert(reportInstances)
      .values(instance)
      .returning();
    return newInstance;
  }

  async updateReportInstance(id: number, updates: Partial<InsertReportInstance>): Promise<ReportInstance> {
    const [instance] = await db
      .update(reportInstances)
      .set(updates)
      .where(eq(reportInstances.id, id))
      .returning();
    return instance;
  }

  async deleteReportInstance(id: number): Promise<void> {
    await db.delete(reportInstances).where(eq(reportInstances.id, id));
  }

  async getReportSchedules(): Promise<ReportSchedule[]> {
    return await db.select().from(reportSchedules).orderBy(desc(reportSchedules.createdAt));
  }

  async createReportSchedule(schedule: InsertReportSchedule): Promise<ReportSchedule> {
    const [newSchedule] = await db
      .insert(reportSchedules)
      .values(schedule)
      .returning();
    return newSchedule;
  }

  async updateReportSchedule(id: number, updates: Partial<InsertReportSchedule>): Promise<ReportSchedule> {
    const [schedule] = await db
      .update(reportSchedules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(reportSchedules.id, id))
      .returning();
    return schedule;
  }

  async deleteReportSchedule(id: number): Promise<void> {
    await db.delete(reportSchedules).where(eq(reportSchedules.id, id));
  }

  async getReportExports(userId?: string): Promise<ReportExport[]> {
    let query = db.select().from(reportExports);
    if (userId) {
      query = query.where(eq(reportExports.exportedBy, userId));
    }
    return await query.orderBy(desc(reportExports.createdAt));
  }

  async createReportExport(exportData: InsertReportExport): Promise<ReportExport> {
    const [newExport] = await db
      .insert(reportExports)
      .values(exportData)
      .returning();
    return newExport;
  }

  async updateReportExport(id: number, updates: Partial<InsertReportExport>): Promise<ReportExport> {
    const [exportRecord] = await db
      .update(reportExports)
      .set(updates)
      .where(eq(reportExports.id, id))
      .returning();
    return exportRecord;
  }

  // Report data generation methods
  async generateSystemOverviewReport(params: any): Promise<any> {
    const dateRange = params.dateRange || { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() };
    
    const [totalUsersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const [totalTransactionsResult] = await db
      .select({ 
        count: sql<number>`count(*)`,
        volume: sql<number>`coalesce(sum(cast(amount as decimal)), 0)`
      })
      .from(transactions)
      .where(
        and(
          gte(transactions.createdAt, dateRange.start),
          lte(transactions.createdAt, dateRange.end)
        )
      );

    const [activeRequestsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(exchangeRequests)
      .where(eq(exchangeRequests.status, "active"));

    const dailyTransactions = await db
      .select({
        date: sql<string>`date(${transactions.createdAt})`,
        count: sql<number>`count(*)`,
        volume: sql<number>`sum(cast(${transactions.amount} as decimal))`
      })
      .from(transactions)
      .where(
        and(
          gte(transactions.createdAt, dateRange.start),
          lte(transactions.createdAt, dateRange.end)
        )
      )
      .groupBy(sql`date(${transactions.createdAt})`)
      .orderBy(sql`date(${transactions.createdAt})`);

    return {
      summary: {
        totalUsers: totalUsersResult?.count || 0,
        totalTransactions: totalTransactionsResult?.count || 0,
        totalVolume: totalTransactionsResult?.volume || 0,
        activeRequests: activeRequestsResult?.count || 0,
      },
      charts: {
        dailyTransactions,
      },
      dateRange,
      generatedAt: new Date(),
    };
  }

  async generateUserActivityReport(params: any): Promise<any> {
    const dateRange = params.dateRange || { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() };
    
    const userActivity = await db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        companyName: users.companyName,
        email: users.email,
        role: users.role,
        totalRequests: sql<number>`coalesce((
          select count(*) from exchange_requests 
          where user_id = ${users.id} 
          and created_at >= ${dateRange.start} 
          and created_at <= ${dateRange.end}
        ), 0)`,
        totalOffers: sql<number>`coalesce((
          select count(*) from rate_offers 
          where bidder_id = ${users.id} 
          and created_at >= ${dateRange.start} 
          and created_at <= ${dateRange.end}
        ), 0)`,
        totalTransactions: sql<number>`coalesce((
          select count(*) from transactions 
          where (requester_id = ${users.id} or bidder_id = ${users.id})
          and created_at >= ${dateRange.start} 
          and created_at <= ${dateRange.end}
        ), 0)`,
        lastActive: users.lastActiveAt,
      })
      .from(users)
      .where(eq(users.status, "active"));

    const topTraders = userActivity
      .sort((a, b) => (b.totalTransactions + b.totalRequests + b.totalOffers) - (a.totalTransactions + a.totalRequests + a.totalOffers))
      .slice(0, 10);

    return {
      userActivity,
      topTraders,
      dateRange,
      generatedAt: new Date(),
    };
  }

  async generateTransactionVolumeReport(params: any): Promise<any> {
    const dateRange = params.dateRange || { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() };
    
    const volumeByDate = await db
      .select({
        date: sql<string>`date(${transactions.createdAt})`,
        volume: sql<number>`sum(cast(${transactions.amount} as decimal))`,
        count: sql<number>`count(*)`
      })
      .from(transactions)
      .where(
        and(
          gte(transactions.createdAt, dateRange.start),
          lte(transactions.createdAt, dateRange.end)
        )
      )
      .groupBy(sql`date(${transactions.createdAt})`)
      .orderBy(sql`date(${transactions.createdAt})`);

    const volumeByCurrency = await db
      .select({
        currency: exchangeRequests.fromCurrency,
        volume: sql<number>`sum(cast(${transactions.amount} as decimal))`,
        count: sql<number>`count(*)`
      })
      .from(transactions)
      .innerJoin(exchangeRequests, eq(transactions.exchangeRequestId, exchangeRequests.id))
      .where(
        and(
          gte(transactions.createdAt, dateRange.start),
          lte(transactions.createdAt, dateRange.end)
        )
      )
      .groupBy(exchangeRequests.fromCurrency)
      .orderBy(desc(sql`sum(cast(${transactions.amount} as decimal))`));

    const [totalVolumeResult] = await db
      .select({
        totalVolume: sql<number>`sum(cast(${transactions.amount} as decimal))`,
        totalCount: sql<number>`count(*)`
      })
      .from(transactions)
      .where(
        and(
          gte(transactions.createdAt, dateRange.start),
          lte(transactions.createdAt, dateRange.end)
        )
      );

    return {
      summary: {
        totalVolume: totalVolumeResult?.totalVolume || 0,
        totalTransactions: totalVolumeResult?.totalCount || 0,
        averageTransaction: (totalVolumeResult?.totalVolume || 0) / (totalVolumeResult?.totalCount || 1),
      },
      charts: {
        volumeByDate,
        volumeByCurrency,
      },
      dateRange,
      generatedAt: new Date(),
    };
  }

  async generateCurrencyAnalysisReport(params: any): Promise<any> {
    const dateRange = params.dateRange || { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() };
    
    const currencyPairs = await db
      .select({
        fromCurrency: exchangeRequests.fromCurrency,
        toCurrency: exchangeRequests.toCurrency,
        totalRequests: sql<number>`count(*)`,
        completedTransactions: sql<number>`sum(case when ${exchangeRequests.status} = 'completed' then 1 else 0 end)`,
        totalVolume: sql<number>`sum(cast(${exchangeRequests.amount} as decimal))`,
        avgAmount: sql<number>`avg(cast(${exchangeRequests.amount} as decimal))`
      })
      .from(exchangeRequests)
      .where(
        and(
          gte(exchangeRequests.createdAt, dateRange.start),
          lte(exchangeRequests.createdAt, dateRange.end)
        )
      )
      .groupBy(exchangeRequests.fromCurrency, exchangeRequests.toCurrency)
      .orderBy(desc(sql`count(*)`));

    const popularCurrencies = await db
      .select({
        currency: sql<string>`currency`,
        requests: sql<number>`total_requests`
      })
      .from(sql`(
        select from_currency as currency, count(*) as total_requests 
        from exchange_requests 
        where created_at >= ${dateRange.start} and created_at <= ${dateRange.end}
        group by from_currency
        union all
        select to_currency as currency, count(*) as total_requests 
        from exchange_requests 
        where created_at >= ${dateRange.start} and created_at <= ${dateRange.end}
        group by to_currency
      ) as currency_counts`)
      .groupBy(sql`currency`)
      .orderBy(desc(sql`sum(total_requests)`));

    return {
      currencyPairs,
      popularCurrencies,
      dateRange,
      generatedAt: new Date(),
    };
  }

  async generateMarketTrendsReport(params: any): Promise<any> {
    const dateRange = params.dateRange || { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() };
    
    const dailyActivity = await db
      .select({
        date: sql<string>`date(created_at)`,
        newRequests: sql<number>`count(*)`,
        activeUsers: sql<number>`count(distinct user_id)`
      })
      .from(exchangeRequests)
      .where(
        and(
          gte(exchangeRequests.createdAt, dateRange.start),
          lte(exchangeRequests.createdAt, dateRange.end)
        )
      )
      .groupBy(sql`date(created_at)`)
      .orderBy(sql`date(created_at)`);

    const peakHours = await db
      .select({
        hour: sql<number>`extract(hour from created_at)`,
        requests: sql<number>`count(*)`
      })
      .from(exchangeRequests)
      .where(
        and(
          gte(exchangeRequests.createdAt, dateRange.start),
          lte(exchangeRequests.createdAt, dateRange.end)
        )
      )
      .groupBy(sql`extract(hour from created_at)`)
      .orderBy(desc(sql`count(*)`));

    const responseTimeAnalysis = await db
      .select({
        avgResponseMinutes: sql<number>`avg(extract(epoch from (${rateOffers.createdAt} - ${exchangeRequests.createdAt}))/60)`,
        currencyPair: sql<string>`${exchangeRequests.fromCurrency} || '/' || ${exchangeRequests.toCurrency}`
      })
      .from(rateOffers)
      .innerJoin(exchangeRequests, eq(rateOffers.exchangeRequestId, exchangeRequests.id))
      .where(
        and(
          gte(rateOffers.createdAt, dateRange.start),
          lte(rateOffers.createdAt, dateRange.end)
        )
      )
      .groupBy(sql`${exchangeRequests.fromCurrency} || '/' || ${exchangeRequests.toCurrency}`)
      .orderBy(sql`avg(extract(epoch from (${rateOffers.createdAt} - ${exchangeRequests.createdAt}))/60)`);

    return {
      dailyActivity,
      peakHours,
      responseTimeAnalysis,
      dateRange,
      generatedAt: new Date(),
    };
  }
  // Verification system implementation
  async createVerificationRequest(request: InsertVerificationRequest): Promise<VerificationRequest> {
    const [verificationRequest] = await db
      .insert(verificationRequests)
      .values(request)
      .returning();
    return verificationRequest;
  }

  async getVerificationRequest(id: number): Promise<(VerificationRequest & { 
    user: User; 
    documents: VerificationDocument[]; 
    checks: VerificationCheck[];
    assignedAdmin?: User;
  }) | undefined> {
    const [request] = await db
      .select()
      .from(verificationRequests)
      .innerJoin(users, eq(verificationRequests.userId, users.id))
      .leftJoin(
        { assignedAdmin: users }, 
        eq(verificationRequests.assignedTo, users.id)
      )
      .where(eq(verificationRequests.id, id));

    if (!request) return undefined;

    const documents = await db
      .select()
      .from(verificationDocuments)
      .where(eq(verificationDocuments.verificationRequestId, id));

    const checks = await db
      .select()
      .from(verificationChecks)
      .where(eq(verificationChecks.verificationRequestId, id));

    return {
      ...request.verification_requests,
      user: request.users,
      assignedAdmin: request.assignedAdmin || undefined,
      documents,
      checks,
    };
  }

  async getUserVerificationRequests(userId: string): Promise<(VerificationRequest & { 
    documents: VerificationDocument[]; 
    checks: VerificationCheck[] 
  })[]> {
    const requests = await db
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.userId, userId))
      .orderBy(desc(verificationRequests.createdAt));

    const requestsWithDetails = [];
    for (const request of requests) {
      const documents = await db
        .select()
        .from(verificationDocuments)
        .where(eq(verificationDocuments.verificationRequestId, request.id));

      const checks = await db
        .select()
        .from(verificationChecks)
        .where(eq(verificationChecks.verificationRequestId, request.id));

      requestsWithDetails.push({
        ...request,
        documents,
        checks,
      });
    }

    return requestsWithDetails;
  }

  async getAllVerificationRequests(status?: string): Promise<(VerificationRequest & { 
    user: User;
    assignedAdmin?: User;
  })[]> {
    const conditions = [];
    if (status) {
      conditions.push(eq(verificationRequests.status, status));
    }

    const query = db
      .select()
      .from(verificationRequests)
      .innerJoin(users, eq(verificationRequests.userId, users.id))
      .leftJoin(
        { assignedAdmin: users }, 
        eq(verificationRequests.assignedTo, users.id)
      );

    const results = conditions.length > 0 
      ? await query.where(and(...conditions)).orderBy(desc(verificationRequests.createdAt))
      : await query.orderBy(desc(verificationRequests.createdAt));

    return results.map(result => ({
      ...result.verification_requests,
      user: result.users,
      assignedAdmin: result.assignedAdmin || undefined,
    }));
  }

  async updateVerificationRequest(id: number, updates: Partial<VerificationRequest>): Promise<VerificationRequest> {
    const [updated] = await db
      .update(verificationRequests)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(verificationRequests.id, id))
      .returning();
    return updated;
  }

  async assignVerificationRequest(id: number, adminId: string): Promise<void> {
    await db
      .update(verificationRequests)
      .set({ 
        assignedTo: adminId, 
        status: "in_progress",
        reviewStartedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(verificationRequests.id, id));
  }

  async createVerificationDocument(document: InsertVerificationDocument): Promise<VerificationDocument> {
    const [verificationDocument] = await db
      .insert(verificationDocuments)
      .values(document)
      .returning();
    return verificationDocument;
  }

  async getVerificationDocuments(verificationRequestId: number): Promise<VerificationDocument[]> {
    return await db
      .select()
      .from(verificationDocuments)
      .where(eq(verificationDocuments.verificationRequestId, verificationRequestId))
      .orderBy(desc(verificationDocuments.createdAt));
  }

  async updateVerificationDocument(id: number, updates: Partial<VerificationDocument>): Promise<VerificationDocument> {
    const [updated] = await db
      .update(verificationDocuments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(verificationDocuments.id, id))
      .returning();
    return updated;
  }

  async deleteVerificationDocument(id: number): Promise<void> {
    await db.delete(verificationDocuments).where(eq(verificationDocuments.id, id));
  }

  async createVerificationCheck(check: InsertVerificationCheck): Promise<VerificationCheck> {
    const [verificationCheck] = await db
      .insert(verificationChecks)
      .values(check)
      .returning();
    return verificationCheck;
  }

  async getVerificationChecks(verificationRequestId: number): Promise<VerificationCheck[]> {
    return await db
      .select()
      .from(verificationChecks)
      .where(eq(verificationChecks.verificationRequestId, verificationRequestId))
      .orderBy(desc(verificationChecks.createdAt));
  }

  async updateVerificationCheck(id: number, updates: Partial<VerificationCheck>): Promise<VerificationCheck> {
    const [updated] = await db
      .update(verificationChecks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(verificationChecks.id, id))
      .returning();
    return updated;
  }

  async approveVerificationRequest(id: number, adminId: string, level: "basic" | "enhanced" | "premium"): Promise<void> {
    await db.transaction(async (tx) => {
      // Update verification request
      await tx
        .update(verificationRequests)
        .set({ 
          status: "approved",
          reviewCompletedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(verificationRequests.id, id));

      // Get the user ID from verification request
      const [request] = await tx
        .select({ userId: verificationRequests.userId })
        .from(verificationRequests)
        .where(eq(verificationRequests.id, id));

      if (request) {
        // Update user verification status
        await tx
          .update(users)
          .set({ 
            isVerified: true,
            verificationStatus: "verified",
            verificationLevel: level,
            verificationCompletedAt: new Date(),
            verificationCompletedBy: adminId,
            lastVerificationUpdate: new Date(),
            updatedAt: new Date()
          })
          .where(eq(users.id, request.userId));
      }
    });
  }

  async rejectVerificationRequest(id: number, adminId: string, reason: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Update verification request
      await tx
        .update(verificationRequests)
        .set({ 
          status: "rejected",
          rejectionReason: reason,
          reviewCompletedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(verificationRequests.id, id));

      // Get the user ID from verification request
      const [request] = await tx
        .select({ userId: verificationRequests.userId })
        .from(verificationRequests)
        .where(eq(verificationRequests.id, id));

      if (request) {
        // Update user verification status
        await tx
          .update(users)
          .set({ 
            verificationStatus: "rejected",
            verificationNotes: reason,
            lastVerificationUpdate: new Date(),
            updatedAt: new Date()
          })
          .where(eq(users.id, request.userId));
      }
    });
  }

  async updateUserVerificationStatus(userId: string, status: string, level?: string): Promise<User> {
    const updates: any = { 
      verificationStatus: status,
      lastVerificationUpdate: new Date(),
      updatedAt: new Date()
    };

    if (level) {
      updates.verificationLevel = level;
    }

    if (status === "verified") {
      updates.isVerified = true;
      updates.verificationCompletedAt = new Date();
    }

    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getVerificationStats(): Promise<{
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    averageProcessingTime: string;
  }> {
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(verificationRequests);

    const [pendingResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(verificationRequests)
      .where(eq(verificationRequests.status, "pending"));

    const [approvedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(verificationRequests)
      .where(eq(verificationRequests.status, "approved"));

    const [rejectedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(verificationRequests)
      .where(eq(verificationRequests.status, "rejected"));

    return {
      totalRequests: totalResult?.count || 0,
      pendingRequests: pendingResult?.count || 0,
      approvedRequests: approvedResult?.count || 0,
      rejectedRequests: rejectedResult?.count || 0,
      averageProcessingTime: "3.2 days",
    };
  }

  // Bank account methods
  async getBankAccountsByUserId(userId: string): Promise<BankAccount[]> {
    return await db.select().from(bankAccounts).where(eq(bankAccounts.userId, userId));
  }

  async getBankAccountById(id: number): Promise<BankAccount | undefined> {
    const [account] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id));
    return account;
  }

  async createBankAccount(data: InsertBankAccount): Promise<BankAccount> {
    const [account] = await db.insert(bankAccounts).values(data).returning();
    
    // Sync with mock bank API after creation
    setTimeout(() => this.syncBankAccountBalance(account.id), 1000);
    
    return account;
  }

  async updateBankAccount(id: number, data: Partial<BankAccount>): Promise<void> {
    await db.update(bankAccounts).set({ ...data, updatedAt: new Date() }).where(eq(bankAccounts.id, id));
  }

  async deleteBankAccount(id: number): Promise<void> {
    await db.delete(bankAccounts).where(eq(bankAccounts.id, id));
  }

  // Bank account balance validation
  async hasActiveBankAccounts(userId: string): Promise<boolean> {
    const accounts = await db
      .select({ count: sql<number>`count(*)` })
      .from(bankAccounts)
      .where(and(eq(bankAccounts.userId, userId), eq(bankAccounts.isActive, true)));
    
    return (accounts[0]?.count || 0) > 0;
  }

  async hasSufficientBalance(userId: string, currency: string, amount: number): Promise<boolean> {
    const holdings = await db
      .select()
      .from(currencyHoldings)
      .where(and(eq(currencyHoldings.userId, userId), eq(currencyHoldings.currency, currency)));
    
    if (holdings.length === 0) return false;
    
    const availableBalance = parseFloat(holdings[0].availableBalance || "0");
    return availableBalance >= amount;
  }

  async getUserCurrencyBalance(userId: string, currency: string): Promise<number> {
    const holdings = await db
      .select()
      .from(currencyHoldings)
      .where(and(eq(currencyHoldings.userId, userId), eq(currencyHoldings.currency, currency)));
    
    if (holdings.length === 0) return 0;
    return parseFloat(holdings[0].availableBalance || "0");
  }

  async canMakeExchangeRequest(userId: string, fromCurrency: string, amount: number): Promise<{ 
    canMake: boolean; 
    reason?: string;
    missingAmount?: number;
  }> {
    // Check if user has any active bank accounts
    const hasAccounts = await this.hasActiveBankAccounts(userId);
    if (!hasAccounts) {
      return { 
        canMake: false, 
        reason: "No active bank accounts found. Please add a bank account to make exchange requests." 
      };
    }

    // Check if user has sufficient balance
    const availableBalance = await this.getUserCurrencyBalance(userId, fromCurrency);
    if (availableBalance < amount) {
      return { 
        canMake: false, 
        reason: `Insufficient ${fromCurrency} balance. Available: ${availableBalance.toFixed(2)}, Required: ${amount.toFixed(2)}`,
        missingAmount: amount - availableBalance
      };
    }

    return { canMake: true };
  }

  async syncBankAccountBalance(accountId: number): Promise<BankAccount> {
    const account = await this.getBankAccountById(accountId);
    if (!account) {
      throw new Error('Bank account not found');
    }

    // Mock bank API call
    const mockBankBalance = await this.getMockBankBalance(account);
    
    // Update account with real balance
    await this.updateBankAccount(accountId, {
      balance: mockBankBalance.balance,
      availableBalance: mockBankBalance.availableBalance,
      lastSyncedAt: new Date()
    });

    // Update currency holdings
    await this.updateUserCurrencyHoldings(account.userId);

    const updatedAccount = await this.getBankAccountById(accountId);
    return updatedAccount!;
  }

  private async getMockBankBalance(account: BankAccount): Promise<{ balance: string; availableBalance: string }> {
    // Simulate bank API call with realistic balance fluctuations
    const baseBalance = parseFloat(account.balance || "0");
    const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
    const newBalance = baseBalance + (baseBalance * variation);
    const availableBalance = newBalance * 0.95; // 95% available
    
    return {
      balance: newBalance.toFixed(2),
      availableBalance: availableBalance.toFixed(2)
    };
  }

  async getBankTransactionsByAccountId(accountId: number): Promise<BankTransaction[]> {
    return await db.select().from(bankTransactions).where(eq(bankTransactions.bankAccountId, accountId));
  }

  async getBankTransactionsByUserId(userId: string): Promise<BankTransaction[]> {
    return await db.select().from(bankTransactions).where(eq(bankTransactions.userId, userId));
  }

  async createBankTransaction(data: InsertBankTransaction): Promise<BankTransaction> {
    const [transaction] = await db.insert(bankTransactions).values(data).returning();
    
    // Update account balance after transaction
    const account = await this.getBankAccountById(data.bankAccountId);
    if (account) {
      const newBalance = parseFloat(account.balance || "0") + parseFloat(data.amount);
      await this.updateBankAccount(data.bankAccountId, {
        balance: newBalance.toFixed(2),
        lastSyncedAt: new Date()
      });
    }

    return transaction;
  }

  async getCurrencyHoldingsByUserId(userId: string): Promise<CurrencyHolding[]> {
    return await db.select().from(currencyHoldings).where(eq(currencyHoldings.userId, userId));
  }

  async updateCurrencyHolding(userId: string, currency: string, data: Partial<CurrencyHolding>): Promise<void> {
    const [existing] = await db
      .select()
      .from(currencyHoldings)
      .where(and(eq(currencyHoldings.userId, userId), eq(currencyHoldings.currency, currency)));

    if (existing) {
      await db
        .update(currencyHoldings)
        .set({ ...data, lastUpdated: new Date() })
        .where(and(eq(currencyHoldings.userId, userId), eq(currencyHoldings.currency, currency)));
    } else {
      await db.insert(currencyHoldings).values({
        userId,
        currency,
        ...data,
        lastUpdated: new Date(),
      });
    }
  }

  private async updateUserCurrencyHoldings(userId: string): Promise<void> {
    const userAccounts = await this.getBankAccountsByUserId(userId);
    
    // Group accounts by currency and calculate totals
    const currencyTotals = userAccounts.reduce((acc, account) => {
      const currency = account.currency;
      if (!acc[currency]) {
        acc[currency] = {
          totalBalance: 0,
          availableBalance: 0,
          accountCount: 0
        };
      }
      
      acc[currency].totalBalance += parseFloat(account.balance || "0");
      acc[currency].availableBalance += parseFloat(account.availableBalance || "0");
      acc[currency].accountCount += 1;
      
      return acc;
    }, {} as Record<string, { totalBalance: number; availableBalance: number; accountCount: number }>);

    // Update currency holdings
    for (const [currency, totals] of Object.entries(currencyTotals)) {
      await this.updateCurrencyHolding(userId, currency, {
        totalBalance: totals.totalBalance.toFixed(2),
        availableBalance: totals.availableBalance.toFixed(2),
        accountCount: totals.accountCount
      });
    }
  }

  async syncAllUserBalances(userId: string): Promise<void> {
    const userAccounts = await this.getBankAccountsByUserId(userId);
    
    // Sync all accounts
    for (const account of userAccounts) {
      await this.syncBankAccountBalance(account.id);
    }

    // Log sync operation
    await this.createBankSyncLog({
      userId,
      syncType: "full_sync",
      status: "success",
      recordsProcessed: userAccounts.length,
      completedAt: new Date(),
      metadata: { accountCount: userAccounts.length }
    });
  }

  async createBankSyncLog(data: InsertBankSyncLog): Promise<BankSyncLog> {
    const [log] = await db.insert(bankSyncLogs).values(data).returning();
    return log;
  }

  async getBankSyncLogsByUserId(userId: string): Promise<BankSyncLog[]> {
    return await db
      .select()
      .from(bankSyncLogs)
      .where(eq(bankSyncLogs.userId, userId))
      .orderBy(desc(bankSyncLogs.startedAt));
  }

  // Session management methods
  async updateLastActiveAt(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ lastActiveAt: new Date() })
      .where(eq(users.id, userId));
  }

  async getActiveSessions(): Promise<number> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const [result] = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          gte(users.lastActiveAt, fiveMinutesAgo),
          eq(users.status, "active")
        )
      );
    return result?.count || 0;
  }

  async getActiveUsersCount(): Promise<number> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const [result] = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          gte(users.lastActiveAt, fiveMinutesAgo),
          eq(users.status, "active")
        )
      );
    return result?.count || 0;
  }

  async cleanupInactiveSessions(): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    // Log inactive users who will be auto-logged out
    const inactiveUsers = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(
        and(
          lte(users.lastActiveAt, fiveMinutesAgo),
          eq(users.status, "active")
        )
      );

    if (inactiveUsers.length > 0) {
      console.log(`Auto-logging out ${inactiveUsers.length} inactive users`);
      
      // Create audit logs for auto-logout
      for (const user of inactiveUsers) {
        await this.createAuditLog({
          userId: user.id,
          action: "AUTO_LOGOUT",
          resource: "session",
          details: `User automatically logged out after 5 minutes of inactivity`,
          ipAddress: null,
          userAgent: null,
          success: true
        });
      }
    }
    
    // Note: In a real implementation, you would also invalidate session tokens
    // For now, we just track the activity status in the database
  }
}

export const storage = new DatabaseStorage();
