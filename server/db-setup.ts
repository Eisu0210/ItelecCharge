
/**
 * Script unique : schéma + données de démo. À lancer une fois (ou quand on veut re-seed les users).
 *   npm run db:setup
 * Prérequis : .env à la racine ItelecCharge/ avec DATABASE_URL=… (Neon)
 */
import { pool, q } from "./db/pool";
import { applySchemaMigrations } from "./applySchema";
import { applySeed } from "./applySeed";

async function listPublicTables() {
  const { rows } = await q<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
  );
  return rows;
}

async function main() {
  console.log("\n========== ItelecCharge : base de données ==========\n");
  console.log("1/3  Schéma (users, installers, leads, index)…");
  await applySchemaMigrations();
  console.log("     — OK\n");
  console.log("2/3  Données (comptes démo, techniciens, dossiers)…");
  await applySeed();
  console.log("     — OK\n");
  console.log("3/3  Vérification (pg_tables)…");
  const tables = await listPublicTables();
  for (const r of tables) {
    console.log("     •", r.tablename);
  }
  if (tables.length === 0) {
    console.warn("     (aucune table — mauvaise base ou droits.)\n");
  } else {
    console.log("\n     C’est bon : vous devriez voir les mêmes noms dans Neon (Tables → public).\n");
  }
  await pool.end();
  console.log("========== Fin ==========\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
