import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { Role } from "../types";
import { useAuth } from "../context/AuthContext";

export function RequireAuth({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: Role[];
}) {
  const { user, ready } = useAuth();
  if (!ready) {
    return (
      <div className="container" style={{ padding: "2rem" }}>
        <p>Chargement de la session…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/connexion" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
}
