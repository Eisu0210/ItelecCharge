import { statusLabels, workflowLabels } from "../data/store";
import type { Lead, LeadStatus, WorkflowStage } from "../types";

/** Ordre du parcours multi-étapes (commercial → admin → site survey → devis → signature). */
export const WORKFLOW_STAGE_ORDER: WorkflowStage[] = [
  "commercial_brouillon",
  "attente_admin",
  "survey_planifie",
  "survey_terrain",
  "devis_pret",
  "devis_envoye_sign",
  "devis_signe",
];

const STATUS_PROGRESS_ORDER: LeadStatus[] = [
  "nouveau",
  "devis_envoye",
  "devis_accepte",
  "installation_planifiee",
  "en_cours",
  "cloture",
];

/** Après signature du devis : le statut opérationnel prime sur workflow_stage (souvent resté à devis_signe). */
const POST_QUOTE_STATUSES: LeadStatus[] = ["installation_planifiee", "en_cours", "cloture"];

function isPostQuotePhase(lead: Lead): boolean {
  return POST_QUOTE_STATUSES.includes(lead.status);
}

/** Statut « legacy » aligné sur l’étape pipeline pour la liste clients. */
export function deriveStatusFromWorkflow(stage: WorkflowStage): LeadStatus {
  switch (stage) {
    case "commercial_brouillon":
      return "nouveau";
    case "attente_admin":
    case "survey_planifie":
    case "survey_terrain":
    case "devis_pret":
    case "devis_envoye_sign":
      return "devis_envoye";
    case "devis_signe":
      return "devis_accepte";
    default:
      return "nouveau";
  }
}

export function normalizeLeadPatch(patch: Partial<Lead>): Partial<Lead> {
  if (!patch.workflowStage) return patch;
  if (Object.prototype.hasOwnProperty.call(patch, "status")) return patch;
  return { ...patch, status: deriveStatusFromWorkflow(patch.workflowStage) };
}

function mergeProjectSpecs(
  current: Lead["projectSpecs"],
  next: Lead["projectSpecs"] | undefined
): Lead["projectSpecs"] | undefined {
  if (next === undefined) return current;
  return {
    commercial: { ...(current?.commercial ?? {}), ...(next.commercial ?? {}) },
    admin: { ...(current?.admin ?? {}), ...(next.admin ?? {}) },
    siteSurvey: { ...(current?.siteSurvey ?? {}), ...(next.siteSurvey ?? {}) },
    quote: { ...(current?.quote ?? {}), ...(next.quote ?? {}) },
  };
}

/** Applique un patch côté client (affichage immédiat dans la liste). */
export function applyLeadPatch(lead: Lead, patch: Partial<Lead>): Lead {
  const normalized = normalizeLeadPatch(patch);
  const next: Lead = { ...lead, ...normalized };
  if (Object.prototype.hasOwnProperty.call(normalized, "projectSpecs")) {
    next.projectSpecs = mergeProjectSpecs(lead.projectSpecs, normalized.projectSpecs);
  }
  return next;
}

export function pipelineProgressRank(lead: Lead): number {
  const si = STATUS_PROGRESS_ORDER.indexOf(lead.status);
  if (lead.status === "cloture") return 400;
  if (lead.status === "en_cours") return 300;
  if (lead.status === "installation_planifiee") return 290;
  if (lead.workflowStage) {
    const i = WORKFLOW_STAGE_ORDER.indexOf(lead.workflowStage);
    return i >= 0 ? i : WORKFLOW_STAGE_ORDER.length;
  }
  return 100 + (si >= 0 ? si : STATUS_PROGRESS_ORDER.length);
}

/** Libellé de la colonne « Étape » (parcours commercial jusqu’à devis signé, puis statut chantier). */
export function displayPipelineLabel(lead: Lead): string {
  if (isPostQuotePhase(lead)) return statusLabels[lead.status];
  if (lead.workflowStage) return workflowLabels[lead.workflowStage];
  return statusLabels[lead.status];
}

export function displayStatusLabel(lead: Lead): string {
  return statusLabels[lead.status];
}

export function pipelineRowClass(lead: Lead): string {
  if (lead.status === "cloture") return "clients-row-done";
  if (isPostQuotePhase(lead)) return "clients-row-active";
  if (lead.workflowStage === "devis_signe" || lead.status === "devis_accepte") {
    return "clients-row-active";
  }
  if (
    lead.workflowStage === "survey_terrain" ||
    lead.workflowStage === "devis_pret" ||
    lead.workflowStage === "devis_envoye_sign"
  ) {
    return "clients-row-active";
  }
  if (lead.status === "installation_planifiee" || lead.status === "en_cours") return "clients-row-active";
  return "";
}

export function pipelineBadgeClass(lead: Lead): string {
  if (lead.status === "cloture") return "badge badge-green";
  if (lead.workflowStage === "devis_signe" || lead.status === "devis_accepte") return "badge badge-green";
  if (
    lead.workflowStage === "survey_terrain" ||
    lead.workflowStage === "devis_pret" ||
    lead.workflowStage === "devis_envoye_sign" ||
    lead.status === "installation_planifiee" ||
    lead.status === "en_cours"
  ) {
    return "badge badge-orange";
  }
  if (lead.workflowStage === "attente_admin" || lead.workflowStage === "survey_planifie") {
    return "badge badge-yellow";
  }
  return "badge";
}

export function compareLeadsByPipeline(a: Lead, b: Lead): number {
  const rankA = pipelineProgressRank(a);
  const rankB = pipelineProgressRank(b);
  if (rankA !== rankB) return rankA - rankB;
  return a.companyName.localeCompare(b.companyName, "fr", { sensitivity: "base" });
}
