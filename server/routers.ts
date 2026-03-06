import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createOpportunity,
  createProduct,
  createRegion,
  createStrategicAction,
  deleteOpportunity,
  deleteStrategicAction,
  getActivitiesByReport,
  getAdminDashboardStats,
  getAllOpportunities,
  getAllStrategicActions,
  getAllUsers,
  getConfidenceLevelByReport,
  getKpiMetricsByReport,
  getLeadSourcesByReport,
  getObjectionsByReport,
  getOpportunitiesByUser,
  getOpportunitiesStats,
  getOrCreateWeeklyReport,
  getProducts,
  getRegions,
  getSalesFunnelByReport,
  getStrategicActionsByUser,
  getWeeklyActionsByReport,
  getWeeklyPlansByReport,
  getWeeklyReportById,
  getWeeklyReportsByUser,
  updateOpportunity,
  updateProduct,
  updateRegion,
  updateStrategicAction,
  updateWeeklyReport,
  upsertActivities,
  upsertConfidenceLevel,
  upsertKpiMetrics,
  upsertLeadSources,
  upsertObjections,
  upsertOperationalDifficulties,
  upsertSalesFunnel,
  upsertWeeklyActions,
  upsertWeeklyPlans,
  // Deals
  getDealsByUser,
  getAllDeals,
  createDeal,
  updateDeal,
  deleteDeal,
  getDealsStats,
  // Labels
  getAllLabels,
  upsertLabel,
  // Checkins
  getCheckinByReport,
  upsertCheckin,
  getAllCheckins,
  // Report
  getFullReportData,
} from "./db";

// Admin middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

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

  // ─── WEEKLY REPORTS ────────────────────────────────────────────────────────
  reports: router({
    getOrCreate: protectedProcedure
      .input(z.object({ weekStart: z.string(), weekEnd: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return getOrCreateWeeklyReport(ctx.user.id, input.weekStart, input.weekEnd);
      }),

    update: protectedProcedure
      .input(z.object({
        reportId: z.number(),
        highlights: z.string().optional(),
        challenges: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const report = await getWeeklyReportById(input.reportId);
        if (!report || report.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await updateWeeklyReport(input.reportId, {
          highlights: input.highlights,
          challenges: input.challenges,
        });
        return { success: true };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return getWeeklyReportsByUser(ctx.user.id);
    }),

    getById: protectedProcedure
      .input(z.object({ reportId: z.number() }))
      .query(async ({ ctx, input }) => {
        const report = await getWeeklyReportById(input.reportId);
        if (!report) return null;
        if (report.userId !== ctx.user.id && ctx.user.role !== "admin") {
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
        metrics: z.array(z.object({
          metricName: z.string(),
          target: z.number().optional(),
          realized: z.number().optional(),
          unit: z.string().optional(),
          notes: z.string().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const report = await getWeeklyReportById(input.reportId);
        if (!report || report.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await upsertKpiMetrics(input.reportId, ctx.user.id, input.metrics);
        return { success: true };
      }),

    getByReport: protectedProcedure
      .input(z.object({ reportId: z.number() }))
      .query(async ({ ctx, input }) => {
        const report = await getWeeklyReportById(input.reportId);
        if (!report) return [];
        if (report.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getKpiMetricsByReport(input.reportId);
      }),
  }),

  // ─── SALES FUNNEL ──────────────────────────────────────────────────────────
  funnel: router({
    upsert: protectedProcedure
      .input(z.object({
        reportId: z.number(),
        entries: z.array(z.object({
          stage: z.enum(["prospecting", "qualification", "presentation", "negotiation", "closing"]),
          quantity: z.number(),
          totalValue: z.number(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const report = await getWeeklyReportById(input.reportId);
        if (!report || report.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await upsertSalesFunnel(input.reportId, ctx.user.id, input.entries);
        return { success: true };
      }),

    getByReport: protectedProcedure
      .input(z.object({ reportId: z.number() }))
      .query(async ({ ctx, input }) => {
        const report = await getWeeklyReportById(input.reportId);
        if (!report) return [];
        if (report.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getSalesFunnelByReport(input.reportId);
      }),
  }),

  // ─── OPPORTUNITIES ─────────────────────────────────────────────────────────
  opportunities: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getOpportunitiesByUser(ctx.user.id);
    }),

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
        const id = await createOpportunity({ userId: ctx.user.id, ...input });
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
      return getOpportunitiesStats(ctx.user.id);
    }),
  }),

  // ─── ACTIVITIES ────────────────────────────────────────────────────────────
  activities: router({
    upsert: protectedProcedure
      .input(z.object({
        reportId: z.number(),
        activities: z.array(z.object({
          activityType: z.enum(["calls", "emails", "whatsapp", "in_person_visits", "meetings_scheduled"]),
          target: z.number(),
          realized: z.number(),
          notes: z.string().optional(),
        })),
        leadSources: z.array(z.object({
          source: z.enum(["referral", "active_prospecting", "inbound", "networking", "other"]),
          quantity: z.number(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const report = await getWeeklyReportById(input.reportId);
        if (!report || report.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await upsertActivities(input.reportId, ctx.user.id, input.activities);
        if (input.leadSources) {
          await upsertLeadSources(input.reportId, ctx.user.id, input.leadSources);
        }
        return { success: true };
      }),

    getByReport: protectedProcedure
      .input(z.object({ reportId: z.number() }))
      .query(async ({ ctx, input }) => {
        const report = await getWeeklyReportById(input.reportId);
        if (!report) return { activities: [], leadSources: [] };
        if (report.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const [acts, sources] = await Promise.all([
          getActivitiesByReport(input.reportId),
          getLeadSourcesByReport(input.reportId),
        ]);
        return { activities: acts, leadSources: sources };
      }),
  }),

  // ─── OBJECTIONS ────────────────────────────────────────────────────────────
  objections: router({
    upsert: protectedProcedure
      .input(z.object({
        reportId: z.number(),
        objections: z.array(z.object({
          objectionText: z.string(),
          frequency: z.number(),
          responseUsed: z.string().optional(),
          worked: z.boolean().optional(),
          needsHelp: z.boolean().optional(),
        })),
        difficulties: z.array(z.object({
          difficultyType: z.enum(["crm_issues", "lack_of_materials", "technical_doubts", "contact_difficulties", "schedule_issues", "lack_of_support", "other"]),
          description: z.string().optional(),
          suggestedSolution: z.string().optional(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const report = await getWeeklyReportById(input.reportId);
        if (!report || report.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await upsertObjections(input.reportId, ctx.user.id, input.objections);
        if (input.difficulties) {
          await upsertOperationalDifficulties(input.reportId, ctx.user.id, input.difficulties);
        }
        return { success: true };
      }),

    getByReport: protectedProcedure
      .input(z.object({ reportId: z.number() }))
      .query(async ({ ctx, input }) => {
        const report = await getWeeklyReportById(input.reportId);
        if (!report) return { objections: [] };
        if (report.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return { objections: await getObjectionsByReport(input.reportId) };
      }),
  }),

  // ─── WEEKLY PLANNING ───────────────────────────────────────────────────────
  planning: router({
    upsert: protectedProcedure
      .input(z.object({
        reportId: z.number(),
        plans: z.array(z.object({
          metricName: z.string(),
          target: z.number().optional(),
          howToAchieve: z.string().optional(),
        })),
        actions: z.array(z.object({
          priority: z.number(),
          actionDescription: z.string(),
          deadline: z.string().optional(),
          status: z.enum(["pending", "in_progress", "done", "cancelled"]).optional(),
        })),
        confidenceLevel: z.object({
          level: z.enum(["very_confident", "confident", "moderately_confident", "low_confidence", "worried"]),
          reason: z.string().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const report = await getWeeklyReportById(input.reportId);
        if (!report || report.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await upsertWeeklyPlans(input.reportId, ctx.user.id, input.plans);
        await upsertWeeklyActions(input.reportId, ctx.user.id, input.actions);
        if (input.confidenceLevel) {
          await upsertConfidenceLevel(
            input.reportId,
            ctx.user.id,
            input.confidenceLevel.level,
            input.confidenceLevel.reason
          );
        }
        return { success: true };
      }),

    getByReport: protectedProcedure
      .input(z.object({ reportId: z.number() }))
      .query(async ({ ctx, input }) => {
        const report = await getWeeklyReportById(input.reportId);
        if (!report) return { plans: [], actions: [], confidence: null };
        if (report.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const [plans, actions, confidence] = await Promise.all([
          getWeeklyPlansByReport(input.reportId),
          getWeeklyActionsByReport(input.reportId),
          getConfidenceLevelByReport(input.reportId),
        ]);
        return { plans, actions, confidence };
      }),
  }),

  // ─── STRATEGIC ACTIONS ─────────────────────────────────────────────────────
  strategic: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getStrategicActionsByUser(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        actionName: z.string().min(1),
        startDate: z.string().optional(),
        description: z.string().optional(),
        completed: z.boolean().optional(),
        resultYtd: z.string().optional(),
        difficulty: z.string().optional(),
        accelerationTips: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createStrategicAction({ userId: ctx.user.id, ...input });
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        actionName: z.string().optional(),
        startDate: z.string().optional(),
        description: z.string().optional(),
        completed: z.boolean().optional(),
        resultYtd: z.string().optional(),
        difficulty: z.string().optional(),
        accelerationTips: z.string().optional(),
      }))
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
    getProducts: protectedProcedure.query(async () => getProducts()),
    createProduct: adminProcedure
      .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
      .mutation(async ({ input }) => {
        const id = await createProduct(input.name, input.description);
        return { id };
      }),
    updateProduct: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), description: z.string().optional(), active: z.boolean().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateProduct(id, data);
        return { success: true };
      }),

    getRegions: protectedProcedure.query(async () => getRegions()),
    createRegion: adminProcedure
      .input(z.object({ name: z.string().min(1), code: z.string().optional() }))
      .mutation(async ({ input }) => {
        const id = await createRegion(input.name, input.code);
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

  // ─── ADMIN ─────────────────────────────────────────────────────────────────
  admin: router({
    getUsers: adminProcedure.query(async () => getAllUsers()),

    getDashboard: adminProcedure
      .input(z.object({
        userId: z.number().optional(),
        weekStart: z.string().optional(),
        weekEnd: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return getAdminDashboardStats(input);
      }),

    getAllOpportunities: adminProcedure.query(async () => getAllOpportunities()),

    getAllStrategicActions: adminProcedure.query(async () => getAllStrategicActions()),

    getOpportunitiesStats: adminProcedure
      .input(z.object({ userId: z.number().optional() }))
      .query(async ({ input }) => {
        return getOpportunitiesStats(input.userId);
      }),

     getUserReports: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const { getWeeklyReportsByUser } = await import("./db");
        return getWeeklyReportsByUser(input.userId);
      }),
    getAllDeals: adminProcedure
      .input(z.object({ userId: z.number().optional(), status: z.string().optional(), regionId: z.number().optional() }))
      .query(async ({ input }) => getAllDeals(input)),
    getDealsStats: adminProcedure
      .input(z.object({ userId: z.number().optional() }))
      .query(async ({ input }) => getDealsStats(input.userId)),
    getAllCheckins: adminProcedure
      .input(z.object({ userId: z.number().optional() }))
      .query(async ({ input }) => getAllCheckins(input.userId)),
  }),

  // ─── DEALS ────────────────────────────────────────────────────────────────
  deals: router({
    list: protectedProcedure.query(async ({ ctx }) => getDealsByUser(ctx.user.id)),
    stats: protectedProcedure.query(async ({ ctx }) => getDealsStats(ctx.user.id)),
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
        return createDeal({ ...input, userId: ctx.user.id });
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
    list: publicProcedure.query(async () => getAllLabels()),
    update: adminProcedure
      .input(z.object({ labelKey: z.string(), labelValue: z.string().min(1) }))
      .mutation(async ({ input }) => upsertLabel(input.labelKey, input.labelValue)),
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
      .mutation(async ({ ctx, input }) => upsertCheckin({ ...input, userId: ctx.user.id })),
  }),

  // ─── REPORT ───────────────────────────────────────────────────────────────
  report: router({
    full: protectedProcedure
      .input(z.object({ reportId: z.number() }))
      .query(async ({ ctx, input }) => getFullReportData(input.reportId, ctx.user.id)),
  }),
});
export type AppRouter = typeof appRouter;
