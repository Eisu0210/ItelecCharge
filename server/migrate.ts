import { pool, q } from "./db/pool";
import { applySchemaMigrations } from "./applySchema";

/**
 * Applique le schéma (migration 001) sur la base pointée par DATABASE_URL.
 * Puis affiche la liste des tables public.
 */
async function run() {
  console.log("Connexion à PostgreSQL (Neon)…");
  await applySchemaMigrations();
  console.log("\nMigration 001 : schéma appliqué.\n");

  const { rows } = await q<{ schemaname: string; tablename: string }>(
    `SELECT schemaname, tablename
     FROM pg_tables
     WHERE schemaname = 'public'
     ORDER BY tablename`
  );
  console.log("Tables « public » (console Neon → Tables) :");
  for (const r of rows) {
    console.log(`  • ${r.schemaname}.${r.tablename}`);
  }
  if (rows.length === 0) {
    console.warn("  (aucune table : vérifiez la branche / le rôle de connexion.)");
  }
  await pool.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
