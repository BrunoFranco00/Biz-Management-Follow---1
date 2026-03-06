/**
 * ActiveOrgContext.tsx
 * Contexto de organização ativa para o Super Admin.
 * Permite que o Super Admin troque de organização a qualquer momento sem fazer logout.
 * Para usuários normais (admin/user), a organização ativa é sempre a do seu cadastro.
 */
import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocalAuth } from "./LocalAuthContext";

const ACTIVE_ORG_KEY = "biz_active_org";

interface ActiveOrgContextValue {
  activeOrgId: number | null;
  setActiveOrgId: (orgId: number) => void;
  isSuperAdmin: boolean;
}

const ActiveOrgContext = createContext<ActiveOrgContextValue | null>(null);

export function ActiveOrgProvider({ children }: { children: React.ReactNode }) {
  const { user } = useLocalAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [activeOrgId, setActiveOrgIdState] = useState<number | null>(() => {
    if (!isSuperAdmin) return null;
    try {
      const stored = localStorage.getItem(ACTIVE_ORG_KEY);
      return stored ? parseInt(stored) : null;
    } catch {
      return null;
    }
  });

  // When user changes (login/logout), reset active org
  useEffect(() => {
    if (!user) {
      setActiveOrgIdState(null);
      return;
    }
    if (user.role !== "super_admin") {
      setActiveOrgIdState(user.organizationId);
      return;
    }
    // Super admin: restore from localStorage or use their default org
    try {
      const stored = localStorage.getItem(ACTIVE_ORG_KEY);
      if (stored) {
        setActiveOrgIdState(parseInt(stored));
      } else {
        setActiveOrgIdState(user.organizationId);
      }
    } catch {
      setActiveOrgIdState(user.organizationId);
    }
  }, [user]);

  const setActiveOrgId = (orgId: number) => {
    setActiveOrgIdState(orgId);
    if (isSuperAdmin) {
      try {
        localStorage.setItem(ACTIVE_ORG_KEY, String(orgId));
      } catch { /* ignore */ }
    }
  };

  return (
    <ActiveOrgContext.Provider value={{ activeOrgId, setActiveOrgId, isSuperAdmin }}>
      {children}
    </ActiveOrgContext.Provider>
  );
}

export function useActiveOrg() {
  const ctx = useContext(ActiveOrgContext);
  if (!ctx) throw new Error("useActiveOrg must be used inside ActiveOrgProvider");
  return ctx;
}
