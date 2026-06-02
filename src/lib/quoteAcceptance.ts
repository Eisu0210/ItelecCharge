/** Preuve d’acceptation électronique du devis (conservation côté dossier). */
export interface QuoteElectronicAcceptance {
  at: string;
  signerName: string;
  signerEmail: string;
  ip: string;
  userAgent: string;
  acceptTerms: boolean;
  acceptCgv: boolean;
  quoteNumber: string;
  totalHtva: number;
  vatRatePercent: number;
  vatAmount: number;
  totalTvac: number;
  /** Empreinte SHA-256 du PDF accepté (version figée au moment de l’acceptation). */
  documentSha256: string;
  /** Empreinte du PDF envoyé initialement au client (si disponible). */
  sentDocumentSha256?: string;
}

export type QuoteAuditEventType = "quote_sent" | "quote_accepted";

export interface QuoteAuditEvent {
  id: string;
  type: QuoteAuditEventType;
  at: string;
  quoteNumber?: string;
  documentSha256?: string;
  ip?: string;
  userAgent?: string;
  signerName?: string;
  signerEmail?: string;
  totalTvac?: number;
}

export function formatAcceptanceProofText(proof: QuoteElectronicAcceptance): string {
  const at = new Date(proof.at).toLocaleString("fr-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    `Devis n° ${proof.quoteNumber} accepté électroniquement le ${at} par ${proof.signerName}, ` +
    `via l’adresse e-mail ${proof.signerEmail}, IP ${proof.ip}, ` +
    `document SHA-256 ${proof.documentSha256}`
  );
}

export function formatAcceptanceProofShort(proof: QuoteElectronicAcceptance): string {
  const at = new Date(proof.at).toLocaleString("fr-BE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Accepté le ${at} par ${proof.signerName} — total TVAC ${proof.totalTvac.toLocaleString("fr-BE", { style: "currency", currency: "EUR" })}`;
}
