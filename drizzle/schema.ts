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

// ─── ORGANIZATIONS (Multi-tenant foundation) ──────────────────────────────────
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  segment: mysqlEnum("segment", [
    "aesthetics_clinic",
    "agribusiness",
    "generic",
    "real_estate",
    "tech",
    "retail",
    "healthcare",
    "education",
  ]).default("generic").notNull(),
  logoUrl: text("logoUrl"),
  active: boolean("active").default(true).notNull(),
  maxUsers: int("maxUsers").default(10).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

// ─── USERS ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "super_admin"]).default("user").notNull(),
  organizationId: int("organizationId"),   // null = not yet onboarded
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── ORGANIZATION INVITES ─────────────────────────────────────────────────────
export const organizationInvites = mysqlTable("organization_invites", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  accepted: boolean("accepted").default(false).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrganizationInvite = typeof organizationInvites.$inferSelect;

// ─── ORG USERS (slots fixos por organização — auth local) ───────────────────
export const orgUsers = mysqlTable("org_users", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  slot: int("slot").notNull(),                          // 1..N (User1, User2...)
  username: varchar("username", { length: 50 }).notNull().unique(), // ex: bfagro_user1
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  displayName: varchar("displayName", { length: 100 }), // nome real da pessoa
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
});

export type OrgUser = typeof orgUsers.$inferSelect;
export type InsertOrgUser = typeof orgUsers.$inferInsert;

// ─── ORG SESSIONS (sessões locais para org_users) ─────────────────────────────
export const orgSessions = mysqlTable("org_sessions", {
  id: int("id").autoincrement().primaryKey(),
  orgUserId: int("orgUserId").notNull(),
  organizationId: int("organizationId").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrgSession = typeof orgSessions.$inferSelect;

// ─── CONFIGURATION (per organization) ────────────────────────────────────────
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 15, scale: 2 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const regions = mysqlTable("regions", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 10 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── SYSTEM LABELS (per organization — personalização) ───────────────────────
export const systemLabels = mysqlTable("system_labels", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  labelKey: varchar("labelKey", { length: 100 }).notNull(),
  labelValue: varchar("labelValue", { length: 200 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  description: text("description"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemLabel = typeof systemLabels.$inferSelect;

// ─── WEEKLY REPORTS ───────────────────────────────────────────────────────────
export const weeklyReports = mysqlTable("weekly_reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  organizationId: int("organizationId").notNull(),
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
  organizationId: int("organizationId").notNull(),
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
  organizationId: int("organizationId").notNull(),
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
  organizationId: int("organizationId").notNull(),
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
  organizationId: int("organizationId").notNull(),
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
  organizationId: int("organizationId").notNull(),
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
  organizationId: int("organizationId").notNull(),
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
  organizationId: int("organizationId").notNull(),
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
  organizationId: int("organizationId").notNull(),
  metricName: varchar("metricName", { length: 100 }).notNull(),
  target: decimal("target", { precision: 15, scale: 2 }),
  howToAchieve: text("howToAchieve"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const weeklyActions = mysqlTable("weekly_actions", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId").notNull(),
  userId: int("userId").notNull(),
  organizationId: int("organizationId").notNull(),
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
  organizationId: int("organizationId").notNull(),
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
  organizationId: int("organizationId").notNull(),
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
  organizationId: int("organizationId").notNull(),
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

// ─── DEALS (Gestão de Negócios) ───────────────────────────────────────────────
export const deals = mysqlTable("deals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  organizationId: int("organizationId").notNull(),
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

// ─── WEEKLY CHECKINS ─────────────────────────────────────────────────────────
export const weeklyCheckins = mysqlTable("weekly_checkins", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  organizationId: int("organizationId").notNull(),
  reportId: int("reportId").notNull(),
  performanceScore: int("performanceScore"),
  weekHighlight: text("weekHighlight"),
  biggestChallenge: text("biggestChallenge"),
  nextWeekFocus: text("nextWeekFocus"),
  moodLevel: mysqlEnum("moodLevel", ["excellent", "good", "neutral", "difficult", "very_difficult"]).default("good"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── SMART GRID (Planejamento Dinâmico) ────────────────────────────────────────
// Template de colunas configurado pelo admin por organização
export const gridTemplates = mysqlTable("grid_templates", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  name: varchar("name", { length: 200 }).notNull().default("Planejamento"),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Colunas do template (configuradas pelo admin)
export const gridColumns = mysqlTable("grid_columns", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull(),
  organizationId: int("organizationId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  // Tipos: text, number, select, date, checkbox, formula
  columnType: mysqlEnum("columnType", ["text", "number", "select", "date", "checkbox", "formula"]).default("text").notNull(),
  // Para tipo select: JSON array de opções ["SP", "MG", "GO"]
  selectOptions: text("selectOptions"),
  // Para tipo formula: tipo de cálculo
  formulaType: mysqlEnum("formulaType", [
    "sum", "average", "percentage", "weighted_average",
    "weighted_sum", "count", "max", "min", "custom"
  ]),
  // Para formula: qual coluna(s) usar (JSON: [colId1, colId2])
  formulaSourceColumns: text("formulaSourceColumns"),
  // Para weighted: coluna de peso
  formulaWeightColumn: int("formulaWeightColumn"),
  // Para percentage: base (coluna ou valor fixo)
  formulaBase: varchar("formulaBase", { length: 100 }),
  // Largura em px para o grid visual
  width: int("width").default(150),
  // Ordem de exibição
  sortOrder: int("sortOrder").default(0).notNull(),
  // Se a coluna é preenchível pelo usuário ou calculada
  isEditable: boolean("isEditable").default(true).notNull(),
  // Se deve aparecer no Dashboard como widget
  showInDashboard: boolean("showInDashboard").default(false).notNull(),
  // Cor de destaque (hex)
  accentColor: varchar("accentColor", { length: 20 }),
  // Unidade (ex: ha, R$, %)
  unit: varchar("unit", { length: 20 }),
  required: boolean("required").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Linhas de dados (cada linha = um registro do usuário)
export const gridRows = mysqlTable("grid_rows", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(),   // orgUserId
  rowOrder: int("rowOrder").default(0).notNull(),
  // Todos os valores da linha em JSON: { colId: value, ... }
  data: text("data").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GridTemplate = typeof gridTemplates.$inferSelect;
export type GridColumn = typeof gridColumns.$inferSelect;
export type InsertGridColumn = typeof gridColumns.$inferInsert;
export type GridRow = typeof gridRows.$inferSelect;
export type InsertGridRow = typeof gridRows.$inferInsert;

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
export type WeeklyCheckin = typeof weeklyCheckins.$inferSelect;
