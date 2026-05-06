import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { authApi, tokenStore, type Role, type UserOut } from "./api";

interface AuthContextValue {
  user: UserOut | null;
  loading: boolean;
  isAuthenticated: boolean;
  role: Role | null;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<UserOut>;
  register: (body: { name: string; email: string; phone: string; password: string; role?: Role }) => Promise<UserOut>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    if (!tokenStore.access) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await authApi.me();
      setUser(me);
    } catch {
      tokenStore.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    // UI uses an "email" input; backend accepts either phone or email via `username`.
    const tokens = await authApi.login({ username: email, password });
    tokenStore.set(tokens.access_token, tokens.refresh_token);
    const me = await authApi.me();
    setUser(me);
    return me;
  }, []);

  const register = useCallback(
    async (body: { name: string; email: string; phone: string; password: string; role?: Role }) => {
      await authApi.register(body);
      // Backend register returns the created user (not tokens). Auto-login to preserve UX.
      const tokens = await authApi.login({ username: body.phone || body.email, password: body.password });
      tokenStore.set(tokens.access_token, tokens.refresh_token);
      const me = await authApi.me();
      setUser(me);
      return me;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      role: user?.role ?? null,
      refresh,
      login,
      register,
      logout,
    }),
    [user, loading, refresh, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function landingForRole(role: Role | null): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "shop_owner":
      return "/owner";
    case "customer":
    default:
      return "/orders";
  }
}
