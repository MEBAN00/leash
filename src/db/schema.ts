import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { Cart, PolicyCheck, PolicyRules } from "../lib/policy/types";

// All money is stored as integer cents.

export const decisionEnum = pgEnum("decision", ["ALLOW", "ASK", "DENY"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A PayPal wallet the user has saved (vaulted) for Leash to charge. */
export const wallets = pgTable("wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  paypalPaymentTokenId: text("paypal_payment_token_id").notNull(),
  paypalCustomerId: text("paypal_customer_id"),
  payerEmail: text("payer_email"),
  status: text("status", { enum: ["active", "revoked"] }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** The user's spending rules, compiled from plain English. */
export const mandates = pgTable("mandates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  walletId: uuid("wallet_id").notNull().references(() => wallets.id),
  prompt: text("prompt").notNull(),
  rules: jsonb("rules").$type<PolicyRules>().notNull(),
  status: text("status", { enum: ["draft", "active", "revoked"] }).notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
});

/** One task given to the agent ("plan a birthday party for 12 kids"). */
export const agentRuns = pgTable("agent_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  mandateId: uuid("mandate_id").notNull().references(() => mandates.id),
  task: text("task").notNull(),
  status: text("status", { enum: ["running", "waiting_approval", "done", "failed"] })
    .notNull()
    .default("running"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

/** A cart the agent proposed, the policy decision, and what happened to it. */
export const purchaseRequests = pgTable("purchase_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").notNull().references(() => agentRuns.id),
  mandateId: uuid("mandate_id").notNull().references(() => mandates.id),
  cart: jsonb("cart").$type<Cart>().notNull(),
  totalCents: integer("total_cents").notNull(),
  decision: decisionEnum("decision").notNull(),
  checks: jsonb("checks").$type<PolicyCheck[]>().notNull(),
  status: text("status", {
    enum: ["denied", "pending_approval", "approved", "rejected", "paid", "failed", "refunded"],
  }).notNull(),
  paypalOrderId: text("paypal_order_id"),
  paypalCaptureId: text("paypal_capture_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
});

/** Append-only log of everything the agent and policy engine did. */
export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").references(() => agentRuns.id),
  mandateId: uuid("mandate_id").references(() => mandates.id),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
