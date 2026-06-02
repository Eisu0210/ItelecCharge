import type { Lead, LeadStatus, WorkflowStage } from "../types";

export const statusLabels: Record<LeadStatus, string> = {
  nouveau: "Nouveau",
  devis_envoye: "Devis envoyé",
  devis_accepte: "Devis accepté",
  installation_planifiee: "Installation planifiée",
  en_cours: "Installation en cours",
  cloture: "Clôturé",
};

export const workflowLabels: Record<WorkflowStage, string> = {
  commercial_brouillon: "1. Brouillon commercial",
  attente_admin: "2. Attente planif. site survey (admin)",
  survey_planifie: "3. Site survey planifié",
  survey_terrain: "4. Relevé terrain en cours",
  devis_pret: "5. Devis prêt à envoyer",
  devis_envoye_sign: "6. Devis envoyé — signature client",
  devis_signe: "7. Devis signé",
};

export function workflowStageLabel(lead: Lead): string {
  if (!lead.workflowStage) return "—";
  return workflowLabels[lead.workflowStage];
}
