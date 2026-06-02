import nodemailer from "nodemailer";
import type { QuoteElectronicAcceptance } from "../src/lib/quoteAcceptance.js";
import { formatAcceptanceProofText } from "../src/lib/quoteAcceptance.js";
import type { QuoteDocument } from "../src/lib/quoteDocument.js";
import { formatEuro, formatQuoteTotalsBlock } from "../src/lib/quoteDocument.js";
import { isSmtpConfigured } from "./mail.js";

function createTransport(): nodemailer.Transporter {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) throw new Error("SMTP_HOST manquant");
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure =
    process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1" || port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
    requireTLS: !secure && port === 587,
  });
}

export async function sendQuoteAcceptanceConfirmationEmail(
  doc: QuoteDocument,
  proof: QuoteElectronicAcceptance,
  pdfBuffer: Buffer
): Promise<void> {
  if (!isSmtpConfigured()) return;
  const from = process.env.MAIL_FROM?.trim();
  if (!from) throw new Error("MAIL_FROM manquant");

  const totals = formatQuoteTotalsBlock(doc);
  const proofLine = formatAcceptanceProofText(proof);
  const subject = `Confirmation — devis n° ${doc.quoteNumber} accepté électroniquement`;
  const text = [
    `Bonjour ${doc.contactName},`,
    "",
    "Nous accusons réception de votre acceptation électronique du devis suivant.",
    "",
    `Devis n° ${doc.quoteNumber}`,
    `Total HTVA : ${totals.totalHtvaLabel}`,
    `${totals.vatLabel} : ${totals.vatAmountLabel}`,
    `Total TVAC à payer : ${totals.totalTvacLabel}`,
    "",
    proofLine,
    "",
    "Vous trouverez en pièce jointe le PDF du devis tel qu’accepté.",
    "",
    "Cordialement,",
    "L’équipe Itelec Charge",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/></head>
<body style="font-family:system-ui,sans-serif;color:#1a2b3c;line-height:1.5;">
  <p>Bonjour <strong>${doc.contactName}</strong>,</p>
  <p>Nous accusons réception de votre <strong>acceptation électronique</strong> du devis <strong>n° ${doc.quoteNumber}</strong>.</p>
  <table style="margin:16px 0;border-collapse:collapse;">
    <tr><td style="padding:6px 12px;color:#5a6b7a;">Total HTVA</td><td style="padding:6px 12px;font-weight:700;">${totals.totalHtvaLabel}</td></tr>
    <tr><td style="padding:6px 12px;color:#5a6b7a;">${totals.vatLabel}</td><td style="padding:6px 12px;font-weight:700;">${totals.vatAmountLabel}</td></tr>
    <tr><td style="padding:6px 12px;color:#003358;font-weight:700;">Total TVAC à payer</td><td style="padding:6px 12px;font-weight:800;color:#006837;">${totals.totalTvacLabel}</td></tr>
  </table>
  <p style="font-size:13px;color:#5a6b7a;background:#f0f7f4;padding:12px;border-radius:6px;">${proofLine}</p>
  <p>Le PDF du devis accepté est joint à ce message.</p>
  <p style="font-size:13px;color:#5a6b7a;">Itelec Charge</p>
</body></html>`;

  const pdfName = `Devis-accepte-${doc.quoteNumber.replace(/[^\w-]+/g, "_")}.pdf`;
  const transporter = createTransport();
  await transporter.sendMail({
    from,
    to: doc.email,
    replyTo: process.env.MAIL_REPLY_TO?.trim() || "hello@itelec-charge.be",
    subject,
    text,
    html,
    attachments: [{ filename: pdfName, content: pdfBuffer, contentType: "application/pdf" }],
  });
}
