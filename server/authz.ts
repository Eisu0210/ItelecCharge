import { q } from "./db/pool";
import { installerProfileIdForUser } from "./installerStock";
import type { Lead, Role } from "../src/types";

export type AuthCtx = { sub: string; un: string; role: Role };

const FULL_LEAD_ACCESS: Role[] = ["admin", "dispatch", "site_survey"];

type LeadAccessRow = {
  commercial_id: string;
  created_by_user_id: number | null;
  installer_id: string | null;
};

export function installerIdForAuth(auth: AuthCtx): string | null {
  const id = Number(auth.sub);
  return installerProfileIdForUser(Number.isFinite(id) ? id : 0, auth.un, auth.role);
}

export function canAccessLeadRow(
  auth: AuthCtx,
  row: LeadAccessRow,
  userInstallerId: string | null
): boolean {
  if (FULL_LEAD_ACCESS.includes(auth.role)) return true;
  if (auth.role === "commercial") {
    const uid = Number(auth.sub);
    if (Number.isFinite(uid) && row.created_by_user_id === uid) return true;
    return row.commercial_id?.toLowerCase() === auth.un.toLowerCase();
  }
  if (auth.role === "installateur") {
    return Boolean(userInstallerId && row.installer_id === userInstallerId);
  }
  return false;
}

export async function fetchLeadAccessRow(leadId: string): Promise<LeadAccessRow | null> {
  const { rows } = await q<LeadAccessRow>(
    `SELECT commercial_id, created_by_user_id, installer_id FROM leads WHERE id = $1 LIMIT 1`,
    [leadId]
  );
  return rows[0] ?? null;
}

export async function assertLeadAccess(auth: AuthCtx, leadId: string): Promise<boolean> {
  const row = await fetchLeadAccessRow(leadId);
  if (!row) return false;
  return canAccessLeadRow(auth, row, installerIdForAuth(auth));
}

const COMMERCIAL_BLOCKED_PATCH: (keyof Lead)[] = [
  "stripeCustomerId",
  "stripeSubscriptionId",
  "createdByUserId",
  "commissionPaid",
  "clientPaid",
];

const INSTALLER_ALLOWED_PATCH: (keyof Lead)[] = [
  "report",
  "surveyPhotos",
  "surveyMaterials",
  "notes",
  "status",
  "workflowStage",
  "projectSpecs",
  "slotStart",
  "slotEnd",
  "onsiteNotifiedAt",
];

export function restrictLeadPatch(role: Role, patch: Partial<Lead>): Partial<Lead> | null {
  if (FULL_LEAD_ACCESS.includes(role)) return patch;
  if (role === "commercial") {
    for (const key of COMMERCIAL_BLOCKED_PATCH) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) return null;
    }
    return patch;
  }
  if (role === "installateur") {
    const next: Partial<Lead> = {};
    for (const key of INSTALLER_ALLOWED_PATCH) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) {
        (next as Record<string, unknown>)[key] = (patch as Record<string, unknown>)[key];
      }
    }
    return Object.keys(next).length ? next : null;
  }
  return null;
}

export function leadsSqlFilter(auth: AuthCtx): { clause: string; params: unknown[] } | null {
  if (FULL_LEAD_ACCESS.includes(auth.role)) return null;
  if (auth.role === "commercial") {
    const uid = Number(auth.sub);
    return {
      clause: `(LOWER(l.commercial_id) = LOWER($1) OR l.created_by_user_id = $2)`,
      params: [auth.un, Number.isFinite(uid) ? uid : -1],
    };
  }
  if (auth.role === "installateur") {
    const iid = installerIdForAuth(auth);
    if (!iid) return { clause: "FALSE", params: [] };
    return { clause: `l.installer_id = $1`, params: [iid] };
  }
  return { clause: "FALSE", params: [] };
}
