export const MIGRATION_005_STATEMENTS = [
  `
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
);`,
  `CREATE INDEX IF NOT EXISTS idx_installer_stock_installer ON installer_stock_items (installer_id);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_installer_stock_catalog_uq
   ON installer_stock_items (installer_id, catalog_item_id)
   WHERE catalog_item_id IS NOT NULL;`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_installer_stock_custom_uq
   ON installer_stock_items (installer_id, article_number, label)
   WHERE catalog_item_id IS NULL;`,
  `
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
);`,
  `CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON installer_stock_movements (stock_item_id);`,
  `CREATE INDEX IF NOT EXISTS idx_stock_movements_installer ON installer_stock_movements (installer_id, created_at DESC);`,
];
