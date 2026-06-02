/**
 * Retire `channel_binding` (le client `pg` + Neon échouent souvent avec).
 * Garde ou ajoute sslmode=require.
 */
export function getSanitizedDatabaseUrl(): string | null {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    u.searchParams.delete("channel_binding");
    if (!u.searchParams.has("sslmode")) u.searchParams.set("sslmode", "require");
    return u.toString();
  } catch {
    return raw
      .replace(/([?&])channel_binding=[^&]*/gi, "$1")
      .replace(/\?&/g, "?")
      .replace(/&&/g, "&");
  }
}
