/**
 * Routes publiques indexables — source unique pour sitemap et pré-rendu.
 */

import { SEO_LANDING_PAGES } from "./seoLandings";

export type SiteRouteMeta = {
  path: string;
  changefreq: "weekly" | "monthly" | "yearly";
  priority: string;
};

export const INDEXABLE_ROUTES: SiteRouteMeta[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/installation-classique", changefreq: "monthly", priority: "0.9" },
  { path: "/faq", changefreq: "monthly", priority: "0.85" },
  ...SEO_LANDING_PAGES.map((p) => ({
    path: `/solutions/${p.slug}`,
    changefreq: "monthly" as const,
    priority: "0.88",
  })),
  { path: "/conditions-generales", changefreq: "yearly", priority: "0.3" },
];

export const PRERENDER_PATHS = INDEXABLE_ROUTES.map((r) => r.path);
