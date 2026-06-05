import type { Response } from "express";

export function isPgUndefinedColumn(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "42703"
  );
}

function logError(prefix: string, e: unknown): void {
  if (e instanceof Error) {
    console.error(`[${prefix}]`, e.message);
  } else {
    console.error(`[${prefix}]`, "erreur inconnue");
  }
}

/** Réponse 500 générique — aucun détail technique exposé au client. */
export function sendServerError(res: Response, e: unknown, logPrefix = "API"): void {
  logError(logPrefix, e);
  res.status(500).json({ error: "Une erreur est survenue. Réessayez plus tard." });
}
