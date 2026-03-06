/**
 * SmartGrid.tsx
 * Módulo de Planejamento Dinâmico — coração do negócio.
 *
 * Admin: configura colunas (tipos, fórmulas, cores), vê todos os usuários.
 * Vendedor: preenche seus dados com interface moderna de cards.
 */
import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Plus,
  Settings2,
  Trash2,
  Edit3,
  Save,
  X,
  ChevronUp,
  ChevronDown,
  Calculator,
  BarChart3,
  Users,
  Eye,
  GripVertical,
  Sparkles,
  TrendingUp,
  Hash,
  Type,
  List,
  Calendar,
  CheckSquare,
  Sigma,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ColumnType = "text" | "number" | "select" | "date" | "checkbox" | "formula";
type FormulaType = "sum" | "average" | "percentage" | "weighted_average" | "weighted_sum" | "count" | "max" | "min" | "custom";

interface GridColumn {
  id: number;
  name: string;
  columnType: ColumnType;
  selectOptions?: string | null;
  formulaType?: FormulaType | null;
  formulaSourceColumns?: string | null;
  formulaWeightColumn?: number | null;
  formulaBase?: string | null;
  width?: number | null;
  sortOrder: number;
  isEditable: boolean;
  showInDashboard: boolean;
  accentColor?: string | null;
  unit?: string | null;
  required: boolean;
}

interface GridRow {
  id: number;
  rowOrder: number;
  data: string;
  computedData: Record<string, unknown>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMN_TYPE_LABELS: Record<ColumnType, string> = {
  text: "Texto",
  number: "Número",
  select: "Lista",
  date: "Data",
  checkbox: "Sim/Não",
  formula: "Fórmula",
};

const FORMULA_TYPE_LABELS: Record<FormulaType, string> = {
  sum: "Soma",
  average: "Média",
  percentage: "Porcentagem (%)",
  weighted_average: "Média Ponderada",
  weighted_sum: "Soma Ponderada",
  count: "Contagem",
  max: "Máximo",
  min: "Mínimo",
  custom: "Personalizado",
};

const COLUMN_TYPE_ICONS: Record<ColumnType, React.ReactNode> = {
  text: <Type className="w-3.5 h-3.5" />,
  number: <Hash className="w-3.5 h-3.5" />,
  select: <List className="w-3.5 h-3.5" />,
  date: <Calendar className="w-3.5 h-3.5" />,
  checkbox: <CheckSquare className="w-3.5 h-3.5" />,
  formula: <Sigma className="w-3.5 h-3.5" />,
};

const ACCENT_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#f97316", "#ec4899",
  "#84cc16", "#64748b",
];

// ─── Column Form ──────────────────────────────────────────────────────────────

interface ColumnFormData {
  name: string;
  columnType: ColumnType;
  selectOptions: string;
  formulaType: FormulaType | "";
  formulaSourceColumns: number[];
  formulaWeightColumn: number | "";
  formulaBase: string;
  showInDashboard: boolean;
  accentColor: string;
  unit: string;
  required: boolean;
}

const defaultColumnForm = (): ColumnFormData => ({
  name: "",
  columnType: "text",
  selectOptions: "",
  formulaType: "",
  formulaSourceColumns: [],
  formulaWeightColumn: "",
  formulaBase: "100",
  showInDashboard: false,
  accentColor: "#3b82f6",
  unit: "",
  required: false,
});

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SmartGrid() {
  const { user } = useLocalAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const [activeTab, setActiveTab] = useState<"fill" | "admin_view" | "config">(
    isAdmin ? "fill" : "fill"
  );
  const [columnDialog, setColumnDialog] = useState(false);
  const [editingColumn, setEditingColumn] = useState<GridColumn | null>(null);
  const [columnForm, setColumnForm] = useState<ColumnFormData>(defaultColumnForm());
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editingRowData, setEditingRowData] = useState<Record<string, unknown>>({});
  const [addingRow, setAddingRow] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<string, unknown>>({});

  const utils = trpc.useUtils();

  // Queries
  const { data: myData, isLoading: myLoading } = trpc.grid.getMyRows.useQuery();
  const { data: adminData, isLoading: adminLoading } = trpc.grid.getAdminView.useQuery(
    {},
    { enabled: isAdmin && activeTab === "admin_view" }
  );

  const columns: GridColumn[] = myData?.columns ?? [];
  const myRows: GridRow[] = (myData?.rows ?? []) as GridRow[];
  const myStats = myData?.stats ?? {};

  // Mutations
  const addColumnMut = trpc.grid.addColumn.useMutation({
    onSuccess: () => {
      toast.success("Coluna adicionada!");
      setColumnDialog(false);
      setColumnForm(defaultColumnForm());
      void utils.grid.getMyRows.invalidate();
      void utils.grid.getAdminView.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateColumnMut = trpc.grid.updateColumn.useMutation({
    onSuccess: () => {
      toast.success("Coluna atualizada!");
      setColumnDialog(false);
      setEditingColumn(null);
      void utils.grid.getMyRows.invalidate();
      void utils.grid.getAdminView.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteColumnMut = trpc.grid.deleteColumn.useMutation({
    onSuccess: () => {
      toast.success("Coluna removida!");
      void utils.grid.getMyRows.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const reorderMut = trpc.grid.reorderColumns.useMutation({
    onSuccess: () => void utils.grid.getMyRows.invalidate(),
  });

  const saveRowMut = trpc.grid.saveRow.useMutation({
    onSuccess: () => {
      toast.success("Dados salvos!");
      setEditingRowId(null);
      setAddingRow(false);
      setNewRowData({});
      void utils.grid.getMyRows.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteRowMut = trpc.grid.deleteRow.useMutation({
    onSuccess: () => {
      toast.success("Linha removida!");
      void utils.grid.getMyRows.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const adminDeleteRowMut = trpc.grid.adminDeleteRow.useMutation({
    onSuccess: () => {
      toast.success("Linha removida!");
      void utils.grid.getAdminView.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const openAddColumn = () => {
    setEditingColumn(null);
    setColumnForm(defaultColumnForm());
    setColumnDialog(true);
  };

  const openEditColumn = (col: GridColumn) => {
    setEditingColumn(col);
    setColumnForm({
      name: col.name,
      columnType: col.columnType,
      selectOptions: col.selectOptions ?? "",
      formulaType: (col.formulaType as FormulaType) ?? "",
      formulaSourceColumns: (() => {
        try { return JSON.parse(col.formulaSourceColumns ?? "[]"); } catch { return []; }
      })(),
      formulaWeightColumn: col.formulaWeightColumn ?? "",
      formulaBase: col.formulaBase ?? "100",
      showInDashboard: col.showInDashboard,
      accentColor: col.accentColor ?? "#3b82f6",
      unit: col.unit ?? "",
      required: col.required,
    });
    setColumnDialog(true);
  };

  const submitColumnForm = () => {
    const payload = {
      name: columnForm.name,
      columnType: columnForm.columnType,
      selectOptions: columnForm.selectOptions || undefined,
      formulaType: (columnForm.formulaType || undefined) as FormulaType | undefined,
      formulaSourceColumns: columnForm.formulaSourceColumns.length > 0
        ? JSON.stringify(columnForm.formulaSourceColumns)
        : undefined,
      formulaWeightColumn: columnForm.formulaWeightColumn !== "" ? Number(columnForm.formulaWeightColumn) : undefined,
      formulaBase: columnForm.formulaBase || undefined,
      showInDashboard: columnForm.showInDashboard,
      accentColor: columnForm.accentColor,
      unit: columnForm.unit || undefined,
      required: columnForm.required,
    };

    if (editingColumn) {
      updateColumnMut.mutate({ id: editingColumn.id, ...payload });
    } else {
      addColumnMut.mutate(payload);
    }
  };

  const moveColumn = (colId: number, dir: "up" | "down") => {
    const sorted = [...columns].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex(c => c.id === colId);
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === sorted.length - 1) return;
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    [sorted[idx], sorted[swapIdx]] = [sorted[swapIdx], sorted[idx]];
    reorderMut.mutate({ columnIds: sorted.map(c => c.id) });
  };

  const startEditRow = (row: GridRow) => {
    setEditingRowId(row.id);
    setEditingRowData({ ...row.computedData });
  };

  const cancelEditRow = () => {
    setEditingRowId(null);
    setEditingRowData({});
  };

  const saveEditRow = (row: GridRow) => {
    // Remove computed formula values before saving
    const dataToSave = { ...editingRowData };
    columns.filter(c => c.columnType === "formula").forEach(c => {
      delete dataToSave[`col_${c.id}`];
    });
    saveRowMut.mutate({ id: row.id, rowOrder: row.rowOrder, data: dataToSave });
  };

  const saveNewRow = () => {
    const dataToSave = { ...newRowData };
    columns.filter(c => c.columnType === "formula").forEach(c => {
      delete dataToSave[`col_${c.id}`];
    });
    saveRowMut.mutate({ rowOrder: myRows.length, data: dataToSave });
  };

  const getCellValue = (data: Record<string, unknown>, colId: number) => {
    return data[`col_${colId}`] ?? "";
  };

  const setCellValue = (
    setter: React.Dispatch<React.SetStateAction<Record<string, unknown>>>,
    colId: number,
    value: unknown
  ) => {
    setter(prev => ({ ...prev, [`col_${colId}`]: value }));
  };

  // ─── Cell Renderer ────────────────────────────────────────────────────────

  const renderCell = (
    col: GridColumn,
    value: unknown,
    onChange: (v: unknown) => void,
    readOnly = false
  ) => {
    if (readOnly || col.columnType === "formula") {
      const display = value !== undefined && value !== "" && value !== null
        ? `${value}${col.unit ? ` ${col.unit}` : ""}`
        : "—";
      return (
        <span className={`text-sm font-medium ${col.columnType === "formula" ? "text-amber-400" : "text-foreground"}`}>
          {display}
        </span>
      );
    }

    switch (col.columnType) {
      case "text":
        return (
          <Input
            value={String(value ?? "")}
            onChange={e => onChange(e.target.value)}
            className="h-8 text-sm bg-background/50 border-border/50 focus:border-primary/50"
            placeholder={col.name}
          />
        );
      case "number":
        return (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={String(value ?? "")}
              onChange={e => onChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
              className="h-8 text-sm bg-background/50 border-border/50 focus:border-primary/50"
              placeholder="0"
            />
            {col.unit && <span className="text-xs text-muted-foreground whitespace-nowrap">{col.unit}</span>}
          </div>
        );
      case "select": {
        const opts = (() => {
          try { return JSON.parse(col.selectOptions ?? "[]") as string[]; } catch { return []; }
        })();
        return (
          <Select value={String(value ?? "")} onValueChange={onChange}>
            <SelectTrigger className="h-8 text-sm bg-background/50 border-border/50">
              <SelectValue placeholder="Selecionar..." />
            </SelectTrigger>
            <SelectContent>
              {opts.map(opt => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      case "date":
        return (
          <Input
            type="date"
            value={String(value ?? "")}
            onChange={e => onChange(e.target.value)}
            className="h-8 text-sm bg-background/50 border-border/50"
          />
        );
      case "checkbox":
        return (
          <Checkbox
            checked={Boolean(value)}
            onCheckedChange={onChange}
            className="data-[state=checked]:bg-primary"
          />
        );
      default:
        return <span className="text-sm text-muted-foreground">—</span>;
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const editableCols = columns.filter(c => c.isEditable);
  const formulaCols = columns.filter(c => c.columnType === "formula");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Smart Grid</h1>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              {isAdmin
                ? "Configure colunas, visualize todos os dados e gere insights automáticos"
                : "Preencha seus dados de planejamento — os resultados são calculados automaticamente"}
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                onClick={openAddColumn}
              >
                <Plus className="w-4 h-4" />
                Nova Coluna
              </Button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="bg-card border border-border/50">
            <TabsTrigger value="fill" className="gap-2 data-[state=active]:bg-primary/20">
              <Edit3 className="w-3.5 h-3.5" />
              {isAdmin ? "Meus Dados" : "Meu Planejamento"}
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin_view" className="gap-2 data-[state=active]:bg-primary/20">
                <Users className="w-3.5 h-3.5" />
                Visão Consolidada
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="config" className="gap-2 data-[state=active]:bg-primary/20">
                <Settings2 className="w-3.5 h-3.5" />
                Configurar Colunas
              </TabsTrigger>
            )}
          </TabsList>

          {/* ─── Tab: Meu Planejamento ─────────────────────────────────── */}
          <TabsContent value="fill" className="mt-4 space-y-4">
            {myLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : columns.length === 0 ? (
              <Card className="bg-card border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-amber-500/50" />
                  </div>
                  <p className="text-foreground font-medium">Nenhuma coluna configurada</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isAdmin
                      ? "Clique em \"Nova Coluna\" para começar a configurar o grid"
                      : "Aguarde o administrador configurar as colunas do planejamento"}
                  </p>
                  {isAdmin && (
                    <Button className="mt-4 gap-2" onClick={openAddColumn}>
                      <Plus className="w-4 h-4" />
                      Adicionar primeira coluna
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Stats pessoais */}
                {formulaCols.length > 0 && myRows.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {formulaCols.slice(0, 4).map(col => {
                      const stat = myStats[col.id];
                      return (
                        <Card key={col.id} className="bg-card border-border/50 overflow-hidden">
                          <div className="h-1" style={{ backgroundColor: col.accentColor ?? "#f59e0b" }} />
                          <CardContent className="pt-3 pb-3">
                            <p className="text-xs text-muted-foreground truncate">{col.name}</p>
                            <p className="text-xl font-bold text-amber-400 mt-0.5">
                              {stat?.sum ?? 0}{col.unit ? ` ${col.unit}` : ""}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Grid de dados */}
                <Card className="bg-card border-border/50 overflow-hidden">
                  <CardHeader className="pb-3 border-b border-border/50">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-foreground">
                        {myData?.template?.name ?? "Planejamento"}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {myRows.length} {myRows.length === 1 ? "registro" : "registros"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/50 bg-muted/30">
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-10">#</th>
                            {columns.map(col => (
                              <th
                                key={col.id}
                                className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap"
                                style={{ minWidth: col.width ?? 140 }}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span style={{ color: col.accentColor ?? undefined }}>
                                    {COLUMN_TYPE_ICONS[col.columnType]}
                                  </span>
                                  {col.name}
                                  {col.unit && <span className="text-muted-foreground/50">({col.unit})</span>}
                                  {col.required && <span className="text-red-400">*</span>}
                                  {col.columnType === "formula" && (
                                    <Badge className="text-[10px] px-1 py-0 bg-amber-500/20 text-amber-400 border-amber-500/30">
                                      calc
                                    </Badge>
                                  )}
                                </div>
                              </th>
                            ))}
                            <th className="px-3 py-2.5 w-24"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {myRows.map((row, idx) => (
                            <tr
                              key={row.id}
                              className={`border-b border-border/30 transition-colors ${
                                editingRowId === row.id
                                  ? "bg-primary/5"
                                  : "hover:bg-muted/20"
                              }`}
                            >
                              <td className="px-4 py-2 text-xs text-muted-foreground">{idx + 1}</td>
                              {columns.map(col => (
                                <td key={col.id} className="px-3 py-2">
                                  {editingRowId === row.id
                                    ? renderCell(
                                        col,
                                        getCellValue(editingRowData, col.id),
                                        (v) => setCellValue(setEditingRowData, col.id, v)
                                      )
                                    : renderCell(col, getCellValue(row.computedData, col.id), () => {}, true)}
                                </td>
                              ))}
                              <td className="px-3 py-2">
                                {editingRowId === row.id ? (
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      className="h-7 px-2 gap-1 text-xs"
                                      onClick={() => saveEditRow(row)}
                                      disabled={saveRowMut.isPending}
                                    >
                                      <Save className="w-3 h-3" />
                                      Salvar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2"
                                      onClick={cancelEditRow}
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 hover:bg-primary/10 hover:text-primary"
                                      onClick={() => startEditRow(row)}
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 hover:bg-red-500/10 hover:text-red-400"
                                      onClick={() => deleteRowMut.mutate({ id: row.id })}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}

                          {/* Nova linha */}
                          {addingRow && (
                            <tr className="border-b border-border/30 bg-primary/5">
                              <td className="px-4 py-2 text-xs text-muted-foreground">{myRows.length + 1}</td>
                              {columns.map(col => (
                                <td key={col.id} className="px-3 py-2">
                                  {renderCell(
                                    col,
                                    getCellValue(newRowData, col.id),
                                    (v) => setCellValue(setNewRowData, col.id, v)
                                  )}
                                </td>
                              ))}
                              <td className="px-3 py-2">
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    className="h-7 px-2 gap-1 text-xs"
                                    onClick={saveNewRow}
                                    disabled={saveRowMut.isPending}
                                  >
                                    <Save className="w-3 h-3" />
                                    Salvar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2"
                                    onClick={() => { setAddingRow(false); setNewRowData({}); }}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Totais */}
                    {myRows.length > 0 && (
                      <div className="border-t border-border/50 bg-muted/20 px-4 py-2 flex gap-6 overflow-x-auto">
                        {columns.filter(c => c.columnType === "number" || c.columnType === "formula").map(col => {
                          const stat = myStats[col.id];
                          if (!stat) return null;
                          return (
                            <div key={col.id} className="flex items-center gap-2 whitespace-nowrap">
                              <span className="text-xs text-muted-foreground">{col.name}:</span>
                              <span className="text-xs font-semibold text-foreground">
                                Σ {stat.sum}{col.unit ? ` ${col.unit}` : ""}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                / Ø {stat.average}{col.unit ? ` ${col.unit}` : ""}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Adicionar linha */}
                    {!addingRow && (
                      <div className="p-3 border-t border-border/30">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-muted-foreground hover:text-foreground w-full justify-start"
                          onClick={() => { setAddingRow(true); setNewRowData({}); }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Adicionar linha
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ─── Tab: Visão Consolidada (Admin) ───────────────────────── */}
          {isAdmin && (
            <TabsContent value="admin_view" className="mt-4 space-y-4">
              {adminLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !adminData || adminData.columns.length === 0 ? (
                <Card className="bg-card border-border/50">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <BarChart3 className="w-12 h-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground font-medium">Nenhum dado disponível</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Configure as colunas e aguarde os usuários preencherem os dados
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Estatísticas globais */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {adminData.columns
                      .filter(c => c.columnType === "number" || c.columnType === "formula")
                      .slice(0, 4)
                      .map(col => {
                        const stat = adminData.stats[col.id];
                        return (
                          <Card key={col.id} className="bg-card border-border/50 overflow-hidden">
                            <div className="h-1" style={{ backgroundColor: col.accentColor ?? "#3b82f6" }} />
                            <CardContent className="pt-3 pb-3">
                              <p className="text-xs text-muted-foreground truncate">{col.name}</p>
                              <p className="text-xl font-bold text-foreground mt-0.5">
                                {stat?.sum ?? 0}{col.unit ? ` ${col.unit}` : ""}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Ø {stat?.average ?? 0} por usuário
                              </p>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>

                  {/* Tabela por usuário */}
                  {adminData.byUser.map(({ user: u, rows }) => (
                    <Card key={u.id} className="bg-card border-border/50 overflow-hidden">
                      <CardHeader className="pb-3 border-b border-border/50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                            {(u.displayName ?? u.username).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{u.displayName ?? u.username}</p>
                            <p className="text-xs text-muted-foreground">@{u.username} · {rows.length} {rows.length === 1 ? "registro" : "registros"}</p>
                          </div>
                        </div>
                      </CardHeader>
                      {rows.length > 0 ? (
                        <CardContent className="p-0">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border/30 bg-muted/20">
                                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground w-10">#</th>
                                  {adminData.columns.map(col => (
                                    <th
                                      key={col.id}
                                      className="text-left px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap"
                                    >
                                      <div className="flex items-center gap-1">
                                        <span style={{ color: col.accentColor ?? undefined }}>
                                          {COLUMN_TYPE_ICONS[col.columnType as ColumnType]}
                                        </span>
                                        {col.name}
                                      </div>
                                    </th>
                                  ))}
                                  <th className="px-3 py-2 w-16"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((row, idx) => (
                                  <tr key={row.id} className="border-b border-border/20 hover:bg-muted/10">
                                    <td className="px-4 py-2 text-xs text-muted-foreground">{idx + 1}</td>
                                    {adminData.columns.map(col => (
                                      <td key={col.id} className="px-3 py-2">
                                        {renderCell(col as GridColumn, getCellValue(row.computedData, col.id), () => {}, true)}
                                      </td>
                                    ))}
                                    <td className="px-3 py-2">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-1.5 hover:bg-red-500/10 hover:text-red-400"
                                        onClick={() => adminDeleteRowMut.mutate({ id: row.id })}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      ) : (
                        <CardContent className="py-6 text-center">
                          <p className="text-xs text-muted-foreground">Nenhum dado preenchido ainda</p>
                        </CardContent>
                      )}
                    </Card>
                  ))}

                  {adminData.byUser.length === 0 && (
                    <Card className="bg-card border-border/50">
                      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <Users className="w-10 h-10 text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground text-sm">Nenhum usuário preencheu dados ainda</p>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>
          )}

          {/* ─── Tab: Configurar Colunas (Admin) ──────────────────────── */}
          {isAdmin && (
            <TabsContent value="config" className="mt-4 space-y-4">
              <Card className="bg-card border-border/50">
                <CardHeader className="pb-3 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Colunas Configuradas</CardTitle>
                    <Button size="sm" className="gap-2" onClick={openAddColumn}>
                      <Plus className="w-3.5 h-3.5" />
                      Nova Coluna
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {columns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Settings2 className="w-10 h-10 text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground text-sm">Nenhuma coluna configurada</p>
                      <Button className="mt-3 gap-2" size="sm" onClick={openAddColumn}>
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar coluna
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/30">
                      {[...columns].sort((a, b) => a.sortOrder - b.sortOrder).map((col, idx) => (
                        <div key={col.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/10 transition-colors">
                          <GripVertical className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
                          <div
                            className="w-2 h-8 rounded-full flex-shrink-0"
                            style={{ backgroundColor: col.accentColor ?? "#64748b" }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-foreground">{col.name}</span>
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 gap-1"
                                style={{ borderColor: col.accentColor ?? undefined, color: col.accentColor ?? undefined }}
                              >
                                {COLUMN_TYPE_ICONS[col.columnType]}
                                {COLUMN_TYPE_LABELS[col.columnType]}
                              </Badge>
                              {col.required && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-500/30 text-red-400">
                                  obrigatório
                                </Badge>
                              )}
                              {col.showInDashboard && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500/30 text-green-400">
                                  dashboard
                                </Badge>
                              )}
                            </div>
                            {col.unit && (
                              <p className="text-xs text-muted-foreground mt-0.5">Unidade: {col.unit}</p>
                            )}
                            {col.columnType === "formula" && col.formulaType && (
                              <p className="text-xs text-amber-400/70 mt-0.5">
                                {FORMULA_TYPE_LABELS[col.formulaType as FormulaType]}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => moveColumn(col.id, "up")}
                              disabled={idx === 0}
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => moveColumn(col.id, "down")}
                              disabled={idx === columns.length - 1}
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"
                              onClick={() => openEditColumn(col)}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 hover:bg-red-500/10 hover:text-red-400"
                              onClick={() => deleteColumnMut.mutate({ id: col.id })}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* ─── Dialog: Adicionar/Editar Coluna ────────────────────────────── */}
      <Dialog open={columnDialog} onOpenChange={setColumnDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              {editingColumn ? "Editar Coluna" : "Nova Coluna"}
            </DialogTitle>
            <DialogDescription>
              Configure o tipo, aparência e comportamento desta coluna
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label>Nome da Coluna *</Label>
              <Input
                value={columnForm.name}
                onChange={e => setColumnForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Área Soja, Cliente, Estado..."
              />
            </div>

            {/* Tipo */}
            <div className="space-y-1.5">
              <Label>Tipo de Dado</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(COLUMN_TYPE_LABELS) as ColumnType[]).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setColumnForm(f => ({ ...f, columnType: type }))}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-all ${
                      columnForm.columnType === type
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    {COLUMN_TYPE_ICONS[type]}
                    {COLUMN_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            {/* Opções para Select */}
            {columnForm.columnType === "select" && (
              <div className="space-y-1.5">
                <Label>Opções (uma por linha)</Label>
                <textarea
                  className="w-full h-24 px-3 py-2 text-sm rounded-md border border-border/50 bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  value={(() => {
                    try {
                      const arr = JSON.parse(columnForm.selectOptions || "[]");
                      return Array.isArray(arr) ? arr.join("\n") : columnForm.selectOptions;
                    } catch { return columnForm.selectOptions; }
                  })()}
                  onChange={e => {
                    const lines = e.target.value.split("\n").filter(l => l.trim());
                    setColumnForm(f => ({ ...f, selectOptions: JSON.stringify(lines) }));
                  }}
                  placeholder={"SP\nMG\nGO\nMT\nMS"}
                />
              </div>
            )}

            {/* Configuração de Fórmula */}
            {columnForm.columnType === "formula" && (
              <div className="space-y-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-400" />
                  <Label className="text-amber-400">Configuração da Fórmula</Label>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo de Cálculo</Label>
                  <Select
                    value={columnForm.formulaType}
                    onValueChange={v => setColumnForm(f => ({ ...f, formulaType: v as FormulaType }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Selecionar cálculo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(FORMULA_TYPE_LABELS) as FormulaType[]).map(ft => (
                        <SelectItem key={ft} value={ft}>{FORMULA_TYPE_LABELS[ft]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Colunas fonte */}
                {columns.filter(c => c.columnType === "number" && c.id !== editingColumn?.id).length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Colunas de Origem (selecione as colunas numéricas)</Label>
                    <div className="space-y-1">
                      {columns.filter(c => c.columnType === "number" && c.id !== editingColumn?.id).map(c => (
                        <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={columnForm.formulaSourceColumns.includes(c.id)}
                            onCheckedChange={checked => {
                              setColumnForm(f => ({
                                ...f,
                                formulaSourceColumns: checked
                                  ? [...f.formulaSourceColumns, c.id]
                                  : f.formulaSourceColumns.filter(id => id !== c.id),
                              }));
                            }}
                          />
                          {c.name} {c.unit ? `(${c.unit})` : ""}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Base para porcentagem */}
                {columnForm.formulaType === "percentage" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Base (100 = porcentagem simples)</Label>
                    <Input
                      value={columnForm.formulaBase}
                      onChange={e => setColumnForm(f => ({ ...f, formulaBase: e.target.value }))}
                      placeholder="100"
                      className="h-8 text-sm"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Unidade */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Unidade (opcional)</Label>
                <Input
                  value={columnForm.unit}
                  onChange={e => setColumnForm(f => ({ ...f, unit: e.target.value }))}
                  placeholder="ha, R$, %, kg..."
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cor de Destaque</Label>
                <div className="flex gap-1 flex-wrap">
                  {ACCENT_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setColumnForm(f => ({ ...f, accentColor: color }))}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        columnForm.accentColor === color ? "border-white scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Switches */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Mostrar no Dashboard</Label>
                  <p className="text-xs text-muted-foreground">Gera widget automático no painel principal</p>
                </div>
                <Switch
                  checked={columnForm.showInDashboard}
                  onCheckedChange={v => setColumnForm(f => ({ ...f, showInDashboard: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Campo Obrigatório</Label>
                  <p className="text-xs text-muted-foreground">Usuário deve preencher antes de salvar</p>
                </div>
                <Switch
                  checked={columnForm.required}
                  onCheckedChange={v => setColumnForm(f => ({ ...f, required: v }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setColumnDialog(false)}>Cancelar</Button>
            <Button
              onClick={submitColumnForm}
              disabled={!columnForm.name || addColumnMut.isPending || updateColumnMut.isPending}
              className="gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              {editingColumn ? "Salvar Alterações" : "Adicionar Coluna"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
