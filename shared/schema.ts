import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  numeric,
  boolean,
  integer,
  decimal,
  date,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["trader", "admin", "moderator", "suspended"] }).notNull().default("trader"),
  status: varchar("status", { enum: ["active", "inactive", "pending", "suspended"] }).notNull().default("active"),
  permissions: text("permissions").array().default([]),
  lastActiveAt: timestamp("last_active_at").defaultNow(),
  
  // Registration fields
  companyName: varchar("company_name"),
  phoneNumber: varchar("phone_number"),
  address: text("address"),
  businessType: varchar("business_type", { enum: ["individual", "company", "financial_institution"] }),
  tradingExperience: varchar("trading_experience", { enum: ["beginner", "intermediate", "advanced"] }),
  specializedCurrencies: text("specialized_currencies").array(),
  isRegistrationComplete: boolean("is_registration_complete").default(false),
  
  balance: numeric("balance", { precision: 15, scale: 2 }).default("10000.00"),
  ugxBalance: numeric("ugx_balance", { precision: 15, scale: 2 }).default("37000000.00"),
  usdBalance: numeric("usd_balance", { precision: 15, scale: 2 }).default("10000.00"),
  kesBalance: numeric("kes_balance", { precision: 15, scale: 2 }).default("1300000.00"),
  eurBalance: numeric("eur_balance", { precision: 15, scale: 2 }).default("9200.00"),
  gbpBalance: numeric("gbp_balance", { precision: 15, scale: 2 }).default("7800.00"),
  
  // Portfolio management
  activeCurrencies: text("active_currencies").array().default(["UGX", "USD", "KES", "EUR", "GBP"]),
  
  // Bidder profile fields
  licenseNumber: varchar("license_number"),
  yearsOfExperience: integer("years_of_experience"),
  minimumTransactionAmount: numeric("minimum_transaction_amount", { precision: 15, scale: 2 }),
  maximumTransactionAmount: numeric("maximum_transaction_amount", { precision: 15, scale: 2 }),
  operatingHours: varchar("operating_hours"),
  responseTimeMinutes: integer("response_time_minutes").default(30),
  commission: numeric("commission", { precision: 5, scale: 2 }),
  isVerified: boolean("is_verified").default(false),
  verificationStatus: varchar("verification_status", { 
    enum: ["unverified", "pending_documents", "under_review", "verified", "rejected", "suspended"] 
  }).default("unverified"),
  verificationLevel: varchar("verification_level", { 
    enum: ["basic", "enhanced", "premium"] 
  }),
  verificationDocuments: text("verification_documents").array(),
  verificationNotes: text("verification_notes"),
  verificationCompletedAt: timestamp("verification_completed_at"),
  verificationCompletedBy: varchar("verification_completed_by"),
  lastVerificationUpdate: timestamp("last_verification_update"),
  
  // Enhanced verification fields
  nationalIdNumber: varchar("national_id_number"),
  passportNumber: varchar("passport_number"),
  taxIdentificationNumber: varchar("tax_identification_number"),
  businessRegistrationNumber: varchar("business_registration_number"),
  bankAccountVerified: boolean("bank_account_verified").default(false),
  complianceScore: integer("compliance_score").default(0),
  riskLevel: varchar("risk_level", { enum: ["low", "medium", "high"] }).default("medium"),
  bio: text("bio"),
  businessAddress: text("business_address"),
  website: varchar("website"),
  
  // RBAC fields
  lastLoginAt: timestamp("last_login_at"),
  loginAttempts: integer("login_attempts").default(0),
  isLocked: boolean("is_locked").default(false),
  lockedUntil: timestamp("locked_until"),
  passwordResetToken: varchar("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// RBAC tables
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: text("description"),
  permissions: text("permissions").array().notNull().default([]),
  isSystemRole: boolean("is_system_role").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  sessionToken: varchar("session_token").notNull().unique(),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").default(true),
  lastActivity: timestamp("last_activity").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  resource: varchar("resource", { length: 100 }),
  resourceId: varchar("resource_id"),
  details: jsonb("details"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  success: boolean("success").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const forexRates = pgTable("forex_rates", {
  id: serial("id").primaryKey(),
  traderId: varchar("trader_id", { length: 255 }).notNull().references(() => users.id),
  fromCurrency: varchar("from_currency", { length: 3 }).notNull(),
  toCurrency: varchar("to_currency", { length: 3 }).notNull(),
  buyRate: decimal("buy_rate", { precision: 15, scale: 6 }).notNull(),
  sellRate: decimal("sell_rate", { precision: 15, scale: 6 }).notNull(),
  date: date("date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueTraderCurrencyDate: unique().on(table.traderId, table.fromCurrency, table.toCurrency, table.date),
}));

export const exchangeRequests = pgTable("exchange_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  fromCurrency: varchar("from_currency", { length: 3 }).notNull(),
  toCurrency: varchar("to_currency", { length: 3 }).notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  desiredRate: numeric("desired_rate", { precision: 10, scale: 6 }),
  priority: varchar("priority", { enum: ["standard", "urgent", "express"] }).default("standard"),
  status: varchar("status", { enum: ["active", "completed", "cancelled"] }).default("active"),
  selectedOfferId: integer("selected_offer_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rateOffers = pgTable("rate_offers", {
  id: serial("id").primaryKey(),
  exchangeRequestId: integer("exchange_request_id").notNull().references(() => exchangeRequests.id),
  bidderId: varchar("bidder_id").notNull().references(() => users.id),
  rate: numeric("rate", { precision: 10, scale: 6 }).notNull(),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
  status: varchar("status", { enum: ["pending", "accepted", "rejected"] }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  messageType: varchar("message_type", { enum: ["request", "offer", "general", "bid_action", "notification", "private", "reply"] }).notNull(),
  content: text("content").notNull(),
  exchangeRequestId: integer("exchange_request_id").references(() => exchangeRequests.id),
  rateOfferId: integer("rate_offer_id").references(() => rateOffers.id),
  actionType: varchar("action_type", { enum: ["accept", "reject"] }),
  targetUserId: varchar("target_user_id").references(() => users.id),
  conversationId: varchar("conversation_id"),
  parentMessageId: integer("parent_message_id"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type", { enum: ["debit", "credit"] }).notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description").notNull(),
  exchangeRequestId: integer("exchange_request_id").references(() => exchangeRequests.id),
  rateOfferId: integer("rate_offer_id").references(() => rateOffers.id),
  termsAccepted: boolean("terms_accepted").notNull().default(false),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Verification tables already defined above, removing duplicates

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  exchangeRequests: many(exchangeRequests),
  rateOffers: many(rateOffers),
  chatMessages: many(chatMessages),
  transactions: many(transactions),
  userSessions: many(userSessions),
  auditLogs: many(auditLogs),
  forexRates: many(forexRates),
  bankAccounts: many(bankAccounts),
  bankTransactions: many(bankTransactions),
  currencyHoldings: many(currencyHoldings),
  bankSyncLogs: many(bankSyncLogs),
}));

export const forexRatesRelations = relations(forexRates, ({ one }) => ({
  trader: one(users, {
    fields: [forexRates.traderId],
    references: [users.id],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  //
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const exchangeRequestsRelations = relations(exchangeRequests, ({ one, many }) => ({
  user: one(users, {
    fields: [exchangeRequests.userId],
    references: [users.id],
  }),
  rateOffers: many(rateOffers),
  chatMessages: many(chatMessages),
  transactions: many(transactions),
}));

export const rateOffersRelations = relations(rateOffers, ({ one, many }) => ({
  exchangeRequest: one(exchangeRequests, {
    fields: [rateOffers.exchangeRequestId],
    references: [exchangeRequests.id],
  }),
  bidder: one(users, {
    fields: [rateOffers.bidderId],
    references: [users.id],
  }),
  chatMessages: many(chatMessages),
}));

export const chatMessagesRelations: any = relations(chatMessages, ({ one }) => ({
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
  exchangeRequest: one(exchangeRequests, {
    fields: [chatMessages.exchangeRequestId],
    references: [exchangeRequests.id],
  }),
  rateOffer: one(rateOffers, {
    fields: [chatMessages.rateOfferId],
    references: [rateOffers.id],
  }),
}));



export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  exchangeRequest: one(exchangeRequests, {
    fields: [transactions.exchangeRequestId],
    references: [exchangeRequests.id],
  }),
  rateOffer: one(rateOffers, {
    fields: [transactions.rateOfferId],
    references: [rateOffers.id],
  }),
}));

// Verification relations will be added after table definitions

// Layout Settings table
export const layoutSettings = pgTable("layout_settings", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  displayName: varchar("display_name").notNull(),
  description: text("description"),
  chatColumnSpan: numeric("chat_column_span", { precision: 3, scale: 1 }).notNull().default("2.0"), // out of 4 columns (supports decimal values)
  sidebarColumnSpan: numeric("sidebar_column_span", { precision: 3, scale: 1 }).notNull().default("2.0"), // out of 4 columns (supports decimal values)
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reports Module Tables
export const reportTemplates = pgTable("report_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  displayName: varchar("display_name").notNull(),
  description: text("description"),
  category: varchar("category", { enum: ["admin", "user", "business_intelligence", "financial", "operational"] }).notNull(),
  type: varchar("type", { enum: ["system_overview", "user_activity", "transaction_volume", "currency_analysis", "profit_loss", "market_trends", "performance_metrics", "audit_summary"] }).notNull(),
  permissions: text("permissions").array().notNull().default([]),
  parameters: jsonb("parameters").notNull().default({}), // Report configuration parameters
  chartConfig: jsonb("chart_config").default({}), // Chart and visualization settings
  columns: jsonb("columns").notNull().default([]), // Table columns configuration
  filters: jsonb("filters").default({}), // Available filter options
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reportInstances = pgTable("report_instances", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => reportTemplates.id),
  name: varchar("name").notNull(),
  description: text("description"),
  generatedBy: varchar("generated_by").notNull().references(() => users.id),
  parameters: jsonb("parameters").notNull().default({}), // Applied parameters for this instance
  filters: jsonb("filters").default({}), // Applied filters
  data: jsonb("data").notNull(), // Cached report data
  summary: jsonb("summary").default({}), // Report summary statistics
  status: varchar("status", { enum: ["generating", "completed", "failed", "expired"] }).notNull().default("generating"),
  generatedAt: timestamp("generated_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Cache expiration
  fileSize: integer("file_size"), // Size in bytes
  error: text("error"), // Error message if failed
  createdAt: timestamp("created_at").defaultNow(),
});

export const reportSchedules = pgTable("report_schedules", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => reportTemplates.id),
  name: varchar("name").notNull(),
  description: text("description"),
  schedule: varchar("schedule").notNull(), // Cron expression
  parameters: jsonb("parameters").notNull().default({}),
  filters: jsonb("filters").default({}),
  recipients: text("recipients").array().notNull().default([]), // Email addresses
  format: varchar("format", { enum: ["pdf", "excel", "csv", "json"] }).notNull().default("pdf"),
  isActive: boolean("is_active").default(true),
  lastRun: timestamp("last_run"),
  nextRun: timestamp("next_run"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Verification system tables
export const verificationRequests = pgTable("verification_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  requestType: varchar("request_type", { 
    enum: ["initial", "document_update", "level_upgrade", "re_verification"] 
  }).notNull(),
  status: varchar("status", { 
    enum: ["pending", "in_progress", "approved", "rejected", "requires_additional_info"] 
  }).default("pending"),
  submittedDocuments: jsonb("submitted_documents").notNull().default([]),
  adminNotes: text("admin_notes"),
  rejectionReason: text("rejection_reason"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  reviewStartedAt: timestamp("review_started_at"),
  reviewCompletedAt: timestamp("review_completed_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const verificationDocuments = pgTable("verification_documents", {
  id: serial("id").primaryKey(),
  verificationRequestId: integer("verification_request_id").notNull().references(() => verificationRequests.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  documentType: varchar("document_type", { 
    enum: [
      "national_id", "passport", "drivers_license", "business_registration", 
      "tax_certificate", "bank_statement", "utility_bill", "professional_license",
      "financial_statement", "compliance_certificate", "other"
    ] 
  }).notNull(),
  documentSubtype: varchar("document_subtype"),
  fileName: varchar("file_name").notNull(),
  originalFileName: varchar("original_file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type").notNull(),
  documentHash: varchar("document_hash").notNull(),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  verificationStatus: varchar("verification_status", { 
    enum: ["pending", "verified", "rejected", "expired"] 
  }).default("pending"),
  verifiedBy: varchar("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  expiryDate: date("expiry_date"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const verificationChecks = pgTable("verification_checks", {
  id: serial("id").primaryKey(),
  verificationRequestId: integer("verification_request_id").notNull().references(() => verificationRequests.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  checkType: varchar("check_type", { 
    enum: [
      "identity_verification", "document_authenticity", "address_verification",
      "business_verification", "financial_background", "criminal_background",
      "sanctions_screening", "pep_screening", "credit_check", "references"
    ] 
  }).notNull(),
  checkProvider: varchar("check_provider"),
  checkReference: varchar("check_reference"),
  status: varchar("status", { 
    enum: ["pending", "in_progress", "passed", "failed", "inconclusive", "manual_review"] 
  }).default("pending"),
  score: integer("score"),
  maxScore: integer("max_score"),
  details: jsonb("details").default({}),
  performedBy: varchar("performed_by").references(() => users.id),
  performedAt: timestamp("performed_at"),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bank Accounts table
export const bankAccounts = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  accountName: varchar("account_name").notNull(),
  accountNumber: varchar("account_number").notNull(),
  bankName: varchar("bank_name").notNull(),
  bankCode: varchar("bank_code"),
  swiftCode: varchar("swift_code"),
  routingNumber: varchar("routing_number"),
  iban: varchar("iban"),
  accountType: varchar("account_type", { 
    enum: ["checking", "savings", "business", "investment", "forex"] 
  }).notNull().default("checking"),
  currency: varchar("currency", { length: 3 }).notNull(),
  balance: numeric("balance", { precision: 15, scale: 2 }).default("0.00"),
  availableBalance: numeric("available_balance", { precision: 15, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true),
  isPrimary: boolean("is_primary").default(false),
  lastSyncedAt: timestamp("last_synced_at"),
  bankApiId: varchar("bank_api_id"), // External bank API identifier
  bankApiToken: varchar("bank_api_token"), // Encrypted token for bank API
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bank Account Transactions table (synced from bank)
export const bankTransactions = pgTable("bank_transactions", {
  id: serial("id").primaryKey(),
  bankAccountId: integer("bank_account_id").notNull().references(() => bankAccounts.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  externalTransactionId: varchar("external_transaction_id").notNull(), // Bank's transaction ID
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  transactionType: varchar("transaction_type", { 
    enum: ["debit", "credit", "transfer", "fee", "interest", "dividend", "forex"] 
  }).notNull(),
  description: text("description"),
  reference: varchar("reference"),
  counterpartyName: varchar("counterparty_name"),
  counterpartyAccount: varchar("counterparty_account"),
  category: varchar("category"), // e.g., "forex_trading", "business", "personal"
  balanceAfter: numeric("balance_after", { precision: 15, scale: 2 }),
  transactionDate: timestamp("transaction_date").notNull(),
  processedAt: timestamp("processed_at"),
  isForexRelated: boolean("is_forex_related").default(false),
  exchangeRequestId: integer("exchange_request_id").references(() => exchangeRequests.id),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// Currency Holdings table (aggregated view)
export const currencyHoldings = pgTable("currency_holdings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  currency: varchar("currency", { length: 3 }).notNull(),
  totalBalance: numeric("total_balance", { precision: 15, scale: 2 }).default("0.00"),
  availableBalance: numeric("available_balance", { precision: 15, scale: 2 }).default("0.00"),
  reservedBalance: numeric("reserved_balance", { precision: 15, scale: 2 }).default("0.00"), // For pending trades
  accountCount: integer("account_count").default(0), // Number of bank accounts for this currency
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bank API Sync Log table
export const bankSyncLogs = pgTable("bank_sync_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  bankAccountId: integer("bank_account_id").references(() => bankAccounts.id),
  syncType: varchar("sync_type", { 
    enum: ["balance", "transactions", "account_info", "full_sync"] 
  }).notNull(),
  status: varchar("status", { 
    enum: ["pending", "in_progress", "success", "failed", "partial"] 
  }).notNull().default("pending"),
  recordsProcessed: integer("records_processed").default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  metadata: jsonb("metadata").default({}),
});

// Bank Account Relations
export const bankAccountsRelations = relations(bankAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [bankAccounts.userId],
    references: [users.id],
  }),
  transactions: many(bankTransactions),
  syncLogs: many(bankSyncLogs),
}));

export const bankTransactionsRelations = relations(bankTransactions, ({ one }) => ({
  user: one(users, {
    fields: [bankTransactions.userId],
    references: [users.id],
  }),
  bankAccount: one(bankAccounts, {
    fields: [bankTransactions.bankAccountId],
    references: [bankAccounts.id],
  }),
  exchangeRequest: one(exchangeRequests, {
    fields: [bankTransactions.exchangeRequestId],
    references: [exchangeRequests.id],
  }),
}));

export const currencyHoldingsRelations = relations(currencyHoldings, ({ one }) => ({
  user: one(users, {
    fields: [currencyHoldings.userId],
    references: [users.id],
  }),
}));

export const bankSyncLogsRelations = relations(bankSyncLogs, ({ one }) => ({
  user: one(users, {
    fields: [bankSyncLogs.userId],
    references: [users.id],
  }),
  bankAccount: one(bankAccounts, {
    fields: [bankSyncLogs.bankAccountId],
    references: [bankAccounts.id],
  }),
}));

export const reportExports = pgTable("report_exports", {
  id: serial("id").primaryKey(),
  reportInstanceId: integer("report_instance_id").references(() => reportInstances.id),
  templateId: integer("template_id").references(() => reportTemplates.id),
  exportedBy: varchar("exported_by").notNull().references(() => users.id),
  format: varchar("format", { enum: ["pdf", "excel", "csv", "json"] }).notNull(),
  fileName: varchar("file_name").notNull(),
  filePath: varchar("file_path"),
  fileSize: integer("file_size"),
  downloadCount: integer("download_count").default(0),
  lastDownloaded: timestamp("last_downloaded"),
  expiresAt: timestamp("expires_at"),
  status: varchar("status", { enum: ["generating", "ready", "failed", "expired"] }).notNull().default("generating"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
  createdAt: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertForexRateSchema = createInsertSchema(forexRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExchangeRequestSchema = createInsertSchema(exchangeRequests).omit({
  id: true,
  selectedOfferId: true,
  createdAt: true,
});

export const insertRateOfferSchema = createInsertSchema(rateOffers).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertLayoutSettingSchema = createInsertSchema(layoutSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReportTemplateSchema = createInsertSchema(reportTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReportInstanceSchema = createInsertSchema(reportInstances).omit({
  id: true,
  createdAt: true,
});

export const insertReportScheduleSchema = createInsertSchema(reportSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReportExportSchema = createInsertSchema(reportExports).omit({
  id: true,
  createdAt: true,
});

// Verification schemas
export const insertVerificationRequestSchema = createInsertSchema(verificationRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVerificationDocumentSchema = createInsertSchema(verificationDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVerificationCheckSchema = createInsertSchema(verificationChecks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBankAccountSchema = createInsertSchema(bankAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBankTransactionSchema = createInsertSchema(bankTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertCurrencyHoldingSchema = createInsertSchema(currencyHoldings).omit({
  id: true,
  createdAt: true,
});

export const insertBankSyncLogSchema = createInsertSchema(bankSyncLogs).omit({
  id: true,
  startedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;
export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = typeof permissions.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = typeof userSessions.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type ForexRate = typeof forexRates.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type InsertForexRate = typeof forexRates.$inferInsert;
export type ExchangeRequest = typeof exchangeRequests.$inferSelect;
export type InsertExchangeRequest = typeof exchangeRequests.$inferInsert;
export type RateOffer = typeof rateOffers.$inferSelect;
export type InsertRateOffer = typeof rateOffers.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
export type LayoutSetting = typeof layoutSettings.$inferSelect;
export type InsertLayoutSetting = typeof layoutSettings.$inferInsert;
export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type InsertReportTemplate = typeof reportTemplates.$inferInsert;
export type ReportInstance = typeof reportInstances.$inferSelect;
export type InsertReportInstance = typeof reportInstances.$inferInsert;
export type ReportSchedule = typeof reportSchedules.$inferSelect;
export type InsertReportSchedule = typeof reportSchedules.$inferInsert;
export type ReportExport = typeof reportExports.$inferSelect;
export type InsertReportExport = typeof reportExports.$inferInsert;
export type VerificationRequest = typeof verificationRequests.$inferSelect;
export type InsertVerificationRequest = typeof verificationRequests.$inferInsert;
export type VerificationDocument = typeof verificationDocuments.$inferSelect;
export type InsertVerificationDocument = typeof verificationDocuments.$inferInsert;
export type VerificationCheck = typeof verificationChecks.$inferSelect;
export type InsertVerificationCheck = typeof verificationChecks.$inferInsert;
export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = typeof bankAccounts.$inferInsert;
export type BankTransaction = typeof bankTransactions.$inferSelect;
export type InsertBankTransaction = typeof bankTransactions.$inferInsert;
export type CurrencyHolding = typeof currencyHoldings.$inferSelect;
export type InsertCurrencyHolding = typeof currencyHoldings.$inferInsert;
export type BankSyncLog = typeof bankSyncLogs.$inferSelect;
export type InsertBankSyncLog = typeof bankSyncLogs.$inferInsert;
