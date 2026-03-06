/**
 * Profile.tsx
 * Página de perfil do usuário local — permite alterar nome e senha.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { User, KeyRound, Save, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

export default function Profile() {
  const { user, refresh } = useLocalAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const updateProfile = trpc.orgUsers.updateProfile.useMutation({
    onSuccess: async () => {
      toast.success("Perfil atualizado com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await refresh();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSaveName = () => {
    if (!user) return;
    updateProfile.mutate({
      orgUserId: user.id,
      organizationId: user.organizationId,
      displayName: displayName || undefined,
    });
  };

  const handleChangePassword = () => {
    if (!user) return;
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    updateProfile.mutate({
      orgUserId: user.id,
      organizationId: user.organizationId,
      currentPassword,
      newPassword,
    });
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie suas informações de acesso
          </p>
        </div>

        {/* Info do usuário */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground text-lg">
                    {user.displayName ?? user.username}
                  </p>
                  <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-xs">
                    {user.role === "admin" ? (
                      <><Shield className="w-3 h-3 mr-1" />Admin</>
                    ) : (
                      <><User className="w-3 h-3 mr-1" />Vendedor</>
                    )}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{user.username}</code>
                  {" · "}Slot #{user.slot}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Alterar nome */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Nome de Exibição
            </CardTitle>
            <CardDescription>
              Este nome aparecerá nos relatórios e no dashboard administrativo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex: João Silva"
                className="max-w-sm"
              />
            </div>
            <Button
              onClick={handleSaveName}
              disabled={updateProfile.isPending}
              size="sm"
              className="gap-2"
            >
              {updateProfile.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar nome
            </Button>
          </CardContent>
        </Card>

        {/* Alterar senha */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" />
              Alterar Senha
            </CardTitle>
            <CardDescription>
              Recomendamos alterar a senha padrão no primeiro acesso.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Senha atual</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="max-w-sm"
                autoComplete="current-password"
              />
            </div>
            <Separator className="bg-border/50" />
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="max-w-sm"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmar nova senha</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="max-w-sm"
                autoComplete="new-password"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={updateProfile.isPending || !currentPassword || !newPassword}
              size="sm"
              className="gap-2"
            >
              {updateProfile.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              Alterar senha
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
