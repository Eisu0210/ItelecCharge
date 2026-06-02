/**
 * Requêtes de création du schéma — exécutées en séquence (pas de parse du .sql).
 * Toute modification future : ajouter 002-xxx, etc.
 */
export const MIGRATION_001_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  login      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN (
    'admin', 'commercial', 'installateur', 'dispatch', 'site_survey'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,

  `CREATE TABLE IF NOT EXISTS installers (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL
)`,

  `CREATE TABLE IF NOT EXISTS leads (
  id                  TEXT PRIMARY KEY,
  created_at          TIMESTAMPTZ NOT NULL,
  commercial_id       TEXT NOT NULL,
  company_name        TEXT NOT NULL,
  contact_name        TEXT NOT NULL,
  email               TEXT NOT NULL,
  phone               TEXT NOT NULL,
  address             TEXT NOT NULL,
  notes               TEXT,
  status              TEXT NOT NULL,
  quote_amount_htva   NUMERIC,
  installer_id        TEXT REFERENCES installers (id) ON DELETE SET NULL,
  slot_start          TIMESTAMPTZ,
  slot_end            TIMESTAMPTZ,
  onsite_notified_at  TIMESTAMPTZ,
  commission_paid     BOOLEAN NOT NULL DEFAULT FALSE,
  report              JSONB,
  survey_photos       JSONB,
  survey_materials    JSONB
)`,

  `CREATE INDEX IF NOT EXISTS idx_leads_commercial_id ON leads (commercial_id)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_installer_id ON leads (installer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status)`,
];
