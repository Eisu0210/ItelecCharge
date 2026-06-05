const BASE = import.meta.env.VITE_API_BASE ?? "";

export const TOKEN_KEY = "itelec_charge_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export { formatApiErrorMessage } from "./safeUserMessage";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const t = getToken();
  if (t) headers.set("Authorization", `Bearer ${t}`);
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const r = await fetch(url, { ...init, headers });
  if (r.status === 401) {
    setToken(null);
    localStorage.removeItem("itelec_charge_session");
    window.dispatchEvent(new Event("itelec:unauthorized"));
    throw new Error("401");
  }
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(txt || r.statusText);
  }
  if (r.status === 204) return undefined as T;
  const ct = r.headers.get("content-type");
  if (!ct?.includes("application/json")) return undefined as T;
  return r.json() as Promise<T>;
}
