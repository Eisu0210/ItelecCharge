import { q, pool } from "./db/pool";

/**
 * Vérifie la connexion et liste les tables — sans modifier la base.
 * Commande : npm run db:check
 * Si aucune table : lancez npm run db:setup
 */
async function run() {
  const db = await q<{ d: string }>("SELECT current_database()::text AS d");
  const user = await q<{ u: string }>("SELECT current_user::text AS u");
  const d0 = db.rows[0];
  const u0 = user.rows[0];
  if (!d0 || !u0) {
    console.error("Impossible de lire la base.");
    process.exit(1);
  }
  console.log("Base connectée :", d0.d);
  console.log("Rôle SQL      :", u0.u);

  const t = await q<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  );
  console.log("\nTables du schéma « public » (identique à la console Neon, onglet Tables / SQL) :");
  if (t.rows.length === 0) {
    console.log("  (aucune — lancez « npm run db:setup » depuis la racine du projet.)");
  } else {
    for (const r of t.rows) {
      console.log("  •", r.tablename);
    }
  }
  await pool.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
