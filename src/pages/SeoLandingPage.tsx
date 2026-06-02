import { Link } from "react-router-dom";
import { SeoHead } from "../components/SeoHead";
import {
  breadcrumbJsonLd,
  buildPageTitle,
  serviceJsonLd,
  type SeoMeta,
} from "../lib/seo";
import { landingPath, type SeoLandingPage } from "../content/seoLandings";

type Props = {
  page: SeoLandingPage;
};

export function SeoLandingPageView({ page }: Props) {
  const path = landingPath(page.slug);
  const seo: SeoMeta = {
    title: buildPageTitle(page.title),
    description: page.description,
    path,
    keywords: page.keywords,
    jsonLd: [
      serviceJsonLd(page.h1, page.description, path),
      breadcrumbJsonLd([
        { name: "Accueil", path: "/" },
        { name: page.title, path },
      ]),
    ],
  };

  return (
    <>
      <SeoHead {...seo} />
      <article className="container seo-landing" style={{ padding: "2.5rem 0 3rem" }}>
        <nav aria-label="Fil d'Ariane" className="seo-breadcrumb">
          <Link to="/">Accueil</Link>
          <span aria-hidden> / </span>
          <span>{page.title}</span>
        </nav>
        <h1>{page.h1}</h1>
        <p className="seo-landing-intro">{page.intro}</p>
        {page.sections.map((sec) => (
          <section key={sec.h2} className="seo-landing-section">
            <h2>{sec.h2}</h2>
            <p>{sec.body}</p>
          </section>
        ))}
        <div className="card seo-landing-cta" style={{ marginTop: "2rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1.15rem" }}>Obtenir une étude pour votre site</h2>
          <p style={{ marginBottom: "1rem", color: "var(--color-muted)" }}>
            Décrivez votre projet : un commercial ITELEC CHARGE vous recontacte avec une proposition adaptée.
          </p>
          <Link to="/#contact-devis" className="btn btn-accent" style={{ textDecoration: "none" }}>
            Demander un devis gratuit
          </Link>
        </div>
      </article>
    </>
  );
}
