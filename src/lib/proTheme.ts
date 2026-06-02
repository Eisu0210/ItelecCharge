export type ProTheme = "light" | "dark";

const STORAGE_KEY = "itelec-pro-theme";

export function getProTheme(): ProTheme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function setProTheme(theme: ProTheme): void {
  localStorage.setItem(STORAGE_KEY, theme);
}

export function toggleProTheme(): ProTheme {
  const next: ProTheme = getProTheme() === "dark" ? "light" : "dark";
  setProTheme(next);
  return next;
}
