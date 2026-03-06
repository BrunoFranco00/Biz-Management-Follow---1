import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
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
  BarChart3,
  Building2,
  DollarSign,
  Shield,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STAGE_LABELS: Record<string, string> = {
  prospecting: "Prospecção",
  qualification: "Qualificação",
  presentation: "Apresentação",
  negotiation: "Negociação",
  closing: "Fechamento",
  won: "Ganho",
  lost: "Perdido",
};

const STAGE_COLORS: Record<string, string> = {
  prospecting: "#1e3a5f",
  qualification: "#2d5282",
  presentation: "#c9a227",
  negotiation: "#b7791f",
  closing: "#276749",
  won: "#22c55e",
  lost: "#ef4444",
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedUserId, setSelectedUserId] = useState<string>("all");

  if (user && user.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Shield className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground">Esta área é exclusiva para administradores.</p>
            <Button className="mt-4" onClick={() => navigate("/dashboard")}>
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { data: users } = trpc.admin.getUsers.useQuery();
  const { data: dashData } = trpc.admin.getDashboard.useQuery({
    userId: selectedUserId !== "all" ? parseInt(selectedUserId) : undefined,
  });
  const { data: allOpps } = trpc.admin.getAllOpportunities.useQuery();
  const { data: oppStats } = trpc.admin.getOpportunitiesStats.useQuery({
    userId: selectedUserId !== "all" ? parseInt(selectedUserId) : undefined,
  });

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

  // Aggregate stats
  const totalUsers = users?.length ?? 0;
  const totalOpps = allOpps?.length ?? 0;
  const totalWon = allOpps?.filter((o) => o.opportunity.stage === "won").length ?? 0;
  const totalPipelineValue = allOpps
    ?.filter((o) => !['lost'].includes(o.opportunity.stage || ""))
    .reduce((acc, o) => acc + (o.opportunity.value ? parseFloat(String(o.opportunity.value)) : 0), 0) ?? 0;

  // Funnel chart data
  const funnelChartData = oppStats
    ? oppStats.map((s) => ({
        stage: STAGE_LABELS[s.stage] || s.stage,
        count: s.count,
        value: s.totalValue,
        color: STAGE_COLORS[s.stage] || "#888",
      }))
    : [];

  // User performance table
  const filteredOpps = selectedUserId === "all"
    ? allOpps
    : allOpps?.filter((o) => o.opportunity.userId === parseInt(selectedUserId));

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Visão consolidada de todos os vendedores
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Todos os vendedores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os vendedores</SelectItem>
                {users?.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name || u.email || `Usuário ${u.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Global KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total de Vendedores", value: totalUsers, icon: Users, color: "#1e3a5f" },
            { label: "Oportunidades Ativas", value: totalOpps, icon: Target, color: "#c9a227" },
            { label: "Negócios Ganhos", value: totalWon, icon: TrendingUp, color: "#276749" },
            {
              label: "Valor no Pipeline",
              value: formatCurrency(totalPipelineValue),
              icon: DollarSign,
              color: "#7c3aed",
            },
          ].map((kpi, i) => (
            <Card key={i} className="border border-border shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: kpi.color + "18" }}
                  >
                    <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Funnel by Stage */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Oportunidades por Etapa
              </CardTitle>
            </CardHeader>
            <CardContent>
              {funnelChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={funnelChartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="stage"
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number) => [value, "Oportunidades"]}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {funnelChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Performance */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Performance por Vendedor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {users && users.length > 0 ? (
                <div className="space-y-3">
                  {users.map((u) => {
                    const userOpps = allOpps?.filter((o) => o.opportunity.userId === u.id) ?? [];
                    const won = userOpps.filter((o) => o.opportunity.stage === "won").length;
                    const total = userOpps.length;
                    const pipelineVal = userOpps
                      .filter((o) => !['lost'].includes(o.opportunity.stage || ""))
                      .reduce((acc, o) => acc + (o.opportunity.value ? parseFloat(String(o.opportunity.value)) : 0), 0);
                    const rate = total > 0 ? Math.round((won / total) * 100) : 0;
                    return (
                      <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">
                            {(u.name || "U").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {u.name || u.email || `Usuário ${u.id}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {total} oportunidades · {won} ganhas ({rate}%)
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-foreground">{formatCurrency(pipelineVal)}</p>
                          <Badge variant="outline" className="text-xs mt-0.5">
                            {u.role === "admin" ? "Admin" : "Vendedor"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                  Nenhum usuário cadastrado
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* All Opportunities Table */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Todas as Oportunidades
              {selectedUserId !== "all" && (
                <Badge variant="outline" className="text-xs ml-2">
                  Filtrado por vendedor
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!filteredOpps || filteredOpps.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                Nenhuma oportunidade encontrada
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Vendedor</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Cliente</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Etapa</th>
                      <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Valor</th>
                      <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Prob.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOpps.slice(0, 20).map((opp) => {
                      const seller = opp.user || users?.find((u) => u.id === opp.opportunity.userId);
                      const stageColor = STAGE_COLORS[opp.opportunity.stage || "prospecting"] || "#888";
                      return (
                        <tr key={opp.opportunity.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {seller?.name || seller?.email || `Usuário ${opp.opportunity.userId}`}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-foreground">{opp.opportunity.clientName}</td>
                          <td className="px-4 py-3">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                              style={{ background: stageColor }}
                            >
                              {STAGE_LABELS[opp.opportunity.stage || "prospecting"] || opp.opportunity.stage}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                            {opp.opportunity.value
                              ? formatCurrency(parseFloat(String(opp.opportunity.value)))
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-muted-foreground">
                            {opp.opportunity.probability != null ? `${opp.opportunity.probability}%` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredOpps.length > 20 && (
                  <div className="px-4 py-3 text-center text-xs text-muted-foreground border-t border-border">
                    Mostrando 20 de {filteredOpps.length} oportunidades
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
