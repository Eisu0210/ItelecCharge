import { pool } from "./db/pool";
import { MIGRATION_001_STATEMENTS } from "./migrations/001-initial-up";
import { MIGRATION_002_STATEMENTS } from "./migrations/002-user-names";
import { MIGRATION_003_STATEMENTS } from "./migrations/003-material-catalog";
import { MIGRATION_004_STATEMENTS } from "./migrations/004-workflow-pipeline";
import { MIGRATION_005_STATEMENTS } from "./migrations/005-installer-stock";
import { MIGRATION_006_STATEMENTS } from "./migrations/006-client-paid";
import { MIGRATION_007_STATEMENTS } from "./migrations/007-fleet-vehicles";
import { MIGRATION_008_STATEMENTS } from "./migrations/008-stripe-billing";

const ALL_MIGRATIONS: string[][] = [
  MIGRATION_001_STATEMENTS,
  MIGRATION_002_STATEMENTS,
  MIGRATION_003_STATEMENTS,
  MIGRATION_004_STATEMENTS,
  MIGRATION_005_STATEMENTS,
  MIGRATION_006_STATEMENTS,
  MIGRATION_007_STATEMENTS,
  MIGRATION_008_STATEMENTS,
];

export async function applySchemaMigrations(): Promise<void> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    for (const group of ALL_MIGRATIONS) {
      for (const sql of group) {
        const preview = sql.slice(0, 70).replace(/\s+/g, " ");
        console.log("  SQL →", preview, "…");
        await c.query(sql);
      }
    }
    await c.query("COMMIT");
  } catch (e) {
    try {
      await c.query("ROLLBACK");
    } catch {
      /* */
    }
    throw e;
  } finally {
    c.release();
  }
}
