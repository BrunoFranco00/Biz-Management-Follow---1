import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  activities,
  confidenceLevels,
  kpiMetrics,
  leadSources,
  objections,
  operationalDifficulties,
  opportunities,
  products,
  regions,
  salesFunnelEntries,
  strategicActions,
  users,
  weeklyActions,
  weeklyPlans,
  weeklyReports,
  weeklySupport,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── USERS ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(users.name);
}

// ─── WEEKLY REPORTS ───────────────────────────────────────────────────────────
export async function getOrCreateWeeklyReport(userId: number, weekStart: string, weekEnd: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const existing = await db
    .select()
    .from(weeklyReports)
    .where(and(eq(weeklyReports.userId, userId), sql`${weeklyReports.weekStart} = ${weekStart}`))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const [inserted] = await db.insert(weeklyReports).values({ userId, weekStart: new Date(weekStart), weekEnd: new Date(weekEnd) } as any);
  const newReport = await db
    .select()
    .from(weeklyReports)
    .where(eq(weeklyReports.id, (inserted as any).insertId))
    .limit(1);
  return newReport[0];
}

export async function updateWeeklyReport(
  reportId: number,
  data: { highlights?: string; challenges?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(weeklyReports).set(data).where(eq(weeklyReports.id, reportId));
}

export async function getWeeklyReportsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(weeklyReports)
    .where(eq(weeklyReports.userId, userId))
    .orderBy(desc(weeklyReports.weekStart));
}

export async function getWeeklyReportById(reportId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(weeklyReports)
    .where(eq(weeklyReports.id, reportId))
    .limit(1);
  return result[0] ?? null;
}

// ─── KPI METRICS ──────────────────────────────────────────────────────────────
export async function upsertKpiMetrics(
  reportId: number,
  userId: number,
  metrics: Array<{ metricName: string; target?: number; realized?: number; unit?: string; notes?: string }>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  await db.delete(kpiMetrics).where(eq(kpiMetrics.reportId, reportId));
  if (metrics.length === 0) return;

  await db.insert(kpiMetrics).values(
    metrics.map((m) => ({
      reportId,
      userId,
      metricName: m.metricName,
      target: m.target?.toString(),
      realized: m.realized?.toString(),
      unit: m.unit ?? "number",
      notes: m.notes,
    }))
  );
}

export async function getKpiMetricsByReport(reportId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(kpiMetrics).where(eq(kpiMetrics.reportId, reportId));
}

// ─── SALES FUNNEL ─────────────────────────────────────────────────────────────
export async function upsertSalesFunnel(
  reportId: number,
  userId: number,
  entries: Array<{ stage: string; quantity: number; totalValue: number }>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  await db.delete(salesFunnelEntries).where(eq(salesFunnelEntries.reportId, reportId));
  if (entries.length === 0) return;

  await db.insert(salesFunnelEntries).values(
    entries.map((e) => ({
      reportId,
      userId,
      stage: e.stage as any,
      quantity: e.quantity,
      totalValue: e.totalValue.toString(),
    }))
  );
}

export async function getSalesFunnelByReport(reportId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(salesFunnelEntries).where(eq(salesFunnelEntries.reportId, reportId));
}

// ─── OPPORTUNITIES ────────────────────────────────────────────────────────────
export async function getOpportunitiesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(opportunities)
    .where(eq(opportunities.userId, userId))
    .orderBy(desc(opportunities.updatedAt));
}

export async function getAllOpportunities() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      opportunity: opportunities,
      user: { id: users.id, name: users.name, email: users.email },
    })
    .from(opportunities)
    .leftJoin(users, eq(opportunities.userId, users.id))
    .orderBy(desc(opportunities.updatedAt));
}

export async function createOpportunity(data: {
  userId: number;
  clientName: string;
  value?: number;
  productService?: string;
  stage?: string;
  probability?: number;
  forecastDate?: string;
  nextAction?: string;
  notes?: string;
  regionId?: number;
  productId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const [result] = await db.insert(opportunities).values({
    userId: data.userId,
    clientName: data.clientName,
    value: data.value?.toString(),
    productService: data.productService,
    stage: (data.stage as any) ?? "prospecting",
    probability: data.probability ?? 0,
    forecastDate: data.forecastDate ? new Date(data.forecastDate) : null,
    nextAction: data.nextAction,
    notes: data.notes,
    regionId: data.regionId,
    productId: data.productId,
  } as any);
  return (result as any).insertId as number;
}

export async function updateOpportunity(
  id: number,
  data: Partial<{
    clientName: string;
    value: number;
    productService: string;
    stage: string;
    probability: number;
    forecastDate: string;
    nextAction: string;
    notes: string;
    status: string;
    lostReason: string;
    lostReasonDetail: string;
    regionId: number;
    productId: number;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData: Record<string, unknown> = { ...data };
  if (data.value !== undefined) updateData.value = data.value.toString();
  await db.update(opportunities).set(updateData as any).where(eq(opportunities.id, id));
}

export async function deleteOpportunity(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(opportunities).where(eq(opportunities.id, id));
}

// ─── ACTIVITIES ───────────────────────────────────────────────────────────────
export async function upsertActivities(
  reportId: number,
  userId: number,
  acts: Array<{ activityType: string; target: number; realized: number; notes?: string }>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  await db.delete(activities).where(eq(activities.reportId, reportId));
  if (acts.length === 0) return;

  await db.insert(activities).values(
    acts.map((a) => ({
      reportId,
      userId,
      activityType: a.activityType as any,
      target: a.target,
      realized: a.realized,
      notes: a.notes,
    }))
  );
}

export async function getActivitiesByReport(reportId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activities).where(eq(activities.reportId, reportId));
}

export async function upsertLeadSources(
  reportId: number,
  userId: number,
  sources: Array<{ source: string; quantity: number }>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  await db.delete(leadSources).where(eq(leadSources.reportId, reportId));
  if (sources.length === 0) return;

  await db.insert(leadSources).values(
    sources.map((s) => ({
      reportId,
      userId,
      source: s.source as any,
      quantity: s.quantity,
    }))
  );
}

export async function getLeadSourcesByReport(reportId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leadSources).where(eq(leadSources.reportId, reportId));
}

// ─── OBJECTIONS ───────────────────────────────────────────────────────────────
export async function upsertObjections(
  reportId: number,
  userId: number,
  objs: Array<{
    objectionText: string;
    frequency: number;
    responseUsed?: string;
    worked?: boolean;
    needsHelp?: boolean;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  await db.delete(objections).where(eq(objections.reportId, reportId));
  if (objs.length === 0) return;

  await db.insert(objections).values(
    objs.map((o) => ({
      reportId,
      userId,
      objectionText: o.objectionText,
      frequency: o.frequency,
      responseUsed: o.responseUsed,
      worked: o.worked,
      needsHelp: o.needsHelp ?? false,
    }))
  );
}

export async function getObjectionsByReport(reportId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(objections).where(eq(objections.reportId, reportId));
}

export async function upsertOperationalDifficulties(
  reportId: number,
  userId: number,
  diffs: Array<{ difficultyType: string; description?: string; suggestedSolution?: string }>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  await db.delete(operationalDifficulties).where(eq(operationalDifficulties.reportId, reportId));
  if (diffs.length === 0) return;

  await db.insert(operationalDifficulties).values(
    diffs.map((d) => ({
      reportId,
      userId,
      difficultyType: d.difficultyType as any,
      description: d.description,
      suggestedSolution: d.suggestedSolution,
    }))
  );
}

// ─── WEEKLY PLANNING ──────────────────────────────────────────────────────────
export async function upsertWeeklyPlans(
  reportId: number,
  userId: number,
  plans: Array<{ metricName: string; target?: number; howToAchieve?: string }>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  await db.delete(weeklyPlans).where(eq(weeklyPlans.reportId, reportId));
  if (plans.length === 0) return;

  await db.insert(weeklyPlans).values(
    plans.map((p) => ({
      reportId,
      userId,
      metricName: p.metricName,
      target: p.target?.toString(),
      howToAchieve: p.howToAchieve,
    }))
  );
}

export async function getWeeklyPlansByReport(reportId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(weeklyPlans).where(eq(weeklyPlans.reportId, reportId));
}

export async function upsertWeeklyActions(
  reportId: number,
  userId: number,
  actions: Array<{
    priority: number;
    actionDescription: string;
    deadline?: string;
    status?: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  await db.delete(weeklyActions).where(eq(weeklyActions.reportId, reportId));
  if (actions.length === 0) return;

  await db.insert(weeklyActions).values(
    actions.map((a) => ({
      reportId,
      userId,
      priority: a.priority,
      actionDescription: a.actionDescription,
      deadline: a.deadline ? new Date(a.deadline) : null,
      status: (a.status as any) ?? "pending",
    }))
  );
}

export async function getWeeklyActionsByReport(reportId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(weeklyActions)
    .where(eq(weeklyActions.reportId, reportId))
    .orderBy(weeklyActions.priority);
}

export async function upsertConfidenceLevel(
  reportId: number,
  userId: number,
  level: string,
  reason?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  await db.delete(confidenceLevels).where(eq(confidenceLevels.reportId, reportId));
  await db.insert(confidenceLevels).values({
    reportId,
    userId,
    level: level as any,
    reason,
  });
}

export async function getConfidenceLevelByReport(reportId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(confidenceLevels)
    .where(eq(confidenceLevels.reportId, reportId))
    .limit(1);
  return result[0] ?? null;
}

// ─── STRATEGIC ACTIONS ────────────────────────────────────────────────────────
export async function getStrategicActionsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(strategicActions)
    .where(eq(strategicActions.userId, userId))
    .orderBy(desc(strategicActions.createdAt));
}

export async function getAllStrategicActions() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      action: strategicActions,
      user: { id: users.id, name: users.name },
    })
    .from(strategicActions)
    .leftJoin(users, eq(strategicActions.userId, users.id))
    .orderBy(desc(strategicActions.createdAt));
}

export async function createStrategicAction(data: {
  userId: number;
  actionName: string;
  startDate?: string;
  description?: string;
  completed?: boolean;
  resultYtd?: string;
  difficulty?: string;
  accelerationTips?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const insertData = { ...data, startDate: data.startDate ? new Date(data.startDate) : undefined };
  const [result] = await db.insert(strategicActions).values(insertData as any);
  return (result as any).insertId as number;
}

export async function updateStrategicAction(
  id: number,
  data: Partial<{
    actionName: string;
    startDate: string;
    description: string;
    completed: boolean;
    resultYtd: string;
    difficulty: string;
    accelerationTips: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData = { ...data, startDate: (data as any).startDate ? new Date((data as any).startDate) : undefined };
  await db.update(strategicActions).set(updateData as any).where(eq(strategicActions.id, id));
}

export async function deleteStrategicAction(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(strategicActions).where(eq(strategicActions.id, id));
}

// ─── PRODUCTS & REGIONS ───────────────────────────────────────────────────────
export async function getProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.active, true)).orderBy(products.name);
}

export async function createProduct(name: string, description?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(products).values({ name, description });
  return (result as any).insertId as number;
}

export async function updateProduct(id: number, data: { name?: string; description?: string; active?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(products).set(data).where(eq(products.id, id));
}

export async function getRegions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(regions).where(eq(regions.active, true)).orderBy(regions.name);
}

export async function createRegion(name: string, code?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(regions).values({ name, code });
  return (result as any).insertId as number;
}

export async function updateRegion(id: number, data: { name?: string; code?: string; active?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(regions).set(data).where(eq(regions.id, id));
}

// ─── ADMIN AGGREGATIONS ───────────────────────────────────────────────────────
export async function getAdminDashboardStats(filters: {
  userId?: number;
  weekStart?: string;
  weekEnd?: string;
}) {
  const db = await getDb();
  if (!db) return null;

  const conditions = [];
  if (filters.userId) conditions.push(eq(weeklyReports.userId, filters.userId));
  if (filters.weekStart) conditions.push(sql`${weeklyReports.weekStart} >= ${filters.weekStart}`);
  if (filters.weekEnd) conditions.push(sql`${weeklyReports.weekStart} <= ${filters.weekEnd}`);

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const reports = await db
    .select({
      report: weeklyReports,
      user: { id: users.id, name: users.name, email: users.email },
    })
    .from(weeklyReports)
    .leftJoin(users, eq(weeklyReports.userId, users.id))
    .where(whereClause)
    .orderBy(desc(weeklyReports.weekStart));

  return reports;
}

export async function getOpportunitiesStats(userId?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions = userId ? [eq(opportunities.userId, userId)] : [];
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      stage: opportunities.stage,
      count: sql<number>`COUNT(*)`,
      totalValue: sql<number>`SUM(CAST(${opportunities.value} AS DECIMAL(15,2)))`,
    })
    .from(opportunities)
    .where(whereClause)
    .groupBy(opportunities.stage);
}
