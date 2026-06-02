import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { useEffect, useLayoutEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { isHomeHashScrollTarget } from "../lib/publicNav";
import { SiteFooter } from "./SiteFooter";

const navTextLink: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  lineHeight: 1.2,
};

function scrollPageToTop(behavior: ScrollBehavior = "smooth") {
  window.scrollTo({ top: 0, left: 0, behavior });
}

/** Lien vers une page entière (haut de page), ex. accueil ou installation classique. */
function NavPageLink(props: {
  to: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onNavigate: () => void;
}) {
  const { to, children, className, style, onNavigate } = props;
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Link
      to={to}
      className={className}
      style={style}
      onClick={(e) => {
        onNavigate();
        if (location.pathname !== to) return;

        e.preventDefault();
        if (location.hash) {
          void navigate(to, { replace: true });
        }
        scrollPageToTop();
      }}
    >
      {children}
    </Link>
  );
}

/** Ancres page d’accueil — navigation SPA depuis la navbar ; scroll dans HomePage. */
function NavHomeSectionLink(props: {
  sectionId: string;
  children: ReactNode;
  style: CSSProperties;
  onNavigate: () => void;
}) {
  const { sectionId, children, style, onNavigate } = props;
  const navigate = useNavigate();
  const href = `/#${sectionId}`;

  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onNavigate();
        void navigate(href);
      }}
      style={{ ...style, cursor: "pointer" }}
    >
      {children}
    </a>
  );
}

export function PublicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);

  const isConnexion = location.pathname === "/connexion";

  function closeMobileNav() {
    setNavOpen(false);
    document.documentElement.classList.remove("public-nav-menu-open");
    document.body.style.removeProperty("overflow");
  }

  useLayoutEffect(() => {
    closeMobileNav();
  }, [location.pathname, location.hash]);

  useLayoutEffect(() => {
    if (isHomeHashScrollTarget(location.pathname, location.hash)) return;
    scrollPageToTop("auto");
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 820px)");
    const apply = () => {
      if (navOpen && mq.matches) {
        document.documentElement.classList.add("public-nav-menu-open");
      } else {
        document.documentElement.classList.remove("public-nav-menu-open");
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.documentElement.classList.remove("public-nav-menu-open");
      document.body.style.removeProperty("overflow");
    };
  }, [navOpen]);

  function handleLogoClick(e: MouseEvent<HTMLAnchorElement>) {
    if (location.pathname !== "/") return;
    e.preventDefault();
    if (location.hash) {
      void navigate("/", { replace: true });
    }
    scrollPageToTop();
  }

  function goConnexion(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    closeMobileNav();
    void navigate("/connexion");
  }

  return (
    <div className={isConnexion ? "public-layout public-layout--connexion" : "public-layout"}>
      {navOpen ? (
        <button
          type="button"
          className="public-nav-backdrop"
          aria-label="Fermer le menu"
          onClick={() => closeMobileNav()}
        />
      ) : null}
      <header className="public-header">
        <div className="container public-header-inner">
          <Link
            to="/"
            onClick={handleLogoClick}
            className="public-header-logo"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              textDecoration: "none",
              minWidth: 0,
            }}
          >
            <img
              src={encodeURI("/Itelec charge transparent.png")}
              alt="ITELEC CHARGE"
              style={{ height: 48, width: "auto", maxWidth: "100%", objectFit: "contain" }}
            />
          </Link>
          {!isConnexion ? (
            <Link to="/connexion" className="public-header-pro-link" onClick={goConnexion}>
              Espace pro
            </Link>
          ) : null}
          <button
            type="button"
            className="public-nav-toggle"
            aria-expanded={navOpen}
            aria-controls="public-main-nav"
            aria-label={navOpen ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setNavOpen((v) => !v)}
          >
            <span className="public-nav-toggle-bars" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </button>
          <nav
            id="public-main-nav"
            className={`public-nav${navOpen ? " public-nav--open" : ""}`}
          >
            <div className="public-nav-sheet-head">
              <span className="public-nav-sheet-title">Menu</span>
              <button
                type="button"
                className="public-nav-close"
                aria-label="Fermer le menu"
                onClick={() => closeMobileNav()}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="public-nav-scroller">
              <div className="public-nav-links-lead" aria-label="Offre avec abonnement">
                <NavPageLink
                  to="/"
                  className="public-nav-install-link"
                  style={navTextLink}
                  onNavigate={closeMobileNav}
                >
                  Bornes avec abonnement
                </NavPageLink>
              </div>
              <div className="public-nav-links-main" aria-label="Navigation offre clé en main">
                <NavHomeSectionLink sectionId="offre" style={navTextLink} onNavigate={closeMobileNav}>
                  Offre
                </NavHomeSectionLink>
                <NavHomeSectionLink sectionId="parcours" style={navTextLink} onNavigate={closeMobileNav}>
                  Parcours
                </NavHomeSectionLink>
                <NavHomeSectionLink
                  sectionId="frais-installation"
                  style={navTextLink}
                  onNavigate={closeMobileNav}
                >
                  Tarifs
                </NavHomeSectionLink>
                <Link to="/faq" style={navTextLink} onClick={() => closeMobileNav()}>
                  FAQ
                </Link>
              </div>
              <div className="public-nav-links-extra" aria-label="Installation au forfait">
                <NavPageLink
                  to="/installation-classique"
                  className="public-nav-install-link"
                  style={navTextLink}
                  onNavigate={closeMobileNav}
                >
                  Installation classique
                </NavPageLink>
              </div>
            </div>
            <div className="public-nav-cta-wrap">
              <Link
                to="/connexion"
                className="btn btn-primary public-nav-cta"
                style={{ textDecoration: "none" }}
                onClick={goConnexion}
              >
                Espace pro
              </Link>
            </div>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
