import type { Role } from "../types";

/** Mot de passe commun à tous les comptes de démo (table `users`, hash bcrypt au seed). */
export const DEMO_PASSWORD = "ItelecCharge";

/** Texte d’aide pour l’écran de connexion (même logique qu’en démo locale d’origine). */
export function connexionDemoHint(): string {
  return (
    "Identifiant = nom du rôle : admin, commercial, installateur, dispatch, site_survey. " +
    `Mot de passe pour tous : ${DEMO_PASSWORD}`
  );
}

export const ROLE_FR: Record<Role, string> = {
  admin: "Administrateur",
  commercial: "Commercial",
  installateur: "Technicien (installateur)",
  dispatch: "Dispatch",
  site_survey: "Site survey (relevé terrain)",
};

type AccountRow = {
  login: string;
  role: Role;
  /** Droit d’accès / modules dans l’appli */
  access: string;
  /** Raccourci du même rôle (même compte) */
  isAlias?: boolean;
};

/** Comptes démo : login = nom du rôle, mot de passe commun {@link DEMO_PASSWORD}. */
const ROWS: AccountRow[] = [
  {
    login: "admin",
    role: "admin",
    access: "Techniciens, planning, clients, commerciaux, utilisateurs",
  },
  {
    login: "commercial",
    role: "commercial",
    access: "Tableau de bord vente (perso), documentation",
  },
  {
    login: "installateur",
    role: "installateur",
    access: "Planning (perso), clients & dossiers, ventes, doc technique, site survey",
  },
  {
    login: "dispatch",
    role: "dispatch",
    access: "Techniciens, planning, clients",
  },
  {
    login: "site_survey",
    role: "site_survey",
    access: "Clients, dossier terrain, photos & matériel (site survey)",
  },
];

export const DEMO_USER_ROWS: ReadonlyArray<Readonly<AccountRow>> = ROWS;
