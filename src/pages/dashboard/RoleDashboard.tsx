import { useAuth } from "../../context/AuthContext";
import { AdminDashboard } from "./AdminDashboard";
import { CommercialDashboard } from "./CommercialDashboard";
import { DispatchDashboard } from "./DispatchDashboard";
import { InstallateurDashboard } from "./InstallateurDashboard";

export function RoleDashboard() {
  const { user } = useAuth();
  switch (user!.role) {
    case "commercial":
      return <CommercialDashboard />;
    case "installateur":
      return <InstallateurDashboard />;
    case "dispatch":
      return <DispatchDashboard />;
    case "admin":
      return <AdminDashboard />;
    default:
      return null;
  }
}
