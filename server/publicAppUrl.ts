/**
 * URL publique du site React (page devis client /devis-signer/…).
 *
 * Développement local (NODE_ENV ≠ production) :
 *   → http://localhost:5173 par défaut (même si APP_PUBLIC_URL pointe vers itelec-charge.be).
 *   → Pour tester avec l’URL prod dans les mails : APP_USE_PRODUCTION_LINKS=true
 *
 * Production : APP_PUBLIC_URL=https://itelec-charge.be dans .env
 */

const BLOCKED_HOST_PATTERNS = [/hostinger\.com/i, /hpanel\./i, /webmail\./i, /smtp\./i];

function normalizeBase(raw: string): string {
  return raw.trim().replace(/\/$/, "");
}

function isLocalDev(): boolean {
  return process.env.NODE_ENV !== "production";
}

function isLocalhostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

function isBlockedPublicUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return BLOCKED_HOST_PATTERNS.some((re) => re.test(host));
  } catch {
    return true;
  }
}

function localDevBaseUrl(): string {
  const port = process.env.VITE_DEV_PORT?.trim() || "5173";
  return `http://localhost:${port}`;
}

function resolveFromEnv(): string | null {
  const fromEnv = process.env.APP_PUBLIC_URL?.trim();
  if (!fromEnv) return null;
  const base = normalizeBase(fromEnv);
  if (!/^https?:\/\//i.test(base)) {
    console.warn(`[APP_PUBLIC_URL] Valeur invalide (${fromEnv})`);
    return null;
  }
  if (isBlockedPublicUrl(base)) {
    console.warn(`[APP_PUBLIC_URL] "${base}" n’est pas l’URL de votre site vitrine.`);
    return null;
  }
  return base;
}

/** Base URL du frontend (sans slash final). */
export function getPublicAppBaseUrl(): string {
  const fromEnv = resolveFromEnv();

  if (isLocalDev() && process.env.APP_USE_PRODUCTION_LINKS !== "true") {
    if (fromEnv && isLocalhostUrl(fromEnv)) {
      return fromEnv;
    }
    if (fromEnv && !isLocalhostUrl(fromEnv)) {
      console.log(
        `[Devis] Mode local : liens e-mail → ${localDevBaseUrl()} (APP_PUBLIC_URL=${fromEnv} ignoré). ` +
          `Mettez APP_PUBLIC_URL=http://localhost:5173 ou APP_USE_PRODUCTION_LINKS=true`
      );
    }
    return localDevBaseUrl();
  }

  if (fromEnv) return fromEnv;

  const site = process.env.SITE_URL?.trim() || process.env.PUBLIC_SITE_URL?.trim();
  if (site) {
    const base = normalizeBase(site);
    if (/^https?:\/\//i.test(base) && !isBlockedPublicUrl(base)) return base;
  }

  return isLocalDev() ? localDevBaseUrl() : "https://itelec-charge.be";
}

export function buildClientQuotePortalUrl(accessToken: string): string {
  const token = accessToken.trim();
  return `${getPublicAppBaseUrl()}/devis-signer/${token}`;
}
