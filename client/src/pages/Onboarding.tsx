import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Leaf, Stethoscope, ShoppingBag, Home, Cpu, CheckCircle2 } from "lucide-react";

const SEGMENTS = [
  { value: "aesthetics_clinic", label: "Clínica de Estética", icon: Stethoscope, description: "Procedimentos estéticos, consultas e fidelização de pacientes", color: "from-pink-500 to-rose-500" },
  { value: "agribusiness", label: "Agronegócio", icon: Leaf, description: "Distribuição, visitas a produtores e pedidos de insumos", color: "from-green-500 to-emerald-600" },
  { value: "real_estate", label: "Imobiliária", icon: Home, description: "Captações, visitas e fechamento de contratos imobiliários", color: "from-blue-500 to-indigo-600" },
  { value: "retail", label: "Varejo", icon: ShoppingBag, description: "Gestão de vendas, estoque e relacionamento com clientes", color: "from-orange-500 to-amber-500" },
  { value: "tech", label: "Tecnologia", icon: Cpu, description: "SaaS, demos e ciclos de vendas consultivas", color: "from-violet-500 to-purple-600" },
  { value: "generic", label: "Outros Segmentos", icon: Building2, description: "Configuração genérica adaptável a qualquer negócio", color: "from-slate-500 to-gray-600" },
];

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [step, setStep] = useState<"join" | "create">("join");
  const [inviteToken, setInviteToken] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [selectedSegment, setSelectedSegment] = useState("");

  const joinByToken = trpc.organizations.joinByToken.useMutation({
    onSuccess: () => {
      toast.success("Bem-vindo à sua organização!");
      window.location.reload();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleJoin = () => {
    if (!inviteToken.trim()) return toast.error("Digite o código de convite");
    joinByToken.mutate({ token: inviteToken.trim() });
  };

  const handleNameChange = (name: string) => {
    setOrgName(name);
    setOrgSlug(name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1e] via-[#0d1530] to-[#0a0f1e] flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#c9a84c]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#c9a84c] to-[#e8c96a] rounded-xl flex items-center justify-center shadow-lg shadow-[#c9a84c]/20">
              <Building2 className="w-6 h-6 text-[#0a0f1e]" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-bold text-white leading-none">Biz Management</h1>
              <p className="text-[#c9a84c] text-sm font-medium">Follow</p>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">Bem-vindo, {user?.name?.split(" ")[0]}!</h2>
          <p className="text-slate-400 mt-1">Para começar, você precisa fazer parte de uma organização.</p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setStep("join")}
            className={`p-4 rounded-xl border-2 transition-all text-left ${step === "join" ? "border-[#c9a84c] bg-[#c9a84c]/10" : "border-slate-700 bg-slate-800/50 hover:border-slate-500"}`}
          >
            <CheckCircle2 className={`w-5 h-5 mb-2 ${step === "join" ? "text-[#c9a84c]" : "text-slate-500"}`} />
            <p className={`font-semibold text-sm ${step === "join" ? "text-white" : "text-slate-300"}`}>Tenho um convite</p>
            <p className="text-xs text-slate-500 mt-0.5">Entrar em uma organização existente</p>
          </button>
          <button
            onClick={() => setStep("create")}
            className={`p-4 rounded-xl border-2 transition-all text-left ${step === "create" ? "border-[#c9a84c] bg-[#c9a84c]/10" : "border-slate-700 bg-slate-800/50 hover:border-slate-500"}`}
          >
            <Building2 className={`w-5 h-5 mb-2 ${step === "create" ? "text-[#c9a84c]" : "text-slate-500"}`} />
            <p className={`font-semibold text-sm ${step === "create" ? "text-white" : "text-slate-300"}`}>Criar organização</p>
            <p className="text-xs text-slate-500 mt-0.5">Configurar um novo espaço de trabalho</p>
          </button>
        </div>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          {step === "join" ? (
            <>
              <CardHeader>
                <CardTitle className="text-white">Entrar com convite</CardTitle>
                <CardDescription className="text-slate-400">
                  Cole o código de convite que você recebeu do administrador da sua empresa.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-slate-300">Código de convite</Label>
                  <Input
                    value={inviteToken}
                    onChange={(e) => setInviteToken(e.target.value)}
                    placeholder="Cole o código aqui..."
                    className="mt-1.5 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>
                <Button
                  onClick={handleJoin}
                  disabled={joinByToken.isPending || !inviteToken.trim()}
                  className="w-full bg-[#c9a84c] hover:bg-[#b8943d] text-[#0a0f1e] font-semibold"
                >
                  {joinByToken.isPending ? "Entrando..." : "Entrar na Organização"}
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-white">Criar nova organização</CardTitle>
                <CardDescription className="text-slate-400">
                  Configure o espaço de trabalho para a sua empresa. Você será o administrador.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-300">Nome da empresa</Label>
                    <Input
                      value={orgName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Ex: Clínica Bella"
                      className="mt-1.5 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Identificador (slug)</Label>
                    <Input
                      value={orgSlug}
                      onChange={(e) => setOrgSlug(e.target.value)}
                      placeholder="clinica-bella"
                      className="mt-1.5 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300 mb-2 block">Segmento de atuação</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {SEGMENTS.map((seg) => {
                      const Icon = seg.icon;
                      const isSelected = selectedSegment === seg.value;
                      return (
                        <button
                          key={seg.value}
                          onClick={() => setSelectedSegment(seg.value)}
                          className={`p-3 rounded-lg border text-left transition-all ${isSelected ? "border-[#c9a84c] bg-[#c9a84c]/10" : "border-slate-600 bg-slate-700/50 hover:border-slate-500"}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className={`w-4 h-4 ${isSelected ? "text-[#c9a84c]" : "text-slate-400"}`} />
                            <span className={`text-sm font-medium ${isSelected ? "text-white" : "text-slate-300"}`}>{seg.label}</span>
                          </div>
                          <p className="text-xs text-slate-500 leading-tight">{seg.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <p className="text-xs text-slate-500 text-center">
                  Para criar uma organização, solicite ao administrador do sistema que crie uma para você ou entre em contato com o suporte.
                </p>
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-amber-400 text-sm font-medium">ℹ️ Aguardando aprovação</p>
                  <p className="text-slate-400 text-xs mt-1">
                    A criação de organizações é gerenciada pelo Super Admin. Entre em contato para obter acesso ou use um código de convite.
                  </p>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
