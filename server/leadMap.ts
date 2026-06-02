import type { Lead, LeadStatus, InstallerProfile, ProjectSpecs, WorkflowStage } from "../src/types";

type LeadRow = {
  id: string;
  created_at: Date;
  commercial_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  notes: string | null;
  status: string;
  quote_amount_htva: string | null;
  installer_id: string | null;
  slot_start: Date | null;
  slot_end: Date | null;
  onsite_notified_at: Date | null;
  commission_paid: boolean | null;
  client_paid: boolean | null;
  report: unknown;
  survey_photos: unknown;
  survey_materials: unknown;
  workflow_stage: string | null;
  project_specs: unknown;
  created_by_user_id: number | null;
  commercial_display_name?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
};

function rowDateToIso(v: Date | string | null | undefined): string {
  if (v == null) return new Date().toISOString();
  if (v instanceof Date) return v.toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/** Dossier encore en attente d’acceptation client (pipeline ou ancien flux sans workflow_stage). */
export function isQuoteAwaitingClientAcceptance(row: {
  workflow_stage: string | null;
  status: string;
}): boolean {
  if (row.workflow_stage === "devis_envoye_sign") return true;
  return !row.workflow_stage && row.status === "devis_envoye";
}

export function rowToLead(r: LeadRow): Lead {
  const lead: Lead = {
    id: r.id,
    createdAt: rowDateToIso(r.created_at),
    commercialId: r.commercial_id ?? "",
    companyName: r.company_name ?? "",
    contactName: r.contact_name ?? "",
    email: r.email ?? "",
    phone: r.phone ?? "",
    address: r.address ?? "",
    status: (r.status as LeadStatus) ?? "nouveau",
  };
  if (r.notes) lead.notes = r.notes;
  if (r.quote_amount_htva != null) lead.quoteAmountHtva = Number(r.quote_amount_htva);
  if (r.installer_id) lead.installerId = r.installer_id;
  if (r.slot_start) lead.slotStart = r.slot_start.toISOString();
  if (r.slot_end) lead.slotEnd = r.slot_end.toISOString();
  if (r.onsite_notified_at) lead.onsiteNotifiedAt = r.onsite_notified_at.toISOString();
  if (r.commission_paid != null) lead.commissionPaid = r.commission_paid;
  if (r.client_paid != null) lead.clientPaid = r.client_paid;
  if (r.report && typeof r.report === "object") lead.report = r.report as Lead["report"];
  if (r.survey_photos && Array.isArray(r.survey_photos)) lead.surveyPhotos = r.survey_photos as Lead["surveyPhotos"];
  if (r.survey_materials && Array.isArray(r.survey_materials))
    lead.surveyMaterials = r.survey_materials as Lead["surveyMaterials"];
  if (r.workflow_stage) lead.workflowStage = r.workflow_stage as WorkflowStage;
  if (r.project_specs && typeof r.project_specs === "object" && r.project_specs !== null)
    lead.projectSpecs = r.project_specs as ProjectSpecs;
  if (r.created_by_user_id != null) lead.createdByUserId = r.created_by_user_id;
  const disp = r.commercial_display_name?.trim();
  if (disp) lead.commercialDisplayName = disp;
  if (r.stripe_customer_id) lead.stripeCustomerId = r.stripe_customer_id;
  if (r.stripe_subscription_id) lead.stripeSubscriptionId = r.stripe_subscription_id;
  return lead;
}

type InstallerRow = { id: string; name: string; phone: string; email: string };

export function rowToInstaller(r: InstallerRow): InstallerProfile {
  return { id: r.id, name: r.name, phone: r.phone, email: r.email };
}

const PATCH: { key: keyof Lead; col: string }[] = [
  { key: "companyName", col: "company_name" },
  { key: "contactName", col: "contact_name" },
  { key: "email", col: "email" },
  { key: "phone", col: "phone" },
  { key: "address", col: "address" },
  { key: "notes", col: "notes" },
  { key: "status", col: "status" },
  { key: "commercialId", col: "commercial_id" },
  { key: "quoteAmountHtva", col: "quote_amount_htva" },
  { key: "installerId", col: "installer_id" },
  { key: "slotStart", col: "slot_start" },
  { key: "slotEnd", col: "slot_end" },
  { key: "onsiteNotifiedAt", col: "onsite_notified_at" },
  { key: "commissionPaid", col: "commission_paid" },
  { key: "clientPaid", col: "client_paid" },
  { key: "report", col: "report" },
  { key: "surveyPhotos", col: "survey_photos" },
  { key: "surveyMaterials", col: "survey_materials" },
  { key: "workflowStage", col: "workflow_stage" },
  { key: "projectSpecs", col: "project_specs" },
  { key: "createdByUserId", col: "created_by_user_id" },
  { key: "stripeCustomerId", col: "stripe_customer_id" },
  { key: "stripeSubscriptionId", col: "stripe_subscription_id" },
];

/** Aligne le statut legacy sur l’étape pipeline si le client n’envoie pas de statut explicite. */
export function normalizeLeadPatch(patch: Partial<Lead>): Partial<Lead> {
  if (!patch.workflowStage) return patch;
  if (Object.prototype.hasOwnProperty.call(patch, "status")) return patch;
  const stage = patch.workflowStage;
  let status: LeadStatus;
  switch (stage) {
    case "commercial_brouillon":
      status = "nouveau";
      break;
    case "attente_admin":
    case "survey_planifie":
    case "survey_terrain":
    case "devis_pret":
    case "devis_envoye_sign":
      status = "devis_envoye";
      break;
    case "devis_signe":
      status = "devis_accepte";
      break;
    default:
      status = "nouveau";
  }
  return { ...patch, status };
}

export function buildLeadPatchSet(patch: Partial<Lead>): { setSql: string; values: unknown[] } {
  const values: unknown[] = [];
  const parts: string[] = [];
  let n = 1;
  for (const { key, col } of PATCH) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
    const raw = (patch as Record<string, unknown>)[key as string];
    if (raw === undefined) continue;
    let v: unknown;
    if (key === "quoteAmountHtva") v = raw == null ? null : Number(raw);
    else if (key === "slotStart" || key === "slotEnd" || key === "onsiteNotifiedAt")
      v = raw == null || raw === "" ? null : new Date(String(raw));
    else if (key === "report" || key === "surveyPhotos" || key === "surveyMaterials" || key === "projectSpecs")
      v = raw == null ? null : JSON.stringify(raw);
    else if (key === "notes") v = raw === "" || raw == null ? null : raw;
    else if (key === "installerId") v = raw === "" || raw == null ? null : raw;
    else if (key === "workflowStage") v = raw === "" || raw == null ? null : raw;
    else if (key === "createdByUserId") v = raw == null ? null : Number(raw);
    else if (key === "commissionPaid" || key === "clientPaid") v = Boolean(raw);
    else v = raw;
    parts.push(`${col} = $${n++}`);
    values.push(v);
  }
  return { setSql: parts.join(", "), values };
}

export function leadToInsertRow(lead: Lead): unknown[] {
  return [
    lead.id,
    new Date(lead.createdAt),
    lead.commercialId,
    lead.companyName,
    lead.contactName,
    lead.email,
    lead.phone,
    lead.address,
    lead.notes ?? null,
    lead.status,
    lead.quoteAmountHtva ?? null,
    lead.installerId ?? null,
    lead.slotStart ? new Date(lead.slotStart) : null,
    lead.slotEnd ? new Date(lead.slotEnd) : null,
    lead.onsiteNotifiedAt ? new Date(lead.onsiteNotifiedAt) : null,
    lead.commissionPaid ?? false,
    lead.clientPaid ?? false,
    lead.report != null ? JSON.stringify(lead.report) : null,
    lead.surveyPhotos != null ? JSON.stringify(lead.surveyPhotos) : null,
    lead.surveyMaterials != null ? JSON.stringify(lead.surveyMaterials) : null,
    lead.workflowStage ?? null,
    lead.projectSpecs != null ? JSON.stringify(lead.projectSpecs) : "{}",
    lead.createdByUserId ?? null,
  ];
}
