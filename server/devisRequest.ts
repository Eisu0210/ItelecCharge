import crypto from "node:crypto";
import type { Request } from "express";
import { q } from "./db/pool";
import { leadToInsertRow } from "./leadMap";
import { isSmtpConfigured, sendDevisRequestNotificationEmail } from "./mail";
import type { Lead } from "../src/types";

export type DevisRequestPayload = {
  name: string;
  email: string;
  phone: string;
  address: string;
  message: string;
};

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function parseDevisRequestBody(body: unknown): { ok: true; data: DevisRequestPayload } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Corps de requête invalide." };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.website === "string" && b.website.trim()) {
    return { ok: false, error: "Requête refusée." };
  }
  const name = String(b.name ?? "").trim();
  const email = String(b.email ?? "").trim().toLowerCase();
  const phone = String(b.phone ?? "").trim();
  const address = String(b.address ?? "").trim();
  const message = String(b.message ?? "").trim();

  if (name.length < 2 || name.length > 120) {
    return { ok: false, error: "Indiquez un nom ou une société (2 à 120 caractères)." };
  }
  if (!isValidEmail(email) || email.length > 254) {
    return { ok: false, error: "Adresse e-mail invalide." };
  }
  if (phone.length > 40) {
    return { ok: false, error: "Numéro de téléphone trop long." };
  }
  if (address.length < 5 || address.length > 300) {
    return { ok: false, error: "Indiquez l’adresse du site (rue, code postal et commune)." };
  }
  if (message.length < 10 || message.length > 5000) {
    return { ok: false, error: "Décrivez votre projet en au moins 10 caractères." };
  }

  return { ok: true, data: { name, email, phone, address, message } };
}

export function getDevisRequestInbox(): string {
  return (
    process.env.DEVIS_REQUEST_TO?.trim() ||
    process.env.MAIL_REPLY_TO?.trim() ||
    process.env.COMPANY_EMAIL?.trim() ||
    "hello@itelec-charge.be"
  );
}

export function buildDevisRequestEmailHtml(data: DevisRequestPayload, leadId?: string): string {
  const phoneLine = data.phone
    ? `<tr><td style="padding:6px 12px 6px 0;color:#5a6b7a;vertical-align:top;">Téléphone</td><td>${escHtml(data.phone)}</td></tr>`
    : "";
  const leadLine = leadId
    ? `<p style="margin:16px 0 0;font-size:13px;color:#5a6b7a;">Dossier créé : <strong>${escHtml(leadId)}</strong></p>`
    : "";
  return `<!DOCTYPE html><html lang="fr"><body style="font-family:system-ui,sans-serif;color:#1a2b3c;line-height:1.5;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <p style="margin:0 0 8px;font-size:13px;color:#006837;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">ITELEC CHARGE</p>
    <h1 style="margin:0 0 16px;font-size:20px;color:#003358;">Nouvelle demande de devis</h1>
    <table style="border-collapse:collapse;font-size:15px;">
      <tr><td style="padding:6px 12px 6px 0;color:#5a6b7a;vertical-align:top;">Nom / société</td><td><strong>${escHtml(data.name)}</strong></td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#5a6b7a;vertical-align:top;">E-mail</td><td><a href="mailto:${escHtml(data.email)}">${escHtml(data.email)}</a></td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#5a6b7a;vertical-align:top;">Adresse du site</td><td style="white-space:pre-wrap;">${escHtml(data.address)}</td></tr>
      ${phoneLine}
    </table>
    <div style="margin-top:20px;padding:16px;background:#f4f7fa;border-radius:10px;border:1px solid #d8e0e6;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#003358;">Projet</p>
      <p style="margin:0;white-space:pre-wrap;">${escHtml(data.message)}</p>
    </div>
    ${leadLine}
  </div></body></html>`;
}

export function buildDevisRequestEmailText(data: DevisRequestPayload, leadId?: string): string {
  const lines = [
    "Nouvelle demande de devis — ITELEC CHARGE",
    "",
    `Nom / société : ${data.name}`,
    `E-mail : ${data.email}`,
  ];
  if (data.phone) lines.push(`Téléphone : ${data.phone}`);
  lines.push(`Adresse du site : ${data.address}`, "", "Projet :", data.message);
  if (leadId) lines.push("", `Dossier : ${leadId}`);
  return lines.join("\n");
}

async function createLeadFromDevisRequest(data: DevisRequestPayload): Promise<string | null> {
  const commercialId = process.env.DEVIS_REQUEST_COMMERCIAL_ID?.trim() || "site";
  const id = `web-${crypto.randomUUID()}`;
  const lead = {
    id,
    createdAt: new Date().toISOString(),
    commercialId,
    companyName: data.name,
    contactName: data.name,
    email: data.email,
    phone: data.phone || "—",
    address: data.address,
    notes: `[Demande site web — ${new Date().toLocaleString("fr-BE", { timeZone: "Europe/Brussels" })}]\n\n${data.message}`,
    status: "nouveau" as const,
    workflowStage: "attente_admin" as const,
    projectSpecs: { intakeSource: "website_devis_form" },
    createdByUserId: null,
  } as Lead & { createdByUserId: null };

  await q(
    `INSERT INTO leads (
      id, created_at, commercial_id, company_name, contact_name, email, phone, address, notes, status,
      quote_amount_htva, installer_id, slot_start, slot_end, onsite_notified_at, commission_paid, client_paid,
      report, survey_photos, survey_materials, workflow_stage, project_specs, created_by_user_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
    leadToInsertRow(lead)
  );
  return id;
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_MAX = 8;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export function checkDevisRequestRateLimit(req: Request): string | null {
  const ip =
    (typeof req.headers["x-forwarded-for"] === "string"
      ? req.headers["x-forwarded-for"].split(",")[0]?.trim()
      : null) || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return null;
  }
  bucket.count += 1;
  if (bucket.count > RATE_MAX) {
    return "Trop de demandes envoyées. Réessayez dans une heure.";
  }
  return null;
}

export async function handleDevisRequest(
  data: DevisRequestPayload
): Promise<{ leadId: string | null }> {
  if (!isSmtpConfigured()) {
    throw Object.assign(new Error("SMTP non configuré"), { code: "SMTP_NOT_CONFIGURED" });
  }

  let leadId: string | null = null;
  try {
    leadId = await createLeadFromDevisRequest(data);
  } catch (dbErr) {
    console.error("[devis-request] Création dossier échouée (e-mail envoyé quand même) :", dbErr);
  }

  await sendDevisRequestNotificationEmail({
    to: getDevisRequestInbox(),
    data,
    leadId,
    html: buildDevisRequestEmailHtml(data, leadId ?? undefined),
    text: buildDevisRequestEmailText(data, leadId ?? undefined),
  });

  return { leadId };
}
