import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  ChevronDown,
  Cog,
  FileText,
  KeyRound,
  Layers,
  LayoutDashboard,
  LogOut,
  Palette,
  PanelLeft,
  Shield,
  Target,
  TrendingUp,
  User,
  Users,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import { trpc } from "@/lib/trpc";

const sellerMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Briefcase, label: "Negócios", path: "/deals" },
  { icon: Target, label: "Oportunidades", path: "/opportunities" },
  { icon: BarChart3, label: "Atividades", path: "/activities" },
  { icon: BookOpen, label: "Objeções", path: "/objections" },
  { icon: Layers, label: "Planejamento", path: "/planning" },
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

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useLocalAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
}) {
  const { user, logout } = useLocalAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isSuperAdmin = user?.role === "super_admin";
  // Busca o nome da organização para exibir na sidebar
  const { data: org } = trpc.organizations.mine.useQuery(undefined, { enabled: !!user?.organizationId });

  const activeItem = [...sellerMenuItems, ...adminMenuItems].find(
    (item) => location === item.path || location.startsWith(item.path + "/")
  );

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, setSidebarWidth]);

  const displayName = user?.displayName ?? user?.username ?? "Usuário";
  const initials = displayName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
  const roleLabel = isSuperAdmin ? "Super Admin" : isAdmin ? "Admin" : "Vendedor";
  const roleBadgeClass = isSuperAdmin
    ? "border-purple-400/60 text-purple-300"
    : isAdmin
    ? "border-[#c9a84c]/50 text-[#c9a84c]"
    : "border-sidebar-border text-sidebar-foreground/60";

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar" disableTransition={isResizing}>
          {/* Header */}
          <SidebarHeader className="h-16 border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-3 h-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors shrink-0"
                aria-label="Toggle sidebar"
              >
                <PanelLeft className="h-4 w-4 text-sidebar-foreground/60" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
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
          </SidebarHeader>

          {/* Org info */}
          {!isCollapsed && (
            <div className="px-4 py-2.5 border-b border-sidebar-border/50">
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-sidebar-foreground/40 shrink-0" />
                <span className="text-xs text-sidebar-foreground/60 truncate">
                  {org?.name ?? `Organização #${user?.organizationId}`}
                </span>
              </div>
            </div>
          )}

          {/* Navigation */}
          <SidebarContent className="py-3">
            {/* Seller Menu */}
            {!isCollapsed && (
              <div className="px-4 mb-2">
                <span className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
                  Vendas
                </span>
              </div>
            )}
            <SidebarMenu className="px-2">
              {sellerMenuItems.map((item) => {
                const isActive = location === item.path || location.startsWith(item.path + "/");
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-9 rounded-lg font-normal transition-all ${
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                      }`}
                    >
                      <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-sidebar-primary" : ""}`} />
                      <span className="text-sm">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>

            {/* Admin Menu */}
            {isAdmin && (
              <>
                {!isCollapsed && (
                  <div className="px-4 mt-4 mb-2">
                    <span className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
                      Administração
                    </span>
                  </div>
                )}
                <SidebarMenu className="px-2">
                  {adminMenuItems.map((item) => {
                    const isActive = location === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className={`h-9 rounded-lg font-normal transition-all ${
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                          }`}
                        >
                          <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-sidebar-primary" : ""}`} />
                          <span className="text-sm">{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </>
            )}
          </SidebarContent>

          {/* Footer */}
          <SidebarFooter className="border-t border-sidebar-border p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent/50 transition-colors w-full text-left focus:outline-none">
                  <Avatar className="h-8 w-8 shrink-0 border border-sidebar-border">
                    <AvatarFallback className="text-xs font-semibold bg-sidebar-primary text-sidebar-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-sidebar-foreground truncate leading-none">
                        {displayName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge
                          variant="outline"
                          className={`text-[10px] h-4 px-1.5 ${roleBadgeClass}`}
                        >
                          {roleLabel}
                        </Badge>
                        <span className="text-[10px] text-sidebar-foreground/40 truncate">
                          {user?.username}
                        </span>
                      </div>
                    </div>
                  )}
                  {!isCollapsed && <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-52 mb-1">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{user?.username}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Slot #{user?.slot}</p>
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
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        {!isMobile && (
          <div
            className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
            onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
            style={{ zIndex: 50 }}
          />
        )}
      </div>

      <SidebarInset className="bg-background">
        {/* Mobile header */}
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-4 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
              <div>
                <span className="font-semibold text-foreground text-sm">
                  {activeItem?.label ?? "Biz Management Follow"}
                </span>
                <p className="text-xs text-muted-foreground leading-none mt-0.5">
                  {displayName}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
              title="Sair"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}
        <main className="flex-1 min-h-screen p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
