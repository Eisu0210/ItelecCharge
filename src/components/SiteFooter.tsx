import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  SITE_ADDRESS_LINES,
  SITE_BRAND,
  SITE_CONTACT_EMAIL,
  SITE_LINKEDIN_URL,
} from "../lib/siteConfig";
import { SEO_LANDING_PAGES, landingPath } from "../content/seoLandings";
import "./site-footer.css";

const logoSrc = encodeURI("/Itelec charge transparent.png");

function FooterColumn(props: { title: string; children: ReactNode }) {
  return (
    <div className="site-footer-col">
      <h2 className="site-footer-col-title">{props.title}</h2>
      {props.children}
    </div>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer public-footer">
      <div className="site-footer-body">
        <div className="container">
          <div className="site-footer-intro">
            <Link to="/" className="site-footer-logo-link">
              <img src={logoSrc} alt={SITE_BRAND} className="site-footer-logo" width={180} height={44} />
            </Link>
            <p className="site-footer-lead">
              <strong>Bornes de recharge clé en main</strong> — installation, exploitation et maintenance
              pour entreprises, copropriétés et parkings semi-publics en Belgique.
            </p>
          </div>

          <div className="site-footer-grid">
            <FooterColumn title="Navigation">
              <ul className="site-footer-links">
                <li>
                  <Link to="/#offre">Offre</Link>
                </li>
                <li>
                  <Link to="/#parcours">Parcours</Link>
                </li>
                <li>
                  <Link to="/#frais-installation">Tarifs</Link>
                </li>
                <li>
                  <Link to="/installation-classique">Installation classique</Link>
                </li>
                <li>
                  <Link to="/faq">FAQ</Link>
                </li>
              </ul>
            </FooterColumn>

            <FooterColumn title="Solutions">
              <ul className="site-footer-links">
                {SEO_LANDING_PAGES.map((p) => (
                  <li key={p.slug}>
                    <Link to={landingPath(p.slug)}>{p.title}</Link>
                  </li>
                ))}
              </ul>
            </FooterColumn>

            <FooterColumn title="Contact">
              <ul className="site-footer-links">
                <li>
                  <Link to="/#contact-devis">Demander un devis</Link>
                </li>
                <li>
                  <a href={`mailto:${SITE_CONTACT_EMAIL}`}>{SITE_CONTACT_EMAIL}</a>
                </li>
                <li>
                  <Link to="/connexion">Espace professionnel</Link>
                </li>
                {SITE_LINKEDIN_URL ? (
                  <li>
                    <a href={SITE_LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
                      LinkedIn
                    </a>
                  </li>
                ) : null}
              </ul>
            </FooterColumn>

            <FooterColumn title="Le modèle Itelec">
              <div className="site-footer-about">
                <p>
                  Vous percevez le revenu des recharges ; nous prenons en charge l&apos;installation, la
                  maintenance et la plateforme.
                </p>
                <p style={{ marginBottom: 0 }}>
                  <Link to="/#offre" className="site-footer-cta">
                    Voir l&apos;offre
                  </Link>
                </p>
              </div>
            </FooterColumn>
          </div>
        </div>
      </div>

      <div className="site-footer-bar">
        <div className="container">
          <div className="site-footer-bar-inner">
            <nav className="site-footer-legal-nav" aria-label="Mentions légales">
              <Link to="/conditions-generales">Conditions générales</Link>
              <span className="site-footer-legal-sep" aria-hidden>
                ·
              </span>
              <Link to="/conditions-generales#donnees-personnelles">Données personnelles</Link>
              <span className="site-footer-legal-sep" aria-hidden>
                ·
              </span>
              <Link to="/#contact-devis">Contact</Link>
            </nav>
            <div className="site-footer-meta">
              <div className="site-footer-contact-line">
                <a href={`mailto:${SITE_CONTACT_EMAIL}`}>{SITE_CONTACT_EMAIL}</a>
              </div>
              <address className="site-footer-address">
                {SITE_ADDRESS_LINES.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </address>
            </div>
          </div>
          <p className="site-footer-copy">
            © {year} {SITE_BRAND}
          </p>
        </div>
      </div>
    </footer>
  );
}
