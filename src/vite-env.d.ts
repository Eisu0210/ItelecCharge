/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WEB3FORMS_ACCESS_KEY?: string;
  readonly VITE_CONTACT_EMAIL?: string;
  /** Base URL de l’API (ex. https://api.votredomaine.com) — laisser vide en dev (proxy Vite → :3001) */
  readonly VITE_API_BASE?: string;
  /** Clé publiable Stripe (pk_test_ / pk_live_) — visible côté navigateur */
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  /** URL canonique du site (SEO, sitemap, Open Graph) — ex. https://itelec-charge.be */
  readonly VITE_SITE_URL?: string;
  readonly VITE_CONTACT_PHONE?: string;
}
