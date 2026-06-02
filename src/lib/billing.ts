/** Modèle financier Itelec (CGV + simulateur ROI). */

export const BILLING_COMMISSION_PERCENT = 12;
export const BILLING_SUBSCRIPTION_PHASE1_EUR = 59;
export const BILLING_SUBSCRIPTION_PHASE2_EUR = 35;
export const BILLING_SUBSCRIPTION_PHASE1_MONTHS = 48;

export type LeadBillingSubscriptionStatus =
  | "none"
  | "pending_mandate"
  | "active"
  | "past_due"
  | "canceled";

export interface LeadBillingMeta {
  subscriptionStatus?: LeadBillingSubscriptionStatus;
  currentPhase?: 1 | 2;
  lastWebhookAt?: string;
}

export interface LeadBillingPeriodRow {
  id: string;
  leadId: string;
  periodLabel: string;
  grossRechargeEur: number;
  commissionPercent: number;
  commissionEur: number;
  stripeInvoiceId?: string;
  status: "invoiced" | "paid" | "failed";
  createdAt: string;
}

export function commissionOnRecharge(grossRechargeEur: number, percent = BILLING_COMMISSION_PERCENT): number {
  return Math.round(grossRechargeEur * (percent / 100) * 100) / 100;
}

export function billingStatusLabel(status: LeadBillingSubscriptionStatus | undefined): string {
  switch (status) {
    case "pending_mandate":
      return "Mandat en attente";
    case "active":
      return "Prélèvement actif";
    case "past_due":
      return "Impayé";
    case "canceled":
      return "Résilié";
    default:
      return "Non configuré";
  }
}
