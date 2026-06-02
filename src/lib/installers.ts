import type { InstallerProfile } from "../types";

/** Libellé affichable pour un technicien (préfère la fiche `installers`, évite `tech-u…`). */
export function installerDisplayName(
  installerId: string | undefined | null,
  installers: InstallerProfile[]
): string {
  if (installerId == null || installerId === "") return "—";
  const profile = installers.find((i) => i.id === installerId);
  const label = profile?.name?.trim();
  if (label) return label;
  return installerId;
}
