import type { Role } from "../src/types";

/** Mot de passe des comptes démo — serveur uniquement (jamais dans le bundle client). */
export const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD?.trim() || "ItelecCharge";

type DemoUserRow = { login: string; role: Role };

export const DEMO_USER_ROWS: ReadonlyArray<DemoUserRow> = [
  { login: "admin", role: "admin" },
  { login: "commercial", role: "commercial" },
  { login: "installateur", role: "installateur" },
  { login: "dispatch", role: "dispatch" },
  { login: "site_survey", role: "site_survey" },
];

export function assertDemoSeedAllowed(): void {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error(
      "Seed désactivé en production. Définissez ALLOW_DEMO_SEED=true uniquement pour une initialisation contrôlée."
    );
  }
}
