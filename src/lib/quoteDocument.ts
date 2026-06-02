import type { Lead, MountType, ProjectSpecs, QuoteSupplementLine, SupplyType } from "../types";
import { buildSiteSurveyPricing, getQuoteMode, subscriptionBaseLabel } from "./quotePricing";
import { getDefaultVatRate, quoteVatBreakdown } from "./quoteVat";

export interface QuoteDocumentLine {
  label: string;
  amountHtva: number;
}

export interface QuoteDocumentMaterial {
  label: string;
  quantity: number;
  unit: string;
}

/** Données structurées pour PDF, e-mail HTML et page client. */
export interface QuoteDocument {
  quoteNumber: string;
  quoteDate: string;
  validUntil: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  baseInstallationHtva: number;
  baseLabel: string;
  supplements: QuoteDocumentLine[];
  totalHtva: number;
  mountLabel?: string;
  supplyLabel?: string;
  chargerCount?: number;
  cableLengthM?: number;
  trenchLengthM?: number;
  trenchLabel?: string;
  headAmperageA?: number;
  materials: QuoteDocumentMaterial[];
  quoteMode: "subscription" | "detailed";
  portalUrl: string;
  cgvUrl: string;
  vatRate: number;
  vatRatePercent: number;
  vatAmount: number;
  totalTvac: number;
  /** ISO — date d’émission figée (envoi du devis). */
  issuedAtIso?: string;
  notes?: string;
}

const MOUNT_LABELS: Record<MountType, string> = {
  mural: "Pose murale (forfait)",
  pied: "Pose sur pied (forfait)",
};

const SUPPLY_LABELS: Record<SupplyType, string> = {
  mono: "Alimentation monophasée",
  tri: "Alimentation triphasée",
};

function formatQuoteDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-BE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function formatEuro(amount: number): string {
  return new Intl.NumberFormat("fr-BE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function buildQuoteDocument(lead: Lead, portalUrl: string, validDays = 30): QuoteDocument {
  const specs: ProjectSpecs = lead.projectSpecs ?? {};
  const site = specs.siteSurvey ?? {};
  const commercial = specs.commercial ?? {};
  const quoteMode = getQuoteMode(lead);
  const pricing = buildSiteSurveyPricing(site, lead);
  const { baseInstallationHtva, supplements, materialLines, totalHtva } = pricing;
  const mount = commercial.mountType;
  const baseLabel =
    quoteMode === "subscription"
      ? `Installation forfait abonnement — ${subscriptionBaseLabel(lead)}`
      : baseInstallationHtva > 0
        ? mount === "pied"
          ? "Installation et pose sur pied — HTVA"
          : mount === "mural"
            ? "Installation et pose murale — HTVA"
            : "Installation et pose — HTVA"
        : "Prestations d’installation (devis au détail)";

  const trenchLabel =
    site.trenchType === "concrete"
      ? "Tranchée béton (réfection comprise)"
      : site.trenchType === "earth"
        ? "Tranchée terre plein"
        : undefined;

  const issuedAt = specs.quote?.issuedAt ?? new Date().toISOString();
  const validUntilIso = specs.quote?.validUntil ?? addDays(issuedAt, validDays);
  const vatRate = specs.quote?.vatRate ?? getDefaultVatRate();
  const vat = quoteVatBreakdown(totalHtva, vatRate);
  const cgvUrl = specs.quote?.cgvUrl?.trim() || "";

  return {
    quoteNumber: specs.quote?.quoteNumber ?? lead.id.replace(/^lead-/, "DEV-").toUpperCase(),
    quoteDate: formatQuoteDate(issuedAt),
    validUntil: formatQuoteDate(validUntilIso),
    issuedAtIso: issuedAt,
    companyName: lead.companyName,
    contactName: lead.contactName,
    email: lead.email,
    phone: lead.phone,
    address: lead.address,
    baseInstallationHtva,
    baseLabel,
    supplements: supplements.map((s: QuoteSupplementLine) => ({
      label: s.label,
      amountHtva: Number(s.amountHtva) || 0,
    })),
    totalHtva,
    mountLabel: mount ? MOUNT_LABELS[mount] : undefined,
    supplyLabel: commercial.supplyType ? SUPPLY_LABELS[commercial.supplyType] : undefined,
    chargerCount: commercial.chargerCount,
    cableLengthM: site.cableLengthM,
    trenchLengthM: site.trenchLengthM,
    trenchLabel,
    headAmperageA: site.headAmperageA,
    materials: materialLines.map((line) => ({
      label: line.label,
      quantity: 1,
      unit: "ligne",
    })),
    quoteMode,
    portalUrl,
    cgvUrl,
    vatRate: vat.vatRate,
    vatRatePercent: vat.vatRatePercent,
    vatAmount: vat.vatAmount,
    totalTvac: vat.totalTvac,
    notes: lead.notes,
  };
}

/** Bloc récapitulatif TVA / TVAC pour affichage (page client, e-mails). */
export function formatQuoteTotalsBlock(doc: Pick<QuoteDocument, "totalHtva" | "vatRatePercent" | "vatAmount" | "totalTvac">) {
  return {
    totalHtvaLabel: formatEuro(doc.totalHtva),
    vatLabel: `TVA ${doc.vatRatePercent} %`,
    vatAmountLabel: formatEuro(doc.vatAmount),
    totalTvacLabel: formatEuro(doc.totalTvac),
  };
}
