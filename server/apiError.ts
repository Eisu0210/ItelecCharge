import type { Response } from "express";

/** Détails d’exception renvoyés seulement hors production (aide au debug local). */
const EXPOSE_ERROR_DETAILS = process.env.NODE_ENV !== "production";

export function isPgUndefinedColumn(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "42703"
  );
}

export function sendServerError(res: Response, e: unknown, logPrefix = "API"): void {
  console.error(`[${logPrefix}]`, e);
  const details = EXPOSE_ERROR_DETAILS && e instanceof Error ? e.message : undefined;
  res.status(500).json({
    error: "Erreur serveur",
    ...(details ? { details } : {}),
  });
}
