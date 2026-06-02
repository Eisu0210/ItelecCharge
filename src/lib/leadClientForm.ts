import type { Lead, MountType, ProjectSpecs, QuotePricingMode, SupplyType, WorkflowStage } from "../types";

export type LeadClientFormValues = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  commercialId: string;
  chargerCount: string;
  supplyType: SupplyType;
  mountType: MountType;
  quoteMode: QuotePricingMode;
};

export function emptyLeadClientForm(commercialId = "admin"): LeadClientFormValues {
  return {
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    commercialId,
    chargerCount: "1",
    supplyType: "mono",
    mountType: "mural",
    quoteMode: "subscription",
  };
}

export function leadToClientForm(lead: Lead): LeadClientFormValues {
  return {
    companyName: lead.companyName,
    contactName: lead.contactName,
    email: lead.email,
    phone: lead.phone,
    address: lead.address,
    notes: lead.notes ?? "",
    commercialId: lead.commercialId,
    chargerCount: String(lead.projectSpecs?.commercial?.chargerCount ?? 1),
    supplyType: lead.projectSpecs?.commercial?.supplyType ?? "mono",
    mountType: lead.projectSpecs?.commercial?.mountType ?? "mural",
    quoteMode: lead.projectSpecs?.commercial?.quoteMode === "detailed" ? "detailed" : "subscription",
  };
}

export function parseChargerCount(raw: string): number {
  return Math.max(1, Math.floor(Number(raw) || 1));
}

export function buildCommercialProjectSpecs(
  form: LeadClientFormValues,
  existing?: ProjectSpecs,
  options?: { markSubmitted?: boolean }
): ProjectSpecs {
  const chargerCount = parseChargerCount(form.chargerCount);
  const commercial = {
    ...(existing?.commercial ?? {}),
    chargerCount,
    supplyType: form.supplyType,
    mountType: form.mountType,
    quoteMode: form.quoteMode,
    ...(options?.markSubmitted ? { submittedAt: new Date().toISOString() } : {}),
  };
  return { ...(existing ?? {}), commercial };
}

export function buildLeadPatchFromClientForm(
  form: LeadClientFormValues,
  existing?: ProjectSpecs,
  options?: { includeCommercialId?: boolean; markSubmitted?: boolean }
): Partial<Lead> {
  const patch: Partial<Lead> = {
    companyName: form.companyName.trim(),
    contactName: form.contactName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    address: form.address.trim(),
    notes: form.notes.trim() || undefined,
    projectSpecs: buildCommercialProjectSpecs(form, existing, { markSubmitted: options?.markSubmitted }),
  };
  if (options?.includeCommercialId) {
    patch.commercialId = form.commercialId.trim() || "admin";
  }
  return patch;
}

/** Dossier admin complet : prêt pour planification site survey. */
export function adminCreateWorkflowStage(): WorkflowStage {
  return "attente_admin";
}
