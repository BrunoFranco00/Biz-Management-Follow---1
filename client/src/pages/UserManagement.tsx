/**
 * UserManagement.tsx
 * Painel de gestão de slots de usuários para o admin da organização.
 * Permite criar lotes de usuários, resetar senhas e visualizar status.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Plus,
  KeyRound,
  Copy,
  Check,
  Shield,
  User,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

export default function UserManagement() {
  const { user: localUser } = useLocalAuth();
  const [, navigate] = useLocation();
  const [createCount, setCreateCount] = useState(5);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Redirecionar se não for admin
  if (localUser && localUser.role !== "admin") {
    navigate("/dashboard");
    return null;
  }

  const { data: slots = [], refetch } = trpc.orgUsers.list.useQuery(undefined, {
    enabled: !!localUser,
  });

  const createBatch = trpc.orgUsers.createBatch.useMutation({
    onSuccess: () => {
      toast.success(`${createCount} usuários criados com sucesso!`);
      setCreateOpen(false);
      void refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetPasswordMut = trpc.orgUsers.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Senha resetada para Biz@102030");
      setResetOpen(false);
      setResetUserId(null);
      setResetPassword("");
    },
    onError: (err) => toast.error(err.message),
  });

  const copyToClipboard = (text: string, id: number) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "Nunca";
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestão de Usuários</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie os slots de acesso da sua organização
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Criar Usuários
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Lote de Usuários</DialogTitle>
                <DialogDescription>
                  Os usuários serão criados com a senha padrão <strong>Biz@102030</strong>.
                  O primeiro slot criado será automaticamente admin.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Quantidade de usuários</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={createCount}
                    onChange={(e) => setCreateCount(parseInt(e.target.value) || 1)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Serão criados: User{(slots.length || 0) + 1} até User{(slots.length || 0) + createCount}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs text-primary font-medium">Credenciais padrão</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Usuário: <code className="bg-muted px-1 rounded">{"<slug>_user<N>"}</code><br />
                    Senha: <code className="bg-muted px-1 rounded">Biz@102030</code>
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button
                  onClick={() => createBatch.mutate({ count: createCount })}
                  disabled={createBatch.isPending}
                >
                  {createBatch.isPending ? "Criando..." : `Criar ${createCount} usuários`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-card border-border/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">{slots.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Admins</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">
                {slots.filter((s) => s.role === "admin").length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Vendedores</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">
                {slots.filter((s) => s.role === "user").length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Ativos hoje</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">
                {slots.filter((s) => {
                  if (!s.lastSignedIn) return false;
                  const today = new Date();
                  const last = new Date(s.lastSignedIn);
                  return last.toDateString() === today.toDateString();
                }).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de usuários */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Slots de Usuários</CardTitle>
            <CardDescription>
              Cada slot é um acesso fixo. Troque a senha para revogar o acesso de uma pessoa sem perder o histórico.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {slots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <Users className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground font-medium">Nenhum usuário criado ainda</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Clique em "Criar Usuários" para adicionar slots à sua organização
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="text-xs">Slot</TableHead>
                      <TableHead className="text-xs">Usuário</TableHead>
                      <TableHead className="text-xs">Nome</TableHead>
                      <TableHead className="text-xs">Role</TableHead>
                      <TableHead className="text-xs">Último acesso</TableHead>
                      <TableHead className="text-xs text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slots.map((slot) => (
                      <TableRow key={slot.id} className="border-border/30 hover:bg-muted/20">
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          #{slot.slot}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-0.5 rounded text-foreground">
                              {slot.username}
                            </code>
                            <button
                              onClick={() => copyToClipboard(slot.username, slot.id)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              title="Copiar usuário"
                            >
                              {copiedId === slot.id ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          {slot.displayName ?? (
                            <span className="text-muted-foreground/50 italic text-xs">Não definido</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={slot.role === "admin" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {slot.role === "admin" ? (
                              <><Shield className="w-3 h-3 mr-1" />Admin</>
                            ) : (
                              <><User className="w-3 h-3 mr-1" />Vendedor</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(slot.lastSignedIn)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => {
                              setResetUserId(slot.id);
                              setResetPassword("");
                              setResetOpen(true);
                            }}
                          >
                            <KeyRound className="w-3 h-3" />
                            Resetar senha
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de reset de senha */}
        <Dialog open={resetOpen} onOpenChange={setResetOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Resetar Senha
              </DialogTitle>
              <DialogDescription>
                A sessão ativa deste usuário será encerrada imediatamente.
                Deixe em branco para usar a senha padrão <strong>Biz@102030</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nova senha (opcional)</Label>
                <Input
                  type="text"
                  placeholder="Biz@102030"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo 6 caracteres. Se vazio, será usada a senha padrão.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResetOpen(false)}>Cancelar</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (resetUserId) {
                    resetPasswordMut.mutate({
                      orgUserId: resetUserId,
                      newPassword: resetPassword || undefined,
                    });
                  }
                }}
                disabled={resetPasswordMut.isPending}
              >
                {resetPasswordMut.isPending ? "Resetando..." : "Confirmar Reset"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
