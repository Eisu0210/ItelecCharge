import bcrypt from "bcryptjs";
import { pool } from "./db/pool";
import { DEMO_USER_ROWS, DEMO_PASSWORD } from "../src/data/demoAccounts";
import { buildSeedLeads, SEED_INSTALLERS } from "./initialData";
import { leadToInsertRow } from "./leadMap";

/** Supprime d'anciens alias de connexion pour garder un login par rôle. */
const REMOVED_DEMO_LOGINS = ["sitesurvey", "site-survey"] as const;

export async function applySeed(): Promise<void> {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    for (const login of REMOVED_DEMO_LOGINS) {
      await c.query("DELETE FROM users WHERE login = $1", [login]);
    }
    for (const row of DEMO_USER_ROWS) {
      await c.query(
        `INSERT INTO users (login, password_hash, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (login) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role`,
        [row.login, hash, row.role]
      );
    }
    for (const ins of SEED_INSTALLERS) {
      await c.query(
        `INSERT INTO installers (id, name, phone, email) VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, email = EXCLUDED.email`,
        [ins.id, ins.name, ins.phone, ins.email]
      );
    }
    for (const lead of buildSeedLeads()) {
      const p = leadToInsertRow(lead);
      await c.query(
        `INSERT INTO leads (
          id, created_at, commercial_id, company_name, contact_name, email, phone, address, notes, status,
          quote_amount_htva, installer_id, slot_start, slot_end, onsite_notified_at, commission_paid, client_paid,
          report, survey_photos, survey_materials, workflow_stage, project_specs, created_by_user_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
        ON CONFLICT (id) DO NOTHING`,
        p
      );
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
