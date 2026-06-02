export const MIGRATION_003_STATEMENTS = [
  `
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
);`,
  `CREATE INDEX IF NOT EXISTS idx_material_catalog_article_number ON material_catalog (article_number);`,
];
