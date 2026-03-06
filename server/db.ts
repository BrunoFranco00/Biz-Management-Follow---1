import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  activities,
  confidenceLevels,
  deals,
  kpiMetrics,
  leadSources,
  objections,
  operationalDifficulties,
  opportunities,
  organizationInvites,
  organizations,
  products,
  regions,
  salesFunnelEntries,
  strategicActions,
  systemLabels,
  users,
  weeklyActions,
  weeklyCheckins,
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
    values.role = "super_admin";
    updateSet.role = "super_admin";
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

export async function getAllUsers(organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (organizationId) {
    return db.select().from(users).where(eq(users.organizationId, organizationId)).orderBy(users.name);
  }
  return db.select().from(users).orderBy(users.name);
}

export async function updateUserOrganization(userId: number, organizationId: number, role?: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData: Record<string, unknown> = { organizationId };
  if (role) updateData.role = role;
  await db.update(users).set(updateData).where(eq(users.id, userId));
}

export async function updateUserRole(userId: number, role: "user" | "admin" | "super_admin") {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ─── ORGANIZATIONS ────────────────────────────────────────────────────────────
export async function getAllOrganizations() {
  const db = await getDb();
  if (!db) return [];
  const orgs = await db.select().from(organizations).orderBy(organizations.name);
  // Enrich with user count
  const enriched = await Promise.all(
    orgs.map(async (org) => {
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(users)
        .where(eq(users.organizationId, org.id));
      return { ...org, userCount: countResult?.count ?? 0 };
    })
  );
  return enriched;
}

export async function getOrganizationById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createOrganization(data: {
  name: string;
  slug: string;
  segment: string;
  logoUrl?: string;
  maxUsers?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(organizations).values({
    name: data.name,
    slug: data.slug,
    segment: data.segment as any,
    logoUrl: data.logoUrl,
    maxUsers: data.maxUsers ?? 10,
  });
  return (result as any).insertId as number;
}

export async function updateOrganization(id: number, data: Partial<{
  name: string;
  segment: string;
  logoUrl: string;
  active: boolean;
  maxUsers: number;
}>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(organizations).set(data as any).where(eq(organizations.id, id));
}

// ─── ORGANIZATION INVITES ─────────────────────────────────────────────────────
export async function createInvite(organizationId: number, email: string, role: "user" | "admin", token: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await db.insert(organizationInvites).values({ organizationId, email, role, token, expiresAt });
}

export async function getInvitesByOrganization(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(organizationInvites)
    .where(and(eq(organizationInvites.organizationId, organizationId), eq(organizationInvites.accepted, false)))
    .orderBy(desc(organizationInvites.createdAt));
}

export async function acceptInvite(token: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [invite] = await db.select().from(organizationInvites)
    .where(and(eq(organizationInvites.token, token), eq(organizationInvites.accepted, false)))
    .limit(1);
  if (!invite) throw new Error("Invite not found or already used");
  if (invite.expiresAt < new Date()) throw new Error("Invite expired");
  await db.update(organizationInvites).set({ accepted: true }).where(eq(organizationInvites.id, invite.id));
  await updateUserOrganization(userId, invite.organizationId, invite.role);
  return invite;
}

// ─── SYSTEM LABELS (per organization) ────────────────────────────────────────
const DEFAULT_LABELS: Array<{ labelKey: string; labelValue: string; category: string; description: string }> = [
  { labelKey: "activity.calls", labelValue: "Ligações", category: "activities", description: "Nome da atividade de ligações" },
  { labelKey: "activity.emails", labelValue: "E-mails", category: "activities", description: "Nome da atividade de e-mails" },
  { labelKey: "activity.whatsapp", labelValue: "WhatsApp", category: "activities", description: "Nome da atividade de WhatsApp" },
  { labelKey: "activity.in_person_visits", labelValue: "Visitas Presenciais", category: "activities", description: "Nome da atividade de visitas" },
  { labelKey: "activity.meetings_scheduled", labelValue: "Reuniões Agendadas", category: "activities", description: "Nome da atividade de reuniões" },
  { labelKey: "funnel.prospecting", labelValue: "Prospecção", category: "funnel", description: "Nome da etapa de prospecção" },
  { labelKey: "funnel.qualification", labelValue: "Qualificação", category: "funnel", description: "Nome da etapa de qualificação" },
  { labelKey: "funnel.presentation", labelValue: "Apresentação", category: "funnel", description: "Nome da etapa de apresentação" },
  { labelKey: "funnel.negotiation", labelValue: "Negociação", category: "funnel", description: "Nome da etapa de negociação" },
  { labelKey: "funnel.closing", labelValue: "Fechamento", category: "funnel", description: "Nome da etapa de fechamento" },
  { labelKey: "kpi.contacts", labelValue: "Contatos Realizados", category: "kpis", description: "Nome do KPI de contatos" },
  { labelKey: "kpi.consultations", labelValue: "Consultas Agendadas", category: "kpis", description: "Nome do KPI de consultas" },
  { labelKey: "kpi.deals_closed", labelValue: "Negociações Fechadas", category: "kpis", description: "Nome do KPI de negociações" },
  { labelKey: "kpi.revenue", labelValue: "Faturamento (R$)", category: "kpis", description: "Nome do KPI de faturamento" },
  { labelKey: "deal.prospecting", labelValue: "Prospecção", category: "deal_status", description: "Status: prospecção" },
  { labelKey: "deal.in_progress", labelValue: "Em Andamento", category: "deal_status", description: "Status: em andamento" },
  { labelKey: "deal.won", labelValue: "Fechado", category: "deal_status", description: "Status: fechado/ganho" },
  { labelKey: "deal.lost", labelValue: "Perdido", category: "deal_status", description: "Status: perdido" },
  { labelKey: "menu.dashboard", labelValue: "Dashboard", category: "menu", description: "Nome do menu Dashboard" },
  { labelKey: "menu.deals", labelValue: "Negócios", category: "menu", description: "Nome do menu Negócios" },
  { labelKey: "menu.opportunities", labelValue: "Oportunidades", category: "menu", description: "Nome do menu Oportunidades" },
  { labelKey: "menu.activities", labelValue: "Atividades", category: "menu", description: "Nome do menu Atividades" },
  { labelKey: "menu.objections", labelValue: "Objeções", category: "menu", description: "Nome do menu Objeções" },
  { labelKey: "menu.planning", labelValue: "Planejamento", category: "menu", description: "Nome do menu Planejamento" },
  { labelKey: "menu.strategic", labelValue: "Ações Estratégicas", category: "menu", description: "Nome do menu Ações Estratégicas" },
];

export async function getAllLabels(organizationId: number) {
  const db = await getDb();
  if (!db) return DEFAULT_LABELS.map((l, i) => ({ id: i, organizationId, ...l, updatedAt: new Date() }));
  const existing = await db.select().from(systemLabels).where(eq(systemLabels.organizationId, organizationId));
  if (existing.length === 0) {
    const toInsert = DEFAULT_LABELS.map(l => ({ ...l, organizationId }));
    await db.insert(systemLabels).values(toInsert);
    return db.select().from(systemLabels).where(eq(systemLabels.organizationId, organizationId));
  }
  return existing;
}

export async function upsertLabel(organizationId: number, labelKey: string, labelValue: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = DEFAULT_LABELS.find(l => l.labelKey === labelKey);
  // Check if exists for this org
  const [found] = await db.select().from(systemLabels)
    .where(and(eq(systemLabels.organizationId, organizationId), eq(systemLabels.labelKey, labelKey)))
    .limit(1);
  if (found) {
    await db.update(systemLabels).set({ labelValue }).where(eq(systemLabels.id, found.id));
  } else {
    await db.insert(systemLabels).values({
      organizationId,
      labelKey,
      labelValue,
      category: existing?.category ?? "custom",
      description: existing?.description ?? "",
    });
  }
}

export async function seedLabelsFromTemplate(organizationId: number, labels: Array<{ key: string; value: string; category: string; description: string }>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  for (const label of labels) {
    await upsertLabel(organizationId, label.key, label.value);
  }
}

// ─── WEEKLY REPORTS ───────────────────────────────────────────────────────────
export async function getOrCreateWeeklyReport(userId: number, organizationId: number, weekStart: string, weekEnd: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db
    .select()
    .from(weeklyReports)
    .where(and(eq(weeklyReports.userId, userId), sql`${weeklyReports.weekStart} = ${weekStart}`))
    .limit(1);
  if (existing.length > 0) return existing[0];
  const [inserted] = await db.insert(weeklyReports).values({
    userId,
    organizationId,
    weekStart: new Date(weekStart),
    weekEnd: new Date(weekEnd),
  } as any);
  const newReport = await db.select().from(weeklyReports)
    .where(eq(weeklyReports.id, (inserted as any).insertId)).limit(1);
  return newReport[0];
}

export async function updateWeeklyReport(reportId: number, data: { highlights?: string; challenges?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(weeklyReports).set(data).where(eq(weeklyReports.id, reportId));
}

export async function getWeeklyReportsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(weeklyReports).where(eq(weeklyReports.userId, userId)).orderBy(desc(weeklyReports.weekStart));
}

export async function getWeeklyReportById(reportId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(weeklyReports).where(eq(weeklyReports.id, reportId)).limit(1);
  return result[0] ?? null;
}

// ─── KPI METRICS ──────────────────────────────────────────────────────────────
export async function upsertKpiMetrics(
  reportId: number,
  userId: number,
  organizationId: number,
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
      organizationId,
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
  organizationId: number,
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
      organizationId,
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
  return db.select().from(opportunities).where(eq(opportunities.userId, userId)).orderBy(desc(opportunities.updatedAt));
}

export async function getAllOpportunities(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      opportunity: opportunities,
      user: { id: users.id, name: users.name, email: users.email },
    })
    .from(opportunities)
    .leftJoin(users, eq(opportunities.userId, users.id))
    .where(eq(opportunities.organizationId, organizationId))
    .orderBy(desc(opportunities.updatedAt));
}

export async function createOpportunity(data: {
  userId: number;
  organizationId: number;
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
    organizationId: data.organizationId,
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

export async function updateOpportunity(id: number, data: Partial<{
  clientName: string; value: number; productService: string; stage: string;
  probability: number; forecastDate: string; nextAction: string; notes: string;
  status: string; lostReason: string; lostReasonDetail: string; regionId: number; productId: number;
}>) {
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
  organizationId: number,
  acts: Array<{ activityType: string; target: number; realized: number; notes?: string }>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(activities).where(eq(activities.reportId, reportId));
  if (acts.length === 0) return;
  await db.insert(activities).values(
    acts.map((a) => ({ reportId, userId, organizationId, activityType: a.activityType as any, target: a.target, realized: a.realized, notes: a.notes }))
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
  organizationId: number,
  sources: Array<{ source: string; quantity: number }>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(leadSources).where(eq(leadSources.reportId, reportId));
  if (sources.length === 0) return;
  await db.insert(leadSources).values(
    sources.map((s) => ({ reportId, userId, organizationId, source: s.source as any, quantity: s.quantity }))
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
  organizationId: number,
  objs: Array<{ objectionText: string; frequency: number; responseUsed?: string; worked?: boolean; needsHelp?: boolean }>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(objections).where(eq(objections.reportId, reportId));
  if (objs.length === 0) return;
  await db.insert(objections).values(
    objs.map((o) => ({ reportId, userId, organizationId, objectionText: o.objectionText, frequency: o.frequency, responseUsed: o.responseUsed, worked: o.worked, needsHelp: o.needsHelp ?? false }))
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
  organizationId: number,
  diffs: Array<{ difficultyType: string; description?: string; suggestedSolution?: string }>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(operationalDifficulties).where(eq(operationalDifficulties.reportId, reportId));
  if (diffs.length === 0) return;
  await db.insert(operationalDifficulties).values(
    diffs.map((d) => ({ reportId, userId, organizationId, difficultyType: d.difficultyType as any, description: d.description, suggestedSolution: d.suggestedSolution }))
  );
}

// ─── WEEKLY PLANNING ──────────────────────────────────────────────────────────
export async function upsertWeeklyPlans(
  reportId: number,
  userId: number,
  organizationId: number,
  plans: Array<{ metricName: string; target?: number; howToAchieve?: string }>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(weeklyPlans).where(eq(weeklyPlans.reportId, reportId));
  if (plans.length === 0) return;
  await db.insert(weeklyPlans).values(
    plans.map((p) => ({ reportId, userId, organizationId, metricName: p.metricName, target: p.target?.toString(), howToAchieve: p.howToAchieve }))
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
  organizationId: number,
  actions: Array<{ priority: number; actionDescription: string; deadline?: string; status?: string }>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(weeklyActions).where(eq(weeklyActions.reportId, reportId));
  if (actions.length === 0) return;
  await db.insert(weeklyActions).values(
    actions.map((a) => ({
      reportId, userId, organizationId, priority: a.priority,
      actionDescription: a.actionDescription,
      deadline: a.deadline ? new Date(a.deadline) : null,
      status: (a.status as any) ?? "pending",
    }))
  );
}

export async function getWeeklyActionsByReport(reportId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(weeklyActions).where(eq(weeklyActions.reportId, reportId)).orderBy(weeklyActions.priority);
}

export async function upsertConfidenceLevel(reportId: number, userId: number, organizationId: number, level: string, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(confidenceLevels).where(eq(confidenceLevels.reportId, reportId));
  await db.insert(confidenceLevels).values({ reportId, userId, organizationId, level: level as any, reason });
}

export async function getConfidenceLevelByReport(reportId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(confidenceLevels).where(eq(confidenceLevels.reportId, reportId)).limit(1);
  return result[0] ?? null;
}

// ─── STRATEGIC ACTIONS ────────────────────────────────────────────────────────
export async function getStrategicActionsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(strategicActions).where(eq(strategicActions.userId, userId)).orderBy(desc(strategicActions.createdAt));
}

export async function getAllStrategicActions(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ action: strategicActions, user: { id: users.id, name: users.name } })
    .from(strategicActions)
    .leftJoin(users, eq(strategicActions.userId, users.id))
    .where(eq(strategicActions.organizationId, organizationId))
    .orderBy(desc(strategicActions.createdAt));
}

export async function createStrategicAction(data: {
  userId: number;
  organizationId: number;
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

export async function updateStrategicAction(id: number, data: Partial<{
  actionName: string; startDate: string; description: string;
  completed: boolean; resultYtd: string; difficulty: string; accelerationTips: string;
}>) {
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

// ─── PRODUCTS & REGIONS (per organization) ────────────────────────────────────
export async function getProducts(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(and(eq(products.organizationId, organizationId), eq(products.active, true))).orderBy(products.name);
}

export async function createProduct(organizationId: number, name: string, description?: string, price?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(products).values({ organizationId, name, description, price: price?.toString() });
  return (result as any).insertId as number;
}

export async function updateProduct(id: number, data: { name?: string; description?: string; active?: boolean; price?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData: Record<string, unknown> = { ...data };
  if (data.price !== undefined) updateData.price = data.price.toString();
  await db.update(products).set(updateData).where(eq(products.id, id));
}

export async function getRegions(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(regions).where(and(eq(regions.organizationId, organizationId), eq(regions.active, true))).orderBy(regions.name);
}

export async function createRegion(organizationId: number, name: string, code?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(regions).values({ organizationId, name, code });
  return (result as any).insertId as number;
}

export async function updateRegion(id: number, data: { name?: string; code?: string; active?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(regions).set(data).where(eq(regions.id, id));
}

// ─── ADMIN AGGREGATIONS ───────────────────────────────────────────────────────
export async function getAdminDashboardStats(organizationId: number, filters: { userId?: number; weekStart?: string; weekEnd?: string }) {
  const db = await getDb();
  if (!db) return null;
  const conditions: any[] = [eq(weeklyReports.organizationId, organizationId)];
  if (filters.userId) conditions.push(eq(weeklyReports.userId, filters.userId));
  if (filters.weekStart) conditions.push(sql`${weeklyReports.weekStart} >= ${filters.weekStart}`);
  if (filters.weekEnd) conditions.push(sql`${weeklyReports.weekStart} <= ${filters.weekEnd}`);
  return db
    .select({ report: weeklyReports, user: { id: users.id, name: users.name, email: users.email } })
    .from(weeklyReports)
    .leftJoin(users, eq(weeklyReports.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(weeklyReports.weekStart));
}

export async function getOpportunitiesStats(organizationId: number, userId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [eq(opportunities.organizationId, organizationId)];
  if (userId) conditions.push(eq(opportunities.userId, userId));
  return db
    .select({ stage: opportunities.stage, count: sql<number>`COUNT(*)`, totalValue: sql<number>`SUM(CAST(${opportunities.value} AS DECIMAL(15,2)))` })
    .from(opportunities)
    .where(and(...conditions))
    .groupBy(opportunities.stage);
}

// ─── DEALS ────────────────────────────────────────────────────────────────────
export async function getDealsByUser(userId: number, organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ deal: deals, region: { id: regions.id, name: regions.name }, product: { id: products.id, name: products.name } })
    .from(deals)
    .leftJoin(regions, eq(deals.regionId, regions.id))
    .leftJoin(products, eq(deals.productId, products.id))
    .where(and(eq(deals.userId, userId), eq(deals.organizationId, organizationId)))
    .orderBy(desc(deals.updatedAt));
}

export async function getAllDeals(organizationId: number, filters?: { userId?: number; status?: string; regionId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [eq(deals.organizationId, organizationId)];
  if (filters?.userId) conditions.push(eq(deals.userId, filters.userId));
  if (filters?.status) conditions.push(eq(deals.status, filters.status as any));
  if (filters?.regionId) conditions.push(eq(deals.regionId, filters.regionId));
  return db
    .select({ deal: deals, user: { id: users.id, name: users.name }, region: { id: regions.id, name: regions.name }, product: { id: products.id, name: products.name } })
    .from(deals)
    .leftJoin(users, eq(deals.userId, users.id))
    .leftJoin(regions, eq(deals.regionId, regions.id))
    .leftJoin(products, eq(deals.productId, products.id))
    .where(and(...conditions))
    .orderBy(desc(deals.updatedAt));
}

export async function createDeal(data: Record<string, unknown>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const startDate = data.startDate as string | Date;
  const endDate = data.endDate as string | Date | undefined | null;
  const insertData = {
    ...data,
    startDate: typeof startDate === "string" ? startDate : startDate.toISOString().split("T")[0],
    endDate: endDate ? (typeof endDate === "string" ? endDate : (endDate as Date).toISOString().split("T")[0]) : null,
  };
  const [result] = await db.insert(deals).values(insertData as any);
  return result;
}

export async function updateDeal(id: number, userId: number, data: Record<string, unknown>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData: Record<string, unknown> = { ...data };
  if (data.startDate) updateData.startDate = typeof data.startDate === "string" ? data.startDate : (data.startDate as Date).toISOString().split("T")[0];
  if (data.endDate) updateData.endDate = typeof data.endDate === "string" ? data.endDate : (data.endDate as Date).toISOString().split("T")[0];
  await db.update(deals).set(updateData).where(and(eq(deals.id, id), eq(deals.userId, userId)));
}

export async function deleteDeal(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(deals).where(and(eq(deals.id, id), eq(deals.userId, userId)));
}

export async function getDealsStats(organizationId: number, userId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [eq(deals.organizationId, organizationId)];
  if (userId) conditions.push(eq(deals.userId, userId));
  return db
    .select({ status: deals.status, count: sql<number>`COUNT(*)`, totalExpected: sql<number>`SUM(CAST(${deals.expectedValue} AS DECIMAL(15,2)))`, totalFinal: sql<number>`SUM(CAST(${deals.finalValue} AS DECIMAL(15,2)))` })
    .from(deals)
    .where(and(...conditions))
    .groupBy(deals.status);
}

// ─── WEEKLY CHECKINS ──────────────────────────────────────────────────────────
export async function getCheckinByReport(reportId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(weeklyCheckins)
    .where(and(eq(weeklyCheckins.reportId, reportId), eq(weeklyCheckins.userId, userId))).limit(1);
  return result[0] ?? null;
}

export async function upsertCheckin(data: {
  reportId: number;
  userId: number;
  organizationId: number;
  performanceScore?: number;
  weekHighlight?: string;
  biggestChallenge?: string;
  nextWeekFocus?: string;
  moodLevel?: "excellent" | "good" | "neutral" | "difficult" | "very_difficult";
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await getCheckinByReport(data.reportId, data.userId);
  if (existing) {
    await db.update(weeklyCheckins).set(data).where(eq(weeklyCheckins.id, existing.id));
  } else {
    await db.insert(weeklyCheckins).values(data);
  }
}

export async function getAllCheckins(organizationId: number, userId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [eq(weeklyCheckins.organizationId, organizationId)];
  if (userId) conditions.push(eq(weeklyCheckins.userId, userId));
  return db
    .select({ checkin: weeklyCheckins, user: { id: users.id, name: users.name }, report: { id: weeklyReports.id, weekStart: weeklyReports.weekStart, weekEnd: weeklyReports.weekEnd } })
    .from(weeklyCheckins)
    .leftJoin(users, eq(weeklyCheckins.userId, users.id))
    .leftJoin(weeklyReports, eq(weeklyCheckins.reportId, weeklyReports.id))
    .where(and(...conditions))
    .orderBy(desc(weeklyCheckins.createdAt));
}

// ─── FULL REPORT DATA (para PDF) ─────────────────────────────────────────────
export async function getFullReportData(reportId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [report] = await db.select().from(weeklyReports)
    .where(and(eq(weeklyReports.id, reportId), eq(weeklyReports.userId, userId))).limit(1);
  if (!report) return null;
  const [kpis, funnel, acts, leadSrcs, objs, plans, actions, strategic, checkin, user] = await Promise.all([
    db.select().from(kpiMetrics).where(eq(kpiMetrics.reportId, reportId)),
    db.select().from(salesFunnelEntries).where(eq(salesFunnelEntries.reportId, reportId)),
    db.select().from(activities).where(eq(activities.reportId, reportId)),
    db.select().from(leadSources).where(eq(leadSources.reportId, reportId)),
    db.select().from(objections).where(eq(objections.reportId, reportId)),
    db.select().from(weeklyPlans).where(eq(weeklyPlans.reportId, reportId)),
    db.select().from(weeklyActions).where(eq(weeklyActions.reportId, reportId)),
    db.select().from(strategicActions).where(eq(strategicActions.userId, userId)),
    db.select().from(weeklyCheckins).where(and(eq(weeklyCheckins.reportId, reportId), eq(weeklyCheckins.userId, userId))).limit(1),
    db.select().from(users).where(eq(users.id, userId)).limit(1),
  ]);
  return { report, kpis, funnel, activities: acts, leadSources: leadSrcs, objections: objs, plans, actions, strategic, checkin: checkin[0] ?? null, user: user[0] ?? null };
}

// ─── SUPER ADMIN STATS ────────────────────────────────────────────────────────
export async function getSuperAdminStats() {
  const db = await getDb();
  if (!db) return null;
  const [orgCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(organizations);
  const [userCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
  const [activeOrgs] = await db.select({ count: sql<number>`COUNT(*)` }).from(organizations).where(eq(organizations.active, true));
  const recentOrgs = await db.select().from(organizations).orderBy(desc(organizations.createdAt)).limit(5);
  return {
    totalOrganizations: orgCount?.count ?? 0,
    totalUsers: userCount?.count ?? 0,
    activeOrganizations: activeOrgs?.count ?? 0,
    recentOrganizations: recentOrgs,
  };
}
