"use client";

/**
 * Client-side auth context. Fetches `/api/auth/me` once on mount and exposes
 * the current user plus a `can()` helper that pages/components use to hide or
 * disable actions the user is not allowed to perform.
 *
 * This is a UX layer only — every mutation is independently enforced by the API
 * route guards. Hiding a button is not a security boundary.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AuthMe } from "@/lib/types";
import { ALL_PERMISSIONS, type Permission } from "./permissions";

interface AuthContextValue {
  user: AuthMe | null;
  loading: boolean;
  can: (permission: Permission) => boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthMe | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { headers: { "Content-Type": "application/json" } });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = (await res.json()) as { user: AuthMe };
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const permissionSet = useMemo(() => new Set(user?.permissions ?? []), [user]);

  const can = useCallback(
    (permission: Permission) => permissionSet.has(ALL_PERMISSIONS) || permissionSet.has(permission),
    [permissionSet]
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, can, refresh, logout }),
    [user, loading, can, refresh, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
