import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  Circle,
  Clock,
  Layers,
  Plus,
  RefreshCw,
  Smile,
  Target,
  Trash2,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { weekStart: fmt(monday), weekEnd: fmt(friday) };
}

const CONFIDENCE_LEVELS = [
  { value: "very_confident", label: "Muito Confiante", color: "text-green-600", bg: "bg-green-50 border-green-200" },
  { value: "confident", label: "Confiante", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  { value: "moderately_confident", label: "Moderadamente Confiante", color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
  { value: "low_confidence", label: "Pouco Confiante", color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
  { value: "worried", label: "Preocupado", color: "text-red-600", bg: "bg-red-50 border-red-200" },
];

const ACTION_STATUSES = [
  { value: "pending", label: "Pendente", icon: Circle, color: "text-muted-foreground" },
  { value: "in_progress", label: "Em Andamento", icon: Clock, color: "text-blue-600" },
  { value: "done", label: "Concluído", icon: CheckCircle2, color: "text-green-600" },
  { value: "cancelled", label: "Cancelado", icon: XCircle, color: "text-red-500" },
];

const DEFAULT_METRICS = [
  "Contatos Realizados",
  "Consultas Agendadas",
  "Negociações Fechadas",
  "Faturamento (R$)",
];

export default function Planning() {
  const { weekStart, weekEnd } = useMemo(() => getWeekRange(), []);
  const [reportId, setReportId] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const createReport = trpc.reports.getOrCreate.useMutation();
  const utils = trpc.useUtils();

  const { data: reports } = trpc.reports.list.useQuery();

  if (reports && !initialized) {
    setInitialized(true);
    const current = reports.find((r) => {
      const rs = r.weekStart instanceof Date ? r.weekStart.toISOString().split("T")[0] : String(r.weekStart).split("T")[0];
      return rs === weekStart;
    });
    if (current) setReportId(current.id);
    else createReport.mutateAsync({ weekStart, weekEnd }).then((r) => { if (r) setReportId(r.id); });
  }

  const { data: planData } = trpc.planning.getByReport.useQuery(
    { reportId: reportId! },
    { enabled: !!reportId }
  );

  // Plans state
  const [planValues, setPlanValues] = useState<Array<{ metricName: string; target: string; howToAchieve: string }>>([]);
  // Actions state
  const [actionValues, setActionValues] = useState<Array<{ priority: number; actionDescription: string; deadline: string; status: string }>>([]);
  // Confidence state
  const [confidenceLevel, setConfidenceLevel] = useState<string>("confident");
  const [confidenceReason, setConfidenceReason] = useState<string>("");

  const savePlanning = trpc.planning.upsert.useMutation({
    onSuccess: () => {
      toast.success("Planejamento salvo!");
      utils.planning.getByReport.invalidate({ reportId: reportId! });
      setIsEditing(false);
    },
    onError: () => toast.error("Erro ao salvar planejamento"),
  });

  const startEdit = () => {
    const plans = DEFAULT_METRICS.map((m) => {
      const found = planData?.plans.find((p) => p.metricName === m);
      return {
        metricName: m,
        target: found?.target ? String(found.target) : "",
        howToAchieve: found?.howToAchieve || "",
      };
    });
    const actions = planData?.actions.length
      ? planData.actions.map((a) => ({
          priority: a.priority ?? 1,
          actionDescription: a.actionDescription,
          deadline: a.deadline
            ? (a.deadline instanceof Date ? a.deadline.toISOString().split("T")[0] : String(a.deadline).split("T")[0])
            : "",
          status: a.status || "pending",
        }))
      : [{ priority: 1, actionDescription: "", deadline: "", status: "pending" }];
    setPlanValues(plans);
    setActionValues(actions);
    setConfidenceLevel(planData?.confidence?.level || "confident");
    setConfidenceReason(planData?.confidence?.reason || "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!reportId) return;
    await savePlanning.mutateAsync({
      reportId,
      plans: planValues.filter((p) => p.target).map((p) => ({
        metricName: p.metricName,
        target: parseFloat(p.target) || 0,
        howToAchieve: p.howToAchieve || undefined,
      })),
      actions: actionValues.filter((a) => a.actionDescription.trim()).map((a, i) => ({
        priority: i + 1,
        actionDescription: a.actionDescription,
        deadline: a.deadline || undefined,
        status: a.status as any,
      })),
      confidenceLevel: {
        level: confidenceLevel as any,
        reason: confidenceReason || undefined,
      },
    });
  };

  const addAction = () => {
    setActionValues((prev) => [
      ...prev,
      { priority: prev.length + 1, actionDescription: "", deadline: "", status: "pending" },
    ]);
  };

  const removeAction = (i: number) => {
    setActionValues((prev) => prev.filter((_, idx) => idx !== i));
  };

  const confidenceInfo = CONFIDENCE_LEVELS.find((c) => c.value === (planData?.confidence?.level || "confident")) || CONFIDENCE_LEVELS[1];

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Planejamento Semanal</h1>
            <p className="text-sm text-muted-foreground mt-1">Defina metas e ações prioritárias para a semana</p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={savePlanning.isPending} className="bg-primary text-primary-foreground">
                  {savePlanning.isPending && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}
                  Salvar Planejamento
                </Button>
              </>
            ) : (
              <Button onClick={startEdit} disabled={!reportId} className="bg-primary text-primary-foreground">
                Editar Planejamento
              </Button>
            )}
          </div>
        </div>

        {/* Confidence Level */}
        <Card className={`border shadow-sm ${isEditing ? "border-border" : `border ${confidenceInfo.bg}`}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Smile className="w-4 h-4 text-primary" />
              Nível de Confiança para a Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {CONFIDENCE_LEVELS.map((cl) => (
                    <button
                      key={cl.value}
                      onClick={() => setConfidenceLevel(cl.value)}
                      className={`p-3 rounded-xl border text-xs font-medium text-center transition-all ${
                        confidenceLevel === cl.value
                          ? `${cl.bg} ${cl.color} border-current`
                          : "border-border text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {cl.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={confidenceReason}
                  onChange={(e) => setConfidenceReason(e.target.value)}
                  placeholder="Por que você está neste nível de confiança? (opcional)"
                  rows={2}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground resize-none"
                />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Badge className={`${confidenceInfo.bg} ${confidenceInfo.color} border`}>
                  {confidenceInfo.label}
                </Badge>
                {planData?.confidence?.reason && (
                  <p className="text-sm text-muted-foreground">{planData.confidence.reason}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metric Goals */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Metas da Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-3">
                {planValues.map((plan, i) => (
                  <div key={plan.metricName} className="grid grid-cols-3 gap-3 items-start">
                    <div className="flex items-center h-10">
                      <span className="text-sm font-medium text-foreground">{plan.metricName}</span>
                    </div>
                    <input
                      type="number"
                      value={plan.target}
                      onChange={(e) =>
                        setPlanValues((prev) => prev.map((p, idx) => idx === i ? { ...p, target: e.target.value } : p))
                      }
                      placeholder="Meta"
                      className="text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground h-10"
                    />
                    <input
                      value={plan.howToAchieve}
                      onChange={(e) =>
                        setPlanValues((prev) => prev.map((p, idx) => idx === i ? { ...p, howToAchieve: e.target.value } : p))
                      }
                      placeholder="Como atingir?"
                      className="text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground h-10"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {planData?.plans && planData.plans.length > 0 ? (
                  planData.plans.map((plan) => (
                    <div key={plan.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <span className="text-sm font-medium text-foreground">{plan.metricName}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-primary">
                          Meta: {plan.target ? Number(plan.target).toLocaleString("pt-BR") : "—"}
                        </span>
                        {plan.howToAchieve && (
                          <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {plan.howToAchieve}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma meta definida. Clique em "Editar Planejamento" para começar.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Priority Actions */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Ações Prioritárias
            </CardTitle>
            {isEditing && (
              <Button variant="outline" size="sm" onClick={addAction} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-3">
                {actionValues.map((action, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-1 flex items-center justify-center h-10">
                      <span className="text-sm font-bold text-muted-foreground">{i + 1}</span>
                    </div>
                    <input
                      value={action.actionDescription}
                      onChange={(e) =>
                        setActionValues((prev) => prev.map((a, idx) => idx === i ? { ...a, actionDescription: e.target.value } : a))
                      }
                      placeholder="Descrição da ação"
                      className="col-span-5 text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground h-10"
                    />
                    <input
                      type="date"
                      value={action.deadline}
                      onChange={(e) =>
                        setActionValues((prev) => prev.map((a, idx) => idx === i ? { ...a, deadline: e.target.value } : a))
                      }
                      className="col-span-3 text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground h-10"
                    />
                    <Select
                      value={action.status}
                      onValueChange={(v) =>
                        setActionValues((prev) => prev.map((a, idx) => idx === i ? { ...a, status: v } : a))
                      }
                    >
                      <SelectTrigger className="col-span-2 h-10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTION_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => removeAction(i)}
                      className="col-span-1 flex items-center justify-center h-10 hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {planData?.actions && planData.actions.length > 0 ? (
                  planData.actions.map((action, i) => {
                    const statusInfo = ACTION_STATUSES.find((s) => s.value === action.status) || ACTION_STATUSES[0];
                    const StatusIcon = statusInfo.icon;
                    return (
                      <div key={action.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors">
                        <span className="text-sm font-bold text-muted-foreground w-5 shrink-0">{i + 1}</span>
                        <StatusIcon className={`w-4 h-4 shrink-0 ${statusInfo.color}`} />
                        <span className="text-sm text-foreground flex-1">{action.actionDescription}</span>
                        {action.deadline && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(String(action.deadline) + "T12:00:00").toLocaleDateString("pt-BR")}
                          </span>
                        )}
                        <Badge variant="outline" className={`text-xs ${statusInfo.color}`}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma ação prioritária definida.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
