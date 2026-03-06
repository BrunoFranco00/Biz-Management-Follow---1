import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  Building2,
  Calendar,
  DollarSign,
  Edit2,
  Plus,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STAGES = [
  { value: "prospecting", label: "Prospecção", color: "bg-blue-900 text-white" },
  { value: "qualification", label: "Qualificação", color: "bg-blue-700 text-white" },
  { value: "presentation", label: "Apresentação", color: "bg-yellow-600 text-white" },
  { value: "negotiation", label: "Negociação", color: "bg-orange-600 text-white" },
  { value: "closing", label: "Fechamento", color: "bg-green-700 text-white" },
  { value: "won", label: "Ganho", color: "bg-green-500 text-white" },
  { value: "lost", label: "Perdido", color: "bg-red-600 text-white" },
];

const LOST_REASONS = [
  { value: "price_too_high", label: "Preço alto demais" },
  { value: "bought_from_competitor", label: "Comprou do concorrente" },
  { value: "wrong_timing", label: "Momento errado" },
  { value: "no_budget", label: "Sem orçamento" },
  { value: "no_response", label: "Sem resposta" },
  { value: "other", label: "Outro motivo" },
];

type OppForm = {
  clientName: string;
  value: string;
  productService: string;
  stage: string;
  probability: string;
  forecastDate: string;
  nextAction: string;
  notes: string;
};

const emptyForm: OppForm = {
  clientName: "",
  value: "",
  productService: "",
  stage: "prospecting",
  probability: "50",
  forecastDate: "",
  nextAction: "",
  notes: "",
};

export default function Opportunities() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<OppForm>(emptyForm);
  const [filterStage, setFilterStage] = useState<string>("all");

  const { data: opportunities, isLoading } = trpc.opportunities.list.useQuery();
  const { data: stats } = trpc.opportunities.stats.useQuery();
  const utils = trpc.useUtils();

  const createOpp = trpc.opportunities.create.useMutation({
    onSuccess: () => {
      toast.success("Oportunidade criada!");
      utils.opportunities.list.invalidate();
      utils.opportunities.stats.invalidate();
      setOpen(false);
      setForm(emptyForm);
    },
    onError: () => toast.error("Erro ao criar oportunidade"),
  });

  const updateOpp = trpc.opportunities.update.useMutation({
    onSuccess: () => {
      toast.success("Oportunidade atualizada!");
      utils.opportunities.list.invalidate();
      utils.opportunities.stats.invalidate();
      setOpen(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: () => toast.error("Erro ao atualizar oportunidade"),
  });

  const deleteOpp = trpc.opportunities.delete.useMutation({
    onSuccess: () => {
      toast.success("Oportunidade removida");
      utils.opportunities.list.invalidate();
      utils.opportunities.stats.invalidate();
    },
    onError: () => toast.error("Erro ao remover oportunidade"),
  });

  const handleSubmit = async () => {
    if (!form.clientName.trim()) {
      toast.error("Nome do cliente é obrigatório");
      return;
    }
    const data = {
      clientName: form.clientName,
      value: form.value ? parseFloat(form.value) : undefined,
      productService: form.productService || undefined,
      stage: form.stage as any,
      probability: form.probability ? parseInt(form.probability) : undefined,
      forecastDate: form.forecastDate || undefined,
      nextAction: form.nextAction || undefined,
      notes: form.notes || undefined,
    };
    if (editId) {
      await updateOpp.mutateAsync({ id: editId, ...data });
    } else {
      await createOpp.mutateAsync(data);
    }
  };

  const handleEdit = (opp: any) => {
    setEditId(opp.id);
    setForm({
      clientName: opp.clientName || "",
      value: opp.value ? String(opp.value) : "",
      productService: opp.productService || "",
      stage: opp.stage || "prospecting",
      probability: opp.probability ? String(opp.probability) : "50",
      forecastDate: opp.forecastDate
        ? (opp.forecastDate instanceof Date ? opp.forecastDate.toISOString().split("T")[0] : String(opp.forecastDate).split("T")[0])
        : "",
      nextAction: opp.nextAction || "",
      notes: opp.notes || "",
    });
    setOpen(true);
  };

  const formatCurrency = (v: number | string | null) => {
    if (!v) return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(v));
  };

  const filtered = opportunities?.filter((o) => filterStage === "all" || o.stage === filterStage) ?? [];

  const stageInfo = (stage: string) => STAGES.find((s) => s.value === stage) || STAGES[0];

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Oportunidades</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie seu pipeline de vendas</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary text-primary-foreground">
                <Plus className="w-4 h-4" />
                Nova Oportunidade
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editId ? "Editar Oportunidade" : "Nova Oportunidade"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <Label>Cliente *</Label>
                    <Input
                      value={form.clientName}
                      onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                      placeholder="Nome do cliente ou empresa"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number"
                      value={form.value}
                      onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Probabilidade (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={form.probability}
                      onChange={(e) => setForm((f) => ({ ...f, probability: e.target.value }))}
                      placeholder="50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Produto/Serviço</Label>
                    <Input
                      value={form.productService}
                      onChange={(e) => setForm((f) => ({ ...f, productService: e.target.value }))}
                      placeholder="Ex: Consultoria Premium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Etapa</Label>
                    <Select value={form.stage} onValueChange={(v) => setForm((f) => ({ ...f, stage: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Previsão de Fechamento</Label>
                    <Input
                      type="date"
                      value={form.forecastDate}
                      onChange={(e) => setForm((f) => ({ ...f, forecastDate: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Próxima Ação</Label>
                    <Input
                      value={form.nextAction}
                      onChange={(e) => setForm((f) => ({ ...f, nextAction: e.target.value }))}
                      placeholder="Ex: Enviar proposta comercial"
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Observações</Label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Notas adicionais sobre a oportunidade..."
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={() => { setOpen(false); setEditId(null); setForm(emptyForm); }}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={createOpp.isPending || updateOpp.isPending}
                    className="bg-primary text-primary-foreground"
                  >
                    {editId ? "Salvar Alterações" : "Criar Oportunidade"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        {stats && (() => {
          const totalActive = stats.filter(s => !['won','lost'].includes(s.stage)).reduce((a,b) => a + b.count, 0);
          const totalWon = stats.find(s => s.stage === 'won')?.count ?? 0;
          const totalLost = stats.find(s => s.stage === 'lost')?.count ?? 0;
          const totalVal = stats.filter(s => !['lost'].includes(s.stage)).reduce((a,b) => a + b.totalValue, 0);
          return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Ativo", value: totalActive, icon: Target, color: "text-blue-700" },
              { label: "Ganhas", value: totalWon, icon: TrendingUp, color: "text-green-600" },
              { label: "Perdidas", value: totalLost, icon: TrendingUp, color: "text-red-600" },
              {
                label: "Valor no Pipeline",
                value: formatCurrency(totalVal),
                icon: DollarSign,
                color: "text-yellow-600",
              },
            ].map((s, i) => (
              <Card key={i} className="border border-border shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-lg font-bold text-foreground">{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          );
        })()}

        {/* Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground font-medium">Filtrar:</span>
          {[{ value: "all", label: "Todas" }, ...STAGES].map((s) => (
            <button
              key={s.value}
              onClick={() => setFilterStage(s.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                filterStage === s.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Opportunities Table */}
        <Card className="border border-border shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <Target className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Nenhuma oportunidade encontrada</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Clique em "Nova Oportunidade" para começar
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Cliente</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Produto/Serviço</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Etapa</th>
                      <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Valor</th>
                      <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Prob.</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Previsão</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Próxima Ação</th>
                      <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((opp) => {
                      const stage = stageInfo(opp.stage || "prospecting");
                      const forecast = opp.forecastDate
                        ? new Date(String(opp.forecastDate) + "T12:00:00").toLocaleDateString("pt-BR")
                        : "—";
                      return (
                        <tr key={opp.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <Building2 className="w-3.5 h-3.5 text-primary" />
                              </div>
                              <span className="text-sm font-medium text-foreground">{opp.clientName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{opp.productService || "—"}</td>
                          <td className="px-4 py-3">
                            <Badge className={`text-xs ${stage.color}`}>{stage.label}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                            {formatCurrency(opp.value)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-medium text-foreground">
                              {opp.probability != null ? `${opp.probability}%` : "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Calendar className="w-3.5 h-3.5" />
                              {forecast}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                            {opp.nextAction || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleEdit(opp)}
                                className="p-1.5 rounded-md hover:bg-muted transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                              </button>
                              <button
                                onClick={() => deleteOpp.mutate({ id: opp.id })}
                                className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
