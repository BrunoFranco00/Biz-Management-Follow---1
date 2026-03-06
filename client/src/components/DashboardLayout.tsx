import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import { useActiveOrg } from "@/contexts/ActiveOrgContext";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cog,
  Crown,
  FileText,
  Globe,
  KeyRound,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

// ─── Menu items ───────────────────────────────────────────────────────────────
const sellerMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Briefcase, label: "Negócios", path: "/deals" },
  { icon: Target, label: "Oportunidades", path: "/opportunities" },
  { icon: BarChart3, label: "Atividades", path: "/activities" },
  { icon: BookOpen, label: "Objeções", path: "/objections" },
  { icon: Layers, label: "Planejamento", path: "/planning" },
  { icon: Sparkles, label: "Smart Grid", path: "/smart-grid" },
  { icon: Zap, label: "Ações Estratégicas", path: "/strategic" },
  { icon: CheckCircle2, label: "Check-in Semanal", path: "/checkin" },
  { icon: FileText, label: "Relatório Semanal", path: "/report" },
];

const adminMenuItems = [
  { icon: Shield, label: "Painel Admin", path: "/admin" },
  { icon: Users, label: "Usuários", path: "/users" },
  { icon: Palette, label: "Personalização", path: "/customization" },
  { icon: Cog, label: "Configurações", path: "/settings" },
];

// ─── Org Switcher (Super Admin only) ─────────────────────────────────────────
function OrgSwitcher({ collapsed }: { collapsed: boolean }) {
  const { activeOrgId, setActiveOrgId } = useActiveOrg();
  const { data: orgs } = trpc.superAdmin.listOrganizations.useQuery();
  const activeOrg = orgs?.find((o) => o.id === activeOrgId);
  const [open, setOpen] = useState(false);

  if (!orgs || orgs.length === 0) return null;

  return (
    <div className="px-2 py-2 border-b border-sidebar-border/50 shrink-0">
      {collapsed ? (
        <div className="flex justify-center">
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-purple-900/30 hover:bg-purple-900/50 transition-colors border border-purple-500/30"
                title={`Org ativa: ${activeOrg?.name ?? "Selecionar"}`}
              >
                <Globe className="h-3.5 w-3.5 text-purple-300" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="w-52">
              <div className="px-2 py-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Organização Ativa</p>
              </div>
              <DropdownMenuSeparator />
              {orgs.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => { setActiveOrgId(org.id); setOpen(false); }}
                  className={`cursor-pointer ${org.id === activeOrgId ? "bg-purple-900/20 text-purple-300" : ""}`}
                >
                  <Building2 className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">{org.name}</span>
                  {org.id === activeOrgId && <ChevronRight className="ml-auto h-3 w-3 text-purple-400" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent/50 transition-colors border border-purple-500/30 bg-purple-900/20">
              <Globe className="h-3.5 w-3.5 text-purple-300 shrink-0" />
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[10px] text-purple-300/70 uppercase tracking-wider font-semibold leading-none">Organização Ativa</p>
                <p className="text-xs text-purple-200 font-medium truncate mt-0.5 leading-none">
                  {activeOrg?.name ?? "Selecionar organização"}
                </p>
              </div>
              <ChevronDown className="h-3 w-3 text-purple-300/60 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trocar Organização</p>
            </div>
            <DropdownMenuSeparator />
            {orgs.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => { setActiveOrgId(org.id); setOpen(false); }}
                className={`cursor-pointer ${org.id === activeOrgId ? "bg-purple-900/20 text-purple-300" : ""}`}
              >
                <Building2 className="mr-2 h-4 w-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{org.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{org.segment}</p>
                </div>
                {org.id === activeOrgId && <ChevronRight className="ml-2 h-3 w-3 text-purple-400 shrink-0" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// ─── Breakpoints ──────────────────────────────────────────────────────────────
function useBreakpoint() {
  const [bp, setBp] = useState<"mobile" | "tablet" | "desktop">(() => {
    if (typeof window === "undefined") return "desktop";
    if (window.innerWidth < 768) return "mobile";
    if (window.innerWidth < 1280) return "tablet";
    return "desktop";
  });

  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 768) setBp("mobile");
      else if (window.innerWidth < 1280) setBp("tablet");
      else setBp("desktop");
    };
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return bp;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useLocalAuth();
  const [, navigate] = useLocation();

  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) {
    navigate("/login");
    return null;
  }

  return <DashboardLayoutContent>{children}</DashboardLayoutContent>;
}

// ─── Inner content ────────────────────────────────────────────────────────────
function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useLocalAuth();
  const [location, setLocation] = useLocation();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";

  // Sidebar state: desktop = always open (collapsible), tablet/mobile = drawer
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Close drawer on route change (mobile/tablet)
  useEffect(() => {
    if (isMobile || isTablet) setSidebarOpen(false);
  }, [location, isMobile, isTablet]);

  // Close drawer on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isSuperAdmin = user?.role === "super_admin";
  const { activeOrgId, isSuperAdmin: ctxSuperAdmin } = useActiveOrg();
  const { data: org } = trpc.organizations.mine.useQuery(undefined, { enabled: !!user?.organizationId && !isSuperAdmin });
  const { data: orgs } = trpc.superAdmin.listOrganizations.useQuery(undefined, { enabled: isSuperAdmin });
  const activeOrg = isSuperAdmin ? orgs?.find((o) => o.id === activeOrgId) : org;

  const displayName = user?.displayName ?? user?.username ?? "Usuário";
  const initials = displayName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
  const roleLabel = isSuperAdmin ? "Super Admin" : isAdmin ? "Admin" : "Vendedor";
  const roleBadgeClass = isSuperAdmin
    ? "border-purple-400/60 text-purple-300 bg-purple-900/20"
    : isAdmin
    ? "border-amber-400/50 text-amber-300 bg-amber-900/20"
    : "border-sidebar-border/60 text-sidebar-foreground/60";

  const superAdminItem = { icon: Crown, label: "Painel Super Admin", path: "/super-admin" };
  const activeItem = [...sellerMenuItems, ...adminMenuItems, superAdminItem].find(
    (item) => location === item.path || location.startsWith(item.path + "/")
  );

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  const navigate = (path: string) => {
    setLocation(path);
    if (isMobile || isTablet) setSidebarOpen(false);
  };

  // Desktop: collapsed = icon-only sidebar (56px), expanded = full (260px)
  const desktopSidebarWidth = sidebarCollapsed ? 56 : 260;
  const showLabels = !sidebarCollapsed || isMobile || isTablet;

  // ─── Sidebar inner content ─────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="h-14 flex items-center gap-2 px-3 border-b border-sidebar-border shrink-0">
        {/* Toggle button (desktop only) */}
        {!isMobile && !isTablet && (
          <button
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors shrink-0"
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed
              ? <PanelLeftOpen className="h-4 w-4 text-sidebar-foreground/60" />
              : <PanelLeftClose className="h-4 w-4 text-sidebar-foreground/60" />
            }
          </button>
        )}
        {/* Close button (mobile/tablet) */}
        {(isMobile || isTablet) && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors shrink-0"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4 text-sidebar-foreground/60" />
          </button>
        )}
        {showLabels && (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-md bg-sidebar-primary flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5 text-sidebar-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sidebar-foreground tracking-tight truncate text-sm leading-none">
                Biz Management
              </p>
              <p className="text-[10px] text-sidebar-primary font-semibold tracking-wide">Follow</p>
            </div>
          </div>
        )}
      </div>

      {/* Super Admin: Org Switcher */}
      {isSuperAdmin && <OrgSwitcher collapsed={sidebarCollapsed && !isMobile && !isTablet} />}

      {/* Regular org info (non-super-admin) */}
      {!isSuperAdmin && showLabels && (
        <div className="px-4 py-2 border-b border-sidebar-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-sidebar-foreground/40 shrink-0" />
            <span className="text-xs text-sidebar-foreground/60 truncate">
              {org?.name ?? `Organização #${user?.organizationId}`}
            </span>
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        {/* Vendas label */}
        {showLabels && (
          <div className="px-4 mb-1">
            <span className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
              Vendas
            </span>
          </div>
        )}
        <ul className="px-2 space-y-0.5">
          {sellerMenuItems.map((item) => {
            const isActive = location === item.path || location.startsWith(item.path + "/");
            return (
              <li key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  title={!showLabels ? item.label : undefined}
                  className={`w-full flex items-center gap-3 h-9 px-2 rounded-lg text-sm font-normal transition-all
                    ${isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    }
                    ${!showLabels ? "justify-center" : ""}
                  `}
                >
                  <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-sidebar-primary" : ""}`} />
                  {showLabels && <span className="truncate">{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Admin section */}
        {isAdmin && (
          <>
            {showLabels && (
              <div className="px-4 mt-4 mb-1">
                <span className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
                  Administração
                </span>
              </div>
            )}
            {!showLabels && <div className="my-3 mx-2 border-t border-sidebar-border/40" />}
            <ul className="px-2 space-y-0.5">
              {adminMenuItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <li key={item.path}>
                    <button
                      onClick={() => navigate(item.path)}
                      title={!showLabels ? item.label : undefined}
                      className={`w-full flex items-center gap-3 h-9 px-2 rounded-lg text-sm font-normal transition-all
                        ${isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        }
                        ${!showLabels ? "justify-center" : ""}
                      `}
                    >
                      <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-sidebar-primary" : ""}`} />
                      {showLabels && <span className="truncate">{item.label}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {/* Super Admin section */}
        {isSuperAdmin && (
          <>
            {showLabels && (
              <div className="px-4 mt-4 mb-1">
                <span className="text-[10px] font-semibold text-purple-400/70 uppercase tracking-wider">
                  Super Admin
                </span>
              </div>
            )}
            {!showLabels && <div className="my-3 mx-2 border-t border-purple-500/30" />}
            <ul className="px-2 space-y-0.5">
              <li>
                <button
                  onClick={() => navigate("/super-admin")}
                  title={!showLabels ? "Painel Super Admin" : undefined}
                  className={`w-full flex items-center gap-3 h-9 px-2 rounded-lg text-sm font-normal transition-all
                    ${location === "/super-admin"
                      ? "bg-purple-900/40 text-purple-200"
                      : "text-purple-300/70 hover:text-purple-200 hover:bg-purple-900/30"
                    }
                    ${!showLabels ? "justify-center" : ""}
                  `}
                >
                  <Crown className={`h-4 w-4 shrink-0 ${location === "/super-admin" ? "text-purple-300" : ""}`} />
                  {showLabels && <span className="truncate">Painel Super Admin</span>}
                </button>
              </li>
            </ul>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={`flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-sidebar-accent/50 transition-colors w-full text-left focus:outline-none ${!showLabels ? "justify-center" : ""}`}>
              <Avatar className="h-8 w-8 shrink-0 border border-sidebar-border">
                <AvatarFallback className="text-xs font-semibold bg-sidebar-primary text-sidebar-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {showLabels && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate leading-none">
                    {displayName}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`text-[10px] h-4 px-1.5 shrink-0 ${roleBadgeClass}`}
                    >
                      {roleLabel}
                    </Badge>
                    <span className="text-[10px] text-sidebar-foreground/40 truncate">
                      {user?.username}
                    </span>
                  </div>
                </div>
              )}
              {showLabels && <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-52 mb-1">
            <div className="px-3 py-2">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">{user?.username}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isSuperAdmin ? "Super Admin Global" : `Slot #${user?.slot}`}
              </p>
              {isSuperAdmin && activeOrg && (
                <p className="text-xs text-purple-500 mt-0.5">Org ativa: {activeOrg.name}</p>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setLocation("/profile")} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Meu Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocation("/profile")} className="cursor-pointer">
              <KeyRound className="mr-2 h-4 w-4" />
              <span>Alterar Senha</span>
            </DropdownMenuItem>
            {isSuperAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/super-admin")} className="cursor-pointer text-purple-600">
                  <Crown className="mr-2 h-4 w-4" />
                  <span>Painel Super Admin</span>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* ── Desktop sidebar (fixed, collapsible) ── */}
      {!isMobile && !isTablet && (
        <aside
          className="h-full bg-sidebar border-r border-sidebar-border flex-shrink-0 transition-all duration-200 overflow-hidden"
          style={{ width: desktopSidebarWidth }}
        >
          <SidebarContent />
        </aside>
      )}

      {/* ── Mobile/Tablet: overlay drawer ── */}
      {(isMobile || isTablet) && (
        <>
          {/* Backdrop */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 transition-opacity"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          {/* Drawer */}
          <aside
            className={`fixed top-0 left-0 h-full bg-sidebar border-r border-sidebar-border z-50 transition-transform duration-300 overflow-hidden
              ${isMobile ? "w-72" : "w-80"}
              ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            `}
          >
            <SidebarContent />
          </aside>
        </>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile/tablet) */}
        {(isMobile || isTablet) && (
          <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-30 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <span className="font-semibold text-foreground text-sm leading-none">
                  {activeItem?.label ?? "Biz Management"}
                </span>
                <p className="text-xs text-muted-foreground leading-none mt-0.5">{displayName}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
              title="Sair"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </button>
          </header>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
