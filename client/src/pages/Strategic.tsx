import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Edit2,
  Plus,
  Trash2,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type StratForm = {
  actionName: string;
  startDate: string;
  description: string;
  completed: boolean;
  resultYtd: string;
  difficulty: string;
  accelerationTips: string;
};

const emptyForm: StratForm = {
  actionName: "",
  startDate: "",
  description: "",
  completed: false,
  resultYtd: "",
  difficulty: "",
  accelerationTips: "",
};

export default function Strategic() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<StratForm>(emptyForm);

  const { data: actions, isLoading } = trpc.strategic.list.useQuery();
  const utils = trpc.useUtils();

  const createAction = trpc.strategic.create.useMutation({
    onSuccess: () => {
      toast.success("Ação estratégica criada!");
      utils.strategic.list.invalidate();
      setOpen(false);
      setForm(emptyForm);
    },
    onError: () => toast.error("Erro ao criar ação estratégica"),
  });

  const updateAction = trpc.strategic.update.useMutation({
    onSuccess: () => {
      toast.success("Ação estratégica atualizada!");
      utils.strategic.list.invalidate();
      setOpen(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: () => toast.error("Erro ao atualizar ação estratégica"),
  });

  const deleteAction = trpc.strategic.delete.useMutation({
    onSuccess: () => {
      toast.success("Ação removida");
      utils.strategic.list.invalidate();
    },
    onError: () => toast.error("Erro ao remover ação"),
  });

  const handleSubmit = async () => {
    if (!form.actionName.trim()) {
      toast.error("Nome da ação é obrigatório");
      return;
    }
    const data = {
      actionName: form.actionName,
      startDate: form.startDate || undefined,
      description: form.description || undefined,
      completed: form.completed,
      resultYtd: form.resultYtd || undefined,
      difficulty: form.difficulty || undefined,
      accelerationTips: form.accelerationTips || undefined,
    };
    if (editId) {
      await updateAction.mutateAsync({ id: editId, ...data });
    } else {
      await createAction.mutateAsync(data);
    }
  };

  const handleEdit = (action: any) => {
    setEditId(action.id);
    setForm({
      actionName: action.actionName || "",
      startDate: action.startDate
        ? (action.startDate instanceof Date ? action.startDate.toISOString().split("T")[0] : String(action.startDate).split("T")[0])
        : "",
      description: action.description || "",
      completed: action.completed || false,
      resultYtd: action.resultYtd || "",
      difficulty: action.difficulty || "",
      accelerationTips: action.accelerationTips || "",
    });
    setOpen(true);
  };

  const toggleComplete = async (action: any) => {
    await updateAction.mutateAsync({ id: action.id, completed: !action.completed });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ações Estratégicas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Iniciativas de longo prazo com acompanhamento de resultados
            </p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary text-primary-foreground">
                <Plus className="w-4 h-4" />
                Nova Ação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editId ? "Editar Ação Estratégica" : "Nova Ação Estratégica"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>Nome da Ação *</Label>
                  <Input
                    value={form.actionName}
                    onChange={(e) => setForm((f) => ({ ...f, actionName: e.target.value }))}
                    placeholder="Ex: Implementar programa de indicações"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Data de Início</Label>
                    <Input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.completed}
                        onChange={(e) => setForm((f) => ({ ...f, completed: e.target.checked }))}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-foreground">Concluída</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Descrição</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Descreva a ação estratégica..."
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Resultado YTD (Acumulado no Ano)</Label>
                  <Textarea
                    value={form.resultYtd}
                    onChange={(e) => setForm((f) => ({ ...f, resultYtd: e.target.value }))}
                    placeholder="Quais resultados foram obtidos até agora?"
                    rows={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Dificuldades Encontradas</Label>
                  <Textarea
                    value={form.difficulty}
                    onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
                    placeholder="Quais obstáculos você encontrou?"
                    rows={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Dicas para Acelerar</Label>
                  <Textarea
                    value={form.accelerationTips}
                    onChange={(e) => setForm((f) => ({ ...f, accelerationTips: e.target.value }))}
                    placeholder="O que poderia acelerar esta ação?"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={() => { setOpen(false); setEditId(null); setForm(emptyForm); }}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={createAction.isPending || updateAction.isPending}
                    className="bg-primary text-primary-foreground"
                  >
                    {editId ? "Salvar Alterações" : "Criar Ação"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary */}
        {actions && actions.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total", value: actions.length, color: "text-primary" },
              { label: "Concluídas", value: actions.filter((a) => a.completed).length, color: "text-green-600" },
              { label: "Em Andamento", value: actions.filter((a) => !a.completed).length, color: "text-yellow-600" },
            ].map((s, i) => (
              <Card key={i} className="border border-border shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Actions List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : !actions || actions.length === 0 ? (
          <Card className="border border-border shadow-sm">
            <CardContent className="py-16 text-center">
              <Zap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">Nenhuma ação estratégica cadastrada</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Adicione iniciativas de longo prazo para acompanhar seu progresso
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {actions.map((action) => (
              <Card
                key={action.id}
                className={`border shadow-sm hover:shadow-md transition-all ${
                  action.completed ? "border-green-200 bg-green-50/30" : "border-border"
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggleComplete(action)}
                      className="mt-0.5 shrink-0 transition-transform hover:scale-110"
                    >
                      {action.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className={`font-semibold text-foreground ${action.completed ? "line-through text-muted-foreground" : ""}`}>
                          {action.actionName}
                        </h3>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleEdit(action)}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => deleteAction.mutate({ id: action.id })}
                            className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        {action.startDate && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(String(action.startDate) + "T12:00:00").toLocaleDateString("pt-BR")}
                          </div>
                        )}
                        <Badge variant="outline" className={`text-xs ${action.completed ? "text-green-600 border-green-300" : "text-yellow-600 border-yellow-300"}`}>
                          {action.completed ? "Concluída" : "Em Andamento"}
                        </Badge>
                      </div>
                      {action.description && (
                        <p className="text-sm text-muted-foreground mb-3">{action.description}</p>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {action.resultYtd && (
                          <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                            <p className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              Resultado YTD
                            </p>
                            <p className="text-xs text-green-800">{action.resultYtd}</p>
                          </div>
                        )}
                        {action.difficulty && (
                          <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
                            <p className="text-xs font-semibold text-orange-700 mb-1">Dificuldades</p>
                            <p className="text-xs text-orange-800">{action.difficulty}</p>
                          </div>
                        )}
                        {action.accelerationTips && (
                          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                            <p className="text-xs font-semibold text-blue-700 mb-1">Como Acelerar</p>
                            <p className="text-xs text-blue-800">{action.accelerationTips}</p>
                          </div>
                        )}
                      </div>
                    </div>
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
