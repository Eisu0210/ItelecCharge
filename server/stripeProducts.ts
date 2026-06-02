import { getStripe, isStripeConfigured } from "./stripe";

const PRODUCT_NAME = "Gestion CPO Itelec Charge";

export type StripePriceIds = {
  productId: string;
  phase1PriceId: string;
  phase2PriceId: string;
};

/** Crée produit + prix récurrents en mode test si les variables d’env sont absentes. */
export async function ensureStripeBillingPrices(): Promise<StripePriceIds | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const fromEnv = {
    productId: process.env.STRIPE_PRODUCT_ID?.trim(),
    phase1PriceId: process.env.STRIPE_PRICE_SUBSCRIPTION_PHASE1?.trim(),
    phase2PriceId: process.env.STRIPE_PRICE_SUBSCRIPTION_PHASE2?.trim(),
  };
  if (fromEnv.productId && fromEnv.phase1PriceId && fromEnv.phase2PriceId) {
    return {
      productId: fromEnv.productId,
      phase1PriceId: fromEnv.phase1PriceId,
      phase2PriceId: fromEnv.phase2PriceId,
    };
  }

  const product =
    fromEnv.productId
      ? await stripe.products.retrieve(fromEnv.productId)
      : await stripe.products.create({
          name: PRODUCT_NAME,
          metadata: { app: "itelec-charge" },
        });

  const phase1 =
    fromEnv.phase1PriceId
      ? await stripe.prices.retrieve(fromEnv.phase1PriceId)
      : await stripe.prices.create({
          product: product.id,
          currency: "eur",
          unit_amount: 5900,
          recurring: { interval: "month" },
          nickname: "Abonnement gestion phase 1 (59 € TVAC/mois — test HT)",
          metadata: { phase: "1" },
        });

  const phase2 =
    fromEnv.phase2PriceId
      ? await stripe.prices.retrieve(fromEnv.phase2PriceId)
      : await stripe.prices.create({
          product: product.id,
          currency: "eur",
          unit_amount: 3500,
          recurring: { interval: "month" },
          nickname: "Abonnement gestion phase 2 (35 €/mois)",
          metadata: { phase: "2" },
        });

  console.log(
    "[stripe] Ajoutez dans .env :\n" +
      `STRIPE_PRODUCT_ID=${product.id}\n` +
      `STRIPE_PRICE_SUBSCRIPTION_PHASE1=${phase1.id}\n` +
      `STRIPE_PRICE_SUBSCRIPTION_PHASE2=${phase2.id}`
  );

  return { productId: product.id, phase1PriceId: phase1.id, phase2PriceId: phase2.id };
}

export async function logStripeBillingSetup(): Promise<void> {
  if (!isStripeConfigured()) {
    console.warn("[stripe] STRIPE_SECRET_KEY manquant — facturation désactivée.");
    return;
  }
  await ensureStripeBillingPrices();
}
