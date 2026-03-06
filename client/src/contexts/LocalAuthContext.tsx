/**
 * LocalAuthContext.tsx
 * Contexto de autenticação local para org_users (login por username/senha).
 * Independente do OAuth Manus — usa /api/local-auth/* endpoints.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface LocalUser {
  id: number;
  username: string;
  displayName: string | null;
  slot: number;
  role: "user" | "admin" | "super_admin";
  organizationId: number;
  lastSignedIn?: string;
}

interface LocalAuthState {
  user: LocalUser | null;
  loading: boolean;
  isAuthenticated: boolean;
}

interface LocalAuthContextValue extends LocalAuthState {
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const LocalAuthContext = createContext<LocalAuthContextValue | null>(null);

export function LocalAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LocalAuthState>({
    user: null,
    loading: true,
    isAuthenticated: false,
  });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/local-auth/me", { credentials: "include" });
      const data = await res.json() as { user: LocalUser | null };
      setState({
        user: data.user,
        loading: false,
        isAuthenticated: !!data.user,
      });
    } catch {
      setState({ user: null, loading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch("/api/local-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json() as { success?: boolean; error?: string; user?: LocalUser };
      if (data.success && data.user) {
        setState({ user: data.user, loading: false, isAuthenticated: true });
        return { success: true };
      }
      return { success: false, error: data.error ?? "Credenciais inválidas" };
    } catch {
      return { success: false, error: "Erro de conexão" };
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/local-auth/logout", { method: "POST", credentials: "include" });
    setState({ user: null, loading: false, isAuthenticated: false });
  }, []);

  return (
    <LocalAuthContext.Provider value={{ ...state, login, logout, refresh }}>
      {children}
    </LocalAuthContext.Provider>
  );
}

export function useLocalAuth() {
  const ctx = useContext(LocalAuthContext);
  if (!ctx) throw new Error("useLocalAuth must be used inside LocalAuthProvider");
  return ctx;
}
