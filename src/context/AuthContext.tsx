import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Role } from "../types";

const DEMO_PASSWORD = "ItelecCharge";

export interface AuthUser {
  username: string;
  role: Role;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function roleFromUsername(u: string): Role | null {
  const n = u.trim().toLowerCase();
  if (n === "admin") return "admin";
  if (n === "commercial") return "commercial";
  if (n === "installateur") return "installateur";
  if (n === "dispatch") return "dispatch";
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem("itelec_charge_session");
      if (!raw) return null;
      const p = JSON.parse(raw) as AuthUser;
      if (p?.username && p?.role) return p;
    } catch {
      /* ignore */
    }
    return null;
  });

  const login = useCallback((username: string, password: string) => {
    const role = roleFromUsername(username);
    if (!role || password !== DEMO_PASSWORD) return false;
    const next: AuthUser = { username: username.trim(), role };
    setUser(next);
    localStorage.setItem("itelec_charge_session", JSON.stringify(next));
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("itelec_charge_session");
  }, []);

  const value = useMemo(
    () => ({ user, login, logout }),
    [user, login, logout]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
