import type express from "express";
import { getStripe, isStripeConfigured } from "./stripe";
import {
  handleCheckoutSessionCompleted,
  handleInvoicePaid,
  handleSubscriptionUpdated,
} from "./stripeBilling";

export async function handleStripeWebhook(
  req: express.Request,
  res: express.Response
): Promise<void> {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) {
    res.status(503).json({ error: "Webhook Stripe non configuré" });
    return;
  }

  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") {
    res.status(400).json({ error: "Signature manquante" });
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, secret);
  } catch (e) {
    console.warn("[stripe webhook] signature invalide");
    res.status(400).json({ error: "Signature invalide" });
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionUpdated(event.data.object);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object);
        break;
      default:
        break;
    }
    res.json({ received: true });
  } catch (e) {
    console.error("[stripe webhook]", event.type, e);
    res.status(500).json({ error: "Traitement webhook échoué" });
  }
}

export function isStripeWebhookConfigured(): boolean {
  return isStripeConfigured() && Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
}
