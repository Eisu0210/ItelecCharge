import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { CommercialDashboard } from "./CommercialDashboard";

/** Point d’entrée `/app` : tableau de bord commercial ou redirection vers la 1re entrée du menu du rôle. */
export function AppHomeEntry() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "commercial") return <CommercialDashboard />;
  if (user.role === "admin") return <Navigate to="/app/admin" replace />;
  if (user.role === "dispatch") return <Navigate to="/app/tech" replace />;
  if (user.role === "installateur") return <Navigate to="/app/planning" replace />;
  if (user.role === "site_survey") return <Navigate to="/app/planning-site-survey" replace />;
  return null;
}
