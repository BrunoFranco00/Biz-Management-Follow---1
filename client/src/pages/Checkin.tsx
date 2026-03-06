import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, TrendingUp, Smile, Frown, Meh, ThumbsUp, AlertTriangle, Star, ChevronRight, ChevronLeft, Zap } from "lucide-react";

const MOOD_OPTIONS = [
  { value: "excellent", label: "Excelente", icon: Star, color: "text-yellow-500", bg: "bg-yellow-50 border-yellow-300", desc: "Semana incrível, superou expectativas" },
  { value: "good", label: "Boa", icon: ThumbsUp, color: "text-emerald-500", bg: "bg-emerald-50 border-emerald-300", desc: "Semana positiva, no caminho certo" },
  { value: "neutral", label: "Regular", icon: Meh, color: "text-blue-500", bg: "bg-blue-50 border-blue-300", desc: "Semana ok, com pontos de melhoria" },
  { value: "difficult", label: "Difícil", icon: Frown, color: "text-orange-500", bg: "bg-orange-50 border-orange-300", desc: "Semana com desafios significativos" },
  { value: "very_difficult", label: "Muito Difícil", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50 border-red-300", desc: "Semana muito desafiadora, precisa de suporte" },
] as const;

type MoodLevel = typeof MOOD_OPTIONS[number]["value"];

const SCORE_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: "Não avaliado", color: "text-muted-foreground", bg: "bg-muted" },
  20: { label: "Abaixo do esperado", color: "text-red-600", bg: "bg-red-100" },
  40: { label: "Precisa melhorar", color: "text-orange-600", bg: "bg-orange-100" },
  60: { label: "Em desenvolvimento", color: "text-yellow-600", bg: "bg-yellow-100" },
  80: { label: "Bom desempenho", color: "text-blue-600", bg: "bg-blue-100" },
  100: { label: "Performance excelente", color: "text-emerald-600", bg: "bg-emerald-100" },
};

function getScoreConfig(score: number) {
  const thresholds = [0, 20, 40, 60, 80, 100];
  const closest = thresholds.reduce((prev, curr) => Math.abs(curr - score) < Math.abs(prev - score) ? curr : prev);
  return SCORE_LABELS[closest] ?? SCORE_LABELS[0];
}

const STEPS = ["Humor da Semana", "Destaques", "Desafios", "Próxima Semana", "Score de Performance"];

export default function Checkin() {
  const utils = trpc.useUtils();
  const [step, setStep] = useState(0);

  const [reportId, setReportId] = useState<number | null>(null);
  const getOrCreateReport = trpc.reports.getOrCreate.useMutation({
    onSuccess: (data) => setReportId(data.id),
  });
  // Auto-create report on mount
  const [reportRequested, setReportRequested] = useState(false);
  if (!reportRequested && !reportId) {
    setReportRequested(true);
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    const fmt = (d: Date) => d.toISOString().split("T")[0];
    getOrCreateReport.mutate({ weekStart: fmt(monday), weekEnd: fmt(friday) });
  }

  const { data: existingCheckin } = trpc.checkins.get.useQuery(
    { reportId: reportId! },
    { enabled: !!reportId }
  );

  const [form, setForm] = useState({
    moodLevel: "good" as MoodLevel,
    weekHighlight: "",
    biggestChallenge: "",
    nextWeekFocus: "",
    performanceScore: 70,
  });

  const [initialized, setInitialized] = useState(false);
  if (existingCheckin && !initialized) {
    setInitialized(true);
    setForm({
      moodLevel: (existingCheckin as { moodLevel: MoodLevel }).moodLevel ?? "good",
      weekHighlight: (existingCheckin as { weekHighlight: string | null }).weekHighlight ?? "",
      biggestChallenge: (existingCheckin as { biggestChallenge: string | null }).biggestChallenge ?? "",
      nextWeekFocus: (existingCheckin as { nextWeekFocus: string | null }).nextWeekFocus ?? "",
      performanceScore: (existingCheckin as { performanceScore: number | null }).performanceScore ?? 70,
    });
  }

  const upsertMutation = trpc.checkins.upsert.useMutation({
    onSuccess: () => { utils.checkins.get.invalidate(); toast.success("Check-in salvo com sucesso!"); },
    onError: (e) => toast.error(e.message),
  });

  function handleSave() {
    if (!reportId) { toast.error("Relatório semanal não encontrado."); return; }
    upsertMutation.mutate({ reportId, ...form });
  }

  const scoreConfig = useMemo(() => getScoreConfig(form.performanceScore), [form.performanceScore]);
  const progressPct = ((step + 1) / STEPS.length) * 100;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Check-in Semanal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Avalie sua semana e defina o foco para a próxima</p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Etapa {step + 1} de {STEPS.length}: <strong>{STEPS[step]}</strong></span>
            <span>{Math.round(progressPct)}% concluído</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="flex gap-1">
            {STEPS.map((s, i) => (
              <button key={s} onClick={() => setStep(i)}
                className={`flex-1 h-1.5 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="border-0 shadow-sm min-h-[300px]">
          <CardContent className="p-6">
            {/* Step 0: Mood */}
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Como foi sua semana?</h2>
                  <p className="text-sm text-muted-foreground mt-1">Selecione o humor que melhor representa sua semana</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {MOOD_OPTIONS.map((opt) => (
                    <button key={opt.value}
                      onClick={() => setForm(f => ({ ...f, moodLevel: opt.value }))}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${form.moodLevel === opt.value ? `${opt.bg} border-current` : "border-border hover:border-muted-foreground/30"}`}>
                      <div className={`p-2 rounded-lg ${form.moodLevel === opt.value ? "bg-white/60" : "bg-muted"}`}>
                        <opt.icon className={`h-6 w-6 ${form.moodLevel === opt.value ? opt.color : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className={`font-semibold ${form.moodLevel === opt.value ? opt.color : ""}`}>{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                      {form.moodLevel === opt.value && <CheckCircle2 className={`h-5 w-5 ml-auto ${opt.color}`} />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Highlights */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    Destaque da Semana
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">O que de melhor aconteceu esta semana? Qual foi sua maior conquista?</p>
                </div>
                <Textarea
                  value={form.weekHighlight}
                  onChange={e => setForm(f => ({ ...f, weekHighlight: e.target.value }))}
                  placeholder="Ex: Fechei um contrato importante com a Clínica X, superando minha meta de faturamento semanal..."
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">{form.weekHighlight.length} caracteres</p>
              </div>
            )}

            {/* Step 2: Challenges */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Principal Desafio
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Qual foi o maior obstáculo desta semana? O que impediu seu crescimento?</p>
                </div>
                <Textarea
                  value={form.biggestChallenge}
                  onChange={e => setForm(f => ({ ...f, biggestChallenge: e.target.value }))}
                  placeholder="Ex: Dificuldade em converter leads qualificados, muitas objeções de preço na fase de apresentação..."
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">{form.biggestChallenge.length} caracteres</p>
              </div>
            )}

            {/* Step 3: Next Week */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Smile className="h-5 w-5 text-blue-500" />
                    Foco da Próxima Semana
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Qual será sua prioridade número 1 na próxima semana?</p>
                </div>
                <Textarea
                  value={form.nextWeekFocus}
                  onChange={e => setForm(f => ({ ...f, nextWeekFocus: e.target.value }))}
                  placeholder="Ex: Focar em reativar os 5 leads que não responderam, agendar pelo menos 3 reuniões de apresentação..."
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">{form.nextWeekFocus.length} caracteres</p>
              </div>
            )}

            {/* Step 4: Score */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Score de Performance
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Avalie sua performance geral desta semana de 0 a 100</p>
                </div>
                <div className="text-center space-y-4">
                  <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full text-4xl font-bold border-4 ${scoreConfig.bg} ${scoreConfig.color} border-current`}>
                    {form.performanceScore}
                  </div>
                  <div>
                    <Badge className={`${scoreConfig.bg} ${scoreConfig.color} text-sm px-4 py-1`}>
                      {scoreConfig.label}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0 — Muito abaixo</span>
                    <span>100 — Excelente</span>
                  </div>
                  <input
                    type="range" min={0} max={100} step={5}
                    value={form.performanceScore}
                    onChange={e => setForm(f => ({ ...f, performanceScore: parseInt(e.target.value) }))}
                    className="w-full accent-primary h-3 cursor-pointer"
                  />
                  <div className="grid grid-cols-5 gap-1 mt-2">
                    {[20, 40, 60, 80, 100].map(v => (
                      <button key={v} onClick={() => setForm(f => ({ ...f, performanceScore: v }))}
                        className={`text-xs py-1.5 rounded-lg border transition-colors ${form.performanceScore === v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="border rounded-xl p-4 bg-muted/30 space-y-3">
                  <p className="text-sm font-semibold">Resumo do Check-in</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Humor:</span> <span className="font-medium">{MOOD_OPTIONS.find(m => m.value === form.moodLevel)?.label}</span></div>
                    <div><span className="text-muted-foreground">Score:</span> <span className="font-medium">{form.performanceScore}/100</span></div>
                  </div>
                  {form.weekHighlight && <p className="text-xs text-muted-foreground line-clamp-2"><strong>Destaque:</strong> {form.weekHighlight}</p>}
                  {form.biggestChallenge && <p className="text-xs text-muted-foreground line-clamp-2"><strong>Desafio:</strong> {form.biggestChallenge}</p>}
                  {form.nextWeekFocus && <p className="text-xs text-muted-foreground line-clamp-2"><strong>Foco:</strong> {form.nextWeekFocus}</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0} className="gap-2">
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)} className="gap-2">
              Próximo <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={upsertMutation.isPending} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {upsertMutation.isPending ? "Salvando..." : "Concluir Check-in"}
            </Button>
          )}
        </div>

        {/* Already saved indicator */}
        {existingCheckin && (
          <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Check-in desta semana já registrado. Você pode atualizar a qualquer momento.
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
