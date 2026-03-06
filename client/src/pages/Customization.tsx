import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil, Check, X, Palette, Tag, BarChart3, TrendingUp, Menu, Briefcase, RefreshCw } from "lucide-react";

const CATEGORY_CONFIG = {
  activities: { label: "Atividades de Prospecção", icon: Tag, color: "text-blue-600", bg: "bg-blue-50", description: "Nomes dos tipos de atividades exibidos nos formulários e relatórios" },
  funnel: { label: "Etapas do Funil de Vendas", icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50", description: "Nomes das etapas do funil exibidos no dashboard e oportunidades" },
  kpis: { label: "KPIs do Dashboard", icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50", description: "Nomes dos indicadores-chave exibidos no dashboard executivo" },
  deal_status: { label: "Status de Negócios", icon: Briefcase, color: "text-emerald-600", bg: "bg-emerald-50", description: "Nomes dos status exibidos no módulo de Gestão de Negócios" },
  menu: { label: "Itens do Menu", icon: Menu, color: "text-slate-600", bg: "bg-slate-50", description: "Nomes dos itens de navegação do menu lateral" },
} as const;

type Category = keyof typeof CATEGORY_CONFIG;

interface LabelItem {
  id: number;
  labelKey: string;
  labelValue: string;
  category: string;
  description: string | null;
}

function LabelRow({ item, onSave }: { item: LabelItem; onSave: (key: string, value: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.labelValue);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!value.trim()) return;
    setSaving(true);
    try {
      await onSave(item.labelKey, value.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setValue(item.labelValue);
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-mono">{item.labelKey}</p>
        {item.description && <p className="text-xs text-muted-foreground/70 mt-0.5">{item.description}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {editing ? (
          <>
            <Input
              value={value}
              onChange={e => setValue(e.target.value)}
              className="h-8 w-44 text-sm"
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel(); }}
            />
            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:text-emerald-700" onClick={handleSave} disabled={saving}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Badge variant="outline" className="text-sm font-medium px-3 py-1">{item.labelValue}</Badge>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Customization() {
  const utils = trpc.useUtils();
  const { data: labelsRaw = [], isLoading } = trpc.labels.list.useQuery();
  const labels = labelsRaw as LabelItem[];

  const updateMutation = trpc.labels.update.useMutation({
    onSuccess: () => { utils.labels.list.invalidate(); toast.success("Label atualizado com sucesso!"); },
    onError: (e) => toast.error(e.message),
  });

  async function handleSave(labelKey: string, labelValue: string) {
    await updateMutation.mutateAsync({ labelKey, labelValue });
  }

  const byCategory = (Object.keys(CATEGORY_CONFIG) as Category[]).map(cat => ({
    cat,
    items: labels.filter(l => l.category === cat),
  }));

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Palette className="h-6 w-6 text-primary" />
              Personalização do Sistema
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Adapte os nomes e rótulos do sistema para o seu segmento de negócio. As alterações são aplicadas em tempo real para todos os usuários.
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 self-start" onClick={() => utils.labels.list.invalidate()}>
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
        </div>

        {/* Info Banner */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">Como usar</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Clique no ícone de edição ao lado de qualquer rótulo para alterá-lo. Pressione <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">Enter</kbd> para salvar ou <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">Esc</kbd> para cancelar.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando configurações...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {byCategory.map(({ cat, items }) => {
              const cfg = CATEGORY_CONFIG[cat];
              if (items.length === 0) return null;
              return (
                <Card key={cat} className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${cfg.bg}`}>
                        <cfg.icon className={`h-4 w-4 ${cfg.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{cfg.label}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">{cfg.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {items.map(item => (
                      <LabelRow key={item.labelKey} item={item} onSave={handleSave} />
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
