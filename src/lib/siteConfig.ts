/** Infos société affichées sur le site public (surcharge possible via .env Vite). */
export const SITE_BRAND = "ITELEC CHARGE";

export const SITE_URL =
  import.meta.env.VITE_SITE_URL?.trim().replace(/\/$/, "") || "https://itelec-charge.be";

export const SITE_CONTACT_EMAIL =
  import.meta.env.VITE_CONTACT_EMAIL?.trim() || "hello@itelec-charge.be";

export const SITE_PHONE = import.meta.env.VITE_CONTACT_PHONE?.trim() || "+32";

export const SITE_LINKEDIN_URL = import.meta.env.VITE_LINKEDIN_URL?.trim() || "";

export const SITE_LEGAL_NAME = "Itelec Charge";

export const SITE_ADDRESS_LINES = [
  SITE_LEGAL_NAME,
  "Rue du Bosquet 19",
  "6181 Gouy-lez-Pieton",
  "Belgique",
] as const;
