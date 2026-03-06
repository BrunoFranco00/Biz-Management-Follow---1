import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, TrendingUp, DollarSign, Target, Clock,
  User, Phone, Mail, MapPin, Package, Calendar, ChevronRight, BarChart3,
} from "lucide-react";
import { useLocalAuth } from "@/contexts/LocalAuthContext";

const STATUS_CONFIG = {
  prospecting: { label: "Prospecção", color: "bg-blue-100 text-blue-800 border-blue-200", dot: "bg-blue-500", kanbanBg: "bg-blue-50 border-blue-200" },
  in_progress: { label: "Em Andamento", color: "bg-amber-100 text-amber-800 border-amber-200", dot: "bg-amber-500", kanbanBg: "bg-amber-50 border-amber-200" },
  won: { label: "Fechado", color: "bg-emerald-100 text-emerald-800 border-emerald-200", dot: "bg-emerald-500", kanbanBg: "bg-emerald-50 border-emerald-200" },
  lost: { label: "Perdido", color: "bg-red-100 text-red-800 border-red-200", dot: "bg-red-500", kanbanBg: "bg-red-50 border-red-200" },
} as const;

const PRIORITY_CONFIG = {
  low: { label: "Baixa", color: "bg-slate-100 text-slate-600" },
  medium: { label: "Média", color: "bg-orange-100 text-orange-700" },
  high: { label: "Alta", color: "bg-red-100 text-red-700" },
} as const;

type DealStatus = keyof typeof STATUS_CONFIG;
type DealPriority = keyof typeof PRIORITY_CONFIG;

interface DealFormData {
  clientName: string;
  regionId?: number;
  productId?: number;
  productService: string;
  expectedValue: string;
  finalValue: string;
  startDate: string;
  endDate: string;
  status: DealStatus;
  lostReason: string;
  notes: string;
  nextAction: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  priority: DealPriority;
  probability: number;
}

const EMPTY_FORM: DealFormData = {
  clientName: "", regionId: undefined, productId: undefined, productService: "",
  expectedValue: "", finalValue: "", startDate: new Date().toISOString().split("T")[0],
  endDate: "", status: "prospecting", lostReason: "", notes: "", nextAction: "",
  contactName: "", contactPhone: "", contactEmail: "", priority: "medium", probability: 50,
};

function formatCurrency(value: string | number | null | undefined) {
  if (!value) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function formatDate(dateStr: string | Date | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

export default function Deals() {
  const { user } = useLocalAuth();
  const utils = trpc.useUtils();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<DealFormData>(EMPTY_FORM);
  const [showDetail, setShowDetail] = useState<number | null>(null);

  const { data: dealsRaw = [], isLoading } = trpc.deals.list.useQuery();
  const { data: statsRaw = [] } = trpc.deals.stats.useQuery();
  const { data: products = [] } = trpc.config.getProducts.useQuery();
  const { data: regions = [] } = trpc.config.getRegions.useQuery();

  const deals = dealsRaw as Array<{ deal: { id: number; clientName: string; status: DealStatus; priority: DealPriority; expectedValue: string | null; finalValue: string | null; startDate: string | Date; endDate: string | Date | null; productService: string | null; notes: string | null; nextAction: string | null; contactName: string | null; contactPhone: string | null; contactEmail: string | null; probability: number | null; lostReason: string | null; regionId: number | null; productId: number | null; userId: number; createdAt: Date; updatedAt: Date }; region: { id: number; name: string } | null; product: { id: number; name: string } | null }>;

  const createMutation = trpc.deals.create.useMutation({
    onSuccess: () => { utils.deals.list.invalidate(); utils.deals.stats.invalidate(); setShowForm(false); setForm(EMPTY_FORM); toast.success("Negócio criado com sucesso!"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.deals.update.useMutation({
    onSuccess: () => { utils.deals.list.invalidate(); utils.deals.stats.invalidate(); setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); toast.success("Negócio atualizado!"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.deals.delete.useMutation({
    onSuccess: () => { utils.deals.list.invalidate(); utils.deals.stats.invalidate(); toast.success("Negócio removido."); },
    onError: (e) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const statsArr = statsRaw as Array<{ status: string; count: number; totalExpected: number; totalFinal: number }>;
    const total = deals.length;
    const won = statsArr.find(s => s.status === "won");
    const inProgress = statsArr.find(s => s.status === "in_progress");
    const totalExpected = statsArr.reduce((acc, s) => acc + (Number(s.totalExpected) || 0), 0);
    const totalWon = Number(won?.totalFinal) || Number(won?.totalExpected) || 0;
    const wonCount = Number(won?.count) || 0;
    const closingRate = total > 0 ? Math.round((wonCount / total) * 100) : 0;
    const avgTicket = wonCount > 0 ? totalWon / wonCount : 0;
    return { total, totalExpected, totalWon, closingRate, avgTicket, inProgressCount: Number(inProgress?.count) || 0 };
  }, [statsRaw, deals]);

  const filteredDeals = useMemo(() => {
    if (filterStatus === "all") return deals;
    return deals.filter(d => d.deal.status === filterStatus);
  }, [deals, filterStatus]);

  const dealsByStatus = useMemo(() => {
    const map: Record<DealStatus, typeof deals> = { prospecting: [], in_progress: [], won: [], lost: [] };
    for (const d of deals) map[d.deal.status].push(d);
    return map;
  }, [deals]);

  function openCreate() { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); }
  function openEdit(d: typeof deals[0]) {
    setForm({
      clientName: d.deal.clientName, regionId: d.deal.regionId ?? undefined, productId: d.deal.productId ?? undefined,
      productService: d.deal.productService ?? "", expectedValue: d.deal.expectedValue ?? "", finalValue: d.deal.finalValue ?? "",
      startDate: typeof d.deal.startDate === "string" ? d.deal.startDate : new Date(d.deal.startDate).toISOString().split("T")[0],
      endDate: d.deal.endDate ? (typeof d.deal.endDate === "string" ? d.deal.endDate : new Date(d.deal.endDate).toISOString().split("T")[0]) : "",
      status: d.deal.status, lostReason: d.deal.lostReason ?? "", notes: d.deal.notes ?? "",
      nextAction: d.deal.nextAction ?? "", contactName: d.deal.contactName ?? "", contactPhone: d.deal.contactPhone ?? "",
      contactEmail: d.deal.contactEmail ?? "", priority: d.deal.priority, probability: d.deal.probability ?? 50,
    });
    setEditingId(d.deal.id);
    setShowForm(true);
  }

  function handleSubmit() {
    const payload = {
      ...form,
      regionId: form.regionId || undefined,
      productId: form.productId || undefined,
      expectedValue: form.expectedValue || undefined,
      finalValue: form.finalValue || undefined,
      endDate: form.endDate || undefined,
      lostReason: form.lostReason || undefined,
      notes: form.notes || undefined,
      nextAction: form.nextAction || undefined,
      contactName: form.contactName || undefined,
      contactPhone: form.contactPhone || undefined,
      contactEmail: form.contactEmail || undefined,
    };
    if (editingId) updateMutation.mutate({ id: editingId, ...payload });
    else createMutation.mutate(payload);
  }

  const detailDeal = showDetail !== null ? deals.find(d => d.deal.id === showDetail) : null;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestão de Negócios</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Acompanhe todos os seus negócios em andamento</p>
          </div>
          <Button onClick={openCreate} className="gap-2 self-start sm:self-auto">
            <Plus className="h-4 w-4" /> Novo Negócio
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total de Negócios", value: stats.total, icon: Target, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Em Andamento", value: stats.inProgressCount, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Taxa de Fechamento", value: `${stats.closingRate}%`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Ticket Médio", value: formatCurrency(stats.avgTicket), icon: DollarSign, color: "text-purple-600", bg: "bg-purple-50" },
          ].map((kpi) => (
            <Card key={kpi.label} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-xl font-bold mt-1">{kpi.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${kpi.bg}`}>
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pipeline Value */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg"><BarChart3 className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Pipeline Total (Valor Esperado)</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(stats.totalExpected)}</p>
                </div>
              </div>
              <div className="h-px sm:h-10 sm:w-px bg-border" />
              <div>
                <p className="text-xs text-muted-foreground">Receita Realizada (Fechados)</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalWon)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* View Tabs + Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Tabs value={view} onValueChange={(v) => setView(v as "kanban" | "list")} className="w-auto">
            <TabsList>
              <TabsTrigger value="kanban">Kanban</TabsTrigger>
              <TabsTrigger value="list">Lista</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Kanban View */}
        {view === "kanban" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {(Object.keys(STATUS_CONFIG) as DealStatus[]).map((status) => {
              const cfg = STATUS_CONFIG[status];
              const col = dealsByStatus[status];
              return (
                <div key={status} className={`rounded-xl border-2 ${cfg.kanbanBg} p-3 space-y-3 min-h-[200px]`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                      <span className="font-semibold text-sm">{cfg.label}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">{col.length}</Badge>
                  </div>
                  {col.map((d) => (
                    <Card key={d.deal.id} className="cursor-pointer hover:shadow-md transition-shadow border-0 shadow-sm"
                      onClick={() => setShowDetail(d.deal.id)}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-sm leading-tight line-clamp-2">{d.deal.clientName}</p>
                          <Badge className={`text-xs shrink-0 ${PRIORITY_CONFIG[d.deal.priority].color}`}>
                            {PRIORITY_CONFIG[d.deal.priority].label}
                          </Badge>
                        </div>
                        {d.deal.productService && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Package className="h-3 w-3" />{d.deal.productService}
                          </p>
                        )}
                        {d.deal.expectedValue && (
                          <p className="text-sm font-bold text-primary">{formatCurrency(d.deal.expectedValue)}</p>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(d.deal.startDate)}</span>
                          <span>{d.deal.probability ?? 50}%</span>
                        </div>
                        {d.deal.nextAction && (
                          <p className="text-xs bg-white/70 rounded p-1.5 text-muted-foreground line-clamp-1">
                            → {d.deal.nextAction}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {col.length === 0 && (
                    <div className="text-center py-6 text-xs text-muted-foreground">Nenhum negócio aqui</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* List View */}
        {view === "list" && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">Carregando...</div>
              ) : filteredDeals.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Nenhum negócio encontrado.</div>
              ) : (
                <div className="divide-y">
                  {filteredDeals.map((d) => {
                    const cfg = STATUS_CONFIG[d.deal.status];
                    return (
                      <div key={d.deal.id} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
                        <div className={`w-2 h-10 rounded-full ${cfg.dot} shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">{d.deal.clientName}</p>
                            <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                            <Badge className={`text-xs ${PRIORITY_CONFIG[d.deal.priority].color}`}>{PRIORITY_CONFIG[d.deal.priority].label}</Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                            {d.deal.productService && <span className="flex items-center gap-1"><Package className="h-3 w-3" />{d.deal.productService}</span>}
                            {d.region && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{d.region.name}</span>}
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(d.deal.startDate)}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-sm text-primary">{formatCurrency(d.deal.expectedValue)}</p>
                          <p className="text-xs text-muted-foreground">{d.deal.probability ?? 50}% prob.</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowDetail(d.deal.id)}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(d)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => { if (confirm("Remover este negócio?")) deleteMutation.mutate({ id: d.deal.id }); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Deal Detail Dialog */}
      {detailDeal && (
        <Dialog open={showDetail !== null} onOpenChange={() => setShowDetail(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${STATUS_CONFIG[detailDeal.deal.status].dot}`} />
                {detailDeal.deal.clientName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge className={STATUS_CONFIG[detailDeal.deal.status].color}>{STATUS_CONFIG[detailDeal.deal.status].label}</Badge>
                <Badge className={PRIORITY_CONFIG[detailDeal.deal.priority].color}>{PRIORITY_CONFIG[detailDeal.deal.priority].label}</Badge>
                <Badge variant="outline">{detailDeal.deal.probability ?? 50}% probabilidade</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Valor Esperado</p><p className="font-bold text-primary">{formatCurrency(detailDeal.deal.expectedValue)}</p></div>
                <div><p className="text-xs text-muted-foreground">Valor Final</p><p className="font-bold text-emerald-600">{formatCurrency(detailDeal.deal.finalValue)}</p></div>
                <div><p className="text-xs text-muted-foreground">Início</p><p className="font-medium">{formatDate(detailDeal.deal.startDate)}</p></div>
                <div><p className="text-xs text-muted-foreground">Previsão Fechamento</p><p className="font-medium">{formatDate(detailDeal.deal.endDate)}</p></div>
                {detailDeal.deal.productService && <div className="col-span-2"><p className="text-xs text-muted-foreground">Produto/Serviço</p><p className="font-medium">{detailDeal.deal.productService}</p></div>}
                {detailDeal.region && <div><p className="text-xs text-muted-foreground">Região</p><p className="font-medium">{detailDeal.region.name}</p></div>}
              </div>
              {(detailDeal.deal.contactName || detailDeal.deal.contactPhone || detailDeal.deal.contactEmail) && (
                <div className="border rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contato</p>
                  {detailDeal.deal.contactName && <p className="text-sm flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground" />{detailDeal.deal.contactName}</p>}
                  {detailDeal.deal.contactPhone && <p className="text-sm flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{detailDeal.deal.contactPhone}</p>}
                  {detailDeal.deal.contactEmail && <p className="text-sm flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{detailDeal.deal.contactEmail}</p>}
                </div>
              )}
              {detailDeal.deal.nextAction && (
                <div className="border rounded-lg p-3 bg-amber-50 border-amber-200">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Próxima Ação</p>
                  <p className="text-sm mt-1">{detailDeal.deal.nextAction}</p>
                </div>
              )}
              {detailDeal.deal.notes && (
                <div className="border rounded-lg p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Observações</p>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{detailDeal.deal.notes}</p>
                </div>
              )}
              {detailDeal.deal.status === "lost" && detailDeal.deal.lostReason && (
                <div className="border rounded-lg p-3 bg-red-50 border-red-200">
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Motivo da Perda</p>
                  <p className="text-sm mt-1">{detailDeal.deal.lostReason}</p>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowDetail(null)}>Fechar</Button>
              <Button onClick={() => { setShowDetail(null); openEdit(detailDeal); }}>
                <Pencil className="h-4 w-4 mr-1" /> Editar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Negócio" : "Novo Negócio"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Nome do Cliente *</Label>
              <Input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} placeholder="Ex: Clínica São Paulo" />
            </div>
            <div>
              <Label>Produto / Serviço</Label>
              <Input value={form.productService} onChange={e => setForm(f => ({ ...f, productService: e.target.value }))} placeholder="Ex: Implante Capilar" />
            </div>
            <div>
              <Label>Região</Label>
              <Select value={form.regionId?.toString() ?? ""} onValueChange={v => setForm(f => ({ ...f, regionId: v ? parseInt(v) : undefined }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar região" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {(regions as Array<{ id: number; name: string }>).map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor Esperado (R$)</Label>
              <Input type="number" value={form.expectedValue} onChange={e => setForm(f => ({ ...f, expectedValue: e.target.value }))} placeholder="0,00" />
            </div>
            <div>
              <Label>Valor Final (R$)</Label>
              <Input type="number" value={form.finalValue} onChange={e => setForm(f => ({ ...f, finalValue: e.target.value }))} placeholder="0,00" />
            </div>
            <div>
              <Label>Data de Início *</Label>
              <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <Label>Data de Fechamento Prevista</Label>
              <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as DealStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as DealPriority }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Probabilidade de Fechamento: {form.probability}%</Label>
              <input type="range" min={0} max={100} step={5} value={form.probability}
                onChange={e => setForm(f => ({ ...f, probability: parseInt(e.target.value) }))}
                className="w-full mt-1 accent-primary" />
            </div>
            <div className="sm:col-span-2 border-t pt-3">
              <p className="text-sm font-semibold text-muted-foreground mb-3">Informações de Contato</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label>Nome do Contato</Label>
                  <Input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Nome" />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="(11) 99999-9999" />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} placeholder="email@exemplo.com" />
                </div>
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label>Próxima Ação</Label>
              <Input value={form.nextAction} onChange={e => setForm(f => ({ ...f, nextAction: e.target.value }))} placeholder="Ex: Enviar proposta até sexta" />
            </div>
            {form.status === "lost" && (
              <div className="sm:col-span-2">
                <Label>Motivo da Perda</Label>
                <Input value={form.lostReason} onChange={e => setForm(f => ({ ...f, lostReason: e.target.value }))} placeholder="Ex: Preço, concorrente, timing..." />
              </div>
            )}
            <div className="sm:col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas adicionais sobre este negócio..." rows={3} />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.clientName || !form.startDate || createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Salvando..." : editingId ? "Salvar Alterações" : "Criar Negócio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
