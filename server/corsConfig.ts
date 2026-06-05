import type { CorsOptions } from "cors";

const DEV_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

function parseOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (raw) {
    return raw.split(",").map((o) => o.trim()).filter(Boolean);
  }
  if (process.env.NODE_ENV === "production") {
    const site = process.env.APP_PUBLIC_URL?.trim() || process.env.VITE_SITE_URL?.trim();
    return site ? [site.replace(/\/$/, "")] : [];
  }
  return DEV_ORIGINS;
}

export function buildCorsOptions(): CorsOptions {
  const allowed = new Set(parseOrigins());
  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowed.has(origin)) {
        callback(null, true);
        return;
      }
      if (process.env.NODE_ENV !== "production" && DEV_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origine non autorisée"));
    },
    credentials: true,
  };
}
