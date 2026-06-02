import type {
  Lead,
  MountType,
  ProjectSpecs,
  QuotePricingMode,
  QuoteSupplementLine,
  SiteSurveyProjectSpecs,
  SurveyMaterialItem,
} from "../types";

/** Forfait HTVA par borne — offre avec abonnement (matériel inclus). */
export const BASE_MURAL_HTVA = 1600;
export const BASE_PIED_HTVA = 2000;
export const INCLUDED_CABLE_M = 10;
export const INCLUDED_TRENCH_M = 2;
export const EUR_CABLE_SUPP_PER_M = 20;
export const EUR_TRENCH_EARTH_PER_M = 40;
export const EUR_TRENCH_CONCRETE_PER_M = 68;

export const QUOTE_MODE_LABELS: Record<QuotePricingMode, string> = {
  subscription: "Avec abonnement (forfait 1 600 / 2 000 € × bornes, matériel inclus)",
  detailed: "Sans abonnement (devis détaillé — catalogue matériel)",
};

export function getQuoteMode(lead: Lead): QuotePricingMode {
  return lead.projectSpecs?.commercial?.quoteMode === "detailed" ? "detailed" : "subscription";
}

export function chargerCountFromLead(lead: Lead): number {
  return Math.max(1, Math.floor(Number(lead.projectSpecs?.commercial?.chargerCount) || 1));
}

export function unitPriceForMount(mount?: MountType): number {
  if (mount === "pied") return BASE_PIED_HTVA;
  return BASE_MURAL_HTVA;
}

/** Total forfait installation abonnement = prix unitaire × nombre de bornes. */
export function defaultSubscriptionBase(lead: Lead): number {
  return unitPriceForMount(lead.projectSpecs?.commercial?.mountType) * chargerCountFromLead(lead);
}

/** Base d’installation suggérée selon le mode de devis. */
export function suggestedInstallationBase(lead: Lead): number {
  if (getQuoteMode(lead) === "detailed") {
    const manual = lead.projectSpecs?.siteSurvey?.baseInstallationHtva;
    return manual != null && Number.isFinite(manual) ? manual : 0;
  }
  return defaultSubscriptionBase(lead);
}

/** @deprecated Utiliser suggestedInstallationBase ou defaultSubscriptionBase. */
export function defaultBaseFromMount(lead: Lead): number {
  return suggestedInstallationBase(lead);
}

export function subscriptionBaseLabel(lead: Lead): string {
  const count = chargerCountFromLead(lead);
  const unit = unitPriceForMount(lead.projectSpecs?.commercial?.mountType);
  const mount =
    lead.projectSpecs?.commercial?.mountType === "pied"
      ? "sur pied"
      : lead.projectSpecs?.commercial?.mountType === "mural"
        ? "murale"
        : "standard";
  return `${count} borne(s) ${mount} × ${unit.toLocaleString("fr-BE")} € HTVA (matériel inclus)`;
}

export function billableCableMeters(totalCableM: number | undefined): number {
  const cable = Number(totalCableM);
  if (!Number.isFinite(cable) || cable <= INCLUDED_CABLE_M) return 0;
  return Math.round((cable - INCLUDED_CABLE_M) * 10) / 10;
}

export function billableTrenchMeters(totalTrenchM: number | undefined): number {
  const trench = Number(totalTrenchM);
  if (!Number.isFinite(trench) || trench <= INCLUDED_TRENCH_M) return 0;
  return Math.round((trench - INCLUDED_TRENCH_M) * 10) / 10;
}

export function autoSupplementLines(site: SiteSurveyProjectSpecs): QuoteSupplementLine[] {
  const out: QuoteSupplementLine[] = [];

  const cableBill = billableCableMeters(site.cableLengthM);
  if (cableBill > 0) {
    out.push({
      id: "auto-cable",
      label: `Câble supplémentaire : ${cableBill.toFixed(1)} m × ${EUR_CABLE_SUPP_PER_M} €/m (au-delà des ${INCLUDED_CABLE_M} m inclus)`,
      amountHtva: Math.round(cableBill * EUR_CABLE_SUPP_PER_M * 100) / 100,
    });
  }

  const trenchBill = billableTrenchMeters(site.trenchLengthM);
  const trenchType = site.trenchType ?? "earth";
  if (trenchBill > 0) {
    const rate = trenchType === "concrete" ? EUR_TRENCH_CONCRETE_PER_M : EUR_TRENCH_EARTH_PER_M;
    const labelType = trenchType === "concrete" ? "béton (réfection comprise)" : "terre plein";
    out.push({
      id: "auto-trench",
      label: `Tranchée ${labelType} : ${trenchBill.toFixed(1)} m × ${rate} €/m (au-delà des ${INCLUDED_TRENCH_M} m inclus)`,
      amountHtva: Math.round(trenchBill * rate * 100) / 100,
    });
  }

  return out;
}

export function materialLineTotalHt(item: SurveyMaterialItem): number {
  const unitPrice = Number(item.unitPriceHt);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) return 0;
  const qty = Number(item.quantity);
  if (!Number.isFinite(qty) || qty <= 0) return 0;
  return Math.round(qty * unitPrice * 100) / 100;
}

export function materialQuoteLines(materials: SurveyMaterialItem[] | undefined): QuoteSupplementLine[] {
  if (!materials?.length) return [];
  return materials
    .map((m) => {
      const amountHtva = materialLineTotalHt(m);
      if (amountHtva <= 0) return null;
      const ref = m.articleNumber?.trim() ? ` [${m.articleNumber.trim()}]` : "";
      const qtyLabel = `${m.quantity} ${m.unit} × ${Number(m.unitPriceHt).toFixed(2)} €`;
      return {
        id: `mat-${m.id}`,
        label: `${m.label}${ref} — ${qtyLabel}`,
        amountHtva,
      };
    })
    .filter((line): line is QuoteSupplementLine => line !== null);
}

function sumMaterialsTotalHtva(materials: SurveyMaterialItem[] | undefined): number {
  return Math.round((materials ?? []).reduce((s, m) => s + materialLineTotalHt(m), 0) * 100) / 100;
}

export function computeTotalHtva(specs: ProjectSpecs, lead: Lead): number {
  const mode = getQuoteMode(lead);
  const site = specs.siteSurvey ?? {};
  const base =
    site.baseInstallationHtva ??
    (mode === "subscription" ? defaultSubscriptionBase(lead) : 0);
  const rawSupp = site.supplements ?? [];
  const dynamic = autoSupplementLines(site);
  const fixedSupp = rawSupp.filter((x) => !/^auto-/.test(String(x.id)) && !/^mat-/.test(String(x.id)));
  const sup = [...fixedSupp, ...dynamic].reduce((s, x) => s + (Number(x.amountHtva) || 0), 0);
  const mat = mode === "detailed" ? sumMaterialsTotalHtva(lead.surveyMaterials) : 0;
  return Math.round((base + sup + mat) * 100) / 100;
}

export function computeQuoteTotalForLead(lead: Lead): number {
  const site = lead.projectSpecs?.siteSurvey ?? {};
  const { siteSurvey } = buildSiteSurveyPricing(site, lead);
  return computeTotalHtva({ siteSurvey }, lead);
}

export function buildSiteSurveyPricing(site: SiteSurveyProjectSpecs, lead: Lead) {
  const quoteMode = getQuoteMode(lead);
  const chargerCount = chargerCountFromLead(lead);
  const unitPriceHtva = unitPriceForMount(lead.projectSpecs?.commercial?.mountType);
  const materialsIncludedInForfait = quoteMode === "subscription";

  const baseInstallationHtva =
    site.baseInstallationHtva ??
    (quoteMode === "subscription" ? defaultSubscriptionBase(lead) : 0);

  const auto = autoSupplementLines(site);
  const fixedSupp = (site.supplements ?? []).filter(
    (l) => !/^auto-/.test(String(l.id)) && !/^mat-/.test(String(l.id))
  );
  const installationSupplements = [...fixedSupp, ...auto];
  const materialLines = materialQuoteLines(lead.surveyMaterials);
  const materialsTotalHtva = sumMaterialsTotalHtva(lead.surveyMaterials);
  const supplements = materialsIncludedInForfait
    ? installationSupplements
    : [...installationSupplements, ...materialLines];
  const siteSurvey: SiteSurveyProjectSpecs = { ...site, baseInstallationHtva, supplements: installationSupplements };
  const specs: ProjectSpecs = { siteSurvey };
  const totalHtva = computeTotalHtva(specs, lead);

  return {
    quoteMode,
    chargerCount,
    unitPriceHtva,
    materialsIncludedInForfait,
    siteSurvey,
    installationSupplements,
    materialLines,
    materialsTotalHtva,
    supplements,
    totalHtva,
    baseInstallationHtva,
  };
}
