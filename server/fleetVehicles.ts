import { pool, q } from "./db/pool";
import type { FleetVehicle } from "../src/types";

type FleetRow = {
  id: string;
  label: string;
  plate: string;
  make_model: string;
  notes: string | null;
  installer_id: string | null;
  created_at: Date;
  updated_at: Date;
};

export function rowToFleetVehicle(r: FleetRow): FleetVehicle {
  return {
    id: r.id,
    label: r.label,
    plate: r.plate ?? "",
    makeModel: r.make_model ?? "",
    notes: r.notes ?? undefined,
    installerId: r.installer_id ?? undefined,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

export async function listFleetVehicles(): Promise<FleetVehicle[]> {
  const { rows } = await q<FleetRow>(
    `SELECT id, label, plate, make_model, notes, installer_id, created_at, updated_at
     FROM fleet_vehicles
     ORDER BY label, plate`
  );
  return rows.map(rowToFleetVehicle);
}

export async function getFleetVehicleById(id: string): Promise<FleetVehicle | null> {
  const { rows } = await q<FleetRow>(
    `SELECT id, label, plate, make_model, notes, installer_id, created_at, updated_at
     FROM fleet_vehicles WHERE id = $1`,
    [id]
  );
  return rows[0] ? rowToFleetVehicle(rows[0]) : null;
}

export async function getFleetVehicleByInstallerId(installerId: string): Promise<FleetVehicle | null> {
  const { rows } = await q<FleetRow>(
    `SELECT id, label, plate, make_model, notes, installer_id, created_at, updated_at
     FROM fleet_vehicles WHERE installer_id = $1`,
    [installerId]
  );
  return rows[0] ? rowToFleetVehicle(rows[0]) : null;
}

/** Un technicien = au plus un véhicule ; un véhicule = au plus un technicien. */
export async function assignFleetVehicleToInstaller(
  vehicleId: string,
  installerId: string | null
): Promise<void> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const prev = await c.query(`SELECT id FROM fleet_vehicles WHERE id = $1 FOR UPDATE`, [vehicleId]);
    if (prev.rowCount === 0) {
      await c.query("ROLLBACK");
      throw Object.assign(new Error("Véhicule introuvable"), { statusCode: 404 });
    }
    if (installerId) {
      await c.query(`UPDATE fleet_vehicles SET installer_id = NULL, updated_at = NOW() WHERE installer_id = $1`, [
        installerId,
      ]);
      await c.query(
        `UPDATE fleet_vehicles SET installer_id = $1, updated_at = NOW() WHERE id = $2`,
        [installerId, vehicleId]
      );
    } else {
      await c.query(`UPDATE fleet_vehicles SET installer_id = NULL, updated_at = NOW() WHERE id = $1`, [vehicleId]);
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
