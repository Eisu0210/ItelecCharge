import type { CSSProperties } from "react";
import { useLayoutEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { DevisContactForm } from "../components/DevisContactForm";
import { SeoHead } from "../components/SeoHead";
import { SEO_LANDING_PAGES, landingPath } from "../content/seoLandings";
import { HOME_HASH_SECTION_IDS } from "../lib/publicNav";
import { HOME_SEO } from "../lib/seo";

const partnerLogos = [
  { src: encodeURI("/Itelec charge transparent.png"), alt: "ITELEC CHARGE" },
  { src: "/home-logos/Hager.png", alt: "Hager" },
  { src: "/home-logos/Rexel.png", alt: "Rexel" },
];

/** Nombre de répétitions du bloc logos : la piste doit dépasser la largeur de l’écran pour éviter les zones vides. */
const LOGO_MARQUEE_SEGMENTS = 12;

const steps = [
  {
    title: "Prise de contact & devis",
    desc: "Votre commercial analyse le site, répond à vos questions et vous transmet une proposition claire.",
  },
  {
    title: "Signature du devis",
    desc: "Validation des travaux, du planning et des conditions financières avant lancement de l’installation.",
  },
  {
    title: "Installation",
    desc: "Pose par nos techniciens certifiés : câblage, raccordement, mise aux normes et tests de sécurité.",
  },
  {
    title: "Mise en route",
    desc: "Configuration, formation rapide à l’exploitation et suivi pour que la borne génère du revenu.",
  },
];

export function HomePage() {
  const location = useLocation();

  useLayoutEffect(() => {
    if (location.pathname !== "/") return;
    const sectionId = location.hash.replace(/^#/, "").trim();
    if (!sectionId || !HOME_HASH_SECTION_IDS.has(sectionId)) return;

    const scroll = () =>
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });

    scroll();
    queueMicrotask(scroll);
    requestAnimationFrame(() => requestAnimationFrame(scroll));
    const timer = window.setTimeout(scroll, 150);

    return () => window.clearTimeout(timer);
  }, [location.pathname, location.hash]);

  return (
    <>
      <SeoHead {...HOME_SEO} />
      <section
        style={{
          background: "linear-gradient(135deg, #003358 0%, #004a6e 48%, #006837 100%)",
          color: "#fff",
          padding: "clamp(2rem, 6vw, 3.5rem) 0 clamp(2.5rem, 7vw, 4rem)",
        }}
      >
        <div className="container">
          <p
            style={{
              margin: "0 0 0.5rem",
              letterSpacing: "0.08em",
              fontSize: "0.8rem",
              textTransform: "uppercase",
              opacity: 0.9,
            }}
          >
            Installation de bornes de recharge
          </p>
          <h1 style={{ color: "#fff", fontSize: "clamp(1.85rem, 4vw, 2.75rem)", maxWidth: "34ch" }}>
            Transformez votre parking en{" "}
            <span style={{ color: "var(--color-yellow)" }}>source de revenus</span>, sans la complexité
            opérationnelle.
          </h1>
          <p style={{ fontSize: "1.1rem", maxWidth: "52ch", opacity: 0.95 }}>
            PME, syndics, parkings de magasins, sites semi-publics : nous installons et exploitons la
            solution pour vous. Vous conservez la part nette des recharges après commission et
            abonnement.
          </p>
          <div style={{ marginTop: "1.75rem" }}>
            <a href="/#contact-devis" className="btn btn-accent">
              Demander un devis
            </a>
          </div>
        </div>
      </section>

      <section aria-label="Partenaires" className="home-logo-strip">
        <div className="home-logo-marquee">
          <div
            className="home-logo-track"
            style={
              {
                ["--home-logo-marquee-segments" as string]: String(LOGO_MARQUEE_SEGMENTS),
              } as CSSProperties
            }
          >
            {Array.from({ length: LOGO_MARQUEE_SEGMENTS }, (_, dup) => (
              <div className="home-logo-segment" key={dup} aria-hidden={dup !== 0}>
                {partnerLogos.map((logo, i) => (
                  <div className="home-logo-item" key={`${dup}-${i}`}>
                    <img src={logo.src} alt={dup === 0 ? logo.alt : ""} loading="eager" decoding="async" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="offre" className="vitrine-section-alt" style={{ padding: "3rem 0" }}>
        <div className="container">
          <h2>Pourquoi équiper votre parking ?</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1.25rem",
              marginTop: "1.5rem",
            }}
          >
            {[
              {
                t: "Attirez plus de clients",
                d: "Les conducteurs électriques privilégient les lieux équipés de recharge fiable.",
              },
              {
                t: "Revenu récurrent",
                d: "Chaque session de recharge peut contribuer à un flux complémentaire, sans gestion du jour le jour.",
              },
              {
                t: "Image moderne",
                d: "Un service visible et utile qui différencie votre commerce, votre immeuble ou votre zone d’activité.",
              },
            ].map((c) => (
              <div key={c.t} className="card">
                <h3 style={{ marginTop: 0 }}>{c.t}</h3>
                <p style={{ marginBottom: 0, color: "var(--color-muted)" }}>{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: "var(--surface)", borderBlock: "1px solid var(--color-border)" }}>
        <div className="container" style={{ padding: "2.5rem 0" }}>
          <div
            className="card"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ maxWidth: "70ch" }}>
              <h2 style={{ marginTop: 0 }}>Vous voulez une installation “classique” ?</h2>
              <p style={{ marginBottom: 0, color: "var(--color-muted)" }}>
                Pose sur devis, sans abonnement — particuliers ou entreprises qui ne passent pas par l’offre{" "}
                <strong>abonnement + CPO</strong>.
              </p>
            </div>
            <Link to="/installation-classique" className="btn btn-primary" style={{ textDecoration: "none" }}>
              Découvrir l’offre
            </Link>
          </div>
        </div>
      </section>

      <section style={{ background: "var(--surface)", borderBlock: "1px solid var(--color-border)" }}>
        <div className="container" style={{ padding: "3rem 0" }}>
          <h2 id="abonnement">Abonnement & revenu net</h2>
          <p style={{ maxWidth: "65ch", color: "var(--color-muted)" }}>
            Selon notre brochure commerciale, votre revenu mensuel correspond à{" "}
            <strong>100&nbsp;% des recharges</strong>, moins une <strong>commission de 12&nbsp;%</strong> et
            l’<strong>abonnement de gestion</strong>. La recharge finance sa consommation ; maintenance et
            exploitation sont incluses dans l’offre.
          </p>
          <div className="card" style={{ marginTop: "1.5rem", maxWidth: 560 }}>
            <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--color-muted)" }}>
              <li>
                <strong style={{ color: "var(--color-navy)" }}>59&nbsp;€/mois</strong> pendant{" "}
                <strong>48 mois</strong> (4 ans)
              </li>
              <li>
                puis <strong style={{ color: "var(--color-navy)" }}>35&nbsp;€/mois</strong> pour le reste de
                la durée du contrat
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section
        id="parcours"
        className="vitrine-section-alt"
        style={{ padding: "clamp(2rem, 5vw, 3rem) 0" }}
      >
        <div className="container">
          <h2>Ordre de l’installation</h2>
          <ol style={{ listStyle: "none", padding: 0, margin: "1.5rem 0 0", display: "grid", gap: "1rem" }}>
            {steps.map((s, i) => (
              <li
                key={s.title}
                className="card"
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: "1rem",
                  alignItems: "start",
                }}
              >
                <span className="badge" style={{ fontSize: "1rem", padding: "0.35rem 0.65rem" }}>
                  {i + 1}
                </span>
                <div>
                  <h3 style={{ margin: "0 0 0.35rem" }}>{s.title}</h3>
                  <p style={{ margin: 0, color: "var(--color-muted)" }}>{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="frais-installation"
        style={{ background: "var(--surface)", borderBlock: "1px solid var(--color-border)" }}
      >
        <div className="container" style={{ padding: "3rem 0" }}>
          <h2>Frais d’installation (HTVA)</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.25rem",
              marginTop: "1.5rem",
            }}
          >
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Installation murale</h3>
              <p style={{ fontSize: "2rem", fontWeight: 800, color: "var(--color-green)", margin: "0.25rem 0" }}>
                1&nbsp;600&nbsp;€
              </p>
              <p style={{ color: "var(--color-muted)", marginBottom: 0 }}>
                Pose de la borne, 10&nbsp;m de câble inclus, jusqu’à 2&nbsp;m de tranchée.
              </p>
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Installation sur pied</h3>
              <p style={{ fontSize: "2rem", fontWeight: 800, color: "var(--color-green)", margin: "0.25rem 0" }}>
                2&nbsp;000&nbsp;€
              </p>
              <p style={{ color: "var(--color-muted)", marginBottom: 0 }}>
                Support et semelle, 10&nbsp;m de câble inclus, jusqu’à 2&nbsp;m de tranchée.
              </p>
            </div>
          </div>
          <div className="card" style={{ marginTop: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>Suppléments possibles</h3>
            <ul style={{ margin: 0, color: "var(--color-muted)" }}>
              <li>Câble supplémentaire : <strong>20&nbsp;€/m</strong></li>
              <li>Tranchée en terre plein : <strong>40&nbsp;€/m</strong></li>
              <li>Tranchée en béton (réfection comprise) : <strong>68&nbsp;€/m</strong></li>
            </ul>
          </div>
        </div>
      </section>

      <section id="expertises" className="vitrine-section-alt" style={{ padding: "2.5rem 0" }}>
        <div className="container">
          <h2>Solutions de recharge par profil</h2>
          <p style={{ maxWidth: "58ch", color: "var(--color-muted)" }}>
            Entreprises, copropriétés, commerces ou installation Hager Witty en Belgique : trouvez la page
            dédiée à votre projet de borne de recharge.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1rem",
              marginTop: "1.25rem",
            }}
          >
            {SEO_LANDING_PAGES.map((p) => (
              <Link
                key={p.slug}
                to={landingPath(p.slug)}
                className="card seo-topic-link"
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                <h3 style={{ marginTop: 0, fontSize: "1rem", color: "var(--color-navy)" }}>{p.title}</h3>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-muted)" }}>
                  {p.description.slice(0, 120)}…
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <DevisContactForm />
    </>
  );
}
