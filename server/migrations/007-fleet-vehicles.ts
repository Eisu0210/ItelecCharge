export const MIGRATION_007_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS fleet_vehicles (
  id            TEXT PRIMARY KEY,
  label         TEXT NOT NULL,
  plate         TEXT NOT NULL DEFAULT '',
  make_model    TEXT NOT NULL DEFAULT '',
  notes         TEXT,
  installer_id  TEXT REFERENCES installers (id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_fleet_vehicle_installer
   ON fleet_vehicles (installer_id) WHERE installer_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_plate ON fleet_vehicles (plate)`,
];
