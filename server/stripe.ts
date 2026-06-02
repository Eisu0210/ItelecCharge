import { createRequire } from "node:module";
import type Stripe from "stripe";

const require = createRequire(import.meta.url);

let client: Stripe | null | undefined;
let stripeModuleMissing = false;

function loadStripeConstructor(): (typeof import("stripe"))["default"] | null {
  if (stripeModuleMissing) return null;
  try {
    const mod = require("stripe") as { default?: (typeof import("stripe"))["default"] };
    const StripeCtor = mod.default ?? mod;
    return typeof StripeCtor === "function" ? StripeCtor : null;
  } catch {
    stripeModuleMissing = true;
    return null;
  }
}

export function isStripePackageInstalled(): boolean {
  return loadStripeConstructor() !== null;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim()) && isStripePackageInstalled();
}

export function getStripePublishableKey(): string | null {
  const k = process.env.STRIPE_PUBLISHABLE_KEY?.trim() || process.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim();
  return k || null;
}

/** Client Stripe serveur (clé secrète). `null` si non configuré ou paquet absent. */
export function getStripe(): Stripe | null {
  if (client !== undefined) return client;
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    client = null;
    return null;
  }
  const StripeCtor = loadStripeConstructor();
  if (!StripeCtor) {
    console.warn(
      "[stripe] Paquet npm « stripe » absent — exécutez « npm install ». Facturation désactivée, le reste de l’API fonctionne."
    );
    client = null;
    return null;
  }
  client = new StripeCtor(secret);
  return client;
}

/** Vérifie que la clé secrète est valide (appel léger à l’API Stripe). */
export async function verifyStripeConnection(): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return { ok: false, error: "STRIPE_SECRET_KEY manquant" };
  }
  if (!isStripePackageInstalled()) {
    return { ok: false, error: "Paquet npm « stripe » non installé (npm install)" };
  }
  const stripe = getStripe();
  if (!stripe) return { ok: false, error: "Client Stripe indisponible" };
  try {
    await stripe.balance.retrieve();
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur Stripe";
    return { ok: false, error: msg };
  }
}
