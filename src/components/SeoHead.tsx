import { useEffect } from "react";
import type { SeoMeta } from "../lib/seo";
import { DEFAULT_OG_IMAGE, GLOBAL_KEYWORDS, absoluteUrl } from "../lib/seo";

const MANAGED = new Set<string>();

function upsertMeta(name: string, content: string, attr: "name" | "property" = "name") {
  const key = `${attr}:${name}`;
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
  MANAGED.add(key);
}

function upsertLink(rel: string, href: string) {
  const key = `link:${rel}`;
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
  MANAGED.add(key);
}

function upsertJsonLd(id: string, data: Record<string, unknown> | Record<string, unknown>[]) {
  const key = `jsonld:${id}`;
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
  MANAGED.add(key);
}

type Props = SeoMeta;

export function SeoHead(props: Props) {
  const { title, description, path = "/", keywords, noindex, ogType = "website", jsonLd } = props;
  const canonical = absoluteUrl(path);
  const kw = (keywords ?? GLOBAL_KEYWORDS).slice(0, 40).join(", ");

  useEffect(() => {
    document.title = title;

    upsertMeta("description", description);
    upsertMeta("keywords", kw);
    upsertMeta("robots", noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large");
    upsertMeta("googlebot", noindex ? "noindex, nofollow" : "index, follow");
    upsertMeta("author", "ITELEC CHARGE");
    upsertMeta("geo.region", "BE-WAL");
    upsertMeta("geo.placename", "Gouy-lez-Pieton");
    upsertMeta("language", "French");

    upsertLink("canonical", canonical);

    upsertMeta("og:title", title, "property");
    upsertMeta("og:description", description, "property");
    upsertMeta("og:url", canonical, "property");
    upsertMeta("og:type", ogType, "property");
    upsertMeta("og:locale", "fr_BE", "property");
    upsertMeta("og:site_name", "ITELEC CHARGE", "property");
    upsertMeta("og:image", DEFAULT_OG_IMAGE, "property");

    upsertMeta("twitter:card", "summary_large_image");
    upsertMeta("twitter:title", title);
    upsertMeta("twitter:description", description);
    upsertMeta("twitter:image", DEFAULT_OG_IMAGE);

    if (jsonLd) {
      const blocks = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      blocks.forEach((block, i) => upsertJsonLd(`seo-jsonld-${i}`, block));
    }

    document.documentElement.setAttribute("data-seo-ready", "true");

    return () => {
      document.documentElement.removeAttribute("data-seo-ready");
    };
  }, [title, description, canonical, kw, noindex, ogType, jsonLd]);

  return null;
}
