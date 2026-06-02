import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, getToken, setToken } from "../lib/api";
import type { Role } from "../types";

export interface AuthUser {
  id: number;
  username: string;
  role: Role;
  /** Fiche technicien (`installateurs.id`), présent si rôle installateur. */
  installerId: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** true une fois la session (token) vérifiée côté API */
  ready: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const t = getToken();
      if (!t) {
        setReady(true);
        return;
      }
      try {
        const u = await apiFetch<{ id: number; username: string; role: Role; installerId?: string | null }>(
          "/api/auth/me"
        );
        setUser({
          id: u.id,
          username: u.username,
          role: u.role,
          installerId: u.installerId ?? (u.role === "installateur" ? `tech-u${u.id}` : null),
        });
      } catch {
        setToken(null);
        setUser(null);
        localStorage.removeItem("itelec_charge_session");
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    function onUnauthorized() {
      setUser(null);
    }
    window.addEventListener("itelec:unauthorized", onUnauthorized);
    return () => window.removeEventListener("itelec:unauthorized", onUnauthorized);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const base = import.meta.env.VITE_API_BASE ?? "";
    let res: Response;
    try {
      res = await fetch(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
    } catch {
      throw new Error("network");
    }
    if (!res.ok) {
      if (res.status >= 500) throw new Error("server");
      return false;
    }
    const r = (await res.json()) as { token: string; user: AuthUser };
    setToken(r.token);
    const u = r.user;
    setUser({
      ...u,
      installerId:
        u.installerId ?? (u.role === "installateur" ? `tech-u${u.id}` : null),
    });
    localStorage.removeItem("itelec_charge_session");
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("itelec_charge_session");
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, logout }),
    [user, ready, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
