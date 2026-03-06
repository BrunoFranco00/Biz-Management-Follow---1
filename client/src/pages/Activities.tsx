import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { Mail, MessageCircle, Phone, RefreshCw, Users, Video } from "lucide-react";
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

const ACTIVITY_TYPES = [
  { key: "calls", label: "Ligações", icon: Phone, color: "#1e3a5f", defaultTarget: 30 },
  { key: "emails", label: "E-mails", icon: Mail, color: "#7c3aed", defaultTarget: 20 },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "#276749", defaultTarget: 40 },
  { key: "in_person_visits", label: "Visitas Presenciais", icon: Users, color: "#c9a227", defaultTarget: 5 },
  { key: "meetings_scheduled", label: "Reuniões Agendadas", icon: Video, color: "#b7791f", defaultTarget: 8 },
];

const LEAD_SOURCES = [
  { key: "referral", label: "Indicação" },
  { key: "active_prospecting", label: "Prospecção Ativa" },
  { key: "inbound", label: "Inbound" },
  { key: "networking", label: "Networking" },
  { key: "other", label: "Outro" },
];

export default function Activities() {
  const { weekStart, weekEnd } = useMemo(() => getWeekRange(), []);
  const [reportId, setReportId] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);

  const createReport = trpc.reports.getOrCreate.useMutation();
  const utils = trpc.useUtils();

  const { data: reports } = trpc.reports.list.useQuery();

  if (reports && !initialized) {
    setInitialized(true);
    const current = reports.find((r) => {
      const rs = r.weekStart instanceof Date ? r.weekStart.toISOString().split("T")[0] : String(r.weekStart).split("T")[0];
      return rs === weekStart;
    });
    if (current) {
      setReportId(current.id);
    } else {
      createReport.mutateAsync({ weekStart, weekEnd }).then((r) => {
        if (r) setReportId(r.id);
      });
    }
  }

  const { data: actData } = trpc.activities.getByReport.useQuery(
    { reportId: reportId! },
    { enabled: !!reportId }
  );

  const [actValues, setActValues] = useState<Record<string, { target: string; realized: string }>>({});
  const [leadValues, setLeadValues] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);

  const saveActivities = trpc.activities.upsert.useMutation({
    onSuccess: () => {
      toast.success("Atividades salvas com sucesso!");
      utils.activities.getByReport.invalidate({ reportId: reportId! });
      setIsEditing(false);
    },
    onError: () => toast.error("Erro ao salvar atividades"),
  });

  const startEdit = () => {
    const init: Record<string, { target: string; realized: string }> = {};
    ACTIVITY_TYPES.forEach((at) => {
      const found = actData?.activities.find((a) => a.activityType === at.key);
      init[at.key] = {
        target: found?.target ? String(found.target) : String(at.defaultTarget),
        realized: found?.realized ? String(found.realized) : "0",
      };
    });
    const leadInit: Record<string, string> = {};
    LEAD_SOURCES.forEach((ls) => {
      const found = actData?.leadSources.find((l) => l.source === ls.key);
      leadInit[ls.key] = found?.quantity ? String(found.quantity) : "0";
    });
    setActValues(init);
    setLeadValues(leadInit);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!reportId) return;
    await saveActivities.mutateAsync({
      reportId,
      activities: ACTIVITY_TYPES.map((at) => ({
        activityType: at.key as any,
        target: parseInt(actValues[at.key]?.target || "0"),
        realized: parseInt(actValues[at.key]?.realized || "0"),
      })),
      leadSources: LEAD_SOURCES.map((ls) => ({
        source: ls.key as any,
        quantity: parseInt(leadValues[ls.key] || "0"),
      })),
    });
  };

  const getActivity = (key: string) => actData?.activities.find((a) => a.activityType === key);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Atividades de Prospecção</h1>
            <p className="text-sm text-muted-foreground mt-1">Rastreie suas atividades semanais</p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saveActivities.isPending} className="bg-primary text-primary-foreground">
                  {saveActivities.isPending && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}
                  Salvar
                </Button>
              </>
            ) : (
              <Button onClick={startEdit} disabled={!reportId} className="bg-primary text-primary-foreground">
                Atualizar Atividades
              </Button>
            )}
          </div>
        </div>

        {/* Activity Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACTIVITY_TYPES.map((at) => {
            const act = getActivity(at.key);
            const target = isEditing
              ? parseInt(actValues[at.key]?.target || "0")
              : act?.target ?? at.defaultTarget;
            const realized = isEditing
              ? parseInt(actValues[at.key]?.realized || "0")
              : act?.realized ?? 0;
            const pct = target > 0 ? Math.min((realized / target) * 100, 100) : 0;
            const isGood = pct >= 80;

            return (
              <Card key={at.key} className="border border-border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: at.color + "18" }}
                    >
                      <at.icon className="w-5 h-5" style={{ color: at.color }} />
                    </div>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: isGood ? "#27674918" : "#b7791f18",
                        color: isGood ? "#276749" : "#b7791f",
                      }}
                    >
                      {pct.toFixed(0)}%
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-foreground mb-3">{at.label}</p>

                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Realizado</label>
                        <input
                          type="number"
                          min="0"
                          value={actValues[at.key]?.realized || ""}
                          onChange={(e) =>
                            setActValues((prev) => ({
                              ...prev,
                              [at.key]: { ...prev[at.key], realized: e.target.value },
                            }))
                          }
                          className="w-full text-sm border border-border rounded-md px-2 py-1.5 bg-background text-foreground"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Meta</label>
                        <input
                          type="number"
                          min="0"
                          value={actValues[at.key]?.target || ""}
                          onChange={(e) =>
                            setActValues((prev) => ({
                              ...prev,
                              [at.key]: { ...prev[at.key], target: e.target.value },
                            }))
                          }
                          className="w-full text-sm border border-border rounded-md px-2 py-1.5 bg-background text-foreground"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-3xl font-bold text-foreground">{realized}</span>
                      <span className="text-sm text-muted-foreground">/ {target} meta</span>
                    </div>
                  )}

                  <Progress value={pct} className="h-1.5" />
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Lead Sources */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Origem dos Leads da Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {LEAD_SOURCES.map((ls) => {
                const found = actData?.leadSources.find((l) => l.source === ls.key);
                const qty = isEditing ? parseInt(leadValues[ls.key] || "0") : (found?.quantity ?? 0);
                return (
                  <div key={ls.key} className="text-center p-4 rounded-xl border border-border bg-muted/20">
                    <p className="text-xs text-muted-foreground mb-2">{ls.label}</p>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={leadValues[ls.key] || ""}
                        onChange={(e) =>
                          setLeadValues((prev) => ({ ...prev, [ls.key]: e.target.value }))
                        }
                        className="w-full text-center text-lg font-bold border border-border rounded-md px-2 py-1 bg-background text-foreground"
                      />
                    ) : (
                      <p className="text-2xl font-bold text-foreground">{qty}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
