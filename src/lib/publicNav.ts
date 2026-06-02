/** Ancres page d’accueil (navbar + boutons) — ne pas forcer scroll en haut de page. */
export const HOME_HASH_SECTION_IDS = new Set([
  "offre",
  "parcours",
  "frais-installation",
  "abonnement",
  "contact-devis",
]);

export function isHomeHashScrollTarget(pathname: string, hash: string): boolean {
  if (pathname !== "/") return false;
  const id = hash.replace(/^#/, "").trim();
  return id.length > 0 && HOME_HASH_SECTION_IDS.has(id);
}
