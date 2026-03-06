import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Opportunities from "./pages/Opportunities";
import Activities from "./pages/Activities";
import Objections from "./pages/Objections";
import Planning from "./pages/Planning";
import Strategic from "./pages/Strategic";
import AdminDashboard from "./pages/AdminDashboard";
import Settings from "./pages/Settings";
import Deals from "./pages/Deals";
import Customization from "./pages/Customization";
import Checkin from "./pages/Checkin";
import Report from "./pages/Report";
import Onboarding from "./pages/Onboarding";
import SuperAdmin from "./pages/SuperAdmin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/opportunities" component={Opportunities} />
      <Route path="/activities" component={Activities} />
      <Route path="/objections" component={Objections} />
      <Route path="/planning" component={Planning} />
      <Route path="/strategic" component={Strategic} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/settings" component={Settings} />
      <Route path="/deals" component={Deals} />
      <Route path="/customization" component={Customization} />
      <Route path="/checkin" component={Checkin} />
      <Route path="/report" component={Report} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/super-admin" component={SuperAdmin} />
      <Route path="/join" component={Onboarding} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
