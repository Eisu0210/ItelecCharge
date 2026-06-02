import crypto from "node:crypto";
import type Stripe from "stripe";
import { q } from "./db/pool";
import { rowToLead } from "./leadMap";
import { getPublicAppBaseUrl } from "./publicAppUrl";
import {
  BILLING_COMMISSION_PERCENT,
  BILLING_SUBSCRIPTION_PHASE1_MONTHS,
  type LeadBillingMeta,
  type LeadBillingPeriodRow,
  commissionOnRecharge,
} from "../src/lib/billing";
import type { Lead, ProjectSpecs } from "../src/types";
import { ensureStripeBillingPrices } from "./stripeProducts";
import { getStripe, isStripeConfigured } from "./stripe";

type LeadRow = {
  id: string;
  created_at: Date;
  commercial_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  notes: string | null;
  status: string;
  quote_amount_htva: string | null;
  installer_id: string | null;
  slot_start: Date | null;
  slot_end: Date | null;
  onsite_notified_at: Date | null;
  commission_paid: boolean | null;
  client_paid: boolean | null;
  report: unknown;
  survey_photos: unknown;
  survey_materials: unknown;
  workflow_stage: string | null;
  project_specs: unknown;
  created_by_user_id: number | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

function billingMetaFromSpecs(specs: ProjectSpecs | undefined): LeadBillingMeta {
  const b = specs?.billing;
  if (!b || typeof b !== "object") return {};
  return b as LeadBillingMeta;
}

function mergeBillingMeta(specs: ProjectSpecs | undefined, patch: LeadBillingMeta): ProjectSpecs {
  const base = specs ?? {};
  return { ...base, billing: { ...billingMetaFromSpecs(base), ...patch } };
}

async function loadLeadRow(leadId: string): Promise<LeadRow | null> {
  const { rows } = await q<LeadRow>(`SELECT * FROM leads WHERE id = $1`, [leadId]);
  return rows[0] ?? null;
}

export async function getOrCreateStripeCustomer(lead: Lead): Promise<string> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe non configuré (STRIPE_SECRET_KEY)");

  const row = await loadLeadRow(lead.id);
  if (row?.stripe_customer_id) return row.stripe_customer_id;

  const customer = await stripe.customers.create({
    email: lead.email || undefined,
    name: lead.companyName,
    phone: lead.phone || undefined,
    metadata: {
      leadId: lead.id,
      contactName: lead.contactName,
    },
    address: lead.address ? { line1: lead.address, country: "BE" } : undefined,
  });

  await q(`UPDATE leads SET stripe_customer_id = $1 WHERE id = $2`, [customer.id, lead.id]);
  return customer.id;
}

/** Lien Stripe Checkout (hors site public) : mandat SEPA ou carte + abonnement mensuel. */
export async function createSubscriptionCheckoutSession(leadId: string): Promise<{ url: string }> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe non configuré");

  const prices = await ensureStripeBillingPrices();
  if (!prices) throw new Error("Impossible de résoudre les prix Stripe");

  const row = await loadLeadRow(leadId);
  if (!row) throw new Error("Dossier introuvable");
  const lead = rowToLead(row as never);
  const customerId = await getOrCreateStripeCustomer(lead);

  const base = getPublicAppBaseUrl().replace(/\/$/, "");
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card", "sepa_debit"],
    line_items: [{ price: prices.phase1PriceId, quantity: 1 }],
    subscription_data: {
      metadata: { leadId: lead.id, phase: "1" },
    },
    metadata: { leadId: lead.id, purpose: "subscription_setup" },
    success_url: `${base}/app/dossier/${lead.id}?billing=success`,
    cancel_url: `${base}/app/dossier/${lead.id}?billing=cancel`,
    locale: "fr",
    billing_address_collection: "required",
  });

  if (!session.url) throw new Error("Session Checkout sans URL");

  const specs = mergeBillingMeta(lead.projectSpecs, { subscriptionStatus: "pending_mandate" });
  await q(`UPDATE leads SET project_specs = $1::jsonb WHERE id = $2`, [JSON.stringify(specs), lead.id]);

  return { url: session.url };
}

/** Après souscription : planning 48 × 59 € puis 35 €/mois (si les deux prix sont configurés). */
export async function attachSubscriptionSchedule(
  subscriptionId: string,
  prices: { phase1PriceId: string; phase2PriceId: string }
): Promise<void> {
  const stripe = getStripe();
  if (!stripe) return;

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  if (sub.schedule) return;

  await stripe.subscriptionSchedules.create({
    from_subscription: subscriptionId,
    end_behavior: "release",
    phases: [
      {
        items: [{ price: prices.phase1PriceId, quantity: 1 }],
        iterations: BILLING_SUBSCRIPTION_PHASE1_MONTHS,
        collection_method: "charge_automatically",
      },
      {
        items: [{ price: prices.phase2PriceId, quantity: 1 }],
        collection_method: "charge_automatically",
      },
    ],
  });
}

export async function syncLeadBillingFromStripe(leadId: string): Promise<LeadBillingMeta & { subscriptionId?: string }> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe non configuré");

  const row = await loadLeadRow(leadId);
  if (!row) throw new Error("Dossier introuvable");

  let subscriptionStatus: LeadBillingMeta["subscriptionStatus"] = "none";
  let currentPhase: 1 | 2 = 1;
  let subscriptionId = row.stripe_subscription_id ?? undefined;

  if (row.stripe_customer_id) {
    const subs = await stripe.subscriptions.list({
      customer: row.stripe_customer_id,
      status: "all",
      limit: 3,
    });
    const active = subs.data.find((s) => s.status === "active" || s.status === "trialing") ?? subs.data[0];
    if (active) {
      subscriptionId = active.id;
      if (active.status === "active" || active.status === "trialing") subscriptionStatus = "active";
      else if (active.status === "past_due" || active.status === "unpaid") subscriptionStatus = "past_due";
      else if (active.status === "canceled") subscriptionStatus = "canceled";
      const phaseMeta = active.metadata?.phase;
      if (phaseMeta === "2") currentPhase = 2;
    }
  }

  const specs = mergeBillingMeta(rowToLead(row as never).projectSpecs, {
    subscriptionStatus,
    currentPhase,
    lastWebhookAt: new Date().toISOString(),
  });

  await q(
    `UPDATE leads SET stripe_subscription_id = $1, project_specs = $2::jsonb WHERE id = $3`,
    [subscriptionId ?? null, JSON.stringify(specs), leadId]
  );

  return { subscriptionStatus, currentPhase, subscriptionId };
}

function rowToBillingPeriod(r: {
  id: string;
  lead_id: string;
  period_label: string;
  gross_recharge_eur: string;
  commission_percent: string;
  commission_eur: string;
  stripe_invoice_id: string | null;
  status: string;
  created_at: Date;
}): LeadBillingPeriodRow {
  return {
    id: r.id,
    leadId: r.lead_id,
    periodLabel: r.period_label,
    grossRechargeEur: Number(r.gross_recharge_eur),
    commissionPercent: Number(r.commission_percent),
    commissionEur: Number(r.commission_eur),
    stripeInvoiceId: r.stripe_invoice_id ?? undefined,
    status: r.status as LeadBillingPeriodRow["status"],
    createdAt: r.created_at.toISOString(),
  };
}

export async function listBillingPeriods(leadId: string): Promise<LeadBillingPeriodRow[]> {
  const { rows } = await q<{
    id: string;
    lead_id: string;
    period_label: string;
    gross_recharge_eur: string;
    commission_percent: string;
    commission_eur: string;
    stripe_invoice_id: string | null;
    status: string;
    created_at: Date;
  }>(
    `SELECT * FROM lead_billing_periods WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 24`,
    [leadId]
  );
  return rows.map(rowToBillingPeriod);
}

/** Commission 12 % sur le CA recharge du mois — facture Stripe séparée (prélèvement auto). */
export async function invoiceRechargeCommission(
  leadId: string,
  periodLabel: string,
  grossRechargeEur: number
): Promise<LeadBillingPeriodRow> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe non configuré");

  if (!Number.isFinite(grossRechargeEur) || grossRechargeEur <= 0) {
    throw new Error("Montant CA recharge invalide");
  }
  const label = periodLabel.trim();
  if (!label) throw new Error("Période requise (ex. 2026-04)");

  const row = await loadLeadRow(leadId);
  if (!row) throw new Error("Dossier introuvable");
  if (!row.stripe_customer_id) {
    throw new Error("Configurez d’abord le prélèvement mensuel (mandat Stripe) pour ce gérant de site.");
  }

  const commissionEur = commissionOnRecharge(grossRechargeEur, BILLING_COMMISSION_PERCENT);
  const amountCents = Math.round(commissionEur * 100);

  await stripe.invoiceItems.create({
    customer: row.stripe_customer_id,
    amount: amountCents,
    currency: "eur",
    description: `Commission recharge ${BILLING_COMMISSION_PERCENT} % — période ${label} (CA ${grossRechargeEur.toFixed(2)} €)`,
    metadata: { leadId, periodLabel: label, grossRechargeEur: String(grossRechargeEur) },
  });

  const invoice = await stripe.invoices.create({
    customer: row.stripe_customer_id,
    collection_method: "charge_automatically",
    auto_advance: true,
    metadata: { leadId, type: "recharge_commission", periodLabel: label },
  });

  const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
  let status: LeadBillingPeriodRow["status"] = "invoiced";
  if (finalized.status === "paid") status = "paid";
  if (finalized.status === "open" && finalized.attempted) status = "failed";

  const periodId = `bp-${crypto.randomUUID().slice(0, 12)}`;
  await q(
    `INSERT INTO lead_billing_periods (
      id, lead_id, period_label, gross_recharge_eur, commission_percent, commission_eur, stripe_invoice_id, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      periodId,
      leadId,
      label,
      grossRechargeEur,
      BILLING_COMMISSION_PERCENT,
      commissionEur,
      finalized.id,
      status,
    ]
  );

  const { rows } = await q(`SELECT * FROM lead_billing_periods WHERE id = $1`, [periodId]);
  return rowToBillingPeriod(rows[0] as never);
}

export async function getLeadBillingSummary(leadId: string) {
  const row = await loadLeadRow(leadId);
  if (!row) throw new Error("Dossier introuvable");
  const lead = rowToLead(row as never);
  const meta = billingMetaFromSpecs(lead.projectSpecs);
  const periods = await listBillingPeriods(leadId);
  return {
    configured: isStripeConfigured(),
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    subscriptionStatus: meta.subscriptionStatus ?? "none",
    currentPhase: meta.currentPhase ?? 1,
    periods,
    model: {
      subscriptionPhase1Eur: 59,
      subscriptionPhase2Eur: 35,
      subscriptionPhase1Months: BILLING_SUBSCRIPTION_PHASE1_MONTHS,
      commissionPercent: BILLING_COMMISSION_PERCENT,
      note:
        "Pas de portail client sur le site vitrine : le gérant signe le mandat via un lien Stripe envoyé depuis l’espace pro. Les recharges sont encaissées par Itelec (CPO) ; la commission est facturée ici chaque mois.",
    },
  };
}

export async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const leadId = session.metadata?.leadId;
  if (!leadId) return;

  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  if (subscriptionId) {
    await q(`UPDATE leads SET stripe_subscription_id = $1 WHERE id = $2`, [subscriptionId, leadId]);
    const prices = await ensureStripeBillingPrices();
    if (prices) {
      try {
        await attachSubscriptionSchedule(subscriptionId, prices);
      } catch (e) {
        console.warn("[stripe] Planification phases abonnement:", e);
      }
    }
  }

  const row = await loadLeadRow(leadId);
  if (!row) return;
  const specs = mergeBillingMeta(rowToLead(row as never).projectSpecs, {
    subscriptionStatus: "active",
    currentPhase: 1,
    lastWebhookAt: new Date().toISOString(),
  });
  await q(`UPDATE leads SET project_specs = $1::jsonb WHERE id = $2`, [JSON.stringify(specs), leadId]);
}

export async function handleSubscriptionUpdated(sub: Stripe.Subscription): Promise<void> {
  let leadId = sub.metadata?.leadId;
  if (!leadId) {
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
    if (customerId) {
      const { rows } = await q<{ id: string }>(`SELECT id FROM leads WHERE stripe_customer_id = $1 LIMIT 1`, [
        customerId,
      ]);
      leadId = rows[0]?.id;
    }
  }
  if (!leadId) return;

  let subscriptionStatus: LeadBillingMeta["subscriptionStatus"] = "none";
  if (sub.status === "active" || sub.status === "trialing") subscriptionStatus = "active";
  else if (sub.status === "past_due" || sub.status === "unpaid") subscriptionStatus = "past_due";
  else if (sub.status === "canceled") subscriptionStatus = "canceled";

  const row = await loadLeadRow(leadId);
  if (!row) return;
  const specs = mergeBillingMeta(rowToLead(row as never).projectSpecs, {
    subscriptionStatus,
    currentPhase: sub.metadata?.phase === "2" ? 2 : 1,
    lastWebhookAt: new Date().toISOString(),
  });
  await q(
    `UPDATE leads SET stripe_subscription_id = $1, project_specs = $2::jsonb WHERE id = $3`,
    [sub.id, JSON.stringify(specs), leadId]
  );
}

export async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const leadId = invoice.metadata?.leadId;
  if (!leadId || invoice.metadata?.type !== "recharge_commission") return;
  await q(
    `UPDATE lead_billing_periods SET status = 'paid' WHERE stripe_invoice_id = $1 AND lead_id = $2`,
    [invoice.id, leadId]
  );
}
