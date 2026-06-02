import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { INDEXABLE_ROUTES } from "../src/content/publicRoutes.ts";

const SITE_URL = (process.env.VITE_SITE_URL || "https://itelec-charge.be").replace(/\/$/, "");
const lastmod = new Date().toISOString().slice(0, 10);

const urls = INDEXABLE_ROUTES.map(
  (r) => `  <url>
    <loc>${SITE_URL}${r.path === "/" ? "/" : r.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
).join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

const out = resolve(process.cwd(), "public", "sitemap.xml");
writeFileSync(out, xml, "utf8");
console.log(`Sitemap généré → ${out} (${INDEXABLE_ROUTES.length} URLs, base ${SITE_URL})`);
