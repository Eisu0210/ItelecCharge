import { apiFetchPath } from "./apiBase";

export type StripePublicConfig = {
  publishableKey: string;
  testMode: boolean;
};

/** Charge la config Stripe depuis l’API (clé publiable uniquement). */
export async function fetchStripePublicConfig(): Promise<StripePublicConfig | null> {
  try {
    const res = await fetch(apiFetchPath("/api/stripe/config"));
    if (!res.ok) return null;
    return (await res.json()) as StripePublicConfig;
  } catch {
    return null;
  }
}

/** Clé publiable en dev/prod si définie au build Vite. */
export function stripePublishableKeyFromEnv(): string | undefined {
  const k = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim();
  return k || undefined;
}
