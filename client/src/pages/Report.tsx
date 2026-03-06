import { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Download, Printer, TrendingUp, Target, Activity, MessageSquare, Calendar, Zap, Star, CheckCircle2, AlertTriangle, BarChart3 } from "lucide-react";
import { useLocalAuth } from "@/contexts/LocalAuthContext";

function formatCurrency(value: string | number | null | undefined) {
  if (!value) return "R$ 0,00";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

const STAGE_LABELS: Record<string, string> = {
  prospecting: "Prospecção", qualification: "Qualificação", presentation: "Apresentação",
  negotiation: "Negociação", closing: "Fechamento",
};

const ACTIVITY_LABELS: Record<string, string> = {
  calls: "Ligações", emails: "E-mails", whatsapp: "WhatsApp",
  in_person_visits: "Visitas Presenciais", meetings_scheduled: "Reuniões Agendadas",
};

const MOOD_LABELS: Record<string, string> = {
  excellent: "Excelente", good: "Boa", neutral: "Regular", difficult: "Difícil", very_difficult: "Muito Difícil",
};

const ACTION_STATUS: Record<string, string> = {
  pending: "Pendente", in_progress: "Em Andamento", done: "Concluído", cancelled: "Cancelado",
};

export default function Report() {
  const { user } = useLocalAuth();
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

  const { data: reportsRaw = [] } = trpc.reports.list.useQuery();
  const reports = reportsRaw as Array<{ id: number; weekStart: string | Date; weekEnd: string | Date }>;

  const currentReportId = selectedReportId ?? (reports[0]?.id ?? null);

  const { data: reportData, isLoading } = trpc.report.full.useQuery(
    { reportId: currentReportId! },
    { enabled: !!currentReportId }
  );

  function handlePrint() {
    window.print();
    toast.success("Abrindo diálogo de impressão/PDF...");
  }

  const rd = reportData as {
    report: { weekStart: string | Date; weekEnd: string | Date; highlights: string | null; challenges: string | null };
    user: { name: string | null; email: string | null } | null;
    kpis: Array<{ metricName: string; target: string | null; realized: string | null; unit: string | null }>;
    funnel: Array<{ stage: string; quantity: number | null; totalValue: string | null }>;
    activities: Array<{ activityType: string; target: number | null; realized: number | null }>;
    objections: Array<{ objectionText: string; frequency: number | null; responseUsed: string | null; worked: boolean | null }>;
    plans: Array<{ metricName: string; target: string | null; howToAchieve: string | null }>;
    actions: Array<{ priority: number | null; actionDescription: string; deadline: string | Date | null; status: string }>;
    strategic: Array<{ actionName: string; completed: boolean; resultYtd: string | null; difficulty: string | null }>;
    checkin: { performanceScore: number | null; weekHighlight: string | null; biggestChallenge: string | null; nextWeekFocus: string | null; moodLevel: string | null } | null;
  } | null | undefined;

  return (
    <DashboardLayout>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-report, #print-report * { visibility: visible !important; }
          #print-report { position: fixed; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Relatório Semanal
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Gere e exporte seu relatório completo de performance</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={currentReportId?.toString() ?? ""} onValueChange={v => setSelectedReportId(parseInt(v))}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Selecionar semana" />
              </SelectTrigger>
              <SelectContent>
                {reports.map(r => (
                  <SelectItem key={r.id} value={r.id.toString()}>
                    Semana: {formatDate(r.weekStart)} – {formatDate(r.weekEnd)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handlePrint} className="gap-2" disabled={!rd}>
              <Printer className="h-4 w-4" /> Imprimir / PDF
            </Button>
          </div>
        </div>

        {isLoading && <div className="text-center py-12 text-muted-foreground">Carregando relatório...</div>}
        {!isLoading && !rd && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center space-y-3">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-lg font-semibold">Nenhum relatório encontrado</p>
              <p className="text-sm text-muted-foreground">Preencha os dados semanais no Dashboard para gerar seu primeiro relatório.</p>
            </CardContent>
          </Card>
        )}

        {rd && (
          <div id="print-report" ref={printRef} className="space-y-4">
            {/* Cover */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-primary to-primary/80 text-primary-foreground overflow-hidden">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-6 w-6" />
                      <span className="text-lg font-bold">Biz Management Follow</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold">Relatório Semanal de Performance</h2>
                    <p className="mt-2 opacity-80">
                      {rd.user?.name ?? user?.displayName ?? user?.username ?? "Vendedor"} · {formatDate(rd.report.weekStart)} a {formatDate(rd.report.weekEnd)}
                    </p>
                  </div>
                  {rd.checkin && (
                    <div className="bg-white/20 rounded-2xl p-4 text-center min-w-[120px]">
                      <p className="text-xs opacity-80 mb-1">Score Semanal</p>
                      <p className="text-5xl font-bold">{rd.checkin.performanceScore ?? "—"}</p>
                      <p className="text-xs opacity-80 mt-1">/100</p>
                      {rd.checkin.moodLevel && <Badge className="mt-2 bg-white/30 text-white border-0 text-xs">{MOOD_LABELS[rd.checkin.moodLevel]}</Badge>}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* KPIs */}
            {rd.kpis.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-5 w-5 text-primary" />KPIs da Semana</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {rd.kpis.map((kpi, i) => {
                      const target = parseFloat(kpi.target ?? "0");
                      const realized = parseFloat(kpi.realized ?? "0");
                      const pct = target > 0 ? Math.min(Math.round((realized / target) * 100), 100) : 0;
                      return (
                        <div key={i} className="bg-muted/30 rounded-xl p-3 space-y-2">
                          <p className="text-xs text-muted-foreground font-medium">{kpi.metricName}</p>
                          <p className="text-2xl font-bold">{kpi.unit === "currency" ? formatCurrency(realized) : realized}</p>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Meta: {kpi.unit === "currency" ? formatCurrency(target) : target}</span>
                              <span className={pct >= 100 ? "text-emerald-600 font-bold" : pct >= 70 ? "text-amber-600" : "text-red-500"}>{pct}%</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Funnel */}
            {rd.funnel.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-5 w-5 text-primary" />Funil de Vendas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {rd.funnel.map((f, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-sm w-28 shrink-0">{STAGE_LABELS[f.stage] ?? f.stage}</span>
                        <div className="flex-1 h-7 bg-muted rounded-lg overflow-hidden relative">
                          <div className="h-full bg-primary/80 rounded-lg flex items-center px-2" style={{ width: `${Math.max(5, (f.quantity ?? 0) * 10)}%`, maxWidth: "100%" }}>
                            <span className="text-xs text-white font-medium">{f.quantity ?? 0} leads</span>
                          </div>
                        </div>
                        <span className="text-sm font-medium w-28 text-right shrink-0">{formatCurrency(f.totalValue)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Activities */}
            {rd.activities.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-5 w-5 text-primary" />Atividades de Prospecção</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {rd.activities.map((a, i) => {
                      const pct = (a.target ?? 0) > 0 ? Math.min(Math.round(((a.realized ?? 0) / (a.target ?? 1)) * 100), 100) : 0;
                      return (
                        <div key={i} className="border rounded-xl p-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">{ACTIVITY_LABELS[a.activityType] ?? a.activityType}</p>
                          <div className="flex items-end gap-1">
                            <span className="text-2xl font-bold">{a.realized ?? 0}</span>
                            <span className="text-sm text-muted-foreground mb-0.5">/ {a.target ?? 0}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Objections */}
            {rd.objections.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-5 w-5 text-primary" />Objeções Registradas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {rd.objections.map((o, i) => (
                      <div key={i} className="border rounded-xl p-3 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">{o.objectionText}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant="outline" className="text-xs">×{o.frequency ?? 1}</Badge>
                            {o.worked !== null && (
                              <Badge className={`text-xs ${o.worked ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                {o.worked ? "Funcionou" : "Não funcionou"}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {o.responseUsed && <p className="text-xs text-muted-foreground">→ {o.responseUsed}</p>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Weekly Actions */}
            {rd.actions.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base"><Calendar className="h-5 w-5 text-primary" />Ações da Semana</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {rd.actions.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)).map((a, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${a.status === "done" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                          {a.status === "done" ? <CheckCircle2 className="h-4 w-4" /> : (a.priority ?? i + 1)}
                        </div>
                        <p className={`flex-1 text-sm ${a.status === "done" ? "line-through text-muted-foreground" : ""}`}>{a.actionDescription}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          {a.deadline && <span className="text-xs text-muted-foreground">{formatDate(a.deadline)}</span>}
                          <Badge variant="outline" className="text-xs">{ACTION_STATUS[a.status] ?? a.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Strategic Actions */}
            {rd.strategic.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base"><Zap className="h-5 w-5 text-primary" />Ações Estratégicas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {rd.strategic.map((s, i) => (
                      <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
                        <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${s.completed ? "bg-emerald-100" : "bg-muted"}`}>
                          {s.completed ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{s.actionName}</p>
                          {s.resultYtd && <p className="text-xs text-muted-foreground mt-0.5">Resultado: {s.resultYtd}</p>}
                          {s.difficulty && <p className="text-xs text-orange-600 mt-0.5">Dificuldade: {s.difficulty}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Check-in */}
            {rd.checkin && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base"><Star className="h-5 w-5 text-primary" />Check-in Semanal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {rd.checkin.weekHighlight && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                        <p className="text-xs font-semibold text-emerald-700 mb-1">Destaque da Semana</p>
                        <p className="text-sm">{rd.checkin.weekHighlight}</p>
                      </div>
                    )}
                    {rd.checkin.biggestChallenge && (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                        <p className="text-xs font-semibold text-orange-700 mb-1">Principal Desafio</p>
                        <p className="text-sm">{rd.checkin.biggestChallenge}</p>
                      </div>
                    )}
                    {rd.checkin.nextWeekFocus && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                        <p className="text-xs font-semibold text-blue-700 mb-1">Foco da Próxima Semana</p>
                        <p className="text-sm">{rd.checkin.nextWeekFocus}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Plans */}
            {rd.plans.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base"><Target className="h-5 w-5 text-primary" />Planejamento da Próxima Semana</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {rd.plans.map((p, i) => (
                      <div key={i} className="border rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{p.metricName}</p>
                          <Badge variant="outline">Meta: {p.target}</Badge>
                        </div>
                        {p.howToAchieve && <p className="text-xs text-muted-foreground mt-1">→ {p.howToAchieve}</p>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Footer */}
            <div className="text-center text-xs text-muted-foreground py-4 border-t">
              Gerado em {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })} · Biz Management Follow
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
