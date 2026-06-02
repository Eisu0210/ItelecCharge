import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { q, pool } from "./db/pool";
import {
  buildLeadPatchSet,
  leadToInsertRow,
  isQuoteAwaitingClientAcceptance,
  normalizeLeadPatch,
  rowToInstaller,
  rowToLead,
} from "./leadMap";
import { isPgUndefinedColumn, sendServerError } from "./apiError";
import { buildInitialPassword, isValidRole, pickUniqueLogin } from "./userCreate";
import {
  checkDevisRequestRateLimit,
  handleDevisRequest,
  parseDevisRequestBody,
} from "./devisRequest";
import { isSmtpConfigured, sendQuoteOfferEmail, verifySmtpConnection } from "./mail";
import { buildQuoteDocument } from "../src/lib/quoteDocument";
import { computeQuoteTotalForLead } from "../src/lib/quotePricing";
import { buildClientQuotePortalUrl, getPublicAppBaseUrl } from "./publicAppUrl";
import {
  buildAcceptedQuoteArtifacts,
  freezeQuoteSpecs,
  getClientIp,
  getCgvUrl,
  getUserAgent,
  recordElectronicAcceptance,
} from "./quoteCompliance";
import { sendQuoteAcceptanceConfirmationEmail } from "./quoteAcceptanceEmail";
import { formatAcceptanceProofText } from "../src/lib/quoteAcceptance";
import {
  applyStockDelta,
  assertLeadAssignedToInstaller,
  buildStockSummary,
  deleteStockItem,
  getStockItem,
  installerProfileIdForUser,
  listInstallerStock,
  resolveStockAccess,
  setStockQuantity,
  syncStockFromDossierMaterials,
  upsertStockItem,
  validateMaterialsInInstallerStock,
  type StockMovementReason,
} from "./installerStock";
import {
  assignFleetVehicleToInstaller,
  listFleetVehicles,
  rowToFleetVehicle,
} from "./fleetVehicles";
import { getStripePublishableKey, isStripeConfigured, verifyStripeConnection } from "./stripe";
import {
  createSubscriptionCheckoutSession,
  getLeadBillingSummary,
  invoiceRechargeCommission,
  syncLeadBillingFromStripe,
} from "./stripeBilling";
import { handleStripeWebhook } from "./stripeWebhook";
import { logStripeBillingSetup } from "./stripeProducts";
import type { FleetVehicle, Lead, MaterialCatalogItem, ProjectSpecs, Role } from "../src/types";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn("JWT_SECRET non défini — utilisation d’un secret de dev (à changer en production).");
}
const secret = JWT_SECRET || "dev-insecure-jwt-secret-change-in-production";

const app = express();
app.use(cors({ origin: true, credentials: true }));

app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  (req, res) => {
    void handleStripeWebhook(req, res);
  }
);

app.use(express.json({ limit: "25mb" }));

interface JwtPayload {
  sub: string;
  un: string;
  role: Role;
}

type Authed = express.Request & { auth: JwtPayload };

function authHeader(req: express.Request): string | null {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7);
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const t = authHeader(req);
  if (!t) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }
  try {
    const p = jwt.verify(t, secret) as JwtPayload;
    (req as Authed).auth = p;
    next();
  } catch {
    res.status(401).json({ error: "Session invalide" });
  }
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if ((req as Authed).auth?.role !== "admin") {
    res.status(403).json({ error: "Réservé à l’administrateur" });
    return;
  }
  next();
}

function requireAdminOrDispatch(req: express.Request, res: express.Response, next: express.NextFunction) {
  const role = (req as Authed).auth?.role;
  if (role !== "admin" && role !== "dispatch") {
    res.status(403).json({ error: "Réservé à l’administrateur ou au dispatch" });
    return;
  }
  next();
}

function requireAdminSiteSurveyOrDispatch(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const role = (req as Authed).auth?.role;
  if (role !== "admin" && role !== "site_survey" && role !== "dispatch") {
    res.status(403).json({ error: "Réservé à l’administrateur, au site survey ou au dispatch." });
    return;
  }
  next();
}

type MaterialCatalogRow = {
  id: string;
  supplier: string;
  article_number: string;
  label: string;
  unit: string;
  unit_price_ht: string | number;
  compatible_models: unknown;
  created_at: Date;
  updated_at: Date;
};

async function ensureInstallerProfilesForUsers(): Promise<void> {
  try {
    await q(
      `UPDATE installers
       SET email = ''
       WHERE id LIKE 'tech-u%' AND email LIKE '%@itelec.local'`
    );
    const { rows } = await q<{
      id: number;
      login: string;
      first_name: string | null;
      last_name: string | null;
    }>(`
      SELECT u.id, u.login, u.first_name, u.last_name
      FROM users u
      WHERE u.role = 'installateur'
        AND NOT EXISTS (
          SELECT 1
          FROM installers i
          WHERE i.id = CONCAT('tech-u', u.id::text)
        )
    `);
    for (const row of rows) {
      const installerId = `tech-u${row.id}`;
      const installerName = `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || row.login;
      await q(
        `INSERT INTO installers (id, name, phone, email)
         VALUES ($1, $2, $3, $4)`,
        [installerId, installerName, "", ""]
      );
    }
    // Fiches créées avant prénom/nom : le nom affiché restait le login (ex. techu30) — on aligne sur l’identité réelle.
    await q(`
      UPDATE installers i
      SET name = TRIM(BOTH ' ' FROM CONCAT_WS(' ', NULLIF(TRIM(u.first_name), ''), NULLIF(TRIM(u.last_name), '')))
      FROM users u
      WHERE u.role = 'installateur'
        AND i.id = CONCAT('tech-u', u.id::text)
        AND LOWER(TRIM(i.name)) = LOWER(TRIM(u.login))
        AND TRIM(BOTH ' ' FROM CONCAT_WS(' ', NULLIF(TRIM(u.first_name), ''), NULLIF(TRIM(u.last_name), ''))) <> ''
    `);
  } catch (e) {
    // Compat ancien schéma users sans first_name/last_name.
    if (!isPgUndefinedColumn(e)) throw e;
    await q(
      `UPDATE installers
       SET email = ''
       WHERE id LIKE 'tech-u%' AND email LIKE '%@itelec.local'`
    );
    const { rows } = await q<{ id: number; login: string }>(`
      SELECT u.id, u.login
      FROM users u
      WHERE u.role = 'installateur'
        AND NOT EXISTS (
          SELECT 1
          FROM installers i
          WHERE i.id = CONCAT('tech-u', u.id::text)
        )
    `);
    for (const row of rows) {
      await q(
        `INSERT INTO installers (id, name, phone, email)
         VALUES ($1, $2, $3, $4)`,
        [`tech-u${row.id}`, row.login, "", ""]
      );
    }
  }
}

function firstNonEmpty(...values: Array<string | undefined | null>): string | null {
  for (const v of values) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return null;
}

/** Profil installateur lié au compte : convention `tech-u{id}` (créé au démarrage / à l’inscription). Exception : login démo `installateur` → fiche seed `tech-1`. */
function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (full, entity) => {
    const raw = String(entity).toLowerCase();
    if (raw.startsWith("#x")) {
      const cp = Number.parseInt(raw.slice(2), 16);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : full;
    }
    if (raw.startsWith("#")) {
      const cp = Number.parseInt(raw.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : full;
    }
    return named[raw] ?? full;
  });
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ");
}

function extractTableCellByLabel(html: string, labelRe: RegExp): string | null {
  const rows = Array.from(html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));
  for (const rowMatch of rows) {
    const row = rowMatch[1] ?? "";
    const cells = Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((m) => m[1] ?? "");
    if (cells.length < 2) continue;
    const key = decodeHtmlEntities(stripHtmlTags(cells[0])).replace(/\s+/g, " ").trim();
    if (!labelRe.test(key)) continue;
    const value = decodeHtmlEntities(stripHtmlTags(cells[1])).replace(/\s+/g, " ").trim();
    if (value) return value;
  }
  return null;
}

function normalizeArticleNumber(value: unknown): string | null {
  const s = decodeHtmlEntities(String(value ?? ""))
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();
  if (s.length < 3 || s.length > 40) return null;
  if (!/^[A-Z0-9][A-Z0-9\-_/\.]*$/.test(s)) return null;
  if (!/[0-9]/.test(s)) return null;
  return s;
}

function articleScore(value: string): number {
  let score = 0;
  if (/[A-Z]/.test(value) && /[0-9]/.test(value)) score += 4;
  if (/^[A-Z]/.test(value)) score += 2;
  if (value.length >= 6 && value.length <= 20) score += 1;
  if (/^[0-9]+$/.test(value)) score -= 2;
  return score;
}

function pickBetterArticleNumber(current: string | null, candidateRaw: unknown): string | null {
  const candidate = normalizeArticleNumber(candidateRaw);
  if (!candidate) return current;
  if (!current) return candidate;
  return articleScore(candidate) > articleScore(current) ? candidate : current;
}

function parsePrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const normalized = raw.replace(/\s/g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function pickMetaContent(html: string, key: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["'][^>]*>`, "i");
  const m = html.match(re);
  return m?.[1]?.trim() || null;
}

function parseRexelProductFromHtml(html: string, pageUrl: string): {
  label: string;
  articleNumber: string;
  unitPriceHt: number;
} | null {
  const ldScripts = Array.from(
    html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  )
    .map((m) => m[1]?.trim())
    .filter((v): v is string => !!v);

  let label: string | null = null;
  let articleNumber: string | null = null;
  let price: number | null = null;
  const assignFromRecord = (rec: Record<string, unknown>) => {
    label = firstNonEmpty(label, String(rec.name ?? ""), String(rec.productName ?? ""), String(rec.title ?? ""));
    articleNumber = pickBetterArticleNumber(articleNumber, rec.sku);
    articleNumber = pickBetterArticleNumber(articleNumber, rec.mpn);
    articleNumber = pickBetterArticleNumber(articleNumber, rec.productID);
    articleNumber = pickBetterArticleNumber(articleNumber, rec.articleNumber);
    articleNumber = pickBetterArticleNumber(articleNumber, rec.reference);
    articleNumber = pickBetterArticleNumber(articleNumber, rec.code);
    if (price == null) {
      price = parsePrice(
        rec.price ?? rec.priceHT ?? rec.priceHt ?? rec.netPrice ?? rec.salePrice ?? rec.amount ?? rec.unitPrice
      );
    }
    const offers = rec.offers as Record<string, unknown> | Record<string, unknown>[] | undefined;
    if (Array.isArray(offers) && price == null) {
      price = parsePrice(offers[0]?.price ?? offers[0]?.amount);
    } else if (offers && typeof offers === "object" && price == null) {
      price = parsePrice((offers as Record<string, unknown>).price ?? (offers as Record<string, unknown>).amount);
    }
  };

  for (const raw of ldScripts) {
    try {
      const data = JSON.parse(raw) as unknown;
      const nodes = Array.isArray(data)
        ? data
        : typeof data === "object" && data !== null && "@graph" in (data as Record<string, unknown>)
          ? (((data as Record<string, unknown>)["@graph"] as unknown[]) ?? [])
          : [data];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const rec = node as Record<string, unknown>;
        const type = String(rec["@type"] ?? "");
        if (type && !/product/i.test(type)) continue;
        assignFromRecord(rec);
      }
    } catch {
      // Ignore malformed JSON-LD chunks.
    }
  }

  // Fallback for Next.js pages where product data is in __NEXT_DATA__.
  const nextData = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
  if (nextData) {
    try {
      const payload = JSON.parse(nextData) as unknown;
      const walk = (value: unknown) => {
        if (!value || typeof value !== "object") return;
        if (Array.isArray(value)) {
          for (const item of value) walk(item);
          return;
        }
        const rec = value as Record<string, unknown>;
        const looksLikeProduct =
          "sku" in rec ||
          "mpn" in rec ||
          "productID" in rec ||
          "articleNumber" in rec ||
          "reference" in rec ||
          "offers" in rec;
        if (looksLikeProduct) assignFromRecord(rec);
        for (const nested of Object.values(rec)) walk(nested);
      };
      walk(payload);
    } catch {
      // Ignore malformed __NEXT_DATA__ payloads.
    }
  }

  label = firstNonEmpty(label, pickMetaContent(html, "og:title"), html.match(/<title>([^<]+)<\/title>/i)?.[1]);
  articleNumber = pickBetterArticleNumber(articleNumber, pickMetaContent(html, "product:retailer_item_id"));
  articleNumber = pickBetterArticleNumber(articleNumber, pickMetaContent(html, "product:sku"));

  // Fallback: Rexel Netstore product detail table.
  const netstoreDescription = extractTableCellByLabel(html, /^Description\b/i);
  if (!label || /^Rexel\s+Netstore$/i.test(label)) {
    label = firstNonEmpty(netstoreDescription, label);
  } else {
    label = firstNonEmpty(label, netstoreDescription);
  }
  articleNumber = pickBetterArticleNumber(articleNumber, extractTableCellByLabel(html, /^R[ée]f(?:[ée]rence)?\s*Rexel\b/i));
  articleNumber = pickBetterArticleNumber(articleNumber, extractTableCellByLabel(html, /^R[ée]f(?:[ée]rence)?\s*fabricant\b/i));

  const refRegexes = [
    /(?:R[eé]f(?:[eé]rence)?(?:\s*Rexel)?|Reference)\s*[:#-]?\s*([A-Z0-9][A-Z0-9\-_/]{2,})/i,
    /(?:SKU|Code(?:\s*article)?|Code(?:\s*produit)?)\s*[:#-]?\s*([A-Z0-9][A-Z0-9\-_/]{2,})/i,
    /"sku"\s*:\s*"([^"]+)"/i,
    /"mpn"\s*:\s*"([^"]+)"/i,
  ];
  for (const re of refRegexes) {
    const m = html.match(re);
    articleNumber = pickBetterArticleNumber(articleNumber, m?.[1]);
  }

  if (!price) {
    const m = html.match(/([0-9]{1,5}(?:[.,][0-9]{1,2})?)\s*(?:€|EUR)/i);
    price = parsePrice(m?.[1]);
  }
  if (!price) {
    const m = html.match(/([0-9]{1,6}(?:[.,][0-9]{1,2})?)\s*(?:&#\d+;|€|EUR)/i);
    price = parsePrice(m?.[1]);
  }
  if (!price) {
    const m = html.match(/"price"\s*:\s*"?([0-9]{1,6}(?:[.,][0-9]{1,2})?)"?/i);
    price = parsePrice(m?.[1]);
  }

  if (!articleNumber) {
    let fromQuery: string | null = null;
    try {
      const parsedUrl = new URL(pageUrl);
      fromQuery = firstNonEmpty(
        parsedUrl.searchParams.get("reference"),
        parsedUrl.searchParams.get("ref"),
        parsedUrl.searchParams.get("sku"),
        parsedUrl.searchParams.get("product")
      );
    } catch {
      // ignore URL parse error
    }
    const slug = pageUrl.split("/").filter(Boolean).pop() ?? "";
    const fallback = slug.replace(/[^A-Za-z0-9\-]/g, "").slice(0, 32);
    articleNumber = pickBetterArticleNumber(null, fromQuery) ?? pickBetterArticleNumber(null, fallback);
  }

  if (!label || !articleNumber) return null;
  return {
    label: decodeHtmlEntities(label).replace(/\s+/g, " ").trim(),
    articleNumber,
    unitPriceHt: price ?? 0,
  };
}

function rowToMaterialCatalogItem(row: MaterialCatalogRow): MaterialCatalogItem {
  const models = Array.isArray(row.compatible_models)
    ? row.compatible_models.map((v) => String(v)).filter((v) => v.trim().length > 0)
    : [];
  return {
    id: row.id,
    supplier: row.supplier || "rexel",
    articleNumber: row.article_number,
    label: row.label,
    unit: row.unit,
    unitPriceHt: Number(row.unit_price_ht) || 0,
    compatibleModels: models,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

async function listMaterialCatalog(): Promise<MaterialCatalogItem[]> {
  const r = await q<MaterialCatalogRow>(
    `SELECT id, supplier, article_number, label, unit, unit_price_ht, compatible_models, created_at, updated_at
     FROM material_catalog
     ORDER BY supplier, article_number, label`
  );
  return r.rows.map(rowToMaterialCatalogItem);
}

app.get("/api/health", async (_req, res) => {
  const stripeConfigured = isStripeConfigured();
  let stripeOk: boolean | null = null;
  if (stripeConfigured) {
    const check = await verifyStripeConnection();
    stripeOk = check.ok;
  }
  res.json({
    ok: true,
    service: "itelec-charge-api",
    stripe: { configured: stripeConfigured, ok: stripeOk },
  });
});

/** Clé publique Stripe pour le front (Checkout, Elements). Jamais la clé secrète. */
app.get("/api/stripe/config", (_req, res) => {
  const publishableKey = getStripePublishableKey();
  if (!publishableKey) {
    res.status(503).json({ error: "Stripe non configuré (STRIPE_PUBLISHABLE_KEY ou VITE_STRIPE_PUBLISHABLE_KEY)" });
    return;
  }
  res.json({
    publishableKey,
    testMode: publishableKey.startsWith("pk_test_"),
  });
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) {
      res.status(400).json({ error: "Identifiant et mot de passe requis" });
      return;
    }
    const { rows } = await q<{
      id: number;
      login: string;
      password_hash: string;
      role: Role;
    }>("SELECT id, login, password_hash, role FROM users WHERE LOWER(login) = LOWER($1) LIMIT 1", [username.trim()]);
    const u = rows[0];
    if (!u) {
      res.status(401).json({ error: "Identifiants invalides" });
      return;
    }
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) {
      res.status(401).json({ error: "Identifiants invalides" });
      return;
    }
    const token = jwt.sign({ sub: String(u.id), un: u.login, role: u.role }, secret, { expiresIn: "7d" });
    const installerId = installerProfileIdForUser(u.id, u.login, u.role);
    res.json({
      token,
      user: { id: u.id, username: u.login, role: u.role, installerId },
    });
  } catch (e) {
    sendServerError(res, e, "POST /api/auth/login");
  }
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  const a = (req as Authed).auth;
  const id = Number(a.sub);
  const safeId = Number.isFinite(id) ? id : 0;
  const installerId = installerProfileIdForUser(safeId, a.un, a.role);
  res.json({ id: safeId, username: a.un, role: a.role, installerId });
});

app.get("/api/users", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const { rows } = await q<{
      id: number;
      login: string;
      role: string;
      first_name: string | null;
      last_name: string | null;
      created_at: Date;
    }>("SELECT id, login, role, first_name, last_name, created_at FROM users ORDER BY role, login");
    res.json(
      rows.map((r) => ({
        id: r.id,
        login: r.login,
        role: r.role,
        firstName: r.first_name,
        lastName: r.last_name,
        createdAt: r.created_at.toISOString(),
      }))
    );
  } catch (e) {
    if (isPgUndefinedColumn(e)) {
      try {
        const { rows } = await q<{
          id: number;
          login: string;
          role: string;
          created_at: Date;
        }>("SELECT id, login, role, created_at FROM users ORDER BY role, login");
        res.json(
          rows.map((r) => ({
            id: r.id,
            login: r.login,
            role: r.role,
            firstName: null as string | null,
            lastName: null as string | null,
            createdAt: r.created_at.toISOString(),
          }))
        );
        return;
      } catch (e2) {
        sendServerError(res, e2, "GET /api/users (schéma ancien)");
        return;
      }
    }
    sendServerError(res, e, "GET /api/users");
  }
});

app.post("/api/users", requireAuth, requireAdmin, async (req, res) => {
  const c = await pool.connect();
  try {
    const b = req.body as { firstName?: string; lastName?: string; role?: string };
    const f = b.firstName?.trim() ?? "";
    const l = b.lastName?.trim() ?? "";
    if (!f || !l) {
      res.status(400).json({ error: "Prénom et nom sont requis" });
      return;
    }
    if (!b.role || !isValidRole(b.role)) {
      res.status(400).json({ error: "Rôle invalide" });
      return;
    }
    const role: Role = b.role;
    const initialPassword = buildInitialPassword(f, l);
    const password_hash = await bcrypt.hash(initialPassword, 10);
    const login = await pickUniqueLogin(f, l);
    await c.query("BEGIN");
    const { rows } = await c.query<{
      id: number;
      created_at: Date;
    }>(
      `INSERT INTO users (login, password_hash, role, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [login, password_hash, role, f, l]
    );
    const row = rows[0]!;
    if (role === "installateur") {
      const installerId = `tech-u${row.id}`;
      const installerName = `${f} ${l}`.trim() || login;
      await c.query(
        `INSERT INTO installers (id, name, phone, email)
         VALUES ($1, $2, $3, $4)`,
        [installerId, installerName, "", ""]
      );
    }
    await c.query("COMMIT");
    res.status(201).json({
      user: {
        id: row.id,
        login,
        role,
        firstName: f,
        lastName: l,
        createdAt: row.created_at.toISOString(),
      },
      initialPassword,
    });
  } catch (e) {
    try {
      await c.query("ROLLBACK");
    } catch {
      // Ignore rollback errors.
    }
    if (e instanceof Error && e.message.startsWith("Identifiant déjà utilisé")) {
      res.status(409).json({ error: e.message });
      return;
    }
    if (isPgUndefinedColumn(e)) {
      res.status(500).json({
        error: "Création impossible",
        details:
          "Colonnes prénom/nom manquantes en base. Exécutez : npm run db:migrate (à la racine du projet).",
      });
      return;
    }
    sendServerError(res, e, "POST /api/users");
  } finally {
    c.release();
  }
});

app.delete("/api/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const raw = req.params.id;
  const id = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(id) || id < 1) {
    res.status(400).json({ error: "Identifiant utilisateur invalide" });
    return;
  }
  const self = Number((req as Authed).auth.sub);
  if (id === self) {
    res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte." });
    return;
  }
  try {
    const r = await q("DELETE FROM users WHERE id = $1", [id]);
    if (r.rowCount === 0) {
      res.status(404).json({ error: "Utilisateur introuvable" });
      return;
    }
    res.status(204).end();
  } catch (e) {
    sendServerError(res, e, "DELETE /api/users");
  }
});

app.get("/api/app", requireAuth, async (_req, res) => {
  try {
    await ensureInstallerProfilesForUsers();
    const [ir, lr, sr] = await Promise.all([
      q("SELECT id, name, phone, email FROM installers ORDER BY name"),
      q(`
        SELECT l.*,
          COALESCE(
            NULLIF(TRIM(BOTH ' ' FROM CONCAT_WS(' ', uid.first_name, uid.last_name)), ''),
            uid.login,
            NULLIF(TRIM(BOTH ' ' FROM CONCAT_WS(' ', ulog.first_name, ulog.last_name)), ''),
            ulog.login,
            l.commercial_id
          ) AS commercial_display_name
        FROM leads l
        LEFT JOIN users uid ON uid.id = l.created_by_user_id
        LEFT JOIN users ulog ON LOWER(ulog.login) = LOWER(l.commercial_id)
        ORDER BY l.created_at DESC
      `),
      q<{ id: number; login: string; first_name: string | null; last_name: string | null }>(
        `SELECT id, login, first_name, last_name
         FROM users
         WHERE role = 'site_survey'
         ORDER BY COALESCE(NULLIF(TRIM(BOTH ' ' FROM CONCAT_WS(' ', first_name, last_name)), ''), login)`
      ),
    ]);
    let materialCatalog: MaterialCatalogItem[] = [];
    try {
      materialCatalog = await listMaterialCatalog();
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code !== "42P01") throw e; // undefined_table -> ancien schéma
    }
    let fleetVehicles: FleetVehicle[] = [];
    try {
      fleetVehicles = await listFleetVehicles();
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code !== "42P01") throw e;
    }
    res.json({
      version: 1,
      installers: ir.rows.map((r) => rowToInstaller(r as Parameters<typeof rowToInstaller>[0])),
      fleetVehicles,
      leads: lr.rows.map((r) => rowToLead(r as never)),
      siteSurveyUsers: sr.rows.map((u) => ({
        id: u.id,
        login: u.login,
        displayName:
          `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() ||
          u.login,
      })),
      materialCatalog,
    });
  } catch (e) {
    sendServerError(res, e, "GET /api/app");
  }
});

app.get("/api/material-catalog", requireAuth, async (_req, res) => {
  try {
    const items = await listMaterialCatalog();
    res.json(items);
  } catch (e) {
    sendServerError(res, e, "GET /api/material-catalog");
  }
});

app.post("/api/material-catalog", requireAuth, requireAdminOrDispatch, async (req, res) => {
  try {
    const body = req.body as Partial<
      Pick<MaterialCatalogItem, "supplier" | "articleNumber" | "label" | "unit" | "unitPriceHt" | "compatibleModels">
    >;
    const supplier = String(body.supplier ?? "rexel").trim() || "rexel";
    const articleNumber = String(body.articleNumber ?? "").trim();
    const label = String(body.label ?? "").trim();
    const unit = String(body.unit ?? "u").trim() || "u";
    const unitPriceHt = Number(body.unitPriceHt ?? 0);
    const compatibleModels = Array.isArray(body.compatibleModels)
      ? body.compatibleModels.map((v) => String(v)).filter((v) => v.trim().length > 0)
      : [];
    if (!articleNumber || !label) {
      res.status(400).json({ error: "Référence article et libellé requis" });
      return;
    }
    const id = `mat-${crypto.randomUUID().slice(0, 12)}`;
    await q(
      `INSERT INTO material_catalog (
         id, supplier, article_number, label, unit, unit_price_ht, compatible_models, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
      [id, supplier, articleNumber, label, unit, Number.isFinite(unitPriceHt) ? unitPriceHt : 0, JSON.stringify(compatibleModels)]
    );
    res.status(201).json({ ok: true, id });
  } catch (e) {
    sendServerError(res, e, "POST /api/material-catalog");
  }
});

app.post("/api/material-catalog/import-url", requireAuth, requireAdminOrDispatch, async (req, res) => {
  try {
    const rawUrl = String((req.body as { url?: string })?.url ?? "").trim();
    if (!rawUrl) {
      res.status(400).json({ error: "URL requise" });
      return;
    }
    let target: URL;
    try {
      target = new URL(rawUrl);
    } catch {
      res.status(400).json({ error: "URL invalide" });
      return;
    }
    if (!/^https?:$/.test(target.protocol)) {
      res.status(400).json({ error: "URL non supportée" });
      return;
    }
    if (!/rexel/i.test(target.hostname)) {
      res.status(400).json({ error: "URL Rexel attendue" });
      return;
    }
    const response = await fetch(target.toString(), {
      headers: {
        "User-Agent": "ItelecCharge/1.0 (+material-catalog-import)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) {
      res.status(502).json({ error: "Impossible de récupérer la page Rexel" });
      return;
    }
    const html = await response.text();
    const parsed = parseRexelProductFromHtml(html, target.toString());
    if (!parsed) {
      res.status(422).json({ error: "Extraction impossible", details: "Nom/référence introuvables sur cette page." });
      return;
    }
    res.json(parsed);
  } catch (e) {
    sendServerError(res, e, "POST /api/material-catalog/import-url");
  }
});

app.patch("/api/material-catalog/:id", requireAuth, requireAdminOrDispatch, async (req, res) => {
  res.status(405).json({
    error: "Modification désactivée",
    details: "Les articles du catalogue sont verrouillés après création pour éviter les erreurs de manipulation.",
  });
});

app.delete("/api/material-catalog/:id", requireAuth, requireAdminOrDispatch, async (req, res) => {
  try {
    const id = String(req.params.id ?? "").trim();
    if (!id) {
      res.status(400).json({ error: "id requis" });
      return;
    }
    const r = await q("DELETE FROM material_catalog WHERE id = $1", [id]);
    if (r.rowCount === 0) {
      res.status(404).json({ error: "Article introuvable" });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    sendServerError(res, e, "DELETE /api/material-catalog/:id");
  }
});

function stockAuthUserId(auth: JwtPayload): string {
  return auth.un || String(auth.sub);
}

app.get("/api/installer-stock", requireAuth, async (req, res) => {
  try {
    const auth = (req as Authed).auth;
    const role = auth.role as Role;
    const userInstallerId = installerProfileIdForUser(Number(auth.sub), auth.un, role);
    const requested = typeof req.query.installerId === "string" ? req.query.installerId.trim() : undefined;
    const access = resolveStockAccess(role, userInstallerId, requested);
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }
    const items = await listInstallerStock(access.canManageAll && !requested ? undefined : access.installerId || requested);
    res.json({ items });
  } catch (e) {
    sendServerError(res, e, "GET /api/installer-stock");
  }
});

app.get("/api/installer-stock/summary", requireAuth, requireAdminOrDispatch, async (_req, res) => {
  try {
    const lines = await buildStockSummary();
    res.json({ lines });
  } catch (e) {
    sendServerError(res, e, "GET /api/installer-stock/summary");
  }
});

app.post("/api/installer-stock/items", requireAuth, async (req, res) => {
  try {
    const auth = (req as Authed).auth;
    const role = auth.role as Role;
    const userInstallerId = installerProfileIdForUser(Number(auth.sub), auth.un, role);
    const body = req.body as {
      installerId?: string;
      catalogItemId?: string;
      articleNumber?: string;
      label?: string;
      unit?: string;
      quantity?: number;
      minQuantity?: number;
    };
    const targetInstaller = String(body.installerId ?? userInstallerId ?? "").trim();
    const access = resolveStockAccess(role, userInstallerId, targetInstaller);
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }
    const installerId = access.installerId || targetInstaller;
    if (!installerId) {
      res.status(400).json({ error: "Technicien requis" });
      return;
    }
    const item = await upsertStockItem({
      installerId,
      catalogItemId: body.catalogItemId,
      articleNumber: body.articleNumber,
      label: body.label,
      unit: body.unit,
      quantity: Number(body.quantity ?? 0),
      minQuantity: body.minQuantity !== undefined ? Number(body.minQuantity) : undefined,
      updatedBy: stockAuthUserId(auth),
      reason: "initial",
    });
    res.status(201).json({ item });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("introuvable") || msg.includes("requis")) {
      res.status(400).json({ error: msg });
      return;
    }
    sendServerError(res, e, "POST /api/installer-stock/items");
  }
});

app.patch("/api/installer-stock/items/:id", requireAuth, async (req, res) => {
  try {
    const auth = (req as Authed).auth;
    const role = auth.role as Role;
    const userInstallerId = installerProfileIdForUser(Number(auth.sub), auth.un, role);
    const id = String(req.params.id ?? "").trim();
    const existing = await getStockItem(id);
    if (!existing) {
      res.status(404).json({ error: "Ligne introuvable" });
      return;
    }
    const access = resolveStockAccess(role, userInstallerId, existing.installerId);
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }
    const body = req.body as { quantity?: number; minQuantity?: number };
    const item = await setStockQuantity(
      id,
      body.quantity !== undefined ? Number(body.quantity) : existing.quantity,
      stockAuthUserId(auth),
      "set",
      body.minQuantity !== undefined ? Number(body.minQuantity) : undefined
    );
    res.json({ item });
  } catch (e) {
    sendServerError(res, e, "PATCH /api/installer-stock/items/:id");
  }
});

app.post("/api/installer-stock/items/:id/move", requireAuth, async (req, res) => {
  try {
    const auth = (req as Authed).auth;
    const role = auth.role as Role;
    const userInstallerId = installerProfileIdForUser(Number(auth.sub), auth.un, role);
    const id = String(req.params.id ?? "").trim();
    const existing = await getStockItem(id);
    if (!existing) {
      res.status(404).json({ error: "Ligne introuvable" });
      return;
    }
    const access = resolveStockAccess(role, userInstallerId, existing.installerId);
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }
    const body = req.body as { delta?: number; reason?: StockMovementReason; note?: string; leadId?: string };
    const delta = Number(body.delta);
    if (!Number.isFinite(delta) || delta === 0) {
      res.status(400).json({ error: "delta non nul requis" });
      return;
    }
    const reason: StockMovementReason =
      body.reason === "usage" || body.reason === "replenish" || body.reason === "adjustment"
        ? body.reason
        : delta < 0
          ? "usage"
          : "replenish";
    const item = await applyStockDelta({
      itemId: id,
      delta,
      reason,
      note: body.note,
      leadId: body.leadId,
      updatedBy: stockAuthUserId(auth),
    });
    res.json({ item });
  } catch (e) {
    sendServerError(res, e, "POST /api/installer-stock/items/:id/move");
  }
});

app.delete("/api/installer-stock/items/:id", requireAuth, async (req, res) => {
  try {
    const auth = (req as Authed).auth;
    const role = auth.role as Role;
    const userInstallerId = installerProfileIdForUser(Number(auth.sub), auth.un, role);
    const id = String(req.params.id ?? "").trim();
    const existing = await getStockItem(id);
    if (!existing) {
      res.status(404).json({ error: "Ligne introuvable" });
      return;
    }
    const access = resolveStockAccess(role, userInstallerId, existing.installerId);
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }
    const ok = await deleteStockItem(id);
    res.json({ ok });
  } catch (e) {
    sendServerError(res, e, "DELETE /api/installer-stock/items/:id");
  }
});

app.post("/api/installer-stock/sync-dossier", requireAuth, async (req, res) => {
  try {
    const auth = (req as Authed).auth;
    const role = auth.role as Role;
    if (role !== "installateur") {
      res.status(403).json({ error: "Réservé aux techniciens" });
      return;
    }
    const userInstallerId = installerProfileIdForUser(Number(auth.sub), auth.un, role);
    if (!userInstallerId) {
      res.status(403).json({ error: "Profil technicien non lié" });
      return;
    }
    const body = req.body as {
      leadId?: string;
      previousMaterials?: unknown;
      nextMaterials?: unknown;
    };
    const leadId = String(body.leadId ?? "").trim();
    if (!leadId) {
      res.status(400).json({ error: "leadId requis" });
      return;
    }
    const assigned = await assertLeadAssignedToInstaller(leadId, userInstallerId);
    if (!assigned) {
      res.status(403).json({ error: "Ce dossier n’est pas assigné à votre planning." });
      return;
    }
    const toLines = (raw: unknown) =>
      Array.isArray(raw)
        ? raw.map((row) => {
            const r = row as Record<string, unknown>;
            return {
              catalogItemId: r.catalogItemId ? String(r.catalogItemId) : null,
              articleNumber: r.articleNumber ? String(r.articleNumber) : undefined,
              label: String(r.label ?? ""),
              quantity: Number(r.quantity),
            };
          })
        : [];
    const result = await syncStockFromDossierMaterials({
      installerId: userInstallerId,
      leadId,
      previous: toLines(body.previousMaterials),
      next: toLines(body.nextMaterials),
      updatedBy: stockAuthUserId(auth),
    });
    res.json(result);
  } catch (e) {
    sendServerError(res, e, "POST /api/installer-stock/sync-dossier");
  }
});

app.post("/api/leads", requireAuth, async (req, res) => {
  try {
    const lead = req.body as Lead;
    if (!lead?.id) {
      res.status(400).json({ error: "Dossier invalide" });
      return;
    }
    const auth = (req as Authed).auth;
    if (auth.role === "commercial") {
      lead.createdByUserId = Number(auth.sub);
      lead.commercialId = auth.un.toLowerCase();
    }
    const p = leadToInsertRow(lead);
    await q(
      `INSERT INTO leads (
        id, created_at, commercial_id, company_name, contact_name, email, phone, address, notes, status,
        quote_amount_htva, installer_id, slot_start, slot_end, onsite_notified_at, commission_paid, client_paid,
        report, survey_photos, survey_materials, workflow_stage, project_specs, created_by_user_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
      p
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Création impossible" });
  }
});

app.patch("/api/leads/:id", requireAuth, async (req, res) => {
  try {
    const auth = (req as Authed).auth;
    const role = auth.role as Role;
    const { id } = req.params;
    const patch = normalizeLeadPatch(req.body as Partial<Lead>);
    if (role === "installateur" && patch.surveyMaterials !== undefined) {
      const userInstallerId = installerProfileIdForUser(Number(auth.sub), auth.un, role);
      if (!userInstallerId) {
        res.status(403).json({ error: "Profil technicien non lié" });
        return;
      }
      const assigned = await assertLeadAssignedToInstaller(String(id), userInstallerId);
      if (!assigned) {
        res.status(403).json({ error: "Ce dossier n’est pas assigné à votre planning." });
        return;
      }
      const materials = Array.isArray(patch.surveyMaterials) ? patch.surveyMaterials : [];
      const stockErr = await validateMaterialsInInstallerStock(
        userInstallerId,
        materials.map((row) => ({
          catalogItemId: row.catalogItemId ?? null,
          articleNumber: row.articleNumber,
          label: row.label,
          quantity: row.quantity,
        }))
      );
      if (stockErr) {
        res.status(400).json({ error: stockErr });
        return;
      }
    }
    const { setSql, values } = buildLeadPatchSet(patch);
    if (!setSql) {
      res.status(400).json({ error: "Aucun champ à mettre à jour" });
      return;
    }
    const n = values.length + 1;
    await q(`UPDATE leads SET ${setSql} WHERE id = $${n}`, [...values, id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Mise à jour impossible" });
  }
});

/** Met à jour le dossier et envoie le devis par e-mail au client (SMTP). */
app.post("/api/leads/:id/send-quote-email", requireAuth, requireAdminSiteSurveyOrDispatch, async (req, res) => {
  try {
    if (!isSmtpConfigured()) {
      res.status(503).json({
        error: "Envoi e-mail non configuré",
        details:
          "Définissez SMTP_HOST et MAIL_FROM dans le fichier .env à la racine du projet. Voir les commentaires sous « Envoi e-mails ».",
      });
      return;
    }
    const id = String(req.params.id ?? "").trim();
    if (!id) {
      res.status(400).json({ error: "Identifiant dossier requis" });
      return;
    }
    const { rows } = await q(`SELECT * FROM leads WHERE id = $1`, [id]);
    const row = rows[0];
    if (!row) {
      res.status(404).json({ error: "Dossier introuvable" });
      return;
    }
    const lead = rowToLead(row as never);
    if (lead.workflowStage !== "devis_pret") {
      res.status(400).json({
        error: "Le devis doit être à l’étape « prêt à envoyer » avant l’envoi par mail.",
      });
      return;
    }
    const email = lead.email?.trim();
    if (!email) {
      res.status(400).json({ error: "Adresse e-mail du client manquante sur le dossier." });
      return;
    }
    const token = crypto.randomUUID().replace(/-/g, "");
    const total = computeQuoteTotalForLead(lead);
    const portalUrl = buildClientQuotePortalUrl(token);
    const { specs: merged, doc: quoteDoc, pdfBuffer } = await freezeQuoteSpecs(
      lead,
      portalUrl,
      total,
      token
    );
    await sendQuoteOfferEmail({ ...quoteDoc, email }, pdfBuffer);
    const { setSql, values } = buildLeadPatchSet({
      projectSpecs: merged,
      workflowStage: "devis_envoye_sign",
      status: "devis_envoye",
      quoteAmountHtva: total,
    });
    const n = values.length + 1;
    await q(`UPDATE leads SET ${setSql} WHERE id = $${n}`, [...values, id]);
    res.json({ ok: true, portalUrl });
  } catch (e) {
    console.error(e);
    const details = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: "L’e-mail n’a pas pu être envoyé", details });
  }
});

app.post("/api/leads/batch-patch", requireAuth, async (req, res) => {
  const c = await pool.connect();
  try {
    const { updates } = req.body as {
      updates?: Array<{ id: string; patch: Partial<Lead> }>;
    };
    if (!Array.isArray(updates) || updates.length === 0) {
      res.status(400).json({ error: "updates requis" });
      return;
    }
    await c.query("BEGIN");
    for (const update of updates) {
      const id = update?.id;
      if (!id) {
        await c.query("ROLLBACK");
        res.status(400).json({ error: "id manquant dans updates" });
        return;
      }
      const { setSql, values } = buildLeadPatchSet(update.patch ?? {});
      if (!setSql) continue;
      const n = values.length + 1;
      await c.query(`UPDATE leads SET ${setSql} WHERE id = $${n}`, [...values, id]);
    }
    await c.query("COMMIT");
    res.json({ ok: true });
  } catch (e) {
    try {
      await c.query("ROLLBACK");
    } catch {
      /* */
    }
    console.error(e);
    res.status(500).json({ error: "Mise à jour groupée impossible" });
  } finally {
    c.release();
  }
});

app.get("/api/leads/:id/billing", requireAuth, requireAdminOrDispatch, async (req, res) => {
  try {
    const summary = await getLeadBillingSummary(req.params.id);
    res.json(summary);
  } catch (e) {
    sendServerError(res, e, "GET /api/leads/:id/billing");
  }
});

app.post("/api/leads/:id/billing/checkout-subscription", requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!isStripeConfigured()) {
      res.status(503).json({ error: "Stripe non configuré (STRIPE_SECRET_KEY)" });
      return;
    }
    const { url } = await createSubscriptionCheckoutSession(req.params.id);
    res.json({ url });
  } catch (e) {
    sendServerError(res, e, "POST billing/checkout-subscription");
  }
});

app.post("/api/leads/:id/billing/sync", requireAuth, requireAdminOrDispatch, async (req, res) => {
  try {
    const meta = await syncLeadBillingFromStripe(req.params.id);
    res.json(meta);
  } catch (e) {
    sendServerError(res, e, "POST billing/sync");
  }
});

app.post("/api/leads/:id/billing/commission", requireAuth, requireAdmin, async (req, res) => {
  try {
    const body = req.body as { periodLabel?: string; grossRechargeEur?: number };
    const period = await invoiceRechargeCommission(
      req.params.id,
      String(body.periodLabel ?? ""),
      Number(body.grossRechargeEur)
    );
    res.json(period);
  } catch (e) {
    sendServerError(res, e, "POST billing/commission");
  }
});

app.delete("/api/leads/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const r = await q("DELETE FROM leads WHERE id = $1", [id]);
    if (r.rowCount === 0) {
      res.status(404).json({ error: "Dossier introuvable" });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Suppression impossible" });
  }
});

app.post("/api/installers", requireAuth, async (req, res) => {
  try {
    const { id, name, phone, email } = req.body as {
      id?: string;
      name?: string;
      phone?: string;
      email?: string;
    };
    if (!id || !name || !phone || !email) {
      res.status(400).json({ error: "id, name, phone, email requis" });
      return;
    }
    await q("INSERT INTO installers (id, name, phone, email) VALUES ($1,$2,$3,$4)", [id, name, phone, email]);
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Création impossible" });
  }
});

app.patch("/api/installers/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body as Partial<{ name: string; phone: string; email: string }>;
    const parts: string[] = [];
    const v: unknown[] = [];
    let n = 1;
    if (b.name != null) {
      parts.push(`name = $${n++}`);
      v.push(b.name);
    }
    if (b.phone != null) {
      parts.push(`phone = $${n++}`);
      v.push(b.phone);
    }
    if (b.email != null) {
      parts.push(`email = $${n++}`);
      v.push(b.email);
    }
    if (!parts.length) {
      res.status(400).json({ error: "Aucun champ" });
      return;
    }
    v.push(id);
    await q(`UPDATE installers SET ${parts.join(", ")} WHERE id = $${n}`, v);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Mise à jour impossible" });
  }
});

app.get("/api/fleet-vehicles", requireAuth, async (_req, res) => {
  try {
    const items = await listFleetVehicles();
    res.json(items);
  } catch (e) {
    sendServerError(res, e, "GET /api/fleet-vehicles");
  }
});

app.post("/api/fleet-vehicles", requireAuth, requireAdminOrDispatch, async (req, res) => {
  try {
    const { id, label, plate, makeModel, notes, installerId } = req.body as {
      id?: string;
      label?: string;
      plate?: string;
      makeModel?: string;
      notes?: string;
      installerId?: string | null;
    };
    const vehicleId = String(id ?? "").trim() || `veh-${crypto.randomUUID().slice(0, 8)}`;
    const lbl = String(label ?? "").trim();
    if (!lbl) {
      res.status(400).json({ error: "Libellé requis" });
      return;
    }
    await q(
      `INSERT INTO fleet_vehicles (id, label, plate, make_model, notes, installer_id)
       VALUES ($1, $2, $3, $4, $5, NULL)`,
      [
        vehicleId,
        lbl,
        String(plate ?? "").trim(),
        String(makeModel ?? "").trim(),
        String(notes ?? "").trim() || null,
      ]
    );
    const instId = installerId != null && String(installerId).trim() ? String(installerId).trim() : null;
    if (instId) {
      await assignFleetVehicleToInstaller(vehicleId, instId);
    }
    const { rows } = await q(
      `SELECT id, label, plate, make_model, notes, installer_id, created_at, updated_at
       FROM fleet_vehicles WHERE id = $1`,
      [vehicleId]
    );
    res.status(201).json(rowToFleetVehicle(rows[0] as never));
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    if (err.statusCode === 404) {
      res.status(404).json({ error: err.message });
      return;
    }
    sendServerError(res, e, "POST /api/fleet-vehicles");
  }
});

app.patch("/api/fleet-vehicles/:id", requireAuth, requireAdminOrDispatch, async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body as Partial<{
      label: string;
      plate: string;
      makeModel: string;
      notes: string | null;
      installerId: string | null;
    }>;
    const parts: string[] = [];
    const v: unknown[] = [];
    let n = 1;
    if (b.label != null) {
      parts.push(`label = $${n++}`);
      v.push(String(b.label).trim());
    }
    if (b.plate != null) {
      parts.push(`plate = $${n++}`);
      v.push(String(b.plate).trim());
    }
    if (b.makeModel != null) {
      parts.push(`make_model = $${n++}`);
      v.push(String(b.makeModel).trim());
    }
    if (b.notes !== undefined) {
      parts.push(`notes = $${n++}`);
      v.push(b.notes != null && String(b.notes).trim() ? String(b.notes).trim() : null);
    }
    if (parts.length) {
      parts.push(`updated_at = NOW()`);
      v.push(id);
      await q(`UPDATE fleet_vehicles SET ${parts.join(", ")} WHERE id = $${n}`, v);
    }
    if (Object.prototype.hasOwnProperty.call(b, "installerId")) {
      const instId =
        b.installerId != null && String(b.installerId).trim() ? String(b.installerId).trim() : null;
      await assignFleetVehicleToInstaller(id, instId);
    }
    const { rows } = await q(
      `SELECT id, label, plate, make_model, notes, installer_id, created_at, updated_at
       FROM fleet_vehicles WHERE id = $1`,
      [id]
    );
    if (!rows[0]) {
      res.status(404).json({ error: "Véhicule introuvable" });
      return;
    }
    res.json(rowToFleetVehicle(rows[0] as never));
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    if (err.statusCode === 404) {
      res.status(404).json({ error: err.message });
      return;
    }
    sendServerError(res, e, "PATCH /api/fleet-vehicles");
  }
});

app.delete("/api/fleet-vehicles/:id", requireAuth, requireAdminOrDispatch, async (req, res) => {
  try {
    const { id } = req.params;
    const r = await q("DELETE FROM fleet_vehicles WHERE id = $1", [id]);
    if (r.rowCount === 0) {
      res.status(404).json({ error: "Véhicule introuvable" });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    sendServerError(res, e, "DELETE /api/fleet-vehicles");
  }
});

app.delete("/api/installers/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query(
      `UPDATE leads SET installer_id = NULL, slot_start = NULL, slot_end = NULL, onsite_notified_at = NULL WHERE installer_id = $1`,
      [id]
    );
    const r = await c.query("DELETE FROM installers WHERE id = $1", [id]);
    if (r.rowCount === 0) {
      await c.query("ROLLBACK");
      res.status(404).json({ error: "Technicien introuvable" });
      return;
    }
    await c.query("COMMIT");
    res.json({ ok: true });
  } catch (e) {
    try {
      await c.query("ROLLBACK");
    } catch {
      /* */
    }
    console.error(e);
    res.status(500).json({ error: "Suppression impossible" });
  } finally {
    c.release();
  }
});

/** Formulaire vitrine « Demande de devis » — e-mail SMTP + dossier prospect. */
app.post("/api/public/devis-request", async (req, res) => {
  try {
    const rateErr = checkDevisRequestRateLimit(req);
    if (rateErr) {
      res.status(429).json({ error: rateErr });
      return;
    }
    const parsed = parseDevisRequestBody(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    if (!isSmtpConfigured()) {
      res.status(503).json({
        error:
          "Envoi par e-mail indisponible sur le serveur. Contactez-nous par téléphone ou e-mail directement.",
        code: "SMTP_NOT_CONFIGURED",
      });
      return;
    }
    const result = await handleDevisRequest(parsed.data);
    res.status(201).json({
      ok: true,
      leadId: result.leadId,
      message: "Votre demande a bien été envoyée. Nous vous répondons dans les meilleurs délais.",
    });
  } catch (e) {
    const err = e as Error & { code?: string };
    if (err.code === "SMTP_NOT_CONFIGURED") {
      res.status(503).json({ error: err.message, code: err.code });
      return;
    }
    sendServerError(res, e, "POST /api/public/devis-request");
  }
});

/** Page publique d’acceptation électronique du devis — pas d’auth JWT. */
app.get("/api/public/quote-offer/:token", async (req, res) => {
  try {
    const token = String(req.params.token ?? "").trim();
    if (!token) {
      res.status(400).json({ error: "Lien invalide" });
      return;
    }
    const { rows } = await q(
      `SELECT * FROM leads
       WHERE project_specs->'quote'->>'accessToken' = $1
       LIMIT 1`,
      [token]
    );
    const row = rows[0];
    const stage = row?.workflow_stage;
    if (!row || (!isQuoteAwaitingClientAcceptance(row) && stage !== "devis_signe")) {
      res.status(404).json({ error: "Lien expiré ou devis introuvable." });
      return;
    }
    const specs =
      row.project_specs && typeof row.project_specs === "object"
        ? (row.project_specs as ProjectSpecs)
        : {};
    const lead = rowToLead(row as never);
    const total = computeQuoteTotalForLead(lead);
    const portalUrl =
      specs.quote?.clientPortalUrl ||
      (specs.quote?.accessToken ? buildClientQuotePortalUrl(specs.quote.accessToken) : "");
    const quote = buildQuoteDocument({ ...lead, quoteAmountHtva: total, projectSpecs: specs }, portalUrl);
    const alreadySigned = stage === "devis_signe";
    res.json({
      companyName: quote.companyName,
      contactName: quote.contactName,
      email: quote.email,
      quoteMode: quote.quoteMode,
      totalHtva: quote.totalHtva,
      vatRatePercent: quote.vatRatePercent,
      vatAmount: quote.vatAmount,
      totalTvac: quote.totalTvac,
      cgvUrl: quote.cgvUrl || specs.quote?.cgvUrl || getCgvUrl(),
      quoteNumber: quote.quoteNumber,
      quoteDate: quote.quoteDate,
      validUntil: quote.validUntil,
      address: quote.address,
      baseLabel: quote.baseLabel,
      baseInstallationHtva: quote.baseInstallationHtva,
      supplements: quote.supplements,
      mountLabel: quote.mountLabel,
      supplyLabel: quote.supplyLabel,
      alreadySigned,
      signedAt: specs.quote?.signedAt,
      clientSignedName: specs.quote?.clientSignedName,
      acceptanceProofText: specs.quote?.acceptance
        ? formatAcceptanceProofText(specs.quote.acceptance)
        : undefined,
    });
  } catch (e) {
    sendServerError(res, e, "GET /api/public/quote-offer");
  }
});

app.post("/api/public/quote-sign/:token", async (req, res) => {
  try {
    const token = String(req.params.token ?? "").trim();
    const body = req.body as {
      accept?: boolean;
      signerName?: string;
      acceptTerms?: boolean;
      acceptCgv?: boolean;
    };
    if (
      !token ||
      !body.accept ||
      !body.acceptTerms ||
      !body.acceptCgv ||
      !String(body.signerName ?? "").trim()
    ) {
      res.status(400).json({
        error:
          "Acceptation électronique incomplète : nom, case devis et case conditions générales requis.",
      });
      return;
    }
    const { rows } = await q(
      `SELECT * FROM leads
       WHERE project_specs->'quote'->>'accessToken' = $1 LIMIT 1`,
      [token]
    );
    const row = rows[0];
    if (!row || !isQuoteAwaitingClientAcceptance(row)) {
      res.status(404).json({ error: "Lien non valide ou devis déjà accepté." });
      return;
    }
    const baseSpecs: ProjectSpecs =
      typeof row.project_specs === "object" && row.project_specs ? (row.project_specs as ProjectSpecs) : {};
    const lead = rowToLead(row as never);
    const portalUrl =
      baseSpecs.quote?.clientPortalUrl ||
      (baseSpecs.quote?.accessToken ? buildClientQuotePortalUrl(baseSpecs.quote.accessToken) : "");
    const signerName = String(body.signerName).trim();

    let doc = buildQuoteDocument(lead, portalUrl);
    doc = { ...doc, cgvUrl: baseSpecs.quote?.cgvUrl || getCgvUrl(), email: lead.email };
    let pdfBuffer: Buffer | null = null;
    let documentSha256 = baseSpecs.quote?.documentSha256 ?? "";
    try {
      const artifacts = await buildAcceptedQuoteArtifacts(lead, portalUrl);
      doc = artifacts.doc;
      pdfBuffer = artifacts.pdfBuffer;
      documentSha256 = artifacts.documentSha256;
    } catch (pdfErr) {
      console.error("[quote-sign] Génération PDF (acceptation enregistrée quand même):", pdfErr);
      if (!documentSha256) documentSha256 = "pdf-generation-failed";
    }

    const specs = recordElectronicAcceptance(baseSpecs, {
      signerName,
      signerEmail: lead.email?.trim() || row.email?.trim() || "",
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      acceptTerms: Boolean(body.acceptTerms),
      acceptCgv: Boolean(body.acceptCgv),
      doc,
      documentSha256,
    });
    await q(`UPDATE leads SET project_specs = $1::jsonb, workflow_stage = $2, status = $3 WHERE id = $4`, [
      JSON.stringify(specs),
      "devis_signe",
      "devis_accepte",
      row.id,
    ]);
    const proof = specs.quote!.acceptance!;
    if (pdfBuffer && isSmtpConfigured()) {
      try {
        await sendQuoteAcceptanceConfirmationEmail({ ...doc, email: lead.email }, proof, pdfBuffer);
      } catch (mailErr) {
        console.error("[quote-sign] E-mail de confirmation non envoyé:", mailErr);
      }
    }
    res.json({
      ok: true,
      proofText: formatAcceptanceProofText(proof),
      totalTvac: proof.totalTvac,
    });
  } catch (e) {
    sendServerError(res, e, "POST /api/public/quote-sign");
  }
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`API ItelecCharge — http://localhost:${port} (santé: /api/health)`);
  console.log(`Liens devis client → ${getPublicAppBaseUrl()}/devis-signer/{token}`);
  if (isStripeConfigured()) {
    void logStripeBillingSetup().catch((e) => console.warn("[stripe] Setup produits/prix:", e));
  } else {
    console.warn("Stripe non configuré — facturation abonnement / commission désactivée.");
  }
  if (!isSmtpConfigured()) {
    console.warn(
      "SMTP non configuré — devis et formulaire « Demande de devis » désactivés (SMTP_HOST + MAIL_FROM dans .env)."
    );
  } else {
    void verifySmtpConnection()
      .then(() => console.log("SMTP prêt — envoi des devis par e-mail activé."))
      .catch((e) =>
        console.warn(
          "SMTP configuré mais connexion refusée :",
          e instanceof Error ? e.message : e,
          "— vérifiez SMTP_USER / SMTP_PASS dans .env"
        )
      );
  }
});
