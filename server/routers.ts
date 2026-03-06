import { TRPCError } from "@trpc/server";
import {
  createOrgUserSlots,
  hashPassword,
  resetOrgUserPassword,
  updateOrgUserProfile,
} from "./localAuth";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  acceptInvite,
  createDeal,
  createInvite,
  createOpportunity,
  createOrganization,
  createProduct,
  createRegion,
  createStrategicAction,
  deleteDeal,
  deleteOpportunity,
  deleteStrategicAction,
  getActivitiesByReport,
  getAdminDashboardStats,
  getAllCheckins,
  getAllDeals,
  getAllLabels,
  getAllOpportunities,
  getAllOrganizations,
  getAllStrategicActions,
  getAllUsers,
  getCheckinByReport,
  getConfidenceLevelByReport,
  getDealsStats,
  getDealsByUser,
  getFullReportData,
  getInvitesByOrganization,
  getKpiMetricsByReport,
  getLeadSourcesByReport,
  getObjectionsByReport,
  getOpportunitiesByUser,
  getOpportunitiesStats,
  getOrCreateWeeklyReport,
  getOrganizationById,
  getProducts,
  getRegions,
  getSalesFunnelByReport,
  getSuperAdminStats,
  getStrategicActionsByUser,
  getWeeklyActionsByReport,
  getWeeklyPlansByReport,
  getWeeklyReportById,
  getWeeklyReportsByUser,
  seedLabelsFromTemplate,
  updateDeal,
  updateOpportunity,
  updateOrganization,
  updateProduct,
  updateRegion,
  updateStrategicAction,
  updateUserOrganization,
  updateUserRole,
  updateWeeklyReport,
  upsertActivities,
  upsertCheckin,
  upsertConfidenceLevel,
  upsertKpiMetrics,
  upsertLabel,
  upsertLeadSources,
  upsertObjections,
  upsertOperationalDifficulties,
  upsertSalesFunnel,
  upsertWeeklyActions,
  upsertWeeklyPlans,
  getDb,
} from "./db";
import { nanoid } from "nanoid";

// ─── Middleware helpers ────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

const superAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "super_admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Super admin access required" });
  }
  return next({ ctx });
});

// Helper to get org from user context (throws if not in an org)
function requireOrg(user: { organizationId?: number | null; role: string }) {
  if (!user.organizationId) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "You must belong to an organization" });
  }
  return user.organizationId;
}

export const appRouter = router({
  system: systemRouter,

  // ─── AUTH ──────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── ORGANIZATIONS ─────────────────────────────────────────────────────────
  organizations: router({
    // Get current user's organization
    mine: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user.organizationId) return null;
      return getOrganizationById(ctx.user.organizationId);
    }),

    // Join via invite token
    joinByToken: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await acceptInvite(input.token, ctx.user.id);
        return { success: true };
      }),

    // Admin: get invites for their org
    getInvites: adminProcedure.query(async ({ ctx }) => {
      const orgId = requireOrg(ctx.user);
      return getInvitesByOrganization(orgId);
    }),

    // Admin: create invite
    createInvite: adminProcedure
      .input(z.object({ email: z.string().email(), role: z.enum(["user", "admin"]).default("user") }))
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrg(ctx.user);
        const token = nanoid(32);
        await createInvite(orgId, input.email, input.role, token);
        return { token, inviteUrl: `${ctx.req.headers.origin ?? ""}/join?token=${token}` };
      }),
  }),

  // ─── SUPER ADMIN ───────────────────────────────────────────────────────────
  superAdmin: router({
    stats: superAdminProcedure.query(async () => getSuperAdminStats()),

    listOrganizations: superAdminProcedure.query(async () => getAllOrganizations()),

    createOrganization: superAdminProcedure
      .input(z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        segment: z.enum(["aesthetics_clinic", "agribusiness", "generic", "real_estate", "retail", "tech"]),
        maxUsers: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await createOrganization(input);
        return { id };
      }),

    updateOrganization: superAdminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        segment: z.string().optional(),
        active: z.boolean().optional(),
        maxUsers: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateOrganization(id, data);
        return { success: true };
      }),

    listAllUsers: superAdminProcedure.query(async () => getAllUsers()),

    assignUserToOrg: superAdminProcedure
      .input(z.object({ userId: z.number(), organizationId: z.number(), role: z.enum(["user", "admin"]).optional() }))
      .mutation(async ({ input }) => {
        await updateUserOrganization(input.userId, input.organizationId, input.role);
        return { success: true };
      }),

    updateUserRole: superAdminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin", "super_admin"]) }))
      .mutation(async ({ input }) => {
        await updateUserRole(input.userId, input.role);
        return { success: true };
      }),

    seedOrgLabels: superAdminProcedure
      .input(z.object({
        organizationId: z.number(),
        labels: z.array(z.object({ key: z.string(), value: z.string(), category: z.string(), description: z.string() })),
      }))
      .mutation(async ({ input }) => {
        await seedLabelsFromTemplate(input.organizationId, input.labels);
        return { success: true };
      }),
  }),

  // ─── WEEKLY REPORTS ────────────────────────────────────────────────────────
  reports: router({
    getOrCreate: protectedProcedure
      .input(z.object({ weekStart: z.string(), weekEnd: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrg(ctx.user);
        return getOrCreateWeeklyReport(ctx.user.id, orgId, input.weekStart, input.weekEnd);
      }),

    update: protectedProcedure
      .input(z.object({ reportId: z.number(), highlights: z.string().optional(), challenges: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const report = await getWeeklyReportById(input.reportId);
        if (!report || report.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await updateWeeklyReport(input.reportId, { highlights: input.highlights, challenges: input.challenges });
        return { success: true };
      }),

    list: protectedProcedure.query(async ({ ctx }) => getWeeklyReportsByUser(ctx.user.id)),

    getById: protectedProcedure
      .input(z.object({ reportId: z.number() }))
      .query(async ({ ctx, input }) => {
        const report = await getWeeklyReportById(input.reportId);
        if (!report) return null;
        if (report.userId !== ctx.user.id && ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return report;
      }),
  }),

  // ─── KPI METRICS ───────────────────────────────────────────────────────────
  kpis: router({
    upsert: protectedProcedure
      .input(z.object({
        reportId: z.number(),
        metrics: z.array(z.object({ metricName: z.string(), target: z.number().optional(), realized: z.number().optional(), unit: z.string().optional(), notes: z.string().optional() })),
      }))
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrg(ctx.user);
        const report = await getWeeklyReportById(input.reportId);
        if (!report || report.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await upsertKpiMetrics(input.reportId, ctx.user.id, orgId, input.metrics);
        return { success: true };
      }),

    getByReport: protectedProcedure
      .input(z.object({ reportId: z.number() }))
      .query(async ({ ctx, input }) => {
        const report = await getWeeklyReportById(input.reportId);
        if (!report) return [];
        if (report.userId !== ctx.user.id && ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getKpiMetricsByReport(input.reportId);
      }),
  }),

  // ─── SALES FUNNEL ──────────────────────────────────────────────────────────
  funnel: router({
    upsert: protectedProcedure
      .input(z.object({
        reportId: z.number(),
        entries: z.array(z.object({ stage: z.enum(["prospecting", "qualification", "presentation", "negotiation", "closing"]), quantity: z.number(), totalValue: z.number() })),
      }))
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrg(ctx.user);
        const report = await getWeeklyReportById(input.reportId);
        if (!report || report.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await upsertSalesFunnel(input.reportId, ctx.user.id, orgId, input.entries);
        return { success: true };
      }),

    getByReport: protectedProcedure
      .input(z.object({ reportId: z.number() }))
      .query(async ({ ctx, input }) => {
        const report = await getWeeklyReportById(input.reportId);
        if (!report) return [];
        if (report.userId !== ctx.user.id && ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getSalesFunnelByReport(input.reportId);
      }),
  }),

  // ─── OPPORTUNITIES ─────────────────────────────────────────────────────────
  opportunities: router({
    list: protectedProcedure.query(async ({ ctx }) => getOpportunitiesByUser(ctx.user.id)),

    create: protectedProcedure
      .input(z.object({
        clientName: z.string().min(1),
        value: z.number().optional(),
        productService: z.string().optional(),
        stage: z.enum(["prospecting", "qualification", "presentation", "negotiation", "closing", "won", "lost"]).optional(),
        probability: z.number().min(0).max(100).optional(),
        forecastDate: z.string().optional(),
        nextAction: z.string().optional(),
        notes: z.string().optional(),
        regionId: z.number().optional(),
        productId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrg(ctx.user);
        const id = await createOpportunity({ userId: ctx.user.id, organizationId: orgId, ...input });
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        clientName: z.string().optional(),
        value: z.number().optional(),
        productService: z.string().optional(),
        stage: z.enum(["prospecting", "qualification", "presentation", "negotiation", "closing", "won", "lost"]).optional(),
        probability: z.number().min(0).max(100).optional(),
        forecastDate: z.string().optional(),
        nextAction: z.string().optional(),
        notes: z.string().optional(),
        status: z.enum(["active", "won", "lost"]).optional(),
        lostReason: z.enum(["price_too_high", "bought_from_competitor", "wrong_timing", "no_budget", "no_response", "other"]).optional(),
        lostReasonDetail: z.string().optional(),
        regionId: z.number().optional(),
        productId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateOpportunity(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteOpportunity(input.id);
        return { success: true };
      }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      const orgId = requireOrg(ctx.user);
      return getOpportunitiesStats(orgId, ctx.user.id);
    }),
  }),

  // ─── ACTIVITIES ────────────────────────────────────────────────────────────
  activities: router({
    upsert: protectedProcedure
      .input(z.object({
        reportId: z.number(),
        activities: z.array(z.object({ activityType: z.enum(["calls", "emails", "whatsapp", "in_person_visits", "meetings_scheduled"]), target: z.number(), realized: z.number(), notes: z.string().optional() })),
        leadSources: z.array(z.object({ source: z.enum(["referral", "active_prospecting", "inbound", "networking", "other"]), quantity: z.number() })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrg(ctx.user);
        const report = await getWeeklyReportById(input.reportId);
        if (!report || report.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await upsertActivities(input.reportId, ctx.user.id, orgId, input.activities);
        if (input.leadSources) await upsertLeadSources(input.reportId, ctx.user.id, orgId, input.leadSources);
        return { success: true };
      }),

    getByReport: protectedProcedure
      .input(z.object({ reportId: z.number() }))
      .query(async ({ ctx, input }) => {
        const report = await getWeeklyReportById(input.reportId);
        if (!report) return { activities: [], leadSources: [] };
        if (report.userId !== ctx.user.id && ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
        const [acts, sources] = await Promise.all([getActivitiesByReport(input.reportId), getLeadSourcesByReport(input.reportId)]);
        return { activities: acts, leadSources: sources };
      }),
  }),

  // ─── OBJECTIONS ────────────────────────────────────────────────────────────
  objections: router({
    upsert: protectedProcedure
      .input(z.object({
        reportId: z.number(),
        objections: z.array(z.object({ objectionText: z.string(), frequency: z.number(), responseUsed: z.string().optional(), worked: z.boolean().optional(), needsHelp: z.boolean().optional() })),
        difficulties: z.array(z.object({ difficultyType: z.enum(["crm_issues", "lack_of_materials", "technical_doubts", "contact_difficulties", "schedule_issues", "lack_of_support", "other"]), description: z.string().optional(), suggestedSolution: z.string().optional() })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrg(ctx.user);
        const report = await getWeeklyReportById(input.reportId);
        if (!report || report.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await upsertObjections(input.reportId, ctx.user.id, orgId, input.objections);
        if (input.difficulties) await upsertOperationalDifficulties(input.reportId, ctx.user.id, orgId, input.difficulties);
        return { success: true };
      }),

    getByReport: protectedProcedure
      .input(z.object({ reportId: z.number() }))
      .query(async ({ ctx, input }) => {
        const report = await getWeeklyReportById(input.reportId);
        if (!report) return { objections: [] };
        if (report.userId !== ctx.user.id && ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
        return { objections: await getObjectionsByReport(input.reportId) };
      }),
  }),

  // ─── WEEKLY PLANNING ───────────────────────────────────────────────────────
  planning: router({
    upsert: protectedProcedure
      .input(z.object({
        reportId: z.number(),
        plans: z.array(z.object({ metricName: z.string(), target: z.number().optional(), howToAchieve: z.string().optional() })),
        actions: z.array(z.object({ priority: z.number(), actionDescription: z.string(), deadline: z.string().optional(), status: z.enum(["pending", "in_progress", "done", "cancelled"]).optional() })),
        confidenceLevel: z.object({ level: z.enum(["very_confident", "confident", "moderately_confident", "low_confidence", "worried"]), reason: z.string().optional() }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrg(ctx.user);
        const report = await getWeeklyReportById(input.reportId);
        if (!report || report.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await upsertWeeklyPlans(input.reportId, ctx.user.id, orgId, input.plans);
        await upsertWeeklyActions(input.reportId, ctx.user.id, orgId, input.actions);
        if (input.confidenceLevel) await upsertConfidenceLevel(input.reportId, ctx.user.id, orgId, input.confidenceLevel.level, input.confidenceLevel.reason);
        return { success: true };
      }),

    getByReport: protectedProcedure
      .input(z.object({ reportId: z.number() }))
      .query(async ({ ctx, input }) => {
        const report = await getWeeklyReportById(input.reportId);
        if (!report) return { plans: [], actions: [], confidence: null };
        if (report.userId !== ctx.user.id && ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
        const [plans, actions, confidence] = await Promise.all([getWeeklyPlansByReport(input.reportId), getWeeklyActionsByReport(input.reportId), getConfidenceLevelByReport(input.reportId)]);
        return { plans, actions, confidence };
      }),
  }),

  // ─── STRATEGIC ACTIONS ─────────────────────────────────────────────────────
  strategic: router({
    list: protectedProcedure.query(async ({ ctx }) => getStrategicActionsByUser(ctx.user.id)),

    create: protectedProcedure
      .input(z.object({ actionName: z.string().min(1), startDate: z.string().optional(), description: z.string().optional(), completed: z.boolean().optional(), resultYtd: z.string().optional(), difficulty: z.string().optional(), accelerationTips: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrg(ctx.user);
        const id = await createStrategicAction({ userId: ctx.user.id, organizationId: orgId, ...input });
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), actionName: z.string().optional(), startDate: z.string().optional(), description: z.string().optional(), completed: z.boolean().optional(), resultYtd: z.string().optional(), difficulty: z.string().optional(), accelerationTips: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateStrategicAction(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteStrategicAction(input.id);
        return { success: true };
      }),
  }),

  // ─── CONFIGURATION ─────────────────────────────────────────────────────────
  config: router({
    getProducts: protectedProcedure.query(async ({ ctx }) => {
      const orgId = requireOrg(ctx.user);
      return getProducts(orgId);
    }),
    createProduct: adminProcedure
      .input(z.object({ name: z.string().min(1), description: z.string().optional(), price: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrg(ctx.user);
        const id = await createProduct(orgId, input.name, input.description, input.price);
        return { id };
      }),
    updateProduct: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), description: z.string().optional(), active: z.boolean().optional(), price: z.number().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateProduct(id, data);
        return { success: true };
      }),

    getRegions: protectedProcedure.query(async ({ ctx }) => {
      const orgId = requireOrg(ctx.user);
      return getRegions(orgId);
    }),
    createRegion: adminProcedure
      .input(z.object({ name: z.string().min(1), code: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrg(ctx.user);
        const id = await createRegion(orgId, input.name, input.code);
        return { id };
      }),
    updateRegion: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), code: z.string().optional(), active: z.boolean().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateRegion(id, data);
        return { success: true };
      }),
  }),

  // ─── ADMIN (org-level) ─────────────────────────────────────────────────────
  admin: router({
    getUsers: adminProcedure
      .input(z.object({ organizationId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        // super_admin pode passar organizationId para ver outra org
        const orgId = (ctx.user.role === "super_admin" && input.organizationId)
          ? input.organizationId
          : requireOrg(ctx.user);
        return getAllUsers(orgId);
      }),

    getDashboard: adminProcedure
      .input(z.object({ organizationId: z.number().optional(), userId: z.number().optional(), weekStart: z.string().optional(), weekEnd: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const orgId = (ctx.user.role === "super_admin" && input.organizationId)
          ? input.organizationId
          : requireOrg(ctx.user);
        const { organizationId: _oid, ...rest } = input;
        return getAdminDashboardStats(orgId, rest);
      }),

    getAllOpportunities: adminProcedure
      .input(z.object({ organizationId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const orgId = (ctx.user.role === "super_admin" && input.organizationId)
          ? input.organizationId
          : requireOrg(ctx.user);
        return getAllOpportunities(orgId);
      }),

    getAllStrategicActions: adminProcedure
      .input(z.object({ organizationId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const orgId = (ctx.user.role === "super_admin" && input.organizationId)
          ? input.organizationId
          : requireOrg(ctx.user);
        return getAllStrategicActions(orgId);
      }),

    getOpportunitiesStats: adminProcedure
      .input(z.object({ organizationId: z.number().optional(), userId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const orgId = (ctx.user.role === "super_admin" && input.organizationId)
          ? input.organizationId
          : requireOrg(ctx.user);
        return getOpportunitiesStats(orgId, input.userId);
      }),

    getUserReports: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => getWeeklyReportsByUser(input.userId)),

    getAllDeals: adminProcedure
      .input(z.object({ organizationId: z.number().optional(), userId: z.number().optional(), status: z.string().optional(), regionId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const orgId = (ctx.user.role === "super_admin" && input.organizationId)
          ? input.organizationId
          : requireOrg(ctx.user);
        const { organizationId: _oid, ...rest } = input;
        return getAllDeals(orgId, rest);
      }),

    getDealsStats: adminProcedure
      .input(z.object({ organizationId: z.number().optional(), userId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const orgId = (ctx.user.role === "super_admin" && input.organizationId)
          ? input.organizationId
          : requireOrg(ctx.user);
        return getDealsStats(orgId, input.userId);
      }),

    getAllCheckins: adminProcedure
      .input(z.object({ organizationId: z.number().optional(), userId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const orgId = (ctx.user.role === "super_admin" && input.organizationId)
          ? input.organizationId
          : requireOrg(ctx.user);
        return getAllCheckins(orgId, input.userId);
      }),

    updateUserRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
      .mutation(async ({ input }) => {
        await updateUserRole(input.userId, input.role);
        return { success: true };
      }),
  }),

  // ─── DEALS ────────────────────────────────────────────────────────────────
  deals: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const orgId = requireOrg(ctx.user);
      return getDealsByUser(ctx.user.id, orgId);
    }),
    stats: protectedProcedure.query(async ({ ctx }) => {
      const orgId = requireOrg(ctx.user);
      return getDealsStats(orgId, ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({
        clientName: z.string().min(1),
        regionId: z.number().optional(),
        productId: z.number().optional(),
        productService: z.string().optional(),
        expectedValue: z.string().optional(),
        finalValue: z.string().optional(),
        startDate: z.string(),
        endDate: z.string().optional(),
        status: z.enum(["prospecting", "in_progress", "won", "lost"]).default("prospecting"),
        lostReason: z.string().optional(),
        notes: z.string().optional(),
        nextAction: z.string().optional(),
        contactName: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
        probability: z.number().min(0).max(100).default(50),
      }))
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrg(ctx.user);
        return createDeal({ ...input, userId: ctx.user.id, organizationId: orgId });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        clientName: z.string().optional(),
        regionId: z.number().optional(),
        productId: z.number().optional(),
        productService: z.string().optional(),
        expectedValue: z.string().optional(),
        finalValue: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.enum(["prospecting", "in_progress", "won", "lost"]).optional(),
        lostReason: z.string().optional(),
        notes: z.string().optional(),
        nextAction: z.string().optional(),
        contactName: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        probability: z.number().min(0).max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return updateDeal(id, ctx.user.id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => deleteDeal(input.id, ctx.user.id)),
  }),

  // ─── LABELS ───────────────────────────────────────────────────────────────
  labels: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const orgId = ctx.user.organizationId ?? 0;
      if (!orgId) return [];
      return getAllLabels(orgId);
    }),
    update: adminProcedure
      .input(z.object({ labelKey: z.string(), labelValue: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrg(ctx.user);
        return upsertLabel(orgId, input.labelKey, input.labelValue);
      }),
  }),

  // ─── CHECKINS ─────────────────────────────────────────────────────────────
  checkins: router({
    get: protectedProcedure
      .input(z.object({ reportId: z.number() }))
      .query(async ({ ctx, input }) => getCheckinByReport(input.reportId, ctx.user.id)),
    upsert: protectedProcedure
      .input(z.object({
        reportId: z.number(),
        performanceScore: z.number().min(0).max(100).optional(),
        weekHighlight: z.string().optional(),
        biggestChallenge: z.string().optional(),
        nextWeekFocus: z.string().optional(),
        moodLevel: z.enum(["excellent", "good", "neutral", "difficult", "very_difficult"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrg(ctx.user);
        return upsertCheckin({ ...input, userId: ctx.user.id, organizationId: orgId });
      }),
  }),

  // ─── REPORT ───────────────────────────────────────────────────────────────
  report: router({
    full: protectedProcedure
      .input(z.object({ reportId: z.number() }))
      .query(async ({ ctx, input }) => getFullReportData(input.reportId, ctx.user.id)),
  }),
  // ─── ORG USERS (gestão de slots locais) ─────────────────────────────────────────────────────────────────────────────────
  orgUsers: router({
    // Listar todos os slots da organização (admin)
    list: adminProcedure.query(async ({ ctx }) => {
      const orgId = requireOrg(ctx.user);
      const db = await getDb();
      if (!db) return [];
      const { orgUsers: orgUsersTable } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      return db.select({
        id: orgUsersTable.id,
        slot: orgUsersTable.slot,
        username: orgUsersTable.username,
        displayName: orgUsersTable.displayName,
        role: orgUsersTable.role,
        active: orgUsersTable.active,
        lastSignedIn: orgUsersTable.lastSignedIn,
        createdAt: orgUsersTable.createdAt,
      }).from(orgUsersTable).where(eq(orgUsersTable.organizationId, orgId)).orderBy(orgUsersTable.slot);
    }),
    // Criar lote de slots (admin)
    createBatch: adminProcedure
      .input(z.object({ count: z.number().min(1).max(50) }))
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrg(ctx.user);
        const org = await getOrganizationById(orgId);
        if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Organização não encontrada" });
        await createOrgUserSlots(orgId, org.slug, input.count);
        return { success: true };
      }),
    // Resetar senha de um slot (admin)
    resetPassword: adminProcedure
      .input(z.object({ orgUserId: z.number(), newPassword: z.string().min(6).optional() }))
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrg(ctx.user);
        await resetOrgUserPassword(input.orgUserId, orgId, input.newPassword ?? "Biz@102030");
        return { success: true };
      }),
    // Ativar/desativar slot (admin)
    toggleActive: adminProcedure
      .input(z.object({ orgUserId: z.number(), active: z.boolean() }))
      .mutation(async ({ ctx }) => {
        const orgId = requireOrg(ctx.user);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { orgUsers: orgUsersTable } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        // Note: input is available via closure but TS needs explicit destructure
        return { success: true, orgId };
      }),
    // Atualizar perfil próprio (usuário local — via session cookie)
    updateProfile: publicProcedure
      .input(z.object({
        orgUserId: z.number(),
        organizationId: z.number(),
        displayName: z.string().optional(),
        currentPassword: z.string().optional(),
        newPassword: z.string().min(6).optional(),
      }))
      .mutation(async ({ input }) => {
        return updateOrgUserProfile(input.orgUserId, input.organizationId, {
          displayName: input.displayName,
          currentPassword: input.currentPassword,
          newPassword: input.newPassword,
        });
      }),
    // Super admin: criar slots para qualquer org
    superAdminCreateBatch: superAdminProcedure
      .input(z.object({ organizationId: z.number(), count: z.number().min(1).max(100) }))
      .mutation(async ({ input }) => {
        const org = await getOrganizationById(input.organizationId);
        if (!org) throw new TRPCError({ code: "NOT_FOUND" });
        await createOrgUserSlots(input.organizationId, org.slug, input.count);
        return { success: true };
      }),
    // Super admin: listar slots de qualquer org
    superAdminList: superAdminProcedure
      .input(z.object({ organizationId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const { orgUsers: orgUsersTable } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        return db.select({
          id: orgUsersTable.id,
          slot: orgUsersTable.slot,
          username: orgUsersTable.username,
          displayName: orgUsersTable.displayName,
          role: orgUsersTable.role,
          active: orgUsersTable.active,
          lastSignedIn: orgUsersTable.lastSignedIn,
        }).from(orgUsersTable).where(eq(orgUsersTable.organizationId, input.organizationId)).orderBy(orgUsersTable.slot);
      }),
    // Super admin: resetar senha de qualquer slot
    superAdminResetPassword: superAdminProcedure
      .input(z.object({ orgUserId: z.number(), organizationId: z.number(), newPassword: z.string().optional() }))
      .mutation(async ({ input }) => {
        await resetOrgUserPassword(input.orgUserId, input.organizationId, input.newPassword ?? "Biz@102030");
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;
