/**
 * Smart Grid — Unit Tests
 * Testa as funções de cálculo do gridDb sem dependência de banco de dados.
 */
import { describe, it, expect } from "vitest";
import { computeFormulas, computeColumnStats } from "./gridDb";
import type { GridColumn, GridRow } from "../drizzle/schema";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeCol(overrides: Partial<GridColumn>): GridColumn {
  return {
    id: 1,
    templateId: 1,
    organizationId: 1,
    name: "Col",
    columnType: "number",
    selectOptions: null,
    formulaType: null,
    formulaSourceColumns: null,
    formulaWeightColumn: null,
    formulaBase: null,
    width: 150,
    sortOrder: 0,
    isEditable: true,
    required: false,
    showInDashboard: false,
    accentColor: null,
    unit: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeRow(id: number, userId: number, data: Record<string, unknown>): GridRow {
  return {
    id,
    templateId: 1,
    organizationId: 1,
    userId,
    rowOrder: 0,
    data: JSON.stringify(data),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ─── computeFormulas ──────────────────────────────────────────────────────────
describe("computeFormulas", () => {
  it("should pass through rows when no formula columns exist", () => {
    const cols = [makeCol({ id: 1, name: "Area", columnType: "number" })];
    const rows = [makeRow(1, 10, { col_1: "100" })];
    const result = computeFormulas(rows, cols);
    expect(result).toHaveLength(1);
    expect(result[0].computedData["col_1"]).toBe("100");
  });

  it("should compute sum formula correctly", () => {
    const cols = [
      makeCol({ id: 1, name: "Area Soja", columnType: "number" }),
      makeCol({ id: 2, name: "Area Milho", columnType: "number" }),
      makeCol({
        id: 3,
        name: "Area Total",
        columnType: "formula",
        formulaType: "sum",
        formulaSourceColumns: JSON.stringify([1, 2]),
        isEditable: false,
      }),
    ];
    const rows = [makeRow(1, 10, { col_1: "200", col_2: "150" })];
    const result = computeFormulas(rows, cols);
    // 200 + 150 = 350
    expect(Number(result[0].computedData["col_3"])).toBe(350);
  });

  it("should compute percentage formula correctly", () => {
    const cols = [
      makeCol({ id: 1, name: "Realizado", columnType: "number" }),
      makeCol({
        id: 2,
        name: "% Atingimento",
        columnType: "formula",
        formulaType: "percentage",
        formulaSourceColumns: JSON.stringify([1]),
        formulaBase: "100",
        isEditable: false,
      }),
    ];
    const rows = [makeRow(1, 10, { col_1: "80" })];
    const result = computeFormulas(rows, cols);
    // (80 / 100) * 100 = 80
    expect(Number(result[0].computedData["col_2"])).toBe(80);
  });

  it("should return 0 when base is zero in percentage", () => {
    const cols = [
      makeCol({ id: 1, name: "Realizado", columnType: "number" }),
      makeCol({
        id: 2,
        name: "% Atingimento",
        columnType: "formula",
        formulaType: "percentage",
        formulaSourceColumns: JSON.stringify([1]),
        formulaBase: "0",
        isEditable: false,
      }),
    ];
    const rows = [makeRow(1, 10, { col_1: "50" })];
    const result = computeFormulas(rows, cols);
    expect(Number(result[0].computedData["col_2"])).toBe(0);
  });

  it("should compute average formula correctly", () => {
    const cols = [
      makeCol({ id: 1, name: "A", columnType: "number" }),
      makeCol({ id: 2, name: "B", columnType: "number" }),
      makeCol({
        id: 3,
        name: "Média",
        columnType: "formula",
        formulaType: "average",
        formulaSourceColumns: JSON.stringify([1, 2]),
        isEditable: false,
      }),
    ];
    const rows = [makeRow(1, 10, { col_1: "100", col_2: "200" })];
    const result = computeFormulas(rows, cols);
    // (100 + 200) / 2 = 150
    expect(Number(result[0].computedData["col_3"])).toBe(150);
  });
});

// ─── computeColumnStats ───────────────────────────────────────────────────────
describe("computeColumnStats", () => {
  it("should compute sum correctly for numeric column", () => {
    const cols = [makeCol({ id: 1, name: "Area Soja", columnType: "number" })];
    const rows = [
      makeRow(1, 10, { col_1: "200" }),
      makeRow(2, 11, { col_1: "150" }),
      makeRow(3, 12, { col_1: "300" }),
    ];
    const stats = computeColumnStats(rows, cols);
    expect(stats[1].sum).toBe(650);
    expect(stats[1].count).toBe(3);
  });

  it("should compute average correctly", () => {
    const cols = [makeCol({ id: 1, name: "Ticket Médio", columnType: "number" })];
    const rows = [
      makeRow(1, 10, { col_1: "100" }),
      makeRow(2, 11, { col_1: "200" }),
    ];
    const stats = computeColumnStats(rows, cols);
    expect(stats[1].average).toBe(150);
  });

  it("should return zero stats for empty rows", () => {
    const cols = [makeCol({ id: 1, name: "Vazio", columnType: "number" })];
    const stats = computeColumnStats([], cols);
    expect(stats[1].sum).toBe(0);
    expect(stats[1].count).toBe(0);
    expect(stats[1].average).toBe(0);
  });

  it("should count distinct values for select column", () => {
    const cols = [makeCol({ id: 1, name: "Estado", columnType: "select" })];
    const rows = [
      makeRow(1, 10, { col_1: "SP" }),
      makeRow(2, 11, { col_1: "MG" }),
      makeRow(3, 12, { col_1: "SP" }),
    ];
    const stats = computeColumnStats(rows, cols);
    expect(stats[1].count).toBe(3);
    expect(stats[1].distribution?.["SP"]).toBe(2);
    expect(stats[1].distribution?.["MG"]).toBe(1);
  });

  it("should compute min and max correctly", () => {
    const cols = [makeCol({ id: 1, name: "Valores", columnType: "number" })];
    const rows = [
      makeRow(1, 10, { col_1: "10" }),
      makeRow(2, 11, { col_1: "50" }),
      makeRow(3, 12, { col_1: "30" }),
    ];
    const stats = computeColumnStats(rows, cols);
    expect(stats[1].min).toBe(10);
    expect(stats[1].max).toBe(50);
  });
});
