import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LocalAuthProvider, useLocalAuth } from "./contexts/LocalAuthContext";
import { ActiveOrgProvider } from "./contexts/ActiveOrgContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Opportunities from "./pages/Opportunities";
import Activities from "./pages/Activities";
import Objections from "./pages/Objections";
import Planning from "./pages/Planning";
import SmartGrid from "./pages/SmartGrid";
import Strategic from "./pages/Strategic";
import AdminDashboard from "./pages/AdminDashboard";
import Settings from "./pages/Settings";
import Deals from "./pages/Deals";
import Customization from "./pages/Customization";
import Checkin from "./pages/Checkin";
import Report from "./pages/Report";
import Onboarding from "./pages/Onboarding";
import SuperAdmin from "./pages/SuperAdmin";
import LocalLogin from "./pages/LocalLogin";
import UserManagement from "./pages/UserManagement";
import Profile from "./pages/Profile";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

// Rotas públicas que não exigem autenticação
const PUBLIC_ROUTES = ["/", "/login", "/join", "/onboarding"];

/**
 * Guard de autenticação local.
 * Se o usuário não estiver autenticado e tentar acessar uma rota protegida,
 * redireciona para /login.
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useLocalAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated && !PUBLIC_ROUTES.includes(location)) {
      navigate("/login");
    }
  }, [loading, isAuthenticated, location, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function Router() {
  return (
    <AuthGuard>
      <Switch>
        {/* Rotas públicas */}
        <Route path="/" component={Home} />
        <Route path="/login" component={LocalLogin} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/join" component={Onboarding} />

        {/* Rotas protegidas — usuário comum */}
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/deals" component={Deals} />
        <Route path="/opportunities" component={Opportunities} />
        <Route path="/activities" component={Activities} />
        <Route path="/objections" component={Objections} />
        <Route path="/planning" component={Planning} />
        <Route path="/smart-grid" component={SmartGrid} />
        <Route path="/strategic" component={Strategic} />
        <Route path="/checkin" component={Checkin} />
        <Route path="/report" component={Report} />
        <Route path="/profile" component={Profile} />

        {/* Rotas protegidas — admin da organização */}
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/settings" component={Settings} />
        <Route path="/customization" component={Customization} />
        <Route path="/users" component={UserManagement} />

        {/* Rotas protegidas — super admin */}
        <Route path="/super-admin" component={SuperAdmin} />

        {/* Fallback */}
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </AuthGuard>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <LocalAuthProvider>
          <ActiveOrgProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
          </ActiveOrgProvider>
        </LocalAuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
