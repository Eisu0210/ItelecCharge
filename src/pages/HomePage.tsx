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
  return (
    <>
      <section
        style={{
          background:
            "linear-gradient(135deg, #003358 0%, #004d73 45%, #006837 100%)",
          color: "#fff",
          padding: "3.5rem 0 4rem",
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
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1.75rem" }}>
            <a href="/#contact-devis" className="btn btn-accent">
              Demander un devis
            </a>
            <a href="/connexion" className="btn btn-ghost" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", borderColor: "rgba(255,255,255,0.35)" }}>
              Accès équipes
            </a>
          </div>
        </div>
      </section>

      <section id="offre" className="container" style={{ padding: "3rem 0" }}>
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
      </section>

      <section
        style={{ background: "var(--surface)", borderBlock: "1px solid var(--color-border)" }}
      >
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

      <section id="parcours" className="container" style={{ padding: "3rem 0" }}>
        <h2>Ordre de l’installation</h2>
        <ol style={{ listStyle: "none", padding: 0, margin: "1.5rem 0 0", display: "grid", gap: "1rem" }}>
          {steps.map((s, i) => (
            <li
              key={s.title}
              className="card"
              style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "1rem", alignItems: "start" }}
            >
              <span
                className="badge badge-yellow"
                style={{ fontSize: "1rem", padding: "0.35rem 0.65rem" }}
              >
                {i + 1}
              </span>
              <div>
                <h3 style={{ margin: "0 0 0.35rem" }}>{s.title}</h3>
                <p style={{ margin: 0, color: "var(--color-muted)" }}>{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section
        id="tarifs"
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

      <section id="contact-devis" className="container" style={{ padding: "3rem 0 4rem" }}>
        <div className="card" style={{ maxWidth: 640 }}>
          <h2 style={{ marginTop: 0 }}>Parlez-nous de votre projet</h2>
          <p style={{ color: "var(--color-muted)" }}>
            La demande commerciale détaillée se fait dans l’espace connecté (rôle commercial). Ici, vous
            pouvez contacter nos équipes pour une première orientation.
          </p>
          <p style={{ marginBottom: 0 }}>
            <a className="btn btn-primary" href="/connexion">
              Demander un devis via l’espace pro
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
