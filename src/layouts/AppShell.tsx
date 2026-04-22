import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links: Record<string, { to: string; label: string }[]> = {
  admin: [
    { to: "/app", label: "Vue d’ensemble" },
    { to: "/app/dispatch", label: "Dispatch" },
    { to: "/app/timeline", label: "Timeline" },
  ],
  commercial: [
    { to: "/app", label: "Tableau de bord" },
    { to: "/app/docs", label: "Documentation" },
  ],
  installateur: [{ to: "/app", label: "Planning & chantiers" }],
  dispatch: [
    { to: "/app", label: "Dispatch" },
    { to: "/app/timeline", label: "Vue timeline" },
  ],
};

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const nav = links[user.role] ?? [];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          background: "var(--color-navy)",
          color: "#fff",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
            padding: "0.65rem 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link to="/app" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <img src="/logo-itelec-charge.png" alt="" style={{ height: 40 }} />
            </Link>
            <span style={{ opacity: 0.85, fontSize: "0.9rem" }}>
              Connecté : <strong>{user.username}</strong> ({user.role})
            </span>
          </div>
          <nav style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            {nav.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                style={{ color: "#e8f4ff", textDecoration: "none", fontWeight: 600 }}
              >
                {l.label}
              </Link>
            ))}
            <Link to="/" style={{ color: "#c8d5e0" }}>
              Site vitrine
            </Link>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ color: "#fff", borderColor: "rgba(255,255,255,0.35)" }}
              onClick={() => {
                logout();
                navigate("/connexion", { replace: true });
              }}
            >
              Déconnexion
            </button>
          </nav>
        </div>
      </header>
      <div style={{ flex: 1, padding: "1.5rem 0 2.5rem" }}>
        <div className="container">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
