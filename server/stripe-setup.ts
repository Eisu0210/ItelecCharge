import "./db/loadEnv";
import { verifyStripeConnection } from "./stripe";
import { ensureStripeBillingPrices } from "./stripeProducts";

async function main() {
  const check = await verifyStripeConnection();
  if (!check.ok) {
    console.error("Stripe :", check.error);
    process.exit(1);
  }
  console.log("Connexion Stripe OK.");
  const prices = await ensureStripeBillingPrices();
  if (prices) {
    console.log("\nProduit :", prices.productId);
    console.log("Prix phase 1 (59 €/mois) :", prices.phase1PriceId);
    console.log("Prix phase 2 (35 €/mois) :", prices.phase2PriceId);
    console.log("\nCopiez les lignes STRIPE_* affichées ci-dessus dans .env si besoin.");
  }
  console.log(
    "\nPour les webhooks en local : stripe listen --forward-to localhost:3001/api/webhooks/stripe"
  );
  console.log("Puis STRIPE_WEBHOOK_SECRET=whsec_… dans .env");
}

void main();
