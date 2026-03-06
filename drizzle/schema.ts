import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  date,
} from "drizzle-orm/mysql-core";

// ─── USERS ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const regions = mysqlTable("regions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 10 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── WEEKLY REPORTS ───────────────────────────────────────────────────────────
export const weeklyReports = mysqlTable("weekly_reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  weekStart: date("weekStart").notNull(),
  weekEnd: date("weekEnd").notNull(),
  highlights: text("highlights"),
  challenges: text("challenges"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── KPI METRICS ──────────────────────────────────────────────────────────────
export const kpiMetrics = mysqlTable("kpi_metrics", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId").notNull(),
  userId: int("userId").notNull(),
  metricName: varchar("metricName", { length: 100 }).notNull(),
  target: decimal("target", { precision: 15, scale: 2 }),
  realized: decimal("realized", { precision: 15, scale: 2 }),
  unit: varchar("unit", { length: 20 }).default("number"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── SALES FUNNEL ─────────────────────────────────────────────────────────────
export const salesFunnelEntries = mysqlTable("sales_funnel_entries", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId").notNull(),
  userId: int("userId").notNull(),
  stage: mysqlEnum("stage", [
    "prospecting",
    "qualification",
    "presentation",
    "negotiation",
    "closing",
  ]).notNull(),
  quantity: int("quantity").default(0),
  totalValue: decimal("totalValue", { precision: 15, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── OPPORTUNITIES ────────────────────────────────────────────────────────────
export const opportunities = mysqlTable("opportunities", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clientName: varchar("clientName", { length: 200 }).notNull(),
  value: decimal("value", { precision: 15, scale: 2 }),
  productService: varchar("productService", { length: 200 }),
  stage: mysqlEnum("stage", [
    "prospecting",
    "qualification",
    "presentation",
    "negotiation",
    "closing",
    "won",
    "lost",
  ]).notNull().default("prospecting"),
  probability: int("probability").default(0),
  forecastDate: date("forecastDate"),
  nextAction: text("nextAction"),
  notes: text("notes"),
  regionId: int("regionId"),
  productId: int("productId"),
  status: mysqlEnum("status", ["active", "won", "lost"]).default("active").notNull(),
  lostReason: mysqlEnum("lostReason", [
    "price_too_high",
    "bought_from_competitor",
    "wrong_timing",
    "no_budget",
    "no_response",
    "other",
  ]),
  lostReasonDetail: text("lostReasonDetail"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── ACTIVITIES ───────────────────────────────────────────────────────────────
export const activities = mysqlTable("activities", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId").notNull(),
  userId: int("userId").notNull(),
  activityType: mysqlEnum("activityType", [
    "calls",
    "emails",
    "whatsapp",
    "in_person_visits",
    "meetings_scheduled",
  ]).notNull(),
  target: int("target").default(0),
  realized: int("realized").default(0),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const leadSources = mysqlTable("lead_sources", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId").notNull(),
  userId: int("userId").notNull(),
  source: mysqlEnum("source", [
    "referral",
    "active_prospecting",
    "inbound",
    "networking",
    "other",
  ]).notNull(),
  quantity: int("quantity").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── OBJECTIONS ───────────────────────────────────────────────────────────────
export const objections = mysqlTable("objections", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId").notNull(),
  userId: int("userId").notNull(),
  objectionText: text("objectionText").notNull(),
  frequency: int("frequency").default(1),
  responseUsed: text("responseUsed"),
  worked: boolean("worked"),
  needsHelp: boolean("needsHelp").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const operationalDifficulties = mysqlTable("operational_difficulties", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId").notNull(),
  userId: int("userId").notNull(),
  difficultyType: mysqlEnum("difficultyType", [
    "crm_issues",
    "lack_of_materials",
    "technical_doubts",
    "contact_difficulties",
    "schedule_issues",
    "lack_of_support",
    "other",
  ]).notNull(),
  description: text("description"),
  suggestedSolution: text("suggestedSolution"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── WEEKLY PLANNING ──────────────────────────────────────────────────────────
export const weeklyPlans = mysqlTable("weekly_plans", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId").notNull(),
  userId: int("userId").notNull(),
  metricName: varchar("metricName", { length: 100 }).notNull(),
  target: decimal("target", { precision: 15, scale: 2 }),
  howToAchieve: text("howToAchieve"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const weeklyActions = mysqlTable("weekly_actions", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId").notNull(),
  userId: int("userId").notNull(),
  priority: int("priority").default(1),
  actionDescription: text("actionDescription").notNull(),
  deadline: date("deadline"),
  status: mysqlEnum("status", ["pending", "in_progress", "done", "cancelled"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const weeklySupport = mysqlTable("weekly_support", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId").notNull(),
  userId: int("userId").notNull(),
  supportType: mysqlEnum("supportType", [
    "client_meeting",
    "complex_negotiation",
    "proposal_review",
    "strategy_discussion",
    "training",
    "other",
  ]).notNull(),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const confidenceLevels = mysqlTable("confidence_levels", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId").notNull(),
  userId: int("userId").notNull(),
  level: mysqlEnum("level", [
    "very_confident",
    "confident",
    "moderately_confident",
    "low_confidence",
    "worried",
  ]).notNull(),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── STRATEGIC ACTIONS ────────────────────────────────────────────────────────
export const strategicActions = mysqlTable("strategic_actions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  actionName: varchar("actionName", { length: 300 }).notNull(),
  startDate: date("startDate"),
  description: text("description"),
  completed: boolean("completed").default(false).notNull(),
  resultYtd: text("resultYtd"),
  difficulty: text("difficulty"),
  accelerationTips: text("accelerationTips"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── DEALS (Gestão de Negócios) ─────────────────────────────────────────────
export const deals = mysqlTable("deals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clientName: varchar("clientName", { length: 200 }).notNull(),
  regionId: int("regionId"),
  productId: int("productId"),
  productService: varchar("productService", { length: 200 }),
  expectedValue: decimal("expectedValue", { precision: 15, scale: 2 }),
  finalValue: decimal("finalValue", { precision: 15, scale: 2 }),
  startDate: date("startDate").notNull(),
  endDate: date("endDate"),
  status: mysqlEnum("status", ["prospecting", "in_progress", "won", "lost"]).default("prospecting").notNull(),
  lostReason: text("lostReason"),
  notes: text("notes"),
  nextAction: text("nextAction"),
  contactName: varchar("contactName", { length: 200 }),
  contactPhone: varchar("contactPhone", { length: 30 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
  probability: int("probability").default(50),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── SYSTEM LABELS (Personalização Admin) ────────────────────────────────────
export const systemLabels = mysqlTable("system_labels", {
  id: int("id").autoincrement().primaryKey(),
  labelKey: varchar("labelKey", { length: 100 }).notNull().unique(),
  labelValue: varchar("labelValue", { length: 200 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  description: text("description"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── WEEKLY CHECKINS (Check-in Semanal de Performance) ───────────────────────
export const weeklyCheckins = mysqlTable("weekly_checkins", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  reportId: int("reportId").notNull(),
  performanceScore: int("performanceScore"),
  weekHighlight: text("weekHighlight"),
  biggestChallenge: text("biggestChallenge"),
  nextWeekFocus: text("nextWeekFocus"),
  moodLevel: mysqlEnum("moodLevel", ["excellent", "good", "neutral", "difficult", "very_difficult"]).default("good"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── EXPORT TYPES ─────────────────────────────────────────────────────────────
export type WeeklyReport = typeof weeklyReports.$inferSelect;
export type Opportunity = typeof opportunities.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Objection = typeof objections.$inferSelect;
export type StrategicAction = typeof strategicActions.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Region = typeof regions.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type InsertDeal = typeof deals.$inferInsert;
export type SystemLabel = typeof systemLabels.$inferSelect;
export type WeeklyCheckin = typeof weeklyCheckins.$inferSelect;
