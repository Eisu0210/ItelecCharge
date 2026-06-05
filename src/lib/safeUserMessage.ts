/** Mots-clés indiquant une fuite technique — ne jamais afficher à l’utilisateur. */
const TECHNICAL_PATTERN =
  /sql|database|postgres|neon|stripe|smtp|jwt|secret|\.env|migration|stack|ECONNREFUSED|localhost:\d|password_hash|channel_binding/i;

/** Messages métier courts autorisés côté client (validation, droits). */
function isSafeUserFacingMessage(msg: string): boolean {
  const s = msg.trim();
  if (!s || s.length > 160) return false;
  if (TECHNICAL_PATTERN.test(s)) return false;
  if (s.startsWith("{") || s.includes(" at ") || s.includes("Error:")) return false;
  return true;
}

/**
 * Ne renvoie jamais le corps brut d’une réponse API (stack, SQL, config).
 * Utiliser un fallback générique pour tout le reste.
 */
export function formatApiErrorMessage(e: unknown, fallback: string): string {
  if (!(e instanceof Error)) return fallback;
  const m = e.message.trim();
  if (!m || m === "401" || m === "403" || m === "404" || m === "500") return fallback;
  if (!m.startsWith("{")) {
    return isSafeUserFacingMessage(m) ? m : fallback;
  }
  try {
    const o = JSON.parse(m) as { error?: string };
    if (typeof o.error === "string" && isSafeUserFacingMessage(o.error)) return o.error;
  } catch {
    /* */
  }
  return fallback;
}

/** Erreurs pages publiques — jamais de champ `details`. */
export function publicApiErrorMessage(
  body: { error?: string } | null | undefined,
  fallback: string
): string {
  const err = body?.error;
  if (typeof err === "string" && isSafeUserFacingMessage(err)) return err;
  return fallback;
}
