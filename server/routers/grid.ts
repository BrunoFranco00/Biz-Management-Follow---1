/**
 * Smart Grid Router
 * Módulo de Planejamento Dinâmico — colunas configuráveis pelo admin,
 * preenchimento pelo vendedor, cálculos automáticos e widgets de dashboard.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getOrCreateTemplate,
  updateTemplate,
  getColumns,
  addColumn,
  updateColumn,
  deleteColumn,
  reorderColumns,
  getRowsByUser,
  getAllRows,
  upsertRow,
  deleteRow,
  deleteRowAdmin,
  computeFormulas,
  computeColumnStats,
} from "../gridDb";

// ─── Middleware helpers ───────────────────────────────────────────────────────

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

function requireOrg(user: { organizationId?: number | null; role: string }) {
  if (!user.organizationId) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "You must belong to an organization" });
  }
  return user.organizationId;
}

// ─── Enums ────────────────────────────────────────────────────────────────────

const columnTypeEnum = z.enum(["text", "number", "select", "date", "checkbox", "formula"]);
const formulaTypeEnum = z.enum([
  "sum", "average", "percentage", "weighted_average",
  "weighted_sum", "count", "max", "min", "custom",
]);

// ─── Router ───────────────────────────────────────────────────────────────────

export const gridRouter = router({
  // Buscar template + colunas da org
  getTemplate: protectedProcedure.query(async ({ ctx }) => {
    const orgId = requireOrg(ctx.user);
    const template = await getOrCreateTemplate(orgId);
    const columns = await getColumns(template.id);
    return { template, columns };
  }),

  // Admin: atualizar nome/descrição do template
  updateTemplate: adminProcedure
    .input(z.object({ name: z.string().optional(), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrg(ctx.user);
      const template = await getOrCreateTemplate(orgId);
      await updateTemplate(template.id, input);
      return { success: true };
    }),

  // Admin: adicionar coluna
  addColumn: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      columnType: columnTypeEnum,
      selectOptions: z.string().optional(),
      formulaType: formulaTypeEnum.optional(),
      formulaSourceColumns: z.string().optional(),
      formulaWeightColumn: z.number().optional(),
      formulaBase: z.string().optional(),
      width: z.number().optional(),
      sortOrder: z.number().optional(),
      showInDashboard: z.boolean().optional(),
      accentColor: z.string().optional(),
      unit: z.string().optional(),
      required: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrg(ctx.user);
      const template = await getOrCreateTemplate(orgId);
      const cols = await getColumns(template.id);
      const nextOrder = cols.length;
      return addColumn({
        ...input,
        templateId: template.id,
        organizationId: orgId,
        sortOrder: input.sortOrder ?? nextOrder,
        isEditable: input.columnType !== "formula",
      });
    }),

  // Admin: atualizar coluna
  updateColumn: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      columnType: columnTypeEnum.optional(),
      selectOptions: z.string().nullable().optional(),
      formulaType: formulaTypeEnum.nullable().optional(),
      formulaSourceColumns: z.string().nullable().optional(),
      formulaWeightColumn: z.number().nullable().optional(),
      formulaBase: z.string().nullable().optional(),
      width: z.number().optional(),
      sortOrder: z.number().optional(),
      showInDashboard: z.boolean().optional(),
      accentColor: z.string().nullable().optional(),
      unit: z.string().nullable().optional(),
      required: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateColumn(id, data as any);
    }),

  // Admin: deletar coluna
  deleteColumn: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteColumn(input.id);
      return { success: true };
    }),

  // Admin: reordenar colunas
  reorderColumns: adminProcedure
    .input(z.object({ columnIds: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      await reorderColumns(input.columnIds);
      return { success: true };
    }),

  // Usuário: buscar suas linhas
  getMyRows: protectedProcedure.query(async ({ ctx }) => {
    const orgId = requireOrg(ctx.user);
    const template = await getOrCreateTemplate(orgId);
    const columns = await getColumns(template.id);
    const rows = await getRowsByUser(template.id, ctx.user.id);
    const computed = computeFormulas(rows, columns);
    const stats = computeColumnStats(rows, columns);
    return { template, columns, rows: computed, stats };
  }),

  // Usuário: salvar linha (criar ou atualizar)
  saveRow: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      rowOrder: z.number(),
      data: z.record(z.string(), z.any()),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrg(ctx.user);
      const template = await getOrCreateTemplate(orgId);
      return upsertRow({
        id: input.id,
        templateId: template.id,
        organizationId: orgId,
        userId: ctx.user.id,
        rowOrder: input.rowOrder,
        data: JSON.stringify(input.data),
      });
    }),

  // Usuário: deletar linha
  deleteRow: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteRow(input.id, ctx.user.id);
      return { success: true };
    }),

  // Admin: ver todas as linhas de todos os usuários
  getAdminView: adminProcedure
    .input(z.object({ organizationId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const orgId = (ctx.user.role === "super_admin" && input.organizationId)
        ? input.organizationId
        : requireOrg(ctx.user);
      const template = await getOrCreateTemplate(orgId);
      const columns = await getColumns(template.id);
      const allRows = await getAllRows(template.id);
      const rawRows = allRows.map(r => r.row);
      const computed = computeFormulas(rawRows, columns);
      const stats = computeColumnStats(rawRows, columns);
      const byUser: Record<number, {
        user: { id: number; displayName: string | null; username: string; slot: number };
        rows: typeof computed;
      }> = {};
      for (let i = 0; i < allRows.length; i++) {
        const { user } = allRows[i];
        if (!user) continue;
        if (!byUser[user.id]) byUser[user.id] = { user, rows: [] };
        byUser[user.id].rows.push(computed[i]);
      }
      return { template, columns, byUser: Object.values(byUser), stats };
    }),

  // Admin: salvar/editar linha de qualquer usuário
  adminSaveRow: adminProcedure
    .input(z.object({
      id: z.number().optional(),
      userId: z.number(),
      rowOrder: z.number(),
      data: z.record(z.string(), z.any()),
      organizationId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx.user.role === "super_admin" && input.organizationId)
        ? input.organizationId
        : requireOrg(ctx.user);
      const template = await getOrCreateTemplate(orgId);
      return upsertRow({
        id: input.id,
        templateId: template.id,
        organizationId: orgId,
        userId: input.userId,
        rowOrder: input.rowOrder,
        data: JSON.stringify(input.data),
      });
    }),

  // Admin: deletar linha de qualquer usuário
  adminDeleteRow: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteRowAdmin(input.id);
      return { success: true };
    }),

  // Dashboard: widgets dinâmicos do grid
  getDashboardWidgets: protectedProcedure.query(async ({ ctx }) => {
    const orgId = requireOrg(ctx.user);
    const template = await getOrCreateTemplate(orgId);
    const columns = await getColumns(template.id);
    const rows = await getRowsByUser(template.id, ctx.user.id);
    const allRows = await getAllRows(template.id);
    const rawAllRows = allRows.map(r => r.row);
    const myStats = computeColumnStats(rows, columns);
    const orgStats = computeColumnStats(rawAllRows, columns);
    const dashboardCols = columns.filter(c => c.showInDashboard);
    return {
      columns: dashboardCols,
      myStats,
      orgStats,
      totalRows: rawAllRows.length,
      myRows: rows.length,
    };
  }),
});
