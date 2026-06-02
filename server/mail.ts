import nodemailer from "nodemailer";
import type { QuoteDocument } from "../src/lib/quoteDocument";
import { buildQuoteEmailContent } from "./quoteEmailTemplate";
import { generateQuotePdfBuffer } from "./quotePdf";

/** True si l’envoi SMTP est configurable (MAIL_FROM + SMTP_HOST). */
export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.MAIL_FROM?.trim());
}

function createTransport(): nodemailer.Transporter {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) {
    throw new Error("SMTP_HOST manquant");
  }
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

/** Vérifie la connexion SMTP (auth + TLS) sans envoyer de message. */
export async function verifySmtpConnection(): Promise<void> {
  if (!isSmtpConfigured()) {
    throw new Error("SMTP non configuré (SMTP_HOST, MAIL_FROM)");
  }
  const transporter = createTransport();
  await transporter.verify();
}

/**
 * Envoie le devis au client : e-mail HTML (charte site) + PDF joint.
 */
export async function sendQuoteOfferEmail(
  doc: QuoteDocument,
  existingPdf?: Buffer
): Promise<void> {
  const from = process.env.MAIL_FROM?.trim();
  if (!from) {
    throw new Error("MAIL_FROM manquant");
  }
  const transporter = createTransport();
  const { subject, text, html } = buildQuoteEmailContent(doc);
  const pdfBuffer = existingPdf ?? (await generateQuotePdfBuffer(doc));
  const pdfName = `Devis-${doc.quoteNumber.replace(/[^\w-]+/g, "_")}.pdf`;

  await transporter.sendMail({
    from,
    to: doc.email,
    replyTo: process.env.MAIL_REPLY_TO?.trim() || "hello@itelec-charge.be",
    subject,
    text,
    html,
    attachments: [
      {
        filename: pdfName,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

/** Notification interne — formulaire « Demande de devis » du site vitrine. */
export async function sendDevisRequestNotificationEmail(opts: {
  to: string;
  data: { name: string; email: string };
  leadId: string | null;
  html: string;
  text: string;
}): Promise<void> {
  const from = process.env.MAIL_FROM?.trim();
  if (!from) {
    throw new Error("MAIL_FROM manquant");
  }
  const transporter = createTransport();
  const subject = `Demande de devis — ${opts.data.name}`;
  await transporter.sendMail({
    from,
    to: opts.to,
    replyTo: opts.data.email,
    subject,
    text: opts.text,
    html: opts.html,
  });
}
