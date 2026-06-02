/** Base de l’API pour le frontend (vide = même domaine, ex. /api via proxy Hostinger). */
export function apiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE as string | undefined;
  if (!raw?.trim()) return "";
  return raw.trim().replace(/\/$/, "");
}

export function apiFetchPath(path: string): string {
  const base = apiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}
