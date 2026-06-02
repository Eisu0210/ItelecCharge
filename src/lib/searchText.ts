export function normalizeSearch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function matchesSearchQuery(parts: (string | null | undefined)[], query: string): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  const haystack = parts
    .filter((p): p is string => Boolean(p))
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  return haystack.includes(q);
}
