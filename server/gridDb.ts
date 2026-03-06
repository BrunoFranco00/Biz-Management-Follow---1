/**
 * Smart Grid — Database Helpers
 * Funções de acesso ao banco para o módulo de Planejamento Dinâmico.
 */
import { getDb } from "./db";
import {
  gridTemplates,
  gridColumns,
  gridRows,
  orgUsers,
  type GridColumn,
  type GridRow,
} from "../drizzle/schema";
import { eq, and, asc } from "drizzle-orm";

// ─── TEMPLATES ────────────────────────────────────────────────────────────────

export async function getOrCreateTemplate(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const existing = await db
    .select()
    .from(gridTemplates)
    .where(and(eq(gridTemplates.organizationId, organizationId), eq(gridTemplates.active, true)))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const [result] = await db.insert(gridTemplates).values({
    organizationId,
    name: "Planejamento",
    active: true,
  });
  const insertId = (result as any).insertId;
  const [tmpl] = await db.select().from(gridTemplates).where(eq(gridTemplates.id, insertId));
  return tmpl;
}

export async function updateTemplate(id: number, data: { name?: string; description?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.update(gridTemplates).set(data).where(eq(gridTemplates.id, id));
}

// ─── COLUMNS ──────────────────────────────────────────────────────────────────

export async function getColumns(templateId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(gridColumns)
    .where(eq(gridColumns.templateId, templateId))
    .orderBy(asc(gridColumns.sortOrder));
}

export async function addColumn(data: {
  templateId: number;
  organizationId: number;
  name: string;
  columnType: "text" | "number" | "select" | "date" | "checkbox" | "formula";
  selectOptions?: string | null;
  formulaType?: "sum" | "average" | "percentage" | "weighted_average" | "weighted_sum" | "count" | "max" | "min" | "custom" | null;
  formulaSourceColumns?: string | null;
  formulaWeightColumn?: number | null;
  formulaBase?: string | null;
  width?: number;
  sortOrder?: number;
  isEditable?: boolean;
  showInDashboard?: boolean;
  accentColor?: string | null;
  unit?: string | null;
  required?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const [result] = await db.insert(gridColumns).values({
    ...data,
    isEditable: data.columnType === "formula" ? false : (data.isEditable ?? true),
  });
  const insertId = (result as any).insertId;
  const [col] = await db.select().from(gridColumns).where(eq(gridColumns.id, insertId));
  return col;
}

export async function updateColumn(id: number, data: Partial<{
  name: string;
  columnType: "text" | "number" | "select" | "date" | "checkbox" | "formula";
  selectOptions: string | null;
  formulaType: "sum" | "average" | "percentage" | "weighted_average" | "weighted_sum" | "count" | "max" | "min" | "custom" | null;
  formulaSourceColumns: string | null;
  formulaWeightColumn: number | null;
  formulaBase: string | null;
  width: number;
  sortOrder: number;
  isEditable: boolean;
  showInDashboard: boolean;
  accentColor: string | null;
  unit: string | null;
  required: boolean;
}>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(gridColumns).set(data).where(eq(gridColumns.id, id));
  const [col] = await db.select().from(gridColumns).where(eq(gridColumns.id, id));
  return col;
}

export async function deleteColumn(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(gridColumns).where(eq(gridColumns.id, id));
}

export async function reorderColumns(columnIds: number[]) {
  const db = await getDb();
  if (!db) return;
  for (let i = 0; i < columnIds.length; i++) {
    await db.update(gridColumns).set({ sortOrder: i }).where(eq(gridColumns.id, columnIds[i]));
  }
}

// ─── ROWS ─────────────────────────────────────────────────────────────────────

export async function getRowsByUser(templateId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(gridRows)
    .where(and(eq(gridRows.templateId, templateId), eq(gridRows.userId, userId)))
    .orderBy(asc(gridRows.rowOrder));
}

export async function getAllRows(templateId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      row: gridRows,
      user: {
        id: orgUsers.id,
        displayName: orgUsers.displayName,
        username: orgUsers.username,
        slot: orgUsers.slot,
      },
    })
    .from(gridRows)
    .leftJoin(orgUsers, eq(gridRows.userId, orgUsers.id))
    .where(eq(gridRows.templateId, templateId))
    .orderBy(asc(orgUsers.slot), asc(gridRows.rowOrder));
}

export async function upsertRow(data: {
  id?: number;
  templateId: number;
  organizationId: number;
  userId: number;
  rowOrder: number;
  data: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  if (data.id) {
    await db.update(gridRows).set({ data: data.data, rowOrder: data.rowOrder }).where(eq(gridRows.id, data.id));
    const [row] = await db.select().from(gridRows).where(eq(gridRows.id, data.id));
    return row;
  } else {
    const [result] = await db.insert(gridRows).values({
      templateId: data.templateId,
      organizationId: data.organizationId,
      userId: data.userId,
      rowOrder: data.rowOrder,
      data: data.data,
    });
    const insertId = (result as any).insertId;
    const [row] = await db.select().from(gridRows).where(eq(gridRows.id, insertId));
    return row;
  }
}

export async function deleteRow(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(gridRows).where(and(eq(gridRows.id, id), eq(gridRows.userId, userId)));
}

export async function deleteRowAdmin(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(gridRows).where(eq(gridRows.id, id));
}

// ─── CALCULATIONS ─────────────────────────────────────────────────────────────

/**
 * Calcula os valores de colunas do tipo "formula" para um conjunto de linhas.
 */
export function computeFormulas(
  rows: GridRow[],
  columns: GridColumn[]
): Array<GridRow & { computedData: Record<string, unknown> }> {
  const formulaCols = columns.filter((c) => c.columnType === "formula");

  return rows.map((row) => {
    const rowData: Record<string, unknown> = (() => {
      try { return JSON.parse(row.data || "{}"); } catch { return {}; }
    })();

    for (const col of formulaCols) {
      const sourceIds: number[] = (() => {
        try { return JSON.parse(col.formulaSourceColumns || "[]"); } catch { return []; }
      })();

      const sourceValues = sourceIds
        .map((id) => parseFloat(String(rowData[`col_${id}`] ?? "0")))
        .filter((v) => !isNaN(v));

      let result: number | null = null;

      switch (col.formulaType) {
        case "sum":
          result = sourceValues.reduce((a, b) => a + b, 0);
          break;
        case "average":
          result = sourceValues.length > 0
            ? sourceValues.reduce((a, b) => a + b, 0) / sourceValues.length
            : 0;
          break;
        case "count":
          result = sourceValues.length;
          break;
        case "max":
          result = sourceValues.length > 0 ? Math.max(...sourceValues) : 0;
          break;
        case "min":
          result = sourceValues.length > 0 ? Math.min(...sourceValues) : 0;
          break;
        case "percentage": {
          const base = parseFloat(col.formulaBase || "100");
          const val = sourceValues[0] ?? 0;
          result = base !== 0 ? (val / base) * 100 : 0;
          break;
        }
        case "weighted_average": {
          if (col.formulaWeightColumn && sourceIds.length > 0) {
            const weight = parseFloat(String(rowData[`col_${col.formulaWeightColumn}`] ?? "1"));
            const total = sourceValues.reduce((a, b) => a + b, 0);
            result = weight !== 0 ? total / weight : 0;
          }
          break;
        }
        case "weighted_sum": {
          if (col.formulaWeightColumn) {
            const weight = parseFloat(String(rowData[`col_${col.formulaWeightColumn}`] ?? "1"));
            result = sourceValues.reduce((a, b) => a + b, 0) * weight;
          }
          break;
        }
      }

      if (result !== null) {
        rowData[`col_${col.id}`] = Math.round(result * 100) / 100;
      }
    }

    return { ...row, computedData: rowData };
  });
}

/**
 * Calcula estatísticas agregadas de todas as linhas para cada coluna.
 */
export function computeColumnStats(
  rows: GridRow[],
  columns: GridColumn[]
): Record<number, {
  sum: number;
  average: number;
  count: number;
  min: number;
  max: number;
  distribution?: Record<string, number>;
}> {
  const stats: Record<number, any> = {};

  for (const col of columns) {
    if (col.columnType === "number" || col.columnType === "formula") {
      const values = rows
        .map((r) => {
          const d = (() => { try { return JSON.parse(r.data || "{}"); } catch { return {}; } })();
          return parseFloat(String(d[`col_${col.id}`] ?? ""));
        })
        .filter((v) => !isNaN(v));

      stats[col.id] = {
        sum: Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100,
        average: values.length > 0
          ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
          : 0,
        count: values.length,
        min: values.length > 0 ? Math.min(...values) : 0,
        max: values.length > 0 ? Math.max(...values) : 0,
      };
    } else if (col.columnType === "select") {
      const distribution: Record<string, number> = {};
      for (const row of rows) {
        const d = (() => { try { return JSON.parse(row.data || "{}"); } catch { return {}; } })();
        const val = String(d[`col_${col.id}`] ?? "");
        if (val) distribution[val] = (distribution[val] || 0) + 1;
      }
      stats[col.id] = { sum: 0, average: 0, count: rows.length, min: 0, max: 0, distribution };
    }
  }

  return stats;
}
