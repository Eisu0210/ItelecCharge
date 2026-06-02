import { Link } from "react-router-dom";
import { SeoHead } from "../components/SeoHead";
import { CGV_DOCUMENT_TITLE, ITELEC_CGV_SECTIONS } from "../content/itelecCgv";
import { buildPageTitle } from "../lib/seo";

export function PublicConditionsPage() {
  return (
    <>
      <SeoHead
        title={buildPageTitle("Conditions générales")}
        description="Conditions générales de prestation et d'exploitation ITELEC CHARGE — bornes de recharge."
        path="/conditions-generales"
      />
    <div className="devis-signer-page" style={{ background: "#f4f7fa" }}>
      <article
        className="devis-signer-card"
        style={{
          maxWidth: 720,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 12,
          padding: "clamp(1rem, 4vw, 1.75rem) clamp(1rem, 5vw, 2rem)",
          border: "1px solid var(--color-border)",
          fontSize: "0.95rem",
          lineHeight: 1.6,
          color: "var(--color-navy)",
        }}
      >
        <p style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>
          <Link to="/">← Retour au site</Link>
        </p>
        <h1 style={{ marginTop: "0.5rem", fontSize: "1.25rem", lineHeight: 1.35, textTransform: "uppercase" }}>
          Conditions générales de prestation et d&apos;exploitation
        </h1>
        <p style={{ margin: "0.25rem 0 0", fontWeight: 700, fontSize: "1rem" }}>ITELEC CHARGE</p>
        <p style={{ color: "var(--color-muted)", fontSize: "0.9rem", marginTop: "0.75rem" }}>
          Document contractuel applicable à toute relation entre ITELEC CHARGE et le client.
        </p>

        {ITELEC_CGV_SECTIONS.map((section, index) => (
          <section key={`${section.number}-${index}`} style={{ marginTop: section.title ? "1.35rem" : "0.5rem" }}>
            {section.title ? (
              <h2
                id={section.id}
                style={{ fontSize: "1.05rem", margin: "0 0 0.65rem", textTransform: "uppercase" }}
              >
                {section.number}. {section.title}
              </h2>
            ) : null}
            {section.paragraphs?.map((p) => (
              <p key={p} style={{ margin: "0 0 0.65rem" }}>
                {p}
              </p>
            ))}
            {section.bullets?.length ? (
              <ul style={{ margin: "0 0 0.65rem", paddingLeft: "1.25rem" }}>
                {section.bullets.map((item) => (
                  <li key={item} style={{ marginBottom: "0.35rem" }}>
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        <p style={{ marginTop: "2rem", fontSize: "0.85rem", color: "var(--color-muted)" }}>
          {CGV_DOCUMENT_TITLE}
        </p>
      </article>
    </div>
    </>
  );
}
