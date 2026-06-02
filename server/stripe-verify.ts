import "./db/loadEnv";
import { getStripePublishableKey, isStripeConfigured, verifyStripeConnection } from "./stripe";

async function main() {
  if (!isStripeConfigured()) {
    console.error("STRIPE_SECRET_KEY manquant dans .env");
    process.exit(1);
  }
  const pk = getStripePublishableKey();
  console.log("Clé publiable :", pk ? `${pk.slice(0, 12)}…` : "(non définie)");
  const result = await verifyStripeConnection();
  if (result.ok) {
    console.log("Connexion Stripe OK (mode test).");
    process.exit(0);
  }
  console.error("Échec Stripe :", result.error);
  process.exit(1);
}

void main();
