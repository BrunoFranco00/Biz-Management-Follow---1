import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  DollarSign,
  Handshake,
  Phone,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

function getWeekRange(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
  const monday = new Date(now.setDate(diff));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { weekStart: fmt(monday), weekEnd: fmt(friday) };
}

const FUNNEL_STAGES = [
  { key: "prospecting", label: "Prospecção", color: "#1e3a5f", width: "100%" },
  { key: "qualification", label: "Qualificação", color: "#2d5282", width: "82%" },
  { key: "presentation", label: "Apresentação", color: "#c9a227", width: "65%" },
  { key: "negotiation", label: "Negociação", color: "#b7791f", width: "48%" },
  { key: "closing", label: "Fechamento", color: "#276749", width: "32%" },
];

const DEFAULT_METRICS = [
  { metricName: "Contatos Realizados", target: 50, realized: 0, unit: "number" },
  { metricName: "Consultas Agendadas", target: 18, realized: 0, unit: "number" },
  { metricName: "Negociações Fechadas", target: 3, realized: 0, unit: "number" },
  { metricName: "Faturamento (R$)", target: 120000, realized: 0, unit: "currency" },
];

const DEFAULT_FUNNEL = FUNNEL_STAGES.map((s) => ({
  stage: s.key,
  quantity: 0,
  totalValue: 0,
}));

export default function Dashboard() {
  const { weekStart, weekEnd } = useMemo(() => getWeekRange(), []);
  const [weekLabel] = useState(() => {
    const s = new Date(weekStart + "T12:00:00");
    const e = new Date(weekEnd + "T12:00:00");
    return `${s.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${e.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`;
  });

  const createReport = trpc.reports.getOrCreate.useMutation();
  const [reportId, setReportId] = useState<number | null>(null);

  const { data: reports, isLoading: loadingReports } = trpc.reports.list.useQuery();

  // Initialize report for current week
  const utils = trpc.useUtils();
  const initReport = async (data: typeof reports) => {
    if (!data) return;
    const current = data.find((r) => {
      const rs = r.weekStart instanceof Date ? r.weekStart.toISOString().split("T")[0] : String(r.weekStart).split("T")[0];
      return rs === weekStart;
    });
    if (current) {
      setReportId(current.id);
    } else {
      const report = await createReport.mutateAsync({ weekStart, weekEnd });
      if (report) {
        setReportId(report.id);
        utils.reports.list.invalidate();
      }
    }
  };

  // Use effect to init report when data loads
  const [initialized, setInitialized] = useState(false);
  if (reports && !initialized && !reportId) {
    setInitialized(true);
    initReport(reports);
  }

  const { data: kpis, isLoading: loadingKpis } = trpc.kpis.getByReport.useQuery(
    { reportId: reportId! },
    { enabled: !!reportId }
  );

  const { data: funnelData, isLoading: loadingFunnel } = trpc.funnel.getByReport.useQuery(
    { reportId: reportId! },
    { enabled: !!reportId }
  );

  const { data: oppStats } = trpc.opportunities.stats.useQuery();

  const saveKpis = trpc.kpis.upsert.useMutation({
    onSuccess: () => toast.success("KPIs salvos com sucesso"),
    onError: () => toast.error("Erro ao salvar KPIs"),
  });

  const saveFunnel = trpc.funnel.upsert.useMutation({
    onSuccess: () => toast.success("Funil atualizado"),
    onError: () => toast.error("Erro ao atualizar funil"),
  });

  const metrics = useMemo(() => {
    if (!kpis || kpis.length === 0) return DEFAULT_METRICS;
    return DEFAULT_METRICS.map((dm) => {
      const found = kpis.find((k) => k.metricName === dm.metricName);
      return {
        ...dm,
        target: found?.target ? parseFloat(String(found.target)) : dm.target,
        realized: found?.realized ? parseFloat(String(found.realized)) : 0,
      };
    });
  }, [kpis]);

  const funnel = useMemo(() => {
    if (!funnelData || funnelData.length === 0) return DEFAULT_FUNNEL;
    return FUNNEL_STAGES.map((s) => {
      const found = funnelData.find((f) => f.stage === s.key);
      return {
        stage: s.key,
        quantity: found?.quantity ?? 0,
        totalValue: found?.totalValue ? parseFloat(String(found.totalValue)) : 0,
      };
    });
  }, [funnelData]);

  const [editingKpi, setEditingKpi] = useState<Record<string, { target: string; realized: string }>>({});
  const [editingFunnel, setEditingFunnel] = useState<Record<string, { quantity: string; totalValue: string }>>({});
  const [isEditingKpi, setIsEditingKpi] = useState(false);
  const [isEditingFunnel, setIsEditingFunnel] = useState(false);

  const startEditKpi = () => {
    const init: Record<string, { target: string; realized: string }> = {};
    metrics.forEach((m) => {
      init[m.metricName] = {
        target: String(m.target),
        realized: String(m.realized),
      };
    });
    setEditingKpi(init);
    setIsEditingKpi(true);
  };

  const startEditFunnel = () => {
    const init: Record<string, { quantity: string; totalValue: string }> = {};
    funnel.forEach((f) => {
      init[f.stage] = {
        quantity: String(f.quantity),
        totalValue: String(f.totalValue),
      };
    });
    setEditingFunnel(init);
    setIsEditingFunnel(true);
  };

  const handleSaveKpi = async () => {
    if (!reportId) return;
    await saveKpis.mutateAsync({
      reportId,
      metrics: metrics.map((m) => ({
        metricName: m.metricName,
        target: parseFloat(editingKpi[m.metricName]?.target || "0"),
        realized: parseFloat(editingKpi[m.metricName]?.realized || "0"),
        unit: m.unit,
      })),
    });
    setIsEditingKpi(false);
  };

  const handleSaveFunnel = async () => {
    if (!reportId) return;
    await saveFunnel.mutateAsync({
      reportId,
      entries: FUNNEL_STAGES.map((s) => ({
        stage: s.key as any,
        quantity: parseInt(editingFunnel[s.key]?.quantity || "0"),
        totalValue: parseFloat(editingFunnel[s.key]?.totalValue || "0"),
      })),
    });
    setIsEditingFunnel(false);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

  const kpiIcons = [Phone, CalendarDays, Handshake, DollarSign];
  const kpiColors = ["#1e3a5f", "#c9a227", "#276749", "#7c3aed"];

  // Pie chart data for lead sources
  const pieData = [
    { name: "Indicação", value: 15 },
    { name: "Inbound", value: 60 },
    { name: "Prospecção Ativa", value: 15 },
    { name: "Networking", value: 10 },
  ];
  const PIE_COLORS = ["#1e3a5f", "#c9a227", "#276749", "#7c3aed"];

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard Executivo</h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              Semana: {weekLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Ao vivo
            </Badge>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(loadingKpis ? Array(4).fill(null) : metrics).map((metric, i) => {
            if (!metric) return <Skeleton key={i} className="h-32 rounded-xl" />;
            const pct = metric.target > 0 ? Math.min((metric.realized / metric.target) * 100, 100) : 0;
            const Icon = kpiIcons[i];
            const isGood = pct >= 80;
            const isCurrency = metric.unit === "currency";
            return (
              <Card key={metric.metricName} className="border border-border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: kpiColors[i] + "18" }}
                    >
                      <Icon className="w-5 h-5" style={{ color: kpiColors[i] }} />
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium" style={{ color: isGood ? "#276749" : "#b7791f" }}>
                      {isGood ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {pct.toFixed(0)}%
                    </div>
                  </div>
                  <div className="space-y-1 mb-3">
                    <p className="text-xs text-muted-foreground font-medium">{metric.metricName}</p>
                    {isEditingKpi ? (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={editingKpi[metric.metricName]?.realized || ""}
                          onChange={(e) =>
                            setEditingKpi((prev) => ({
                              ...prev,
                              [metric.metricName]: { ...prev[metric.metricName], realized: e.target.value },
                            }))
                          }
                          placeholder="Realizado"
                          className="w-full text-sm border border-border rounded-md px-2 py-1 bg-background text-foreground"
                        />
                        <input
                          type="number"
                          value={editingKpi[metric.metricName]?.target || ""}
                          onChange={(e) =>
                            setEditingKpi((prev) => ({
                              ...prev,
                              [metric.metricName]: { ...prev[metric.metricName], target: e.target.value },
                            }))
                          }
                          placeholder="Meta"
                          className="w-full text-sm border border-border rounded-md px-2 py-1 bg-background text-foreground"
                        />
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-foreground">
                          {isCurrency ? formatCurrency(metric.realized) : metric.realized.toLocaleString("pt-BR")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          / {isCurrency ? formatCurrency(metric.target) : metric.target.toLocaleString("pt-BR")}
                        </span>
                      </div>
                    )}
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* KPI Edit Controls */}
        <div className="flex justify-end gap-2">
          {isEditingKpi ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditingKpi(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveKpi} disabled={saveKpis.isPending}>
                {saveKpis.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                Salvar KPIs
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={startEditKpi} disabled={!reportId}>
              Atualizar KPIs da Semana
            </Button>
          )}
        </div>

        {/* Funnel + Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Funnel */}
          <Card className="lg:col-span-2 border border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Funil de Vendas
              </CardTitle>
              {isEditingFunnel ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditingFunnel(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSaveFunnel} disabled={saveFunnel.isPending}>
                    Salvar
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={startEditFunnel} disabled={!reportId}>
                  Editar
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {FUNNEL_STAGES.map((stage, i) => {
                const data = funnel.find((f) => f.stage === stage.key) || { quantity: 0, totalValue: 0 };
                return (
                  <div key={stage.key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: stage.color }} />
                        <span className="font-medium text-foreground">{stage.label}</span>
                      </div>
                      <div className="flex items-center gap-4 text-muted-foreground">
                        {isEditingFunnel ? (
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={editingFunnel[stage.key]?.quantity || ""}
                              onChange={(e) =>
                                setEditingFunnel((prev) => ({
                                  ...prev,
                                  [stage.key]: { ...prev[stage.key], quantity: e.target.value },
                                }))
                              }
                              placeholder="Qtd"
                              className="w-16 text-xs border border-border rounded px-2 py-0.5 bg-background text-foreground"
                            />
                            <input
                              type="number"
                              value={editingFunnel[stage.key]?.totalValue || ""}
                              onChange={(e) =>
                                setEditingFunnel((prev) => ({
                                  ...prev,
                                  [stage.key]: { ...prev[stage.key], totalValue: e.target.value },
                                }))
                              }
                              placeholder="Valor"
                              className="w-24 text-xs border border-border rounded px-2 py-0.5 bg-background text-foreground"
                            />
                          </div>
                        ) : (
                          <>
                            <span className="text-xs">{data.quantity} leads</span>
                            <span className="text-xs font-medium text-foreground">
                              {formatCurrency(data.totalValue)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="relative h-8 rounded-md overflow-hidden bg-muted">
                      <div
                        className="h-full rounded-md transition-all duration-500 flex items-center px-3"
                        style={{
                          width: stage.width,
                          background: stage.color,
                          opacity: 0.9,
                        }}
                      >
                        <span className="text-white text-xs font-medium truncate">
                          {data.quantity > 0 ? `${data.quantity} leads` : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="pt-3 border-t border-border flex items-center justify-between text-sm">
                <span className="font-semibold text-foreground">Total no Pipeline</span>
                <span className="font-bold text-primary">
                  {formatCurrency(funnel.reduce((acc, f) => acc + f.totalValue, 0))}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Lead Sources Pie */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Origem dos Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, ""]}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: PIE_COLORS[i] }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Reports */}
        {reports && reports.length > 0 && (
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Relatórios Anteriores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {reports.slice(0, 5).map((report) => {
                  const rs = report.weekStart instanceof Date
                    ? report.weekStart.toLocaleDateString("pt-BR")
                    : new Date(String(report.weekStart) + "T12:00:00").toLocaleDateString("pt-BR");
                  const re = report.weekEnd instanceof Date
                    ? report.weekEnd.toLocaleDateString("pt-BR")
                    : new Date(String(report.weekEnd) + "T12:00:00").toLocaleDateString("pt-BR");
                  return (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <CalendarDays className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          {rs} — {re}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
