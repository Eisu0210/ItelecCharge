import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = dirname(fileURLToPath(import.meta.url));
/** Racine du dépôt : …/ItelecCharge/ */
const projectRoot = resolve(here, "../..");

const envPaths = [
  join(projectRoot, ".env"),
  join(process.cwd(), ".env"),
  join(process.cwd(), "..", ".env"),
];

let loaded = false;
for (const p of envPaths) {
  if (existsSync(p)) {
    dotenv.config({ path: p, override: true });
    loaded = true;
    break;
  }
}
if (!loaded) {
  dotenv.config();
}
