import { Pool, type QueryResult } from "pg";
import "./loadEnv";
import { getSanitizedDatabaseUrl } from "./databaseUrl";

const url = getSanitizedDatabaseUrl();
if (!url) {
  console.error(
    "[DB] DATABASE_URL manquant. Créez ItelecCharge/.env (à la racine, à côté de package.json) avec :"
  );
  console.error("    DATABASE_URL=postgresql://USER:PASS@HOST/neondb?sslmode=require");
  process.exit(1);
}

try {
  const u = new URL(url);
  if (u.password) u.password = "•••";
  console.log("[DB] URL (masquée) :", u.toString());
} catch {
  console.log("[DB] Connexion configurée.");
}

export const pool = new Pool({
  connectionString: url,
  max: 10,
  ssl: { rejectUnauthorized: true },
});

export function q<T = unknown>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}
