import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { authApi, tokenStore, type Role, type UserOut } from "./api";

interface AuthContextValue {
  user: UserOut | null;
  loading: boolean;
  isAuthenticated: boolean;
  role: Role | null;
  refresh: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<UserOut>;
  register: (body: {
    name: string;
    email?: string | null;
    phone: string;
    password: string;
    role?: Role;
    phone_verification_token: string;
  }) => Promise<UserOut>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    const access = tokenStore.access;
    const refreshToken = tokenStore.refresh;
    if (!access && !refreshToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      // Session bootstrap: if access token is missing/expired but refresh exists,
      // mint a fresh access token before fetching profile.
      if (!access && refreshToken) {
        const tokens = await authApi.refresh(refreshToken);
        tokenStore.set(tokens.access_token, tokens.refresh_token);
      }
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

  const login = useCallback(async (identifier: string, password: string) => {
    const tokens = await authApi.login({ username: identifier, password });
    tokenStore.set(tokens.access_token, tokens.refresh_token);
    const me = await authApi.me();
    setUser(me);
    return me;
  }, []);

  const register = useCallback(
    async (body: {
      name: string;
      email?: string | null;
      phone: string;
      password: string;
      role?: Role;
      phone_verification_token: string;
    }) => {
      await authApi.register(body);
      // Backend register returns the created user (not tokens). Auto-login to preserve UX.
      const loginId = body.phone || (typeof body.email === "string" ? body.email.trim() : "");
      const tokens = await authApi.login({ username: loginId, password: body.password });
      tokenStore.set(tokens.access_token, tokens.refresh_token);
      const me = await authApi.me();
      setUser(me);
      return me;
    },
    [],
  );

  const logout = useCallback(async () => {
    const accessToken = tokenStore.access;
    tokenStore.clear();
    setUser(null);
    setLoading(false);
    try {
      // Best-effort server logout. UI state is already cleared to avoid stale auth rendering.
      if (accessToken) {
        await authApi.logout(accessToken);
      }
    } catch {
      /* ignore */
    }
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

