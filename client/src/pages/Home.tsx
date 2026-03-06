import { useLocalAuth } from "@/contexts/LocalAuthContext";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useLocation } from "wouter";
import {
  TrendingUp,
  Users,
  Target,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export default function Home() {
  const { user, loading, isAuthenticated } = useLocalAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      if (!user?.organizationId && user?.role !== "super_admin") {
        navigate("/onboarding");
      } else {
        navigate("/dashboard");
      }
    }
  }, [loading, isAuthenticated, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const features = [
    {
      icon: BarChart3,
      title: "Dashboard Executivo",
      desc: "KPIs em tempo real com comparação meta vs realizado",
    },
    {
      icon: Target,
      title: "Funil de Vendas",
      desc: "5 estágios visuais com valores e quantidades",
    },
    {
      icon: Users,
      title: "Gestão de Oportunidades",
      desc: "Pipeline completo com probabilidade e previsão",
    },
    {
      icon: TrendingUp,
      title: "Visão Administrativa",
      desc: "Consolidação de todos os vendedores com filtros",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground tracking-tight">
              Biz Management Follow
            </span>
          </div>
          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
          >
            Entrar na Plataforma
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center">
        <div className="container py-24">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/15 border border-accent/30 text-sm font-medium text-foreground mb-8">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Plataforma de Gestão de Vendas
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight mb-6">
              Gerencie suas vendas com{" "}
              <span
                className="relative"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.28 0.08 255), oklch(0.78 0.12 75))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                precisão e elegância
              </span>
            </h1>

            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Substitua suas planilhas por um sistema completo de gestão. Acompanhe
              oportunidades, atividades, metas e resultados em tempo real.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => (window.location.href = getLoginUrl())}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 px-8 h-12 text-base font-semibold shadow-lg"
              >
                Acessar Plataforma
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-xl p-6 hover:shadow-md hover:-translate-y-1 transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Benefits */}
          <div className="mt-16 flex flex-wrap justify-center gap-6">
            {[
              "Multi-usuário com controle de acesso",
              "Dashboard em tempo real",
              "Relatórios semanais estruturados",
              "Visão consolidada para gestores",
              "Adaptável a múltiplos segmentos",
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container text-center text-sm text-muted-foreground">
          Biz Management Follow — Plataforma de Gestão de Negócios        </div>
      </footer>
    </div>
  );
}
