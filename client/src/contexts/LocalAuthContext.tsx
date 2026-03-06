/**
 * LocalAuthContext.tsx
 * Contexto de autenticação local para org_users (login por username/senha).
 * Usa localStorage para persistir o token JWT e Authorization header para enviar nas requisições.
 * Isso evita problemas com cookies cross-site em ambientes de preview/staging.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const TOKEN_KEY = "biz_local_token";

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
  token: string | null;
}

const LocalAuthContext = createContext<LocalAuthContextValue | null>(null);

function getStoredToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function setStoredToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
}

export function LocalAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [state, setState] = useState<LocalAuthState>({
    user: null,
    loading: true,
    isAuthenticated: false,
  });

  const refresh = useCallback(async () => {
    const t = getStoredToken();
    if (!t) {
      setState({ user: null, loading: false, isAuthenticated: false });
      return;
    }
    try {
      const res = await fetch("/api/local-auth/me", {
        headers: { "Authorization": `Bearer ${t}` },
      });
      const data = await res.json() as { user: LocalUser | null };
      if (data.user) {
        setState({ user: data.user, loading: false, isAuthenticated: true });
      } else {
        setStoredToken(null);
        setToken(null);
        setState({ user: null, loading: false, isAuthenticated: false });
      }
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
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json() as { success?: boolean; error?: string; user?: LocalUser; token?: string };
      if (data.success && data.user && data.token) {
        setStoredToken(data.token);
        setToken(data.token);
        setState({ user: data.user, loading: false, isAuthenticated: true });
        return { success: true };
      }
      return { success: false, error: data.error ?? "Credenciais inválidas" };
    } catch {
      return { success: false, error: "Erro de conexão" };
    }
  }, []);

  const logout = useCallback(async () => {
    const t = getStoredToken();
    if (t) {
      try {
        await fetch("/api/local-auth/logout", {
          method: "POST",
          headers: { "Authorization": `Bearer ${t}` },
        });
      } catch { /* ignore */ }
    }
    setStoredToken(null);
    setToken(null);
    setState({ user: null, loading: false, isAuthenticated: false });
  }, []);

  return (
    <LocalAuthContext.Provider value={{ ...state, login, logout, refresh, token }}>
      {children}
    </LocalAuthContext.Provider>
  );
}

export function useLocalAuth() {
  const ctx = useContext(LocalAuthContext);
  if (!ctx) throw new Error("useLocalAuth must be used inside LocalAuthProvider");
  return ctx;
}
