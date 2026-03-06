import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, BookOpen, CheckCircle2, Plus, RefreshCw, Trash2, X } from "lucide-react";
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

type ObjForm = {
  objectionText: string;
  frequency: string;
  responseUsed: string;
  worked: boolean;
  needsHelp: boolean;
};

const emptyObj: ObjForm = {
  objectionText: "",
  frequency: "1",
  responseUsed: "",
  worked: false,
  needsHelp: false,
};

export default function Objections() {
  const { weekStart, weekEnd } = useMemo(() => getWeekRange(), []);
  const [reportId, setReportId] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [newObj, setNewObj] = useState<ObjForm>(emptyObj);
  const [showForm, setShowForm] = useState(false);

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

  const { data: objData, isLoading } = trpc.objections.getByReport.useQuery(
    { reportId: reportId! },
    { enabled: !!reportId }
  );

  const saveObjections = trpc.objections.upsert.useMutation({
    onSuccess: () => {
      toast.success("Objeções salvas!");
      utils.objections.getByReport.invalidate({ reportId: reportId! });
      setShowForm(false);
      setNewObj(emptyObj);
    },
    onError: () => toast.error("Erro ao salvar objeções"),
  });

  const handleAddObjection = async () => {
    if (!reportId || !newObj.objectionText.trim()) {
      toast.error("Descreva a objeção");
      return;
    }
    const existing = objData?.objections || [];
    await saveObjections.mutateAsync({
      reportId,
      objections: [
        ...existing.map((o) => ({
          objectionText: o.objectionText,
          frequency: o.frequency ?? 1,
          responseUsed: o.responseUsed ?? undefined,
          worked: o.worked ?? undefined,
          needsHelp: o.needsHelp ?? undefined,
        })),
        {
          objectionText: newObj.objectionText,
          frequency: parseInt(newObj.frequency) || 1,
          responseUsed: newObj.responseUsed || undefined,
          worked: newObj.worked,
          needsHelp: newObj.needsHelp,
        },
      ],
    });
  };

  const handleRemoveObjection = async (index: number) => {
    if (!reportId) return;
    const existing = objData?.objections || [];
    await saveObjections.mutateAsync({
      reportId,
      objections: existing
        .filter((_, i) => i !== index)
        .map((o) => ({
          objectionText: o.objectionText,
          frequency: o.frequency ?? 1,
          responseUsed: o.responseUsed ?? undefined,
          worked: o.worked ?? undefined,
          needsHelp: o.needsHelp ?? undefined,
        })),
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Objeções dos Clientes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Registre e analise as objeções recebidas esta semana
            </p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            disabled={!reportId}
            className="gap-2 bg-primary text-primary-foreground"
          >
            <Plus className="w-4 h-4" />
            Registrar Objeção
          </Button>
        </div>

        {/* Add Form */}
        {showForm && (
          <Card className="border border-primary/30 shadow-sm bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Nova Objeção</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Objeção *
                </label>
                <input
                  value={newObj.objectionText}
                  onChange={(e) => setNewObj((f) => ({ ...f, objectionText: e.target.value }))}
                  placeholder='Ex: "O preço está muito alto para nosso orçamento"'
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                    Frequência (vezes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newObj.frequency}
                    onChange={(e) => setNewObj((f) => ({ ...f, frequency: e.target.value }))}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground"
                  />
                </div>
                <div className="flex flex-col gap-2 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newObj.worked}
                      onChange={(e) => setNewObj((f) => ({ ...f, worked: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-xs text-muted-foreground">Resposta funcionou</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newObj.needsHelp}
                      onChange={(e) => setNewObj((f) => ({ ...f, needsHelp: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-xs text-muted-foreground">Precisa de ajuda</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Resposta Utilizada
                </label>
                <textarea
                  value={newObj.responseUsed}
                  onChange={(e) => setNewObj((f) => ({ ...f, responseUsed: e.target.value }))}
                  placeholder="Como você respondeu a esta objeção?"
                  rows={3}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setNewObj(emptyObj); }}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddObjection}
                  disabled={saveObjections.isPending}
                  className="bg-primary text-primary-foreground"
                >
                  {saveObjections.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  Salvar Objeção
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Objections List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : !objData?.objections || objData.objections.length === 0 ? (
          <Card className="border border-border shadow-sm">
            <CardContent className="py-16 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">Nenhuma objeção registrada esta semana</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Registre as objeções que você encontrou para melhorar suas respostas
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {objData.objections.map((obj, i) => (
              <Card key={i} className="border border-border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />
                        <p className="font-medium text-foreground text-sm">{obj.objectionText}</p>
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <Badge variant="outline" className="text-xs">
                          {obj.frequency ?? 1}x esta semana
                        </Badge>
                        {obj.worked && (
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Resposta efetiva
                          </div>
                        )}
                        {obj.needsHelp && (
                          <div className="flex items-center gap-1 text-xs text-orange-600">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Precisa de suporte
                          </div>
                        )}
                      </div>
                      {obj.responseUsed && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground font-medium mb-1">Resposta utilizada:</p>
                          <p className="text-sm text-foreground">{obj.responseUsed}</p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveObjection(i)}
                      className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
