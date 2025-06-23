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
  role: varchar("role", { enum: ["trader", "admin", "suspended"] }).notNull().default("trader"),
  balance: numeric("balance", { precision: 15, scale: 2 }).default("10000.00"),
  ugxBalance: numeric("ugx_balance", { precision: 15, scale: 2 }).default("37000000.00"),
  usdBalance: numeric("usd_balance", { precision: 15, scale: 2 }).default("10000.00"),
  kesBalance: numeric("kes_balance", { precision: 15, scale: 2 }).default("1300000.00"),
  eurBalance: numeric("eur_balance", { precision: 15, scale: 2 }).default("9200.00"),
  gbpBalance: numeric("gbp_balance", { precision: 15, scale: 2 }).default("7800.00"),
  
  // Portfolio management
  activeCurrencies: text("active_currencies").array().default(["UGX", "USD", "KES", "EUR", "GBP"]),
  
  // Bidder profile fields
  companyName: varchar("company_name"),
  licenseNumber: varchar("license_number"),
  yearsOfExperience: integer("years_of_experience"),
  specializedCurrencies: text("specialized_currencies").array(),
  minimumTransactionAmount: numeric("minimum_transaction_amount", { precision: 15, scale: 2 }),
  maximumTransactionAmount: numeric("maximum_transaction_amount", { precision: 15, scale: 2 }),
  operatingHours: varchar("operating_hours"),
  responseTimeMinutes: integer("response_time_minutes").default(30),
  commission: numeric("commission", { precision: 5, scale: 2 }),
  isVerified: boolean("is_verified").default(false),
  verificationDocuments: text("verification_documents").array(),
  bio: text("bio"),
  phoneNumber: varchar("phone_number"),
  businessAddress: text("business_address"),
  website: varchar("website"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  messageType: varchar("message_type", { enum: ["request", "offer", "general", "bid_action", "notification"] }).notNull(),
  content: text("content").notNull(),
  exchangeRequestId: integer("exchange_request_id").references(() => exchangeRequests.id),
  rateOfferId: integer("rate_offer_id").references(() => rateOffers.id),
  actionType: varchar("action_type", { enum: ["accept", "reject"] }),
  targetUserId: varchar("target_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type", { enum: ["debit", "credit"] }).notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description").notNull(),
  exchangeRequestId: integer("exchange_request_id").references(() => exchangeRequests.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  exchangeRequests: many(exchangeRequests),
  rateOffers: many(rateOffers),
  chatMessages: many(chatMessages),
  transactions: many(transactions),
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

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
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
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
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

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type ExchangeRequest = typeof exchangeRequests.$inferSelect;
export type InsertExchangeRequest = z.infer<typeof insertExchangeRequestSchema>;
export type RateOffer = typeof rateOffers.$inferSelect;
export type InsertRateOffer = z.infer<typeof insertRateOfferSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
