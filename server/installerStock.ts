import crypto from "node:crypto";
import { q } from "./db/pool";
import type { Role } from "../src/types";

export type StockMovementReason = "set" | "usage" | "replenish" | "adjustment" | "initial";

export interface InstallerStockItemDto {
  id: string;
  installerId: string;
  catalogItemId: string | null;
  articleNumber: string;
  label: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  updatedAt: string;
  updatedBy: string | null;
}

export interface StockSummaryLineDto {
  catalogItemId: string | null;
  articleNumber: string;
  label: string;
  unit: string;
  totalQuantity: number;
  byInstaller: Array<{
    installerId: string;
    installerName: string;
    quantity: number;
    itemId: string;
  }>;
}

type StockRow = {
  id: string;
  installer_id: string;
  catalog_item_id: string | null;
  article_number: string;
  label: string;
  unit: string;
  quantity: string | number;
  min_quantity: string | number;
  updated_at: Date;
  updated_by: string | null;
};

type CatalogRow = {
  id: string;
  article_number: string;
  label: string;
  unit: string;
};

function newStockId(): string {
  return `stk-${crypto.randomUUID()}`;
}

function newMovementId(): string {
  return `stm-${crypto.randomUUID()}`;
}

function rowToDto(r: StockRow): InstallerStockItemDto {
  return {
    id: r.id,
    installerId: r.installer_id,
    catalogItemId: r.catalog_item_id,
    articleNumber: r.article_number,
    label: r.label,
    unit: r.unit,
    quantity: Number(r.quantity) || 0,
    minQuantity: Number(r.min_quantity) || 0,
    updatedAt: r.updated_at.toISOString(),
    updatedBy: r.updated_by,
  };
}

export function installerProfileIdForUser(id: number, login: string, role: Role): string | null {
  if (role !== "installateur") return null;
  if (login.toLowerCase() === "installateur") return "tech-1";
  return `tech-u${id}`;
}

export type StockAccess =
  | { ok: true; installerId: string; canManageAll: boolean }
  | { ok: false; status: number; error: string };

export function resolveStockAccess(
  role: Role,
  userInstallerId: string | null,
  requestedInstallerId?: string
): StockAccess {
  if (role === "installateur") {
    if (!userInstallerId) {
      return { ok: false, status: 403, error: "Profil technicien non lié à votre compte." };
    }
    if (requestedInstallerId && requestedInstallerId !== userInstallerId) {
      return { ok: false, status: 403, error: "Accès réservé à votre stock personnel." };
    }
    return { ok: true, installerId: userInstallerId, canManageAll: false };
  }
  if (role === "admin" || role === "dispatch") {
    if (requestedInstallerId) {
      return { ok: true, installerId: requestedInstallerId, canManageAll: true };
    }
    return { ok: true, installerId: "", canManageAll: true };
  }
  return { ok: false, status: 403, error: "Accès non autorisé." };
}

export async function listInstallerStock(installerId?: string): Promise<InstallerStockItemDto[]> {
  const sql = installerId
    ? `SELECT id, installer_id, catalog_item_id, article_number, label, unit, quantity, min_quantity, updated_at, updated_by
       FROM installer_stock_items WHERE installer_id = $1
       ORDER BY label, article_number`
    : `SELECT id, installer_id, catalog_item_id, article_number, label, unit, quantity, min_quantity, updated_at, updated_by
       FROM installer_stock_items
       ORDER BY installer_id, label, article_number`;
  const r = await q<StockRow>(sql, installerId ? [installerId] : []);
  return r.rows.map(rowToDto);
}

export async function getStockItem(id: string): Promise<InstallerStockItemDto | null> {
  const r = await q<StockRow>(
    `SELECT id, installer_id, catalog_item_id, article_number, label, unit, quantity, min_quantity, updated_at, updated_by
     FROM installer_stock_items WHERE id = $1`,
    [id]
  );
  const row = r.rows[0];
  return row ? rowToDto(row) : null;
}

async function recordMovement(opts: {
  installerId: string;
  stockItemId: string;
  delta: number;
  quantityAfter: number;
  reason: StockMovementReason;
  note?: string;
  leadId?: string;
  createdBy: string;
}): Promise<void> {
  await q(
    `INSERT INTO installer_stock_movements (
      id, installer_id, stock_item_id, delta, quantity_after, reason, note, lead_id, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      newMovementId(),
      opts.installerId,
      opts.stockItemId,
      opts.delta,
      opts.quantityAfter,
      opts.reason,
      opts.note?.trim() || null,
      opts.leadId?.trim() || null,
      opts.createdBy,
    ]
  );
}

export async function buildStockSummary(): Promise<StockSummaryLineDto[]> {
  const items = await listInstallerStock();
  const { rows: installers } = await q<{ id: string; name: string }>(`SELECT id, name FROM installers ORDER BY name`);
  const nameById = new Map(installers.map((i) => [i.id, i.name]));

  const map = new Map<string, StockSummaryLineDto>();
  for (const item of items) {
    const key = item.catalogItemId ?? `custom:${item.articleNumber}:${item.label}`;
    let line = map.get(key);
    if (!line) {
      line = {
        catalogItemId: item.catalogItemId,
        articleNumber: item.articleNumber,
        label: item.label,
        unit: item.unit,
        totalQuantity: 0,
        byInstaller: [],
      };
      map.set(key, line);
    }
    line.totalQuantity += item.quantity;
    line.byInstaller.push({
      installerId: item.installerId,
      installerName: nameById.get(item.installerId) ?? item.installerId,
      quantity: item.quantity,
      itemId: item.id,
    });
  }
  return [...map.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "fr", { sensitivity: "base" })
  );
}

export async function upsertStockItem(opts: {
  installerId: string;
  catalogItemId?: string | null;
  articleNumber?: string;
  label?: string;
  unit?: string;
  quantity: number;
  minQuantity?: number;
  updatedBy: string;
  reason?: StockMovementReason;
}): Promise<InstallerStockItemDto> {
  const qty = Math.max(0, opts.quantity);
  const minQty = Math.max(0, opts.minQuantity ?? 0);
  let articleNumber = (opts.articleNumber ?? "").trim();
  let label = (opts.label ?? "").trim();
  let unit = (opts.unit ?? "u").trim() || "u";
  const catalogId = opts.catalogItemId?.trim() || null;

  if (catalogId) {
    const cat = await q<CatalogRow>(
      `SELECT id, article_number, label, unit FROM material_catalog WHERE id = $1`,
      [catalogId]
    );
    const row = cat.rows[0];
    if (!row) throw new Error("Article catalogue introuvable");
    articleNumber = row.article_number;
    label = row.label;
    unit = row.unit;
    const existing = await q<StockRow>(
      `SELECT id, installer_id, catalog_item_id, article_number, label, unit, quantity, min_quantity, updated_at, updated_by
       FROM installer_stock_items WHERE installer_id = $1 AND catalog_item_id = $2`,
      [opts.installerId, catalogId]
    );
    if (existing.rows[0]) {
      return setStockQuantity(existing.rows[0].id, qty, opts.updatedBy, opts.reason ?? "set", minQty);
    }
  } else {
    if (!label) throw new Error("Libellé requis pour un article hors catalogue");
  }

  const id = newStockId();
  await q(
    `INSERT INTO installer_stock_items (
      id, installer_id, catalog_item_id, article_number, label, unit, quantity, min_quantity, updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, opts.installerId, catalogId, articleNumber, label, unit, qty, minQty, opts.updatedBy]
  );
  await recordMovement({
    installerId: opts.installerId,
    stockItemId: id,
    delta: qty,
    quantityAfter: qty,
    reason: opts.reason ?? "initial",
    createdBy: opts.updatedBy,
  });
  const created = await getStockItem(id);
  if (!created) throw new Error("Création stock échouée");
  return created;
}

export async function setStockQuantity(
  itemId: string,
  newQuantity: number,
  updatedBy: string,
  reason: StockMovementReason = "set",
  minQuantity?: number
): Promise<InstallerStockItemDto> {
  const item = await getStockItem(itemId);
  if (!item) throw new Error("Ligne de stock introuvable");
  const qty = Math.max(0, newQuantity);
  const delta = qty - item.quantity;
  const minQty = minQuantity !== undefined ? Math.max(0, minQuantity) : item.minQuantity;

  await q(
    `UPDATE installer_stock_items SET quantity = $1, min_quantity = $2, updated_at = NOW(), updated_by = $3 WHERE id = $4`,
    [qty, minQty, updatedBy, itemId]
  );
  if (delta !== 0 || reason === "set") {
    await recordMovement({
      installerId: item.installerId,
      stockItemId: itemId,
      delta: delta !== 0 ? delta : qty,
      quantityAfter: qty,
      reason: delta === 0 && reason === "set" ? "set" : reason,
      createdBy: updatedBy,
    });
  }
  const updated = await getStockItem(itemId);
  if (!updated) throw new Error("Mise à jour stock échouée");
  return updated;
}

export async function applyStockDelta(opts: {
  itemId: string;
  delta: number;
  reason: StockMovementReason;
  note?: string;
  leadId?: string;
  updatedBy: string;
}): Promise<InstallerStockItemDto> {
  const item = await getStockItem(opts.itemId);
  if (!item) throw new Error("Ligne de stock introuvable");
  const next = Math.max(0, item.quantity + opts.delta);
  await q(
    `UPDATE installer_stock_items SET quantity = $1, updated_at = NOW(), updated_by = $2 WHERE id = $3`,
    [next, opts.updatedBy, opts.itemId]
  );
  await recordMovement({
    installerId: item.installerId,
    stockItemId: opts.itemId,
    delta: opts.delta,
    quantityAfter: next,
    reason: opts.reason,
    note: opts.note,
    leadId: opts.leadId,
    createdBy: opts.updatedBy,
  });
  const updated = await getStockItem(opts.itemId);
  if (!updated) throw new Error("Mise à jour stock échouée");
  return updated;
}

export async function deleteStockItem(itemId: string): Promise<boolean> {
  const r = await q(`DELETE FROM installer_stock_items WHERE id = $1`, [itemId]);
  return (r.rowCount ?? 0) > 0;
}

export type DossierMaterialLine = {
  catalogItemId?: string | null;
  articleNumber?: string;
  label: string;
  quantity: number;
};

export type StockDossierSyncLine = {
  label: string;
  articleNumber: string;
  delta: number;
  stockItemId: string;
  quantityAfter: number;
};

export type StockDossierSyncResult = {
  applied: StockDossierSyncLine[];
  warnings: string[];
};

function normalizeDossierLine(raw: DossierMaterialLine): DossierMaterialLine | null {
  const label = String(raw.label ?? "").trim();
  const quantity = Number(raw.quantity);
  if (!label || !Number.isFinite(quantity) || quantity < 0) return null;
  const catalogItemId = raw.catalogItemId ? String(raw.catalogItemId).trim() : null;
  const articleNumber = String(raw.articleNumber ?? "").trim();
  return { catalogItemId: catalogItemId || null, articleNumber, label, quantity };
}

function dossierMaterialKey(m: DossierMaterialLine): string {
  if (m.catalogItemId) return `cat:${m.catalogItemId}`;
  if (m.articleNumber) return `art:${m.articleNumber.toLowerCase()}:${m.label.toLowerCase()}`;
  return `lbl:${m.label.toLowerCase()}`;
}

function sumDossierMaterialsByKey(lines: DossierMaterialLine[]): Map<string, DossierMaterialLine> {
  const map = new Map<string, DossierMaterialLine>();
  for (const raw of lines) {
    const m = normalizeDossierLine(raw);
    if (!m) continue;
    const key = dossierMaterialKey(m);
    const prev = map.get(key);
    if (prev) {
      map.set(key, { ...prev, quantity: prev.quantity + m.quantity });
    } else {
      map.set(key, m);
    }
  }
  return map;
}

async function findStockItemForDossierLine(
  installerId: string,
  m: DossierMaterialLine
): Promise<InstallerStockItemDto | null> {
  if (m.catalogItemId) {
    const r = await q<StockRow>(
      `SELECT id, installer_id, catalog_item_id, article_number, label, unit, quantity, min_quantity, updated_at, updated_by
       FROM installer_stock_items WHERE installer_id = $1 AND catalog_item_id = $2 LIMIT 1`,
      [installerId, m.catalogItemId]
    );
    return r.rows[0] ? rowToDto(r.rows[0]) : null;
  }
  if (m.articleNumber) {
    const r = await q<StockRow>(
      `SELECT id, installer_id, catalog_item_id, article_number, label, unit, quantity, min_quantity, updated_at, updated_by
       FROM installer_stock_items
       WHERE installer_id = $1 AND LOWER(article_number) = LOWER($2) AND LOWER(label) = LOWER($3)
       LIMIT 1`,
      [installerId, m.articleNumber, m.label]
    );
    if (r.rows[0]) return rowToDto(r.rows[0]);
  }
  const r = await q<StockRow>(
    `SELECT id, installer_id, catalog_item_id, article_number, label, unit, quantity, min_quantity, updated_at, updated_by
     FROM installer_stock_items
     WHERE installer_id = $1 AND LOWER(label) = LOWER($2)
     ORDER BY catalog_item_id NULLS LAST
     LIMIT 1`,
    [installerId, m.label]
  );
  return r.rows[0] ? rowToDto(r.rows[0]) : null;
}

export async function syncStockFromDossierMaterials(opts: {
  installerId: string;
  leadId: string;
  previous: DossierMaterialLine[];
  next: DossierMaterialLine[];
  updatedBy: string;
}): Promise<StockDossierSyncResult> {
  const prevMap = sumDossierMaterialsByKey(opts.previous);
  const nextMap = sumDossierMaterialsByKey(opts.next);
  const keys = new Set([...prevMap.keys(), ...nextMap.keys()]);
  const applied: StockDossierSyncLine[] = [];
  const warnings: string[] = [];
  const noteBase = `Dossier client ${opts.leadId}`;

  for (const key of keys) {
    const prevQty = prevMap.get(key)?.quantity ?? 0;
    const nextLine = nextMap.get(key);
    const nextQty = nextLine?.quantity ?? 0;
    const usageDelta = nextQty - prevQty;
    if (usageDelta === 0 || !nextLine) continue;

    const stockItem = await findStockItemForDossierLine(opts.installerId, nextLine);
    if (!stockItem) {
      if (usageDelta > 0) {
        warnings.push(
          `« ${nextLine.label} » : absent du stock camionnette.`
        );
      }
      continue;
    }

    const updated = await applyStockDelta({
      itemId: stockItem.id,
      delta: -usageDelta,
      reason: usageDelta > 0 ? "usage" : "replenish",
      note: noteBase,
      leadId: opts.leadId,
      updatedBy: opts.updatedBy,
    });
    applied.push({
      label: nextLine.label,
      articleNumber: nextLine.articleNumber,
      delta: -usageDelta,
      stockItemId: stockItem.id,
      quantityAfter: updated.quantity,
    });
  }

  return { applied, warnings };
}

export async function assertLeadAssignedToInstaller(leadId: string, installerId: string): Promise<boolean> {
  const r = await q<{ installer_id: string | null }>(
    `SELECT installer_id FROM leads WHERE id = $1 LIMIT 1`,
    [leadId]
  );
  return r.rows[0]?.installer_id === installerId;
}

/** Chaque ligne doit exister dans le stock du technicien (pas de saisie hors inventaire). */
export async function validateMaterialsInInstallerStock(
  installerId: string,
  materials: DossierMaterialLine[]
): Promise<string | null> {
  const map = sumDossierMaterialsByKey(materials);
  for (const m of map.values()) {
    if (m.quantity <= 0) continue;
    const stockItem = await findStockItemForDossierLine(installerId, m);
    if (!stockItem) {
      return `« ${m.label} » n’est pas dans votre stock camionnette. Ajoutez l’article à votre stock avant de l’utiliser sur un chantier.`;
    }
  }
  return null;
}
