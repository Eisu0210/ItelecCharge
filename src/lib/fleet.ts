import type { FleetVehicle, InstallerId } from "../types";

export function vehicleForInstaller(
  installerId: InstallerId | undefined,
  fleet: FleetVehicle[]
): FleetVehicle | undefined {
  if (!installerId) return undefined;
  return fleet.find((v) => v.installerId === installerId);
}

export function vehicleLabel(v: FleetVehicle): string {
  const parts = [v.label];
  if (v.plate.trim()) parts.push(v.plate);
  if (v.makeModel.trim()) parts.push(`(${v.makeModel})`);
  return parts.join(" — ");
}
