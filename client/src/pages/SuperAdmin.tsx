import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Building2, Users, Plus, Shield, Leaf, Stethoscope, ShoppingBag, Home, Cpu, ToggleLeft, ToggleRight, UserCog } from "lucide-react";
import { useLocation } from "wouter";

const SEGMENT_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  aesthetics_clinic: { label: "Clínica de Estética", icon: Stethoscope, color: "text-pink-400" },
  agribusiness: { label: "Agronegócio", icon: Leaf, color: "text-green-400" },
  real_estate: { label: "Imobiliária", icon: Home, color: "text-blue-400" },
  retail: { label: "Varejo", icon: ShoppingBag, color: "text-orange-400" },
  tech: { label: "Tecnologia", icon: Cpu, color: "text-violet-400" },
  generic: { label: "Genérico", icon: Building2, color: "text-slate-400" },
};

export default function SuperAdmin() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [orgSegment, setOrgSegment] = useState<string>("");
  const [orgMaxUsers, setOrgMaxUsers] = useState("10");
  const [assignOrgId, setAssignOrgId] = useState<string>("");
  const [assignUserId, setAssignUserId] = useState<string>("");
  const [assignRole, setAssignRole] = useState<"user" | "admin">("user");

  if (user?.role !== "super_admin") {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white">Acesso Negado</h2>
          <p className="text-slate-400 mt-2">Esta área é restrita ao Super Admin.</p>
          <Button onClick={() => navigate("/")} className="mt-4 bg-[#c9a84c] text-[#0a0f1e]">Voltar ao início</Button>
        </div>
      </div>
    );
  }

  const { data: stats } = trpc.superAdmin.stats.useQuery();
  const { data: orgs, refetch: refetchOrgs } = trpc.superAdmin.listOrganizations.useQuery();
  const { data: allUsers, refetch: refetchUsers } = trpc.superAdmin.listAllUsers.useQuery();

  const createOrg = trpc.superAdmin.createOrganization.useMutation({
    onSuccess: () => {
      toast.success("Organização criada com sucesso!");
      setCreateOrgOpen(false);
      setOrgName(""); setOrgSlug(""); setOrgSegment(""); setOrgMaxUsers("10");
      refetchOrgs();
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleOrg = trpc.superAdmin.updateOrganization.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); refetchOrgs(); },
    onError: (err) => toast.error(err.message),
  });

  const assignUser = trpc.superAdmin.assignUserToOrg.useMutation({
    onSuccess: () => { toast.success("Usuário atribuído!"); refetchUsers(); },
    onError: (err) => toast.error(err.message),
  });

  const updateRole = trpc.superAdmin.updateUserRole.useMutation({
    onSuccess: () => { toast.success("Role atualizado!"); refetchUsers(); },
    onError: (err) => toast.error(err.message),
  });

  const handleNameChange = (name: string) => {
    setOrgName(name);
    setOrgSlug(name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""));
  };

  const handleCreateOrg = () => {
    if (!orgName || !orgSlug || !orgSegment) return toast.error("Preencha todos os campos obrigatórios");
    createOrg.mutate({ name: orgName, slug: orgSlug, segment: orgSegment as any, maxUsers: parseInt(orgMaxUsers) });
  };

  const handleAssignUser = () => {
    if (!assignUserId || !assignOrgId) return toast.error("Selecione usuário e organização");
    assignUser.mutate({ userId: parseInt(assignUserId), organizationId: parseInt(assignOrgId), role: assignRole });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1e] via-[#0d1530] to-[#0a0f1e] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#c9a84c] to-[#e8c96a] rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#0a0f1e]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Super Admin</h1>
              <p className="text-slate-400 text-sm">Gestão global de organizações e usuários</p>
            </div>
          </div>
          <Button onClick={() => navigate("/")} variant="outline" className="border-slate-600 text-slate-300 hover:text-white">
            ← Voltar ao App
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Organizações Ativas", value: stats?.activeOrganizations ?? 0, icon: Building2, color: "text-[#c9a84c]" },
            { label: "Total de Organizações", value: stats?.totalOrganizations ?? 0, icon: Building2, color: "text-blue-400" },
            { label: "Total de Usuários", value: stats?.totalUsers ?? 0, icon: Users, color: "text-green-400" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-8 h-8 ${stat.color}`} />
                    <div>
                      <p className="text-3xl font-bold text-white">{stat.value}</p>
                      <p className="text-slate-400 text-sm">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs defaultValue="organizations">
          <TabsList className="bg-slate-800 border border-slate-700 mb-6">
            <TabsTrigger value="organizations" className="data-[state=active]:bg-[#c9a84c] data-[state=active]:text-[#0a0f1e]">
              <Building2 className="w-4 h-4 mr-2" />Organizações
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-[#c9a84c] data-[state=active]:text-[#0a0f1e]">
              <Users className="w-4 h-4 mr-2" />Usuários
            </TabsTrigger>
          </TabsList>

          {/* ORGANIZATIONS TAB */}
          <TabsContent value="organizations">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">Organizações Cadastradas</h2>
              <Dialog open={createOrgOpen} onOpenChange={setCreateOrgOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#c9a84c] hover:bg-[#b8943d] text-[#0a0f1e] font-semibold">
                    <Plus className="w-4 h-4 mr-2" />Nova Organização
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
                  <DialogHeader>
                    <DialogTitle>Criar Nova Organização</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-slate-300">Nome *</Label>
                        <Input value={orgName} onChange={(e) => handleNameChange(e.target.value)} placeholder="Clínica Bella" className="mt-1 bg-slate-700 border-slate-600 text-white" />
                      </div>
                      <div>
                        <Label className="text-slate-300">Slug *</Label>
                        <Input value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} placeholder="clinica-bella" className="mt-1 bg-slate-700 border-slate-600 text-white" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-slate-300">Segmento *</Label>
                      <Select value={orgSegment} onValueChange={setOrgSegment}>
                        <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                          <SelectValue placeholder="Selecione o segmento" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          {Object.entries(SEGMENT_LABELS).map(([value, { label }]) => (
                            <SelectItem key={value} value={value} className="text-white hover:bg-slate-600">{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-300">Máx. usuários</Label>
                      <Input type="number" value={orgMaxUsers} onChange={(e) => setOrgMaxUsers(e.target.value)} className="mt-1 bg-slate-700 border-slate-600 text-white" />
                    </div>
                    <Button onClick={handleCreateOrg} disabled={createOrg.isPending} className="w-full bg-[#c9a84c] hover:bg-[#b8943d] text-[#0a0f1e] font-semibold">
                      {createOrg.isPending ? "Criando..." : "Criar Organização"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3">
              {orgs?.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhuma organização cadastrada ainda.</p>
                </div>
              )}
              {orgs?.map((org) => {
                const seg = SEGMENT_LABELS[org.segment] ?? SEGMENT_LABELS.generic;
                const Icon = seg.icon;
                return (
                  <Card key={org.id} className="bg-slate-800/50 border-slate-700 hover:border-slate-500 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                            <Icon className={`w-5 h-5 ${seg.color}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-white">{org.name}</p>
                              <Badge variant="outline" className={`text-xs border-slate-600 ${org.active ? "text-green-400 border-green-400/30" : "text-red-400 border-red-400/30"}`}>
                                {org.active ? "Ativa" : "Inativa"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-slate-400 text-xs">/{org.slug}</span>
                              <span className={`text-xs ${seg.color}`}>{seg.label}</span>
                              <span className="text-slate-500 text-xs">{(org as any).userCount ?? 0}/{org.maxUsers} usuários</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleOrg.mutate({ id: org.id, active: !org.active })}
                          className="text-slate-400 hover:text-white transition-colors"
                          title={org.active ? "Desativar" : "Ativar"}
                        >
                          {org.active ? <ToggleRight className="w-6 h-6 text-green-400" /> : <ToggleLeft className="w-6 h-6" />}
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* USERS TAB */}
          <TabsContent value="users">
            <div className="grid grid-cols-2 gap-6">
              {/* User list */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Todos os Usuários</h2>
                <div className="space-y-2">
                  {allUsers?.map((u) => {
                    const org = orgs?.find((o) => o.id === u.organizationId);
                    return (
                      <Card key={u.id} className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-white text-sm">{u.name ?? "Sem nome"}</p>
                              <p className="text-slate-400 text-xs">{u.email ?? "Sem e-mail"}</p>
                              <p className="text-slate-500 text-xs mt-0.5">{org ? org.name : "Sem organização"}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant="outline" className={`text-xs ${u.role === "super_admin" ? "text-[#c9a84c] border-[#c9a84c]/30" : u.role === "admin" ? "text-blue-400 border-blue-400/30" : "text-slate-400 border-slate-600"}`}>
                                {u.role}
                              </Badge>
                              {u.role !== "super_admin" && (
                                <button
                                  onClick={() => updateRole.mutate({ userId: u.id, role: u.role === "admin" ? "user" : "admin" })}
                                  className="text-xs text-slate-500 hover:text-[#c9a84c] transition-colors"
                                >
                                  <UserCog className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Assign user to org */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Atribuir Usuário a Organização</h2>
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-5 space-y-4">
                    <div>
                      <Label className="text-slate-300">Usuário</Label>
                      <Select value={assignUserId} onValueChange={setAssignUserId}>
                        <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                          <SelectValue placeholder="Selecione o usuário" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          {allUsers?.filter(u => u.role !== "super_admin").map((u) => (
                            <SelectItem key={u.id} value={String(u.id)} className="text-white hover:bg-slate-600">
                              {u.name ?? u.email ?? `ID ${u.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-300">Organização</Label>
                      <Select value={assignOrgId} onValueChange={setAssignOrgId}>
                        <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                          <SelectValue placeholder="Selecione a organização" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          {orgs?.filter(o => o.active).map((o) => (
                            <SelectItem key={o.id} value={String(o.id)} className="text-white hover:bg-slate-600">{o.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-300">Role na organização</Label>
                      <Select value={assignRole} onValueChange={(v) => setAssignRole(v as any)}>
                        <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="user" className="text-white hover:bg-slate-600">Vendedor (user)</SelectItem>
                          <SelectItem value="admin" className="text-white hover:bg-slate-600">Admin da empresa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAssignUser} disabled={assignUser.isPending} className="w-full bg-[#c9a84c] hover:bg-[#b8943d] text-[#0a0f1e] font-semibold">
                      {assignUser.isPending ? "Atribuindo..." : "Atribuir Usuário"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
