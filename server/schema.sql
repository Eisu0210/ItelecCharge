-- ItelecCharge — schéma PostgreSQL (Neon) — référence lisible
-- La source exécutée par le script est : server/migrations/001-initial-up.ts
-- Commande : npm run db:migrate (fichier .env avec DATABASE_URL à la racine du dépôt)

CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  login      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN (
    'admin', 'commercial', 'installateur', 'dispatch', 'site_survey'
  )),
  first_name TEXT,
  last_name  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS installers (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fleet_vehicles (
  id            TEXT PRIMARY KEY,
  label         TEXT NOT NULL,
  plate         TEXT NOT NULL DEFAULT '',
  make_model    TEXT NOT NULL DEFAULT '',
  notes         TEXT,
  installer_id  TEXT REFERENCES installers (id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
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
  client_paid         BOOLEAN NOT NULL DEFAULT FALSE,
  report              JSONB,
  survey_photos       JSONB,
  survey_materials     JSONB
);

CREATE TABLE IF NOT EXISTS material_catalog (
  id                TEXT PRIMARY KEY,
  supplier          TEXT NOT NULL DEFAULT 'rexel',
  article_number    TEXT NOT NULL,
  label             TEXT NOT NULL,
  unit              TEXT NOT NULL DEFAULT 'u',
  unit_price_ht     NUMERIC NOT NULL DEFAULT 0,
  compatible_models JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_commercial_id ON leads (commercial_id);
CREATE INDEX IF NOT EXISTS idx_leads_installer_id  ON leads (installer_id);
CREATE INDEX IF NOT EXISTS idx_leads_status         ON leads (status);
CREATE INDEX IF NOT EXISTS idx_material_catalog_article_number ON material_catalog (article_number);

CREATE TABLE IF NOT EXISTS installer_stock_items (
  id              TEXT PRIMARY KEY,
  installer_id    TEXT NOT NULL REFERENCES installers (id) ON DELETE CASCADE,
  catalog_item_id TEXT REFERENCES material_catalog (id) ON DELETE SET NULL,
  article_number  TEXT NOT NULL DEFAULT '',
  label           TEXT NOT NULL,
  unit            TEXT NOT NULL DEFAULT 'u',
  quantity        NUMERIC NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  min_quantity    NUMERIC NOT NULL DEFAULT 0 CHECK (min_quantity >= 0),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      TEXT
);

CREATE INDEX IF NOT EXISTS idx_installer_stock_installer ON installer_stock_items (installer_id);

CREATE TABLE IF NOT EXISTS installer_stock_movements (
  id              TEXT PRIMARY KEY,
  installer_id    TEXT NOT NULL REFERENCES installers (id) ON DELETE CASCADE,
  stock_item_id   TEXT NOT NULL REFERENCES installer_stock_items (id) ON DELETE CASCADE,
  delta           NUMERIC NOT NULL,
  quantity_after  NUMERIC NOT NULL,
  reason          TEXT NOT NULL,
  note            TEXT,
  lead_id         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      TEXT NOT NULL
);
