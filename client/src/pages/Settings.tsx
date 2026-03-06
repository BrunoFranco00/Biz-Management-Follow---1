import DashboardLayout from "@/components/DashboardLayout";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import {
  Building2,
  Globe,
  Package,
  Plus,
  Settings as SettingsIcon,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useLocalAuth();
  const isAdmin = user?.role === "admin";

  const { data: products } = trpc.config.getProducts.useQuery();
  const { data: regions } = trpc.config.getRegions.useQuery();
  const utils = trpc.useUtils();
  type ProductItem = NonNullable<typeof products>[number];
  type RegionItem = NonNullable<typeof regions>[number];

  const [newProduct, setNewProduct] = useState({ name: "", description: "", price: "" });
  const [newRegion, setNewRegion] = useState({ name: "", description: "" });
  const [showProductForm, setShowProductForm] = useState(false);
  const [showRegionForm, setShowRegionForm] = useState(false);

  const createProduct = trpc.config.createProduct.useMutation({
    onSuccess: () => {
      toast.success("Produto criado!");
      utils.config.getProducts.invalidate();
      setNewProduct({ name: "", description: "", price: "" });
      setShowProductForm(false);
    },
    onError: () => toast.error("Erro ao criar produto"),
  });

  const deleteProduct = trpc.config.updateProduct.useMutation({
    onSuccess: () => {
      toast.success("Produto removido");
      utils.config.getProducts.invalidate();
    },
  });

  const createRegion = trpc.config.createRegion.useMutation({
    onSuccess: () => {
      toast.success("Região criada!");
      utils.config.getRegions.invalidate();
      setNewRegion({ name: "", description: "" });
      setShowRegionForm(false);
    },
    onError: () => toast.error("Erro ao criar região"),
  });

  const deleteRegion = trpc.config.updateRegion.useMutation({
    onSuccess: () => {
      toast.success("Região removida");
      utils.config.getRegions.invalidate();
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-primary" />
            Configurações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Personalize o sistema para o seu negócio
          </p>
        </div>

        {/* User Profile */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Perfil do Usuário</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">
                  {(user?.displayName || user?.username || "U").charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-semibold text-foreground">{user?.displayName || user?.username || "Usuário"}</p>
                <p className="text-sm text-muted-foreground">{user?.username || ""}</p>
                <Badge
                  variant="outline"
                  className={`text-xs mt-1 ${user?.role === "admin" ? "text-yellow-600 border-yellow-300" : "text-blue-600 border-blue-300"}`}
                >
                  {user?.role === "admin" ? "Administrador" : "Vendedor"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products/Services */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Produtos e Serviços
            </CardTitle>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProductForm(!showProductForm)}
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {showProductForm && isAdmin && (
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome *</Label>
                    <Input
                      value={newProduct.name}
                      onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Ex: Consultoria Premium"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Preço (R$)</Label>
                    <Input
                      type="number"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))}
                      placeholder="0,00"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Descrição</Label>
                  <Input
                    value={newProduct.description}
                    onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Breve descrição do produto/serviço"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setShowProductForm(false)}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      createProduct.mutate({
                        name: newProduct.name,
                        description: newProduct.description || undefined,
                      })
                    }
                    disabled={!newProduct.name.trim() || createProduct.isPending}
                    className="bg-primary text-primary-foreground"
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            )}
            {!products || products.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum produto cadastrado. {isAdmin ? "Adicione produtos para usar nas oportunidades." : ""}
              </p>
            ) : (
              <div className="space-y-2">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.name}</p>

                    </div>
                    <div className="flex items-center gap-3">

                      {isAdmin && (
                        <button
                          onClick={() => deleteProduct.mutate({ id: p.id, active: false })}
                          className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Regions */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Regiões de Atuação
            </CardTitle>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRegionForm(!showRegionForm)}
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {showRegionForm && isAdmin && (
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome *</Label>
                    <Input
                      value={newRegion.name}
                      onChange={(e) => setNewRegion((r) => ({ ...r, name: e.target.value }))}
                      placeholder="Ex: São Paulo - Capital"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Descrição</Label>
                    <Input
                      value={newRegion.description}
                      onChange={(e) => setNewRegion((r) => ({ ...r, description: e.target.value }))}
                      placeholder="Descrição da região"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setShowRegionForm(false)}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      createRegion.mutate({
                        name: newRegion.name,
                      })
                    }
                    disabled={!newRegion.name.trim() || createRegion.isPending}
                    className="bg-primary text-primary-foreground"
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            )}
            {!regions || regions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma região cadastrada. {isAdmin ? "Adicione regiões para organizar sua equipe." : ""}
              </p>
            ) : (
              <div className="space-y-2">
                {regions.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{r.name}</p>
                        {r.code && (
                          <p className="text-xs text-muted-foreground">Código: {r.code}</p>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => deleteRegion.mutate({ id: r.id, active: false })}
                        className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Note */}
        {!isAdmin && (
          <div className="p-4 rounded-xl border border-yellow-200 bg-yellow-50 text-sm text-yellow-800">
            <strong>Nota:</strong> Apenas administradores podem adicionar ou remover produtos e regiões.
            Entre em contato com o administrador do sistema para solicitar alterações.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
