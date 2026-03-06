/**
 * SmartGrid.tsx — Módulo de Planejamento Dinâmico
 *
 * Admin: configura colunas, fórmulas, vê todos os usuários, exporta dados.
 * Vendedor: preenche seus dados com interface moderna.
 * Super Admin: acesso total igual ao Admin.
 *
 * Features:
 * - Ordenação por qualquer coluna (A→Z, Z→A, maior→menor, menor→maior)
 * - Exportação: Excel (.xlsx), PDF, Imagem (PNG)
 * - Colunas fixas (sticky) na Visão Consolidada
 * - Ocultar/mostrar colunas e linhas
 * - Cálculos automáticos exibidos ACIMA do cabeçalho da coluna
 * - Super Admin pode editar qualquer linha
 * - Visão do vendedor disponível para Admin/Super Admin
 */
import { useState, useMemo, useRef, useCallback } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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
  EyeOff,
  Sparkles,
  Hash,
  Type,
  List,
  Calendar,
  CheckSquare,
  Sigma,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  Pencil,
  Download,
  FileSpreadsheet,
  FileImage,
  FileText as FilePdf,
  Pin,
  PinOff,
  MoreHorizontal,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ColumnType = "text" | "number" | "select" | "date" | "checkbox" | "formula";
type FormulaType =
  | "sum" | "average" | "percentage" | "weighted_average" | "weighted_sum"
  | "count" | "max" | "min" | "custom";

type SortDir = "asc" | "desc" | null;

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

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMN_TYPE_LABELS: Record<ColumnType, string> = {
  text: "Texto", number: "Número", select: "Lista",
  date: "Data", checkbox: "Sim/Não", formula: "Fórmula/Cálculo",
};

const FORMULA_TYPE_LABELS: Record<FormulaType, string> = {
  sum: "Σ Soma", average: "Ø Média", percentage: "% Porcentagem",
  weighted_average: "Média Ponderada", weighted_sum: "Soma Ponderada",
  count: "# Contagem", max: "↑ Máximo", min: "↓ Mínimo",
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

const defaultColumnForm = (): ColumnFormData => ({
  name: "", columnType: "text", selectOptions: "",
  formulaType: "", formulaSourceColumns: [], formulaWeightColumn: "",
  formulaBase: "100", showInDashboard: false, accentColor: "#3b82f6",
  unit: "", required: false,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCellValue(data: Record<string, unknown>, colId: number): unknown {
  return data[`col_${colId}`] ?? "";
}

function setCellValue(
  setter: React.Dispatch<React.SetStateAction<Record<string, unknown>>>,
  colId: number,
  value: unknown
) {
  setter(prev => ({ ...prev, [`col_${colId}`]: value }));
}

function formatValue(value: unknown, col: GridColumn): string {
  if (value === undefined || value === null || value === "") return "—";
  if (col.columnType === "checkbox") return value ? "✓" : "✗";
  if (col.columnType === "number" || col.columnType === "formula") {
    const num = typeof value === "string" ? parseFloat(value) : Number(value);
    if (!isNaN(num)) {
      const formatted = num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const unit = col.unit?.trim();
      if (unit) {
        const monetaryUnits = ["r$", "usd", "eur", "brl", "$", "€", "£"];
        if (monetaryUnits.includes(unit.toLowerCase())) {
          return `${unit.toUpperCase() === "BRL" ? "R$" : unit} ${formatted}`;
        }
        return `${formatted} ${unit}`;
      }
      return formatted;
    }
  }
  return String(value);
}

// ─── Cell Renderer ────────────────────────────────────────────────────────────

function CellRenderer({
  col, value, onChange, readOnly = false,
}: {
  col: GridColumn;
  value: unknown;
  onChange: (v: unknown) => void;
  readOnly?: boolean;
}) {
  if (readOnly || col.columnType === "formula") {
    const display = formatValue(value, col);
    return (
      <span className={`text-sm font-medium ${col.columnType === "formula" ? "text-amber-400 font-semibold" : "text-foreground"}`}>
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
          className="h-8 text-sm bg-background/50 border-border/50 focus:border-primary/50 min-w-[120px]"
          placeholder={col.name}
        />
      );
    case "number":
      return (
        <div className="flex items-center gap-1 min-w-[100px]">
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
          <SelectTrigger className="h-8 text-sm bg-background/50 border-border/50 min-w-[120px]">
            <SelectValue placeholder="Selecionar..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_empty">— Nenhum —</SelectItem>
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
          className="h-8 text-sm bg-background/50 border-border/50 min-w-[130px]"
        />
      );
    case "checkbox":
      return (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={Boolean(value)}
            onCheckedChange={onChange}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      );
    default:
      return <span className="text-sm text-muted-foreground">—</span>;
  }
}

// ─── Column Config Dialog ─────────────────────────────────────────────────────

function ColumnDialog({
  open, onClose, columns, editingColumn, form, setForm, onSubmit, isPending,
}: {
  open: boolean;
  onClose: () => void;
  columns: GridColumn[];
  editingColumn: GridColumn | null;
  form: ColumnFormData;
  setForm: React.Dispatch<React.SetStateAction<ColumnFormData>>;
  onSubmit: () => void;
  isPending: boolean;
}) {
  const numericCols = columns.filter(c => c.columnType === "number");

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingColumn ? "Editar Coluna" : "Nova Coluna"}</DialogTitle>
          <DialogDescription>
            Configure o tipo, fórmulas e aparência desta coluna.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label>Nome da Coluna *</Label>
            <Input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Ex: Área Soja, Cliente, Estado..."
            />
          </div>

          {/* Tipo */}
          <div className="space-y-1.5">
            <Label>Tipo de Dado</Label>
            <Select value={form.columnType} onValueChange={v => setForm(p => ({ ...p, columnType: v as ColumnType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(COLUMN_TYPE_LABELS) as ColumnType[]).map(t => (
                  <SelectItem key={t} value={t}>
                    <span className="flex items-center gap-2">
                      {COLUMN_TYPE_ICONS[t]} {COLUMN_TYPE_LABELS[t]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Opções de Select */}
          {form.columnType === "select" && (
            <div className="space-y-1.5">
              <Label>Opções (separadas por vírgula)</Label>
              <Input
                value={form.selectOptions}
                onChange={e => setForm(p => ({ ...p, selectOptions: e.target.value }))}
                placeholder="Ex: SP, RJ, MG, RS, PR"
              />
            </div>
          )}

          {/* Fórmula */}
          {form.columnType === "formula" && (
            <div className="space-y-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <Label className="text-amber-400 font-semibold flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Configuração do Cálculo
              </Label>

              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de Cálculo</Label>
                <Select value={form.formulaType} onValueChange={v => setForm(p => ({ ...p, formulaType: v as FormulaType }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar cálculo..." /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(FORMULA_TYPE_LABELS) as FormulaType[]).map(t => (
                      <SelectItem key={t} value={t}>{FORMULA_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.formulaType && form.formulaType !== "count" && numericCols.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Colunas de Origem (selecione as que entram no cálculo)</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {numericCols.map(col => (
                      <label key={col.id} className="flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded hover:bg-muted/50">
                        <Checkbox
                          checked={form.formulaSourceColumns.includes(col.id)}
                          onCheckedChange={checked => {
                            setForm(p => ({
                              ...p,
                              formulaSourceColumns: checked
                                ? [...p.formulaSourceColumns, col.id]
                                : p.formulaSourceColumns.filter(id => id !== col.id),
                            }));
                          }}
                        />
                        {col.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {(form.formulaType === "weighted_average" || form.formulaType === "weighted_sum") && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Coluna de Peso</Label>
                  <Select
                    value={String(form.formulaWeightColumn)}
                    onValueChange={v => setForm(p => ({ ...p, formulaWeightColumn: v ? Number(v) : "" }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecionar coluna de peso..." /></SelectTrigger>
                    <SelectContent>
                      {numericCols.map(col => (
                        <SelectItem key={col.id} value={String(col.id)}>{col.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.formulaType === "percentage" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Base para % (padrão: 100)</Label>
                  <Input
                    type="number"
                    value={form.formulaBase}
                    onChange={e => setForm(p => ({ ...p, formulaBase: e.target.value }))}
                    placeholder="100"
                  />
                </div>
              )}
            </div>
          )}

          {/* Unidade */}
          {(form.columnType === "number" || form.columnType === "formula") && (
            <div className="space-y-1.5">
              <Label>Unidade (opcional)</Label>
              <Input
                value={form.unit}
                onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                placeholder="Ex: ha, R$, kg, %, un"
              />
            </div>
          )}

          {/* Cor */}
          <div className="space-y-1.5">
            <Label>Cor de Destaque</Label>
            <div className="flex gap-2 flex-wrap">
              {ACCENT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`w-6 h-6 rounded-full transition-all ${form.accentColor === c ? "ring-2 ring-offset-2 ring-offset-background ring-white scale-110" : "hover:scale-110"}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setForm(p => ({ ...p, accentColor: c }))}
                />
              ))}
            </div>
          </div>

          {/* Opções */}
          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium">Mostrar no Dashboard</p>
                <p className="text-xs text-muted-foreground">Gera widget automático no painel principal</p>
              </div>
              <Switch
                checked={form.showInDashboard}
                onCheckedChange={v => setForm(p => ({ ...p, showInDashboard: v }))}
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium">Campo Obrigatório</p>
                <p className="text-xs text-muted-foreground">Usuário deve preencher antes de salvar</p>
              </div>
              <Switch
                checked={form.required}
                onCheckedChange={v => setForm(p => ({ ...p, required: v }))}
              />
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={isPending || !form.name.trim()}>
            {isPending ? "Salvando..." : editingColumn ? "Atualizar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SmartGrid() {
  const { user } = useLocalAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  // ── State ──
  const [activeTab, setActiveTab] = useState<"fill" | "admin_view" | "config">("fill");
  const [columnDialog, setColumnDialog] = useState(false);
  const [editingColumn, setEditingColumn] = useState<GridColumn | null>(null);
  const [columnForm, setColumnForm] = useState<ColumnFormData>(defaultColumnForm());
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editingRowData, setEditingRowData] = useState<Record<string, unknown>>({});
  const [addingRow, setAddingRow] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<string, unknown>>({});

  // Sorting
  const [sortColId, setSortColId] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [adminSortColId, setAdminSortColId] = useState<number | null>(null);
  const [adminSortDir, setAdminSortDir] = useState<SortDir>(null);

  // Hidden columns/rows
  const [hiddenColIds, setHiddenColIds] = useState<Set<number>>(new Set());
  const [hiddenRowIds, setHiddenRowIds] = useState<Set<number>>(new Set());
  const [pinnedColIds, setPinnedColIds] = useState<Set<number>>(new Set());

  // Admin view: preview as user
  const [previewUserId, setPreviewUserId] = useState<number | null>(null);
  // Admin view: editing rows inline
  const [adminEditingRowId, setAdminEditingRowId] = useState<number | null>(null);
  const [adminEditingRowData, setAdminEditingRowData] = useState<Record<string, unknown>>({});
  const [adminEditingUserId, setAdminEditingUserId] = useState<number | null>(null);

  // Export ref
  const gridRef = useRef<HTMLDivElement>(null);
  const adminGridRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  // ── Queries ──
  const { data: myData, isLoading: myLoading } = trpc.grid.getMyRows.useQuery();
  const { data: adminData, isLoading: adminLoading } = trpc.grid.getAdminView.useQuery(
    {},
    { enabled: isAdmin && (activeTab === "admin_view" || activeTab === "fill") }
  );

  const columns: GridColumn[] = myData?.columns ?? [];
  const myRows: GridRow[] = (myData?.rows ?? []) as GridRow[];
  const myStats = myData?.stats ?? {};

  // ── Mutations ──
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
      void utils.grid.getAdminView.invalidate();
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
      void utils.grid.getAdminView.invalidate();
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

  const adminSaveRowMut = trpc.grid.adminSaveRow.useMutation({
    onSuccess: () => {
      toast.success("Dados salvos!");
      setAdminEditingRowId(null);
      setAdminEditingRowData({});
      setAdminEditingUserId(null);
      void utils.grid.getAdminView.invalidate();
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

  // ── Handlers ──

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

  // ── Sorting ──

  const handleSort = (colId: number, isAdmin = false) => {
    if (isAdmin) {
      if (adminSortColId === colId) {
        setAdminSortDir(d => d === "asc" ? "desc" : d === "desc" ? null : "asc");
        if (adminSortDir === "desc") setAdminSortColId(null);
      } else {
        setAdminSortColId(colId);
        setAdminSortDir("asc");
      }
    } else {
      if (sortColId === colId) {
        setSortDir(d => d === "asc" ? "desc" : d === "desc" ? null : "asc");
        if (sortDir === "desc") setSortColId(null);
      } else {
        setSortColId(colId);
        setSortDir("asc");
      }
    }
  };

  const sortRows = useCallback((rows: GridRow[], colId: number | null, dir: SortDir, cols: GridColumn[]) => {
    if (!colId || !dir) return rows;
    const col = cols.find(c => c.id === colId);
    if (!col) return rows;
    return [...rows].sort((a, b) => {
      const va = getCellValue(a.computedData, colId);
      const vb = getCellValue(b.computedData, colId);
      if (col.columnType === "number" || col.columnType === "formula") {
        const na = parseFloat(String(va ?? 0)) || 0;
        const nb = parseFloat(String(vb ?? 0)) || 0;
        return dir === "asc" ? na - nb : nb - na;
      }
      const sa = String(va ?? "").toLowerCase();
      const sb = String(vb ?? "").toLowerCase();
      return dir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
  }, []);

  // ── Computed rows ──

  const sortedMyRows = useMemo(
    () => sortRows(myRows.filter(r => !hiddenRowIds.has(r.id)), sortColId, sortDir, columns),
    [myRows, sortColId, sortDir, columns, hiddenRowIds, sortRows]
  );

  const visibleColumns = useMemo(
    () => columns.filter(c => !hiddenColIds.has(c.id)),
    [columns, hiddenColIds]
  );

  // Pinned columns go first
  const orderedVisibleColumns = useMemo(() => {
    const pinned = visibleColumns.filter(c => pinnedColIds.has(c.id));
    const rest = visibleColumns.filter(c => !pinnedColIds.has(c.id));
    return [...pinned, ...rest];
  }, [visibleColumns, pinnedColIds]);

  // ── Column stats (shown above header) ──

  const computeColStats = useCallback((rows: GridRow[], col: GridColumn) => {
    const vals = rows
      .map(r => parseFloat(String(getCellValue(r.computedData, col.id) ?? "")))
      .filter(v => !isNaN(v));
    if (vals.length === 0) return null;
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = sum / vals.length;
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    return { sum: Math.round(sum * 100) / 100, avg: Math.round(avg * 100) / 100, max, min, count: vals.length };
  }, []);

  // ── Toggle helpers ──

  const toggleHideCol = (colId: number) => {
    setHiddenColIds(prev => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId); else next.add(colId);
      return next;
    });
  };

  const togglePinCol = (colId: number) => {
    setPinnedColIds(prev => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId); else next.add(colId);
      return next;
    });
  };

  const toggleHideRow = (rowId: number) => {
    setHiddenRowIds(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId); else next.add(rowId);
      return next;
    });
  };

  // ── Export ──

  const exportToExcel = (rows: GridRow[], cols: GridColumn[], filename: string) => {
    const headers = ["#", ...cols.map(c => `${c.name}${c.unit ? ` (${c.unit})` : ""}`)];
    const data = rows.map((row, idx) => [
      idx + 1,
      ...cols.map(col => {
        const v = getCellValue(row.computedData, col.id);
        if (col.columnType === "checkbox") return v ? "Sim" : "Não";
        return v ?? "";
      }),
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Smart Grid");
    XLSX.writeFile(wb, `${filename}.xlsx`);
    toast.success("Exportado para Excel!");
  };

  const exportToPDF = async (ref: React.RefObject<HTMLDivElement | null>, filename: string) => {
    if (!ref.current) return;
    toast.info("Gerando PDF...");
    try {
      const canvas = await html2canvas(ref.current, { scale: 2, backgroundColor: "#1e293b" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      const imgW = pageW - 20;
      const imgH = imgW / ratio;
      pdf.addImage(imgData, "PNG", 10, 10, imgW, Math.min(imgH, pageH - 20));
      pdf.save(`${filename}.pdf`);
      toast.success("PDF gerado!");
    } catch {
      toast.error("Erro ao gerar PDF");
    }
  };

  const exportToImage = async (ref: React.RefObject<HTMLDivElement | null>, filename: string) => {
    if (!ref.current) return;
    toast.info("Gerando imagem...");
    try {
      const canvas = await html2canvas(ref.current, { scale: 2, backgroundColor: "#1e293b" });
      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Imagem exportada!");
    } catch {
      toast.error("Erro ao exportar imagem");
    }
  };

  // ── Sort icon ──
  const SortIcon = ({ colId, isAdminView = false }: { colId: number; isAdminView?: boolean }) => {
    const activeId = isAdminView ? adminSortColId : sortColId;
    const activeDir = isAdminView ? adminSortDir : sortDir;
    if (activeId !== colId) return <ArrowUpDown className="w-3 h-3 text-muted-foreground/50" />;
    if (activeDir === "asc") return <ArrowUp className="w-3 h-3 text-primary" />;
    if (activeDir === "desc") return <ArrowDown className="w-3 h-3 text-primary" />;
    return <ArrowUpDown className="w-3 h-3 text-muted-foreground/50" />;
  };

  // ── Preview as user (admin sees vendor view) ──
  const previewUser = adminData?.byUser.find(u => u.user.id === previewUserId);
  const previewRows = previewUser?.rows ?? [];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <DashboardLayout>
        <div className="space-y-5">

          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground leading-tight">Smart Grid</h1>
                  <p className="text-xs text-muted-foreground">
                    {isAdmin ? "Planejamento dinâmico — configure, visualize e exporte" : "Preencha seu planejamento"}
                  </p>
                </div>
              </div>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs"
                  onClick={openAddColumn}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova Coluna
                </Button>
              </div>
            )}
          </div>

          {/* ── Tabs ── */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "fill" | "admin_view" | "config")}>
            <TabsList className="bg-card border border-border/50 h-9 flex-wrap gap-0.5">
              <TabsTrigger value="fill" className="gap-1.5 data-[state=active]:bg-primary/20 text-xs">
                <Edit3 className="w-3.5 h-3.5" />
                {isAdmin ? "Meus Dados" : "Meu Planejamento"}
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="admin_view" className="gap-1.5 data-[state=active]:bg-primary/20 text-xs">
                  <Users className="w-3.5 h-3.5" />
                  Visão Consolidada
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="config" className="gap-1.5 data-[state=active]:bg-primary/20 text-xs">
                  <Settings2 className="w-3.5 h-3.5" />
                  Configurar
                </TabsTrigger>
              )}
            </TabsList>

            {/* ══════════════════════════════════════════════════════════════
                Tab: Meus Dados / Meu Planejamento
            ══════════════════════════════════════════════════════════════ */}
            <TabsContent value="fill" className="mt-4 space-y-4">

              {/* Admin: preview as user */}
              {isAdmin && adminData && adminData.byUser.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <Eye className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-xs text-blue-300">Visualizar como:</span>
                  <Select
                    value={previewUserId ? String(previewUserId) : "me"}
                    onValueChange={v => setPreviewUserId(v === "me" ? null : Number(v))}
                  >
                    <SelectTrigger className="h-7 text-xs w-48 bg-blue-500/10 border-blue-500/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="me">Minha visão (Admin)</SelectItem>
                      {adminData.byUser.map(u => (
                        <SelectItem key={u.user.id} value={String(u.user.id)}>
                          {u.user.displayName ?? u.user.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {previewUserId && (
                    <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">
                      Modo Visualização
                    </Badge>
                  )}
                </div>
              )}

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
                        ? "Clique em \"Nova Coluna\" para começar"
                        : "Aguarde o administrador configurar as colunas"}
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
                  {/* Toolbar */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Ocultar colunas */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                          <EyeOff className="w-3.5 h-3.5" />
                          Colunas
                          {hiddenColIds.size > 0 && (
                            <Badge className="ml-1 text-[10px] px-1 py-0 bg-primary/20 text-primary">{hiddenColIds.size}</Badge>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel className="text-xs">Mostrar/Ocultar Colunas</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {columns.map(col => (
                          <DropdownMenuItem
                            key={col.id}
                            className="gap-2 text-xs cursor-pointer"
                            onClick={() => toggleHideCol(col.id)}
                          >
                            {hiddenColIds.has(col.id)
                              ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                              : <Eye className="w-3.5 h-3.5 text-primary" />
                            }
                            {col.name}
                          </DropdownMenuItem>
                        ))}
                        {hiddenColIds.size > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-xs text-primary cursor-pointer"
                              onClick={() => setHiddenColIds(new Set())}
                            >
                              <RefreshCw className="w-3.5 h-3.5 mr-2" />
                              Mostrar todas
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Exportar */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                          <Download className="w-3.5 h-3.5" />
                          Exportar
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel className="text-xs">Formato de Exportação</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2 text-xs cursor-pointer"
                          onClick={() => exportToExcel(sortedMyRows, orderedVisibleColumns, "meus-dados")}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-green-400" />
                          Excel (.xlsx)
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 text-xs cursor-pointer"
                          onClick={() => void exportToPDF(gridRef, "meus-dados")}
                        >
                          <FilePdf className="w-3.5 h-3.5 text-red-400" />
                          PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 text-xs cursor-pointer"
                          onClick={() => void exportToImage(gridRef, "meus-dados")}
                        >
                          <FileImage className="w-3.5 h-3.5 text-blue-400" />
                          Imagem (PNG)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {hiddenRowIds.size > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs h-8 text-amber-400 border-amber-500/30"
                        onClick={() => setHiddenRowIds(new Set())}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Mostrar {hiddenRowIds.size} linha(s) oculta(s)
                      </Button>
                    )}
                  </div>

                  {/* Grid */}
                  <Card className="bg-card border-border/50 overflow-hidden" ref={gridRef}>
                    <CardHeader className="pb-3 border-b border-border/50">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold text-foreground">
                          {previewUserId
                            ? `Visão de: ${previewUser?.user.displayName ?? previewUser?.user.username}`
                            : (myData?.template?.name ?? "Planejamento")}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {sortedMyRows.length} {sortedMyRows.length === 1 ? "registro" : "registros"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          {/* Stats row (above header) */}
                          {sortedMyRows.length > 0 && (
                            <thead>
                              <tr className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border-b border-amber-500/20">
                                <td className="px-4 py-1.5 text-[10px] text-amber-400/70 font-medium w-10">Σ</td>
                                {orderedVisibleColumns.map(col => {
                                  const stats = (col.columnType === "number" || col.columnType === "formula")
                                    ? computeColStats(previewUserId ? previewRows as GridRow[] : sortedMyRows, col)
                                    : null;
                                  return (
                                    <td
                                      key={col.id}
                                      className={`px-3 py-1.5 text-[10px] font-medium whitespace-nowrap ${pinnedColIds.has(col.id) ? "sticky left-0 z-10 bg-card" : ""}`}
                                      style={{ minWidth: col.width ?? 140 }}
                                    >
                                      {stats ? (
                                        <div className="flex items-center gap-2">
                                          <span className="text-amber-400">Σ {formatValue(stats.sum, col)}</span>
                                          <span className="text-muted-foreground/60">Ø {formatValue(stats.avg, col)}</span>
                                          <span className="text-green-400/60">↑ {formatValue(stats.max, col)}</span>
                                          <span className="text-red-400/60">↓ {formatValue(stats.min, col)}</span>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground/30">—</span>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="px-3 py-1.5 w-24" />
                              </tr>
                              {/* Column headers */}
                              <tr className="border-b border-border/50 bg-muted/30">
                                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-10">#</th>
                                {orderedVisibleColumns.map(col => (
                                  <th
                                    key={col.id}
                                    className={`text-left px-3 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap ${pinnedColIds.has(col.id) ? "sticky left-0 z-10 bg-muted/30" : ""}`}
                                    style={{ minWidth: col.width ?? 140 }}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span style={{ color: col.accentColor ?? undefined }}>
                                        {COLUMN_TYPE_ICONS[col.columnType]}
                                      </span>
                                      <span>{col.name}</span>
                                      {col.unit && <span className="text-muted-foreground/40">({col.unit})</span>}
                                      {col.required && <span className="text-red-400">*</span>}
                                      {pinnedColIds.has(col.id) && <Pin className="w-2.5 h-2.5 text-primary/60" />}
                                      {col.columnType === "formula" && (
                                        <Badge className="text-[9px] px-1 py-0 bg-amber-500/20 text-amber-400 border-amber-500/30">calc</Badge>
                                      )}
                                      {/* Sort button */}
                                      <button
                                        className="ml-0.5 hover:text-primary transition-colors"
                                        onClick={() => handleSort(col.id)}
                                      >
                                        <SortIcon colId={col.id} />
                                      </button>
                                    </div>
                                  </th>
                                ))}
                                <th className="px-3 py-2.5 w-24" />
                              </tr>
                            </thead>
                          )}
                          {!sortedMyRows.length && (
                            <thead>
                              <tr className="border-b border-border/50 bg-muted/30">
                                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-10">#</th>
                                {orderedVisibleColumns.map(col => (
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
                                      {col.required && <span className="text-red-400">*</span>}
                                      <button className="ml-0.5 hover:text-primary" onClick={() => handleSort(col.id)}>
                                        <SortIcon colId={col.id} />
                                      </button>
                                    </div>
                                  </th>
                                ))}
                                <th className="px-3 py-2.5 w-24" />
                              </tr>
                            </thead>
                          )}
                          <tbody>
                            {(previewUserId ? previewRows as GridRow[] : sortedMyRows).map((row, idx) => (
                              <tr
                                key={row.id}
                                className={`border-b border-border/30 transition-colors group ${
                                  editingRowId === row.id ? "bg-primary/5" : "hover:bg-muted/20"
                                }`}
                              >
                                <td className="px-4 py-2 text-xs text-muted-foreground">{idx + 1}</td>
                                {orderedVisibleColumns.map(col => (
                                  <td
                                    key={col.id}
                                    className={`px-3 py-2 ${pinnedColIds.has(col.id) ? "sticky left-0 z-10 bg-card" : ""}`}
                                  >
                                    {editingRowId === row.id && !previewUserId
                                      ? <CellRenderer
                                          col={col}
                                          value={getCellValue(editingRowData, col.id)}
                                          onChange={(v) => setCellValue(setEditingRowData, col.id, v)}
                                        />
                                      : <CellRenderer
                                          col={col}
                                          value={getCellValue(row.computedData, col.id)}
                                          onChange={() => {}}
                                          readOnly
                                        />
                                    }
                                  </td>
                                ))}
                                <td className="px-3 py-2">
                                  {editingRowId === row.id ? (
                                    <div className="flex gap-1">
                                      <Button size="sm" className="h-7 px-2 gap-1 text-xs" onClick={() => saveEditRow(row)} disabled={saveRowMut.isPending}>
                                        <Save className="w-3 h-3" />Salvar
                                      </Button>
                                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={cancelEditRow}>
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ) : !previewUserId ? (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button size="sm" variant="ghost" className="h-7 px-2 hover:bg-primary/10 hover:text-primary" onClick={() => startEditRow(row)}>
                                            <Edit3 className="w-3 h-3" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Editar linha</TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button size="sm" variant="ghost" className="h-7 px-2 hover:bg-muted/50" onClick={() => toggleHideRow(row.id)}>
                                            <EyeOff className="w-3 h-3" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Ocultar linha</TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button size="sm" variant="ghost" className="h-7 px-2 hover:bg-red-500/10 hover:text-red-400" onClick={() => deleteRowMut.mutate({ id: row.id })}>
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Excluir linha</TooltipContent>
                                      </Tooltip>
                                    </div>
                                  ) : null}
                                </td>
                              </tr>
                            ))}

                            {/* Nova linha */}
                            {addingRow && !previewUserId && (
                              <tr className="border-b border-border/30 bg-primary/5">
                                <td className="px-4 py-2 text-xs text-muted-foreground">{sortedMyRows.length + 1}</td>
                                {orderedVisibleColumns.map(col => (
                                  <td key={col.id} className="px-3 py-2">
                                    <CellRenderer
                                      col={col}
                                      value={getCellValue(newRowData, col.id)}
                                      onChange={(v) => setCellValue(setNewRowData, col.id, v)}
                                    />
                                  </td>
                                ))}
                                <td className="px-3 py-2">
                                  <div className="flex gap-1">
                                    <Button size="sm" className="h-7 px-2 gap-1 text-xs" onClick={saveNewRow} disabled={saveRowMut.isPending}>
                                      <Save className="w-3 h-3" />Salvar
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setAddingRow(false); setNewRowData({}); }}>
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Adicionar linha */}
                      {!addingRow && !previewUserId && (
                        <div className="p-3 border-t border-border/30">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2 text-muted-foreground hover:text-foreground w-full justify-start text-xs"
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

            {/* ══════════════════════════════════════════════════════════════
                Tab: Visão Consolidada (Admin)
            ══════════════════════════════════════════════════════════════ */}
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
                      <p className="text-sm text-muted-foreground/70 mt-1">Configure as colunas e aguarde os usuários preencherem</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Stats globais */}
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
                                <p className="text-xs text-muted-foreground">Ø {stat?.average ?? 0} por usuário</p>
                              </CardContent>
                            </Card>
                          );
                        })}
                    </div>

                    {/* Toolbar Consolidada */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Colunas fixas */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                            <Pin className="w-3.5 h-3.5" />
                            Fixar Colunas
                            {pinnedColIds.size > 0 && (
                              <Badge className="ml-1 text-[10px] px-1 py-0 bg-primary/20 text-primary">{pinnedColIds.size}</Badge>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel className="text-xs">Colunas Fixas (Sticky)</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {adminData.columns.map(col => (
                            <DropdownMenuItem
                              key={col.id}
                              className="gap-2 text-xs cursor-pointer"
                              onClick={() => togglePinCol(col.id)}
                            >
                              {pinnedColIds.has(col.id)
                                ? <Pin className="w-3.5 h-3.5 text-primary" />
                                : <PinOff className="w-3.5 h-3.5 text-muted-foreground" />
                              }
                              {col.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Ocultar colunas */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                            <EyeOff className="w-3.5 h-3.5" />
                            Ocultar
                            {hiddenColIds.size > 0 && (
                              <Badge className="ml-1 text-[10px] px-1 py-0 bg-primary/20 text-primary">{hiddenColIds.size}</Badge>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel className="text-xs">Mostrar/Ocultar Colunas</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {adminData.columns.map(col => (
                            <DropdownMenuItem
                              key={col.id}
                              className="gap-2 text-xs cursor-pointer"
                              onClick={() => toggleHideCol(col.id)}
                            >
                              {hiddenColIds.has(col.id)
                                ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                                : <Eye className="w-3.5 h-3.5 text-primary" />
                              }
                              {col.name}
                            </DropdownMenuItem>
                          ))}
                          {hiddenColIds.size > 0 && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-xs text-primary cursor-pointer" onClick={() => setHiddenColIds(new Set())}>
                                <RefreshCw className="w-3.5 h-3.5 mr-2" />Mostrar todas
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Exportar */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                            <Download className="w-3.5 h-3.5" />
                            Exportar Consolidado
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel className="text-xs">Exportar todos os dados</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2 text-xs cursor-pointer"
                            onClick={() => {
                              const allRows: GridRow[] = adminData.byUser.flatMap(u => u.rows as GridRow[]);
                              const visibleAdminCols = adminData.columns.filter(c => !hiddenColIds.has(c.id)) as GridColumn[];
                              exportToExcel(allRows, visibleAdminCols, "visao-consolidada");
                            }}
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-green-400" />
                            Excel (.xlsx)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 text-xs cursor-pointer"
                            onClick={() => void exportToPDF(adminGridRef, "visao-consolidada")}
                          >
                            <FilePdf className="w-3.5 h-3.5 text-red-400" />
                            PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 text-xs cursor-pointer"
                            onClick={() => void exportToImage(adminGridRef, "visao-consolidada")}
                          >
                            <FileImage className="w-3.5 h-3.5 text-blue-400" />
                            Imagem (PNG)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Tabela consolidada por usuário */}
                    <div className="space-y-4" ref={adminGridRef}>
                      {adminData.byUser.map(({ user: u, rows }) => {
                        const visibleAdminCols = adminData.columns.filter(c => !hiddenColIds.has(c.id)) as GridColumn[];
                        const pinnedAdminCols = visibleAdminCols.filter(c => pinnedColIds.has(c.id));
                        const restAdminCols = visibleAdminCols.filter(c => !pinnedColIds.has(c.id));
                        const orderedAdminCols = [...pinnedAdminCols, ...restAdminCols];
                        const sortedAdminRows = sortRows(
                          rows.filter(r => !hiddenRowIds.has(r.id)) as GridRow[],
                          adminSortColId,
                          adminSortDir,
                          visibleAdminCols
                        );

                        return (
                          <Card key={u.id} className="bg-card border-border/50 overflow-hidden">
                            <CardHeader className="pb-3 border-b border-border/50">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                                    {(u.displayName ?? u.username).charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-medium text-foreground text-sm">{u.displayName ?? u.username}</p>
                                    <p className="text-xs text-muted-foreground">@{u.username} · {rows.length} {rows.length === 1 ? "registro" : "registros"}</p>
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {sortedAdminRows.length} visíveis
                                </Badge>
                              </div>
                            </CardHeader>
                            {rows.length > 0 ? (
                              <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm border-collapse">
                                    {/* Stats acima do header */}
                                    <thead>
                                      <tr className="bg-gradient-to-r from-blue-500/10 to-indigo-500/5 border-b border-blue-500/20">
                                        <td className="px-4 py-1.5 text-[10px] text-blue-400/70 font-medium w-10">Σ</td>
                                        {orderedAdminCols.map(col => {
                                          const stats = (col.columnType === "number" || col.columnType === "formula")
                                            ? computeColStats(sortedAdminRows, col)
                                            : null;
                                          return (
                                            <td
                                              key={col.id}
                                              className={`px-3 py-1.5 text-[10px] font-medium whitespace-nowrap ${pinnedColIds.has(col.id) ? "sticky left-0 z-10 bg-card" : ""}`}
                                            >
                                              {stats ? (
                                                <div className="flex items-center gap-2">
                                                  <span className="text-blue-400">Σ {formatValue(stats.sum, col)}</span>
                                                  <span className="text-muted-foreground/60">Ø {formatValue(stats.avg, col)}</span>
                                                </div>
                                              ) : (
                                                <span className="text-muted-foreground/30">—</span>
                                              )}
                                            </td>
                                          );
                                        })}
                                        <td className="px-3 py-1.5 w-24" />
                                      </tr>
                                      <tr className="border-b border-border/30 bg-muted/20">
                                        <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground w-10">#</th>
                                        {orderedAdminCols.map(col => (
                                          <th
                                            key={col.id}
                                            className={`text-left px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap ${pinnedColIds.has(col.id) ? "sticky left-0 z-10 bg-muted/20" : ""}`}
                                          >
                                            <div className="flex items-center gap-1.5">
                                              <span style={{ color: col.accentColor ?? undefined }}>
                                                {COLUMN_TYPE_ICONS[col.columnType as ColumnType]}
                                              </span>
                                              {col.name}
                                              {pinnedColIds.has(col.id) && <Pin className="w-2.5 h-2.5 text-primary/60" />}
                                              <button className="ml-0.5 hover:text-primary" onClick={() => handleSort(col.id, true)}>
                                                <SortIcon colId={col.id} isAdminView />
                                              </button>
                                            </div>
                                          </th>
                                        ))}
                                        <th className="px-3 py-2 w-24" />
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {sortedAdminRows.map((row, idx) => {
                                        const isEditingThisRow = adminEditingRowId === row.id;
                                        return (
                                          <tr key={row.id} className={`border-b border-border/20 hover:bg-muted/10 group ${isEditingThisRow ? "bg-primary/5" : ""}`}>
                                            <td className="px-4 py-2 text-xs text-muted-foreground">{idx + 1}</td>
                                            {orderedAdminCols.map(col => (
                                              <td
                                                key={col.id}
                                                className={`px-3 py-2 ${pinnedColIds.has(col.id) ? "sticky left-0 z-10 bg-card" : ""}`}
                                              >
                                                <CellRenderer
                                                  col={col as GridColumn}
                                                  value={isEditingThisRow
                                                    ? (adminEditingRowData[String(col.id)] ?? getCellValue(row.computedData, col.id))
                                                    : getCellValue(row.computedData, col.id)
                                                  }
                                                  onChange={(val) => {
                                                    if (isEditingThisRow) {
                                                      setAdminEditingRowData(prev => ({ ...prev, [String(col.id)]: val }));
                                                    }
                                                  }}
                                                  readOnly={!isEditingThisRow || col.columnType === "formula"}
                                                />
                                              </td>
                                            ))}
                                            <td className="px-3 py-2">
                                              {isEditingThisRow ? (
                                                <div className="flex gap-1">
                                                  <Button
                                                    size="sm"
                                                    className="h-7 px-2 gap-1 text-xs"
                                                    onClick={() => {
                                                      if (!adminEditingUserId) return;
                                                      adminSaveRowMut.mutate({
                                                        id: row.id,
                                                        userId: adminEditingUserId,
                                                        rowOrder: row.rowOrder,
                                                        data: adminEditingRowData,
                                                      });
                                                    }}
                                                    disabled={adminSaveRowMut.isPending}
                                                  >
                                                    <Check className="w-3 h-3" /> Salvar
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 px-2 text-xs"
                                                    onClick={() => { setAdminEditingRowId(null); setAdminEditingRowData({}); setAdminEditingUserId(null); }}
                                                  >
                                                    <X className="w-3 h-3" />
                                                  </Button>
                                                </div>
                                              ) : (
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <Tooltip>
                                                    <TooltipTrigger asChild>
                                                      <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 px-2 hover:bg-primary/10 hover:text-primary"
                                                        onClick={() => {
                                                          setAdminEditingRowId(row.id);
                                                          setAdminEditingRowData(row.computedData as Record<string, unknown>);
                                                          setAdminEditingUserId(u.id);
                                                        }}
                                                      >
                                                        <Pencil className="w-3 h-3" />
                                                      </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Editar linha</TooltipContent>
                                                  </Tooltip>
                                                  <Tooltip>
                                                    <TooltipTrigger asChild>
                                                      <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 px-2 hover:bg-muted/50"
                                                        onClick={() => toggleHideRow(row.id)}
                                                      >
                                                        <EyeOff className="w-3 h-3" />
                                                      </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Ocultar linha</TooltipContent>
                                                  </Tooltip>
                                                  <Tooltip>
                                                    <TooltipTrigger asChild>
                                                      <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 px-2 hover:bg-red-500/10 hover:text-red-400"
                                                        onClick={() => adminDeleteRowMut.mutate({ id: row.id })}
                                                      >
                                                        <Trash2 className="w-3 h-3" />
                                                      </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Excluir linha</TooltipContent>
                                                  </Tooltip>
                                                </div>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
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
                        );
                      })}
                    </div>
                  </>
                )}
              </TabsContent>
            )}

            {/* ══════════════════════════════════════════════════════════════
                Tab: Configurar Colunas (Admin)
            ══════════════════════════════════════════════════════════════ */}
            {isAdmin && (
              <TabsContent value="config" className="mt-4 space-y-4">
                <Card className="bg-card border-border/50">
                  <CardHeader className="pb-3 border-b border-border/50">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">Colunas Configuradas</CardTitle>
                      <Button size="sm" className="gap-1.5 text-xs" onClick={openAddColumn}>
                        <Plus className="w-3.5 h-3.5" />
                        Nova Coluna
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {columns.length === 0 ? (
                      <div className="py-12 text-center">
                        <Settings2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">Nenhuma coluna configurada</p>
                        <Button className="mt-3 gap-2 text-xs" size="sm" onClick={openAddColumn}>
                          <Plus className="w-3.5 h-3.5" />
                          Adicionar primeira coluna
                        </Button>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/30">
                        {[...columns].sort((a, b) => a.sortOrder - b.sortOrder).map((col, idx) => (
                          <div key={col.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/10 transition-colors group">
                            {/* Reorder */}
                            <div className="flex flex-col gap-0.5">
                              <button
                                className="text-muted-foreground/40 hover:text-foreground transition-colors"
                                onClick={() => moveColumn(col.id, "up")}
                                disabled={idx === 0}
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                className="text-muted-foreground/40 hover:text-foreground transition-colors"
                                onClick={() => moveColumn(col.id, "down")}
                                disabled={idx === columns.length - 1}
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Color dot */}
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: col.accentColor ?? "#64748b" }}
                            />

                            {/* Icon */}
                            <span className="text-muted-foreground shrink-0">
                              {COLUMN_TYPE_ICONS[col.columnType]}
                            </span>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-foreground">{col.name}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {COLUMN_TYPE_LABELS[col.columnType]}
                                </Badge>
                                {col.unit && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                                    {col.unit}
                                  </Badge>
                                )}
                                {col.required && (
                                  <Badge className="text-[10px] px-1.5 py-0 bg-red-500/20 text-red-400 border-red-500/30">
                                    obrigatório
                                  </Badge>
                                )}
                                {col.showInDashboard && (
                                  <Badge className="text-[10px] px-1.5 py-0 bg-blue-500/20 text-blue-400 border-blue-500/30">
                                    dashboard
                                  </Badge>
                                )}
                                {col.columnType === "formula" && col.formulaType && (
                                  <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-400 border-amber-500/30">
                                    {FORMULA_TYPE_LABELS[col.formulaType as FormulaType]}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 hover:bg-primary/10 hover:text-primary"
                                onClick={() => openEditColumn(col)}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 hover:bg-red-500/10 hover:text-red-400"
                                onClick={() => {
                                  if (confirm(`Remover coluna "${col.name}"? Os dados desta coluna serão perdidos.`)) {
                                    deleteColumnMut.mutate({ id: col.id });
                                  }
                                }}
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

                {/* Dica */}
                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                  <p className="text-xs text-amber-400/80 font-medium mb-1">💡 Dica de uso</p>
                  <p className="text-xs text-muted-foreground">
                    Colunas do tipo <strong>Fórmula/Cálculo</strong> são calculadas automaticamente com base nas colunas numéricas que você selecionar.
                    Os resultados aparecem em <strong>amarelo</strong> na tabela e o total é exibido <strong>acima do cabeçalho</strong> de cada coluna.
                    Marque "Mostrar no Dashboard" para gerar widgets automáticos no painel principal.
                  </p>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* ── Column Dialog ── */}
        <ColumnDialog
          open={columnDialog}
          onClose={() => { setColumnDialog(false); setEditingColumn(null); }}
          columns={columns}
          editingColumn={editingColumn}
          form={columnForm}
          setForm={setColumnForm}
          onSubmit={submitColumnForm}
          isPending={addColumnMut.isPending || updateColumnMut.isPending}
        />
      </DashboardLayout>
    </TooltipProvider>
  );
}
