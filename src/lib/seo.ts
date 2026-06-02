/** Configuration SEO centrale — site vitrine ITELEC CHARGE */

import {
  SITE_ADDRESS_LINES,
  SITE_BRAND,
  SITE_CONTACT_EMAIL,
  SITE_LEGAL_NAME,
  SITE_PHONE,
  SITE_URL,
} from "./siteConfig";

export type SeoMeta = {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  noindex?: boolean;
  ogType?: "website" | "article";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

export const DEFAULT_OG_IMAGE = `${SITE_URL}/Itelec%20charge%20transparent.png`;

export const GLOBAL_KEYWORDS = [
  "ITELEC CHARGE",
  "Itelec Charge",
  "borne de recharge",
  "bornes de recharge",
  "installation borne recharge",
  "borne recharge voiture électrique",
  "charge voiture électrique",
  "wallbox entreprise",
  "CPO recharge",
  "parking recharge électrique",
  "borne recharge PME",
  "borne recharge syndic",
  "copropriété borne recharge",
  "parking entreprise recharge",
  "installation Hager witty",
  "witty pro",
  "witty plus",
  "witty park",
  "installateur borne Belgique",
  "borne recharge Belgique",
  "borne recharge Wallonie",
  "Charleroi borne recharge",
  "Hainaut borne recharge",
  "recharge clé en main",
  "maintenance borne recharge",
  "abonnement borne recharge",
  "revenu parking recharge",
  "Rexel Hager installateur",
  "devis borne recharge",
  "borne semi-publique",
  "site semi-public recharge",
] as const;

export function absoluteUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL.replace(/\/$/, "")}${p}`;
}

export function buildPageTitle(pageTitle: string): string {
  const prefix = "Itelec Charge";
  const normalized = pageTitle.trim();
  if (/^Itelec Charge\s[-–—]/i.test(normalized)) return normalized;
  const withoutBrand = normalized
    .replace(/^ITELEC CHARGE\s*[-–—|]\s*/i, "")
    .replace(/^Itelec Charge\s*[-–—|]\s*/i, "")
    .replace(/\s*\|\s*ITELEC CHARGE\s*$/i, "")
    .trim();
  if (!withoutBrand || withoutBrand.toUpperCase() === SITE_BRAND) {
    return prefix;
  }
  return `${prefix} - ${withoutBrand}`;
}

function streetAddress(): string {
  return SITE_ADDRESS_LINES[1] ?? "Rue du Bosquet 19";
}

function postalLocality(): { postalCode: string; locality: string } {
  const line = SITE_ADDRESS_LINES[2] ?? "6181 Gouy-lez-Pieton";
  const m = line.match(/^(\d{4})\s+(.+)$/);
  return m ? { postalCode: m[1]!, locality: m[2]! } : { postalCode: "6181", locality: "Gouy-lez-Pieton" };
}

export function organizationJsonLd(): Record<string, unknown> {
  const { postalCode, locality } = postalLocality();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_LEGAL_NAME,
    alternateName: SITE_BRAND,
    url: SITE_URL,
    logo: absoluteUrl("/Itelec%20charge%20transparent.png"),
    email: SITE_CONTACT_EMAIL,
    telephone: SITE_PHONE,
    address: {
      "@type": "PostalAddress",
      streetAddress: streetAddress(),
      addressLocality: locality,
      postalCode,
      addressCountry: "BE",
    },
    areaServed: [
      { "@type": "Country", name: "Belgique" },
      { "@type": "AdministrativeArea", name: "Wallonie" },
      { "@type": "AdministrativeArea", name: "Hainaut" },
    ],
    sameAs: [] as string[],
  };
}

export function localBusinessJsonLd(): Record<string, unknown> {
  const org = organizationJsonLd();
  return {
    ...org,
    "@type": ["LocalBusiness", "Electrician"],
    "@id": `${SITE_URL}/#localbusiness`,
    priceRange: "€€",
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "18:00",
    },
    knowsAbout: [
      "Installation de bornes de recharge",
      "Bornes Hager Witty",
      "Recharge voiture électrique professionnelle",
      "Exploitation CPO",
    ],
  };
}

export function webSiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_BRAND,
    description:
      "Installation et exploitation de bornes de recharge pour entreprises, copropriétés et parkings en Belgique.",
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "fr-BE",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/faq?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function serviceJsonLd(name: string, description: string, path: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: "Belgique",
    url: absoluteUrl(path),
    serviceType: "Installation et exploitation de bornes de recharge",
  };
}

export function faqPageJsonLd(items: Array<{ q: string; a: string }>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

export function breadcrumbJsonLd(crumbs: Array<{ name: string; path: string }>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

/** Routes publiques indexables (sitemap). */
export { INDEXABLE_ROUTES as PUBLIC_INDEX_ROUTES } from "../content/publicRoutes";

export const HOME_SEO: SeoMeta = {
  title: buildPageTitle("Bornes de recharge clé en main — PME, syndics & parkings"),
  description:
    "ITELEC CHARGE installe et exploite des bornes de recharge en Belgique : PME, copropriétés, parkings commerciaux. Installation Hager Witty, abonnement tout inclus, revenus des recharges pour vous.",
  path: "/",
  keywords: [...GLOBAL_KEYWORDS],
  jsonLd: [organizationJsonLd(), localBusinessJsonLd(), webSiteJsonLd()],
};
