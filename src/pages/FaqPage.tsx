import { Link } from "react-router-dom";
import { SeoHead } from "../components/SeoHead";
import { FAQ_ITEMS, FAQ_SEO } from "../content/faqContent";
import { SEO_LANDING_PAGES, landingPath } from "../content/seoLandings";
import { buildPageTitle, faqPageJsonLd, organizationJsonLd, webSiteJsonLd } from "../lib/seo";

export function FaqPage() {
  const items = FAQ_ITEMS.map((it) => ({ q: it.q, a: it.a }));

  return (
    <>
      <SeoHead
        title={buildPageTitle(FAQ_SEO.title)}
        description={FAQ_SEO.description}
        path="/faq"
        jsonLd={[faqPageJsonLd(items), organizationJsonLd(), webSiteJsonLd()]}
      />
      <div className="container" style={{ padding: "2.5rem 0 3rem" }}>
        <h1>Questions fréquentes — bornes de recharge &amp; installation</h1>
        <p style={{ maxWidth: "60ch", color: "var(--color-muted)" }}>
          Tarifs, délais, abonnement CPO, bornes Hager Witty et intervention en Belgique : les réponses aux
          questions les plus posées sur l&apos;installation de bornes de recharge professionnelles.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.5rem" }}>
          {items.map((it) => (
            <article key={it.q} className="card">
              <h2 style={{ marginTop: 0, fontSize: "1.15rem" }}>{it.q}</h2>
              <p style={{ marginBottom: 0, color: "var(--color-muted)" }}>{it.a}</p>
            </article>
          ))}
        </div>
        <section style={{ marginTop: "2.5rem" }}>
          <h2>Nos solutions par type de site</h2>
          <ul style={{ columns: "2 14rem", gap: "0.5rem 2rem", paddingLeft: "1.2rem" }}>
            {SEO_LANDING_PAGES.map((p) => (
              <li key={p.slug}>
                <Link to={landingPath(p.slug)}>{p.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
