import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import type { Role } from "../types";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { getProTheme, setProTheme, type ProTheme } from "../lib/proTheme";
import "./admin-shell.css";
import "./admin-shell-dark.css";
import "./app-page.css";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrateur",
  commercial: "Commercial",
  installateur: "Technicien",
  dispatch: "Dispatch",
  site_survey: "Site survey",
};

function homePathForRole(role: Role): string {
  switch (role) {
    case "commercial":
      return "/app";
    case "installateur":
      return "/app/planning";
    case "dispatch":
      return "/app/tech";
    case "site_survey":
      return "/app/clients";
    default:
      return "/app/admin";
  }
}

function IconTech() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconPlanning() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconClients() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconCommerciaux() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconDoc() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconTrend() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function IconSales() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function IconSurvey() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconCatalog() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 12l9 4 9-4" />
      <path d="M3 17l9 4 9-4" />
    </svg>
  );
}

function IconStock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function IconFleet() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 16H9m10 0h1a1 1 0 0 0 1-1v-2.34a1 1 0 0 0-.24-.64L19 10.5V6a1 1 0 0 0-1-1h-3M4 16H3a1 1 0 0 1-1-1v-2.34a1 1 0 0 1 .24-.64L5 10.5V6a1 1 0 0 1 1-1h3m0 11v2a1 1 0 0 0 1 1h1m8-3v2a1 1 0 0 0 1 1h1M7 15h10M7 5h4" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="16.5" cy="17.5" r="1.5" />
    </svg>
  );
}

function IconRoi() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="10" y2="10" />
      <line x1="14" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="10" y2="14" />
      <line x1="14" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="16" y2="18" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

type NavItem = {
  to: string;
  label: string;
  Icon: ComponentType;
  end?: boolean;
};

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  admin: [
    { to: "/app/admin", label: "Vue globale", Icon: IconTrend, end: true },
    { to: "/app/tech", label: "Techniciens", Icon: IconTech },
    { to: "/app/planning", label: "Planning tech", Icon: IconPlanning },
    { to: "/app/planning-site-survey", label: "Planning site survey", Icon: IconSurvey },
    { to: "/app/site-survey", label: "Site survey", Icon: IconSurvey },
    { to: "/app/clients", label: "Clients", Icon: IconClients },
    { to: "/app/catalogue-materiaux", label: "Catalogue matériaux", Icon: IconCatalog },
    { to: "/app/stock-techniciens", label: "Stock techniciens", Icon: IconStock },
    { to: "/app/flotte-vehicules", label: "Flotte véhicules", Icon: IconFleet },
    { to: "/app/docs", label: "Doc commerciale", Icon: IconDoc },
    { to: "/app/commerciaux", label: "Commerciaux", Icon: IconCommerciaux },
    { to: "/app/utilisateurs", label: "Utilisateurs", Icon: IconUsers },
  ],
  commercial: [
    { to: "/app", label: "Statut vente (perso)", Icon: IconTrend, end: true },
    { to: "/app/simulateur-roi", label: "Simulateur ROI", Icon: IconRoi },
    { to: "/app/docs", label: "Documentation", Icon: IconDoc },
  ],
  installateur: [
    { to: "/app/planning", label: "Planning (perso)", Icon: IconPlanning },
    { to: "/app/clients", label: "Clients & dossiers", Icon: IconClients },
    { to: "/app/stock", label: "Stock camionnette", Icon: IconStock },
    { to: "/app/docs", label: "Doc commerciale", Icon: IconDoc },
    { to: "/app/ventes", label: "Ventes", Icon: IconSales },
    { to: "/app/docs-technique", label: "Doc technique", Icon: IconDoc },
    { to: "/app/site-survey", label: "Site survey", Icon: IconSurvey },
  ],
  dispatch: [
    { to: "/app/tech", label: "Techniciens", Icon: IconTech },
    { to: "/app/planning", label: "Planning tech", Icon: IconPlanning },
    { to: "/app/clients", label: "Clients", Icon: IconClients },
    { to: "/app/catalogue-materiaux", label: "Catalogue matériaux", Icon: IconCatalog },
    { to: "/app/stock-techniciens", label: "Stock techniciens", Icon: IconStock },
    { to: "/app/flotte-vehicules", label: "Flotte véhicules", Icon: IconFleet },
    { to: "/app/docs", label: "Doc commerciale", Icon: IconDoc },
  ],
  site_survey: [
    { to: "/app/clients", label: "Clients", Icon: IconClients },
    { to: "/app/planning-site-survey", label: "Planning site survey", Icon: IconSurvey },
    { to: "/app/site-survey", label: "Site survey", Icon: IconSurvey },
    { to: "/app/docs", label: "Doc commerciale", Icon: IconDoc },
  ],
};

function navClass(isActive: boolean) {
  return isActive ? "admin-shell-nav-link admin-shell-nav-active" : "admin-shell-nav-link";
}

export function AppShell() {
  const { user, logout } = useAuth();
  const { loading, error } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [proTheme, setProThemeState] = useState<ProTheme>(() => getProTheme());

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!navOpen || typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 901px)").matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  if (!user) return null;

  const initial = (user.username.trim()[0] ?? "?").toUpperCase();
  const nav = NAV_BY_ROLE[user.role];
  const home = homePathForRole(user.role);

  const shellClass = proTheme === "dark" ? "admin-shell admin-shell--dark" : "admin-shell";

  function handleThemeToggle() {
    const next: ProTheme = proTheme === "dark" ? "light" : "dark";
    setProTheme(next);
    setProThemeState(next);
  }

  return (
    <div className={shellClass}>
      {navOpen ? (
        <button
          type="button"
          className="admin-shell-backdrop"
          aria-label="Fermer le menu"
          onClick={() => setNavOpen(false)}
        />
      ) : null}
      <aside className={`admin-shell-sidebar${navOpen ? " admin-shell-sidebar-open" : ""}`}>
        <div className="admin-shell-brand">
          <Link to={home}>
            <img src={encodeURI("/Itelec charge transparent.png")} alt="" />
            <span>ITELEC CHARGE</span>
          </Link>
        </div>

        <nav id="admin-shell-sidebar-nav" className="admin-shell-nav" aria-label="Navigation principale">
          {nav.map((item) => {
            const Icon = item.Icon;
            return (
              <NavLink
                key={item.to + item.label}
                to={item.to}
                end={item.end}
                className={({ isActive }) => navClass(isActive)}
              >
                <Icon />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="admin-shell-footer">
          <div className="admin-shell-user">
            <div className="admin-shell-avatar" aria-hidden>
              {initial}
            </div>
            <div className="admin-shell-user-meta">
              <strong title={user.username}>{user.username}</strong>
              <span>{ROLE_LABEL[user.role]}</span>
            </div>
            <button
              type="button"
              className="admin-shell-theme-toggle"
              onClick={handleThemeToggle}
              aria-pressed={proTheme === "dark"}
              aria-label={proTheme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
              title={proTheme === "dark" ? "Mode clair" : "Mode sombre"}
            >
              {proTheme === "dark" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </div>
          <Link className="admin-shell-site" to="/">
            ← Site vitrine
          </Link>
          <button
            type="button"
            className="admin-shell-logout"
            onClick={() => {
              logout();
              navigate("/connexion", { replace: true });
            }}
          >
            <IconLogout />
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="admin-shell-main">
        <div className="admin-shell-mobile-bar">
          <button
            type="button"
            className="admin-shell-menu-btn"
            aria-expanded={navOpen}
            aria-controls="admin-shell-sidebar-nav"
            aria-label={navOpen ? "Fermer le menu" : "Ouvrir le menu de navigation"}
            onClick={() => setNavOpen((v) => !v)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Link to={home} className="admin-shell-mobile-center" aria-label="Accueil application">
            <img
              src={encodeURI("/Itelec charge transparent.png")}
              alt="ITELEC CHARGE"
            />
          </Link>
          <div className="admin-shell-mobile-bar-sizer" aria-hidden />
        </div>
        <div className="container app-page">
          {error ? (
            <p
              className="card"
              style={{ color: "#c0392b", marginBottom: "1rem", padding: "0.75rem 1rem" }}
              role="alert"
            >
              Données : {error}
            </p>
          ) : null}
          {loading ? (
            <p style={{ color: "var(--color-muted)", marginBottom: "1rem" }}>Synchronisation avec la base…</p>
          ) : null}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
