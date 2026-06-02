import { pool } from "./db/pool";
import { applySeed } from "./applySeed";

/**
 * Remplit la base (users, installers, leads) — requiert le schéma (npm run db:migrate ou db:setup).
 */
async function run() {
  await applySeed();
  console.log("Seed OK (utilisateurs, techniciens, dossiers).");
  await pool.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
