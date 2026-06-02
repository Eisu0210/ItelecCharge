import { createHash, randomUUID } from "node:crypto";
import type { Lead, ProjectSpecs } from "../src/types.js";
import type { QuoteAuditEvent, QuoteElectronicAcceptance } from "../src/lib/quoteAcceptance.js";
import { buildQuoteDocument, type QuoteDocument } from "../src/lib/quoteDocument.js";
import { getDefaultVatRate } from "../src/lib/quoteVat.js";
import { getPublicAppBaseUrl } from "./publicAppUrl.js";
import { generateQuotePdfBuffer } from "./quotePdf.js";

export function sha256Buffer(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export function getCgvUrl(): string {
  const fromEnv = process.env.APP_CGV_URL?.trim() || process.env.VITE_CGV_URL?.trim();
  if (fromEnv && /^https?:\/\//i.test(fromEnv)) {
    return fromEnv.replace(/\/$/, "");
  }
  return `${getPublicAppBaseUrl()}/conditions-generales`;
}

export function getClientIp(req: {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}): string {
  const xf = req.headers["x-forwarded-for"];
  const first = Array.isArray(xf) ? xf[0] : xf;
  if (first) return String(first).split(",")[0]?.trim() || "inconnu";
  return req.socket?.remoteAddress?.trim() || "inconnu";
}

export function getUserAgent(req: { headers: Record<string, string | string[] | undefined> }): string {
  const ua = req.headers["user-agent"];
  return (Array.isArray(ua) ? ua[0] : ua)?.trim() || "inconnu";
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** Figé à l’envoi : dates, numéro, TVA, URL CGV, empreinte PDF. */
export async function freezeQuoteSpecs(
  lead: Lead,
  portalUrl: string,
  totalHtva: number,
  token: string,
  validDays = 30
): Promise<{ specs: ProjectSpecs; doc: QuoteDocument; pdfBuffer: Buffer; documentSha256: string }> {
  const merged: ProjectSpecs = { ...(lead.projectSpecs ?? {}) };
  const issuedAt = new Date().toISOString();
  const quoteNumber = lead.id.replace(/^lead-/, "DEV-").toUpperCase();
  const vatRate = getDefaultVatRate();
  const cgvUrl = getCgvUrl();

  merged.quote = {
    ...(merged.quote ?? {}),
    quoteNumber,
    issuedAt,
    validUntil: addDaysIso(issuedAt, validDays),
    vatRate,
    cgvUrl,
    totalHtva,
    sentAt: issuedAt,
    accessToken: token,
    clientPortalUrl: portalUrl,
  };

  const leadFrozen = { ...lead, quoteAmountHtva: totalHtva, projectSpecs: merged };
  const doc = { ...buildQuoteDocument(leadFrozen, portalUrl, validDays), cgvUrl, email: lead.email };
  const pdfBuffer = await generateQuotePdfBuffer(doc);
  const documentSha256 = sha256Buffer(pdfBuffer);
  merged.quote = {
    ...merged.quote,
    documentSha256,
    auditLog: appendAudit(merged.quote?.auditLog, {
      id: randomUUID(),
      type: "quote_sent",
      at: new Date().toISOString(),
      quoteNumber: doc.quoteNumber,
      documentSha256,
      totalTvac: doc.totalTvac,
    }),
  };
  return { specs: merged, doc, pdfBuffer, documentSha256 };
}

export async function buildAcceptedQuoteArtifacts(
  lead: Lead,
  portalUrl: string
): Promise<{ doc: QuoteDocument; pdfBuffer: Buffer; documentSha256: string }> {
  const doc = buildQuoteDocument({ ...lead, projectSpecs: lead.projectSpecs }, portalUrl);
  const docFull = { ...doc, cgvUrl: lead.projectSpecs?.quote?.cgvUrl || getCgvUrl(), email: lead.email };
  const pdfBuffer = await generateQuotePdfBuffer(docFull);
  return { doc: docFull, pdfBuffer, documentSha256: sha256Buffer(pdfBuffer) };
}

export function appendAudit(
  existing: QuoteAuditEvent[] | undefined,
  event: QuoteAuditEvent
): QuoteAuditEvent[] {
  return [...(existing ?? []), event];
}

export function recordElectronicAcceptance(
  specs: ProjectSpecs,
  input: {
    signerName: string;
    signerEmail: string;
    ip: string;
    userAgent: string;
    acceptTerms: boolean;
    acceptCgv: boolean;
    doc: QuoteDocument;
    documentSha256: string;
  }
): ProjectSpecs {
  const q = specs.quote ?? {};
  const proof: QuoteElectronicAcceptance = {
    at: new Date().toISOString(),
    signerName: input.signerName,
    signerEmail: input.signerEmail,
    ip: input.ip,
    userAgent: input.userAgent,
    acceptTerms: input.acceptTerms,
    acceptCgv: input.acceptCgv,
    quoteNumber: input.doc.quoteNumber,
    totalHtva: input.doc.totalHtva,
    vatRatePercent: input.doc.vatRatePercent,
    vatAmount: input.doc.vatAmount,
    totalTvac: input.doc.totalTvac,
    documentSha256: input.documentSha256,
    sentDocumentSha256: q.documentSha256,
  };

  return {
    ...specs,
    quote: {
      ...q,
      signedAt: proof.at,
      clientSignedName: proof.signerName,
      acceptance: proof,
      auditLog: appendAudit(q.auditLog, {
        id: randomUUID(),
        type: "quote_accepted",
        at: proof.at,
        quoteNumber: proof.quoteNumber,
        documentSha256: proof.documentSha256,
        ip: proof.ip,
        userAgent: proof.userAgent,
        signerName: proof.signerName,
        signerEmail: proof.signerEmail,
        totalTvac: proof.totalTvac,
      }),
    },
  };
}
