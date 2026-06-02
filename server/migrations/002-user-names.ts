/**
 * Champs d’affichage (création utilisateur par l’admin) — rétrocompatible, colonnes NULL pour les comptes existants.
 */
export const MIGRATION_002_STATEMENTS: string[] = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT`,
];
