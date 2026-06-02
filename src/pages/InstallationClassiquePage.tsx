import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { DevisContactForm } from "../components/DevisContactForm";
import { SeoHead } from "../components/SeoHead";
import { buildPageTitle, breadcrumbJsonLd, organizationJsonLd, serviceJsonLd } from "../lib/seo";

const partnerLogos = [
  { src: encodeURI("/Itelec charge transparent.png"), alt: "ITELEC CHARGE" },
  { src: "/home-logos/Hager.png", alt: "Hager" },
  { src: "/home-logos/Rexel.png", alt: "Rexel" },
];

const LOGO_MARQUEE_SEGMENTS = 12;

const steps = [
  {
    title: "Échange & devis",
    desc: "Vous nous présentez le site et l’usage ; nous revenons vers vous avec une proposition chiffrée, claire et sans engagement.",
  },
  {
    title: "Planification",
    desc: "Après accord sur le devis, nous fixons ensemble une date d’intervention qui respecte votre calendrier.",
  },
  {
    title: "Installation",
    desc: "Nos équipes réalisent la pose, le câblage jusqu’au tableau, les protections et les contrôles de mise en conformité.",
  },
  {
    title: "Remise des clés",
    desc: "Essais de charge, explication des réglages utiles au quotidien : vous démarrez en toute sérénité.",
  },
];

const borneGamme = [
  {
    titre: "witty+",
    sousTitre: "Maison & petit tertiaire",
    texte:
      "Borne connectée Hager, pensée pour une utilisation simple au quotidien. Installation murale ou sur pied selon votre emplacement : nous la dimensionnons en cohérence avec votre tableau et votre besoin réel de recharge.",
  },
  {
    titre: "witty pro",
    sousTitre: "Sites pros & parkings d’entreprise",
    texte:
      "Solution robuste sur pied, adaptée aux parkings professionnels et aux usages plus soutenus. Nous l’intégrons dans votre infrastructure électrique avec le même souci de fiabilité que sur nos chantiers à forte exigence.",
  },
  {
    titre: "witty park",
    sousTitre: "Parkings structurés",
    texte:
      "Totem double charge pour les flux importants : deux points de charge sur une même colonne, lisibilité et confort d’usage pour entreprises ou sites recevant beaucoup de véhicules. Idéal lorsque le projet le justifie.",
  },
];

const pitchPoints = [
  {
    title: "Particuliers et entreprises",
    text: "Même exigence de qualité, adaptation à votre site (maison, parking pro, totem).",
  },
  {
    title: "Budget clair",
    text: "Travaux et matériel facturés au devis ; ensuite, seule votre consommation d’électricité habituelle.",
  },
  {
    title: "Installation dimensionnée au besoin",
    text: "Étude de faisabilité, choix de la borne et du raccordement au tableau, sans surdimensionnement inutile.",
  },
  {
    title: "Bornes Hager witty+, witty pro ou witty park",
    text: "Le modèle retenu est explicité sur le devis selon le projet.",
  },
  {
    title: "Prix sur devis",
    text: "Chaque poste est listé et chiffré avant signature.",
  },
];

export function InstallationClassiquePage() {
  const path = "/installation-classique";
  const description =
    "Installation de borne de recharge sur devis, sans abonnement : particuliers et entreprises. Pose Hager Witty+, Witty Pro ou Witty Park par ITELEC CHARGE en Belgique.";
  return (
    <>
      <SeoHead
        title={buildPageTitle("Installation classique de borne de recharge — sur devis")}
        description={description}
        path={path}
        keywords={[
          "installation borne recharge devis",
          "pose wallbox sans abonnement",
          "installateur borne particulier entreprise",
          "Hager Witty installation forfait",
        ]}
        jsonLd={[
          serviceJsonLd(
            "Installation classique de borne de recharge",
            description,
            path
          ),
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Installation classique", path },
          ]),
          organizationJsonLd(),
        ]}
      />
      <section
        style={{
          background: "linear-gradient(135deg, #003358 0%, #004a6e 50%, #006837 100%)",
          color: "#fff",
          padding: "3.25rem 0 3.5rem",
        }}
      >
        <div className="container">
          <p
            style={{
              margin: "0 0 0.5rem",
              letterSpacing: "0.1em",
              fontSize: "0.78rem",
              textTransform: "uppercase",
              opacity: 0.92,
            }}
          >
            Installation classique Hager
          </p>
          <h1 style={{ color: "#fff", fontSize: "clamp(1.9rem, 4.2vw, 2.65rem)", maxWidth: "44ch", lineHeight: 1.2 }}>
            Rechargez chez vous ou sur votre site —{" "}
            <span style={{ color: "var(--color-yellow)" }}>installation étudiée pour votre projet</span>.
          </h1>
          <p
            style={{
              fontSize: "1.08rem",
              maxWidth: "58ch",
              opacity: 0.94,
              marginTop: "1rem",
              marginBottom: 0,
              lineHeight: 1.55,
            }}
          >
            <strong>Particuliers</strong> et <strong>entreprises</strong> : bornes <strong>Hager witty+</strong>,{" "}
            <strong>witty pro</strong> ou <strong>witty park</strong>, adaptées à votre site et{" "}
            <strong>chiffrées sur devis</strong>. Une formule avec exploitation et revenus est présentée sur notre{" "}
            <Link to="/" style={{ color: "var(--color-yellow)", textDecoration: "underline", fontWeight: 600 }}>
              page d’accueil
            </Link>
            .
          </p>
          <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", marginTop: "1.65rem" }}>
            <a href="/installation-classique#contact-devis" className="btn btn-accent">
              Demander un devis
            </a>
            <Link
              to="/"
              className="btn btn-ghost"
              style={{
                textDecoration: "none",
                background: "rgba(255,255,255,0.14)",
                color: "#fff",
                borderColor: "rgba(255,255,255,0.38)",
              }}
            >
              Offre exploitation & revenus
            </Link>
          </div>
          <p style={{ fontSize: "0.88rem", opacity: 0.88, marginTop: "1.15rem", marginBottom: 0 }}>
            Devis gratuit · Sans engagement · Conseil personnalisé
          </p>
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

      <section id="offre-classique" className="vitrine-section-alt" style={{ padding: "2.5rem 0 1.5rem" }}>
        <div className="container">
        <h2 style={{ marginTop: 0, fontSize: "clamp(1.35rem, 2.5vw, 1.6rem)" }}>Ce que vous signez avec nous</h2>
        <ul
          style={{
            margin: "1rem 0 0",
            paddingLeft: "1.2rem",
            maxWidth: "62ch",
            color: "var(--color-muted)",
            lineHeight: 1.65,
            fontSize: "1.02rem",
          }}
        >
          {pitchPoints.map((item) => (
            <li key={item.title} style={{ marginBottom: "0.5rem" }}>
              <strong style={{ color: "var(--color-navy)" }}>{item.title}</strong> : {item.text}
            </li>
          ))}
        </ul>
        </div>
      </section>

      <section style={{ background: "var(--surface)", borderBlock: "1px solid var(--color-border)" }}>
        <div className="container" style={{ padding: "2.75rem 0" }}>
          <h2 style={{ marginTop: 0, fontSize: "clamp(1.35rem, 2.5vw, 1.6rem)" }}>La gamme que nous positionnons</h2>
          <p style={{ margin: "0.5rem 0 0", color: "var(--color-muted)", maxWidth: "68ch", lineHeight: 1.55 }}>
            Trois réponses Hager aux usages les plus fréquents en installation « classique ». Nous vous orientons vers la
            borne adaptée après analyse de votre site — le détail matériel figure toujours sur votre proposition
            commerciale.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1.15rem",
              marginTop: "1.5rem",
            }}
          >
            {borneGamme.map((b) => (
              <div key={b.titre} className="card" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <p style={{ margin: 0, fontSize: "0.8rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-muted)" }}>
                  Hager
                </p>
                <h3 style={{ margin: "0.25rem 0 0.35rem", fontSize: "1.35rem" }}>{b.titre}</h3>
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.9rem", color: "var(--color-green)", fontWeight: 600 }}>
                  {b.sousTitre}
                </p>
                <p style={{ margin: 0, color: "var(--color-muted)", lineHeight: 1.55, flex: 1 }}>{b.texte}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "2.25rem", maxWidth: "920px", marginLeft: "auto", marginRight: "auto" }}>
            <figure
              style={{
                margin: 0,
                background: "#fff",
                borderRadius: "12px",
                padding: "0.75rem",
                border: "1px solid var(--color-border)",
                boxShadow: "var(--shadow)",
              }}
            >
              <div style={{ borderRadius: "8px", overflow: "hidden", lineHeight: 0 }}>
                <img
                  src="/home-logos/hager-witty-famille.png"
                  alt="Famille de bornes Hager witty : witty murale, witty+ sur pied, witty pro sur pied, witty park totem."
                  width={1440}
                  height={720}
                  loading="lazy"
                  decoding="async"
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
              <figcaption
                style={{
                  marginTop: "0.65rem",
                  textAlign: "center",
                  fontSize: "0.82rem",
                  color: "var(--color-muted)",
                  lineHeight: 1.45,
                }}
              >
                Visuel promotionnel Hager — illustration non contractuelle des finitions sur site.
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="vitrine-section-alt" style={{ padding: "2.75rem 0" }}>
        <div className="container">
        <h2 style={{ marginTop: 0, fontSize: "clamp(1.35rem, 2.5vw, 1.6rem)" }}>Comment avance votre projet</h2>
        <ol style={{ listStyle: "none", padding: 0, margin: "1.15rem 0 0", display: "grid", gap: "0.85rem" }}>
          {steps.map((s, i) => (
            <li
              key={s.title}
              className="card"
              style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "1rem", alignItems: "start" }}
            >
              <span className="badge" style={{ fontSize: "0.95rem", padding: "0.35rem 0.6rem" }}>
                {i + 1}
              </span>
              <div>
                <h3 style={{ margin: "0 0 0.35rem", fontSize: "1.08rem" }}>{s.title}</h3>
                <p style={{ margin: 0, color: "var(--color-muted)", lineHeight: 1.55 }}>{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
        </div>
      </section>

      <section
        id="frais-installation-classique"
        style={{ background: "var(--surface)", borderBlock: "1px solid var(--color-border)" }}
      >
        <div className="container" style={{ padding: "2.75rem 0" }}>
          <h2 style={{ marginTop: 0, fontSize: "clamp(1.35rem, 2.5vw, 1.6rem)" }}>Tarification sur devis</h2>
          <p style={{ maxWidth: "58ch", color: "var(--color-muted)", marginTop: "0.5rem", lineHeight: 1.55 }}>
            Chaque site est différent : distance au tableau, chemin de câbles, adaptations électriques et modèle de borne
            font varier le budget. Nous vous remettons un <strong>devis gratuit</strong>, structuré pour que vous puissiez
            décider en toute transparence.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
              gap: "1.1rem",
              marginTop: "1.25rem",
            }}
          >
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Principaux critères de chiffrage</h3>
              <ul style={{ margin: 0, paddingLeft: "1.15rem", color: "var(--color-muted)", lineHeight: 1.55 }}>
                <li>Modèle retenu (witty+, witty pro, witty park)</li>
                <li>Puissance et alimentation disponible</li>
                <li>Longueur et complexité du chemin de câble</li>
                <li>Travaux éventuels sur le tableau</li>
              </ul>
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Écrivez-nous</h3>
              <p style={{ color: "var(--color-muted)", marginTop: 0, lineHeight: 1.55 }}>
                Commune, type de site, nombre d’emplacements envisagés, photos si vous en avez : nous revenons vers vous
                après analyse.
              </p>
              <a href="/installation-classique#contact-devis" className="btn btn-primary" style={{ marginTop: "0.5rem" }}>
                Accéder au formulaire
              </a>
            </div>
          </div>
        </div>
      </section>

      <DevisContactForm />
    </>
  );
}
