import { useCallback, useEffect, useMemo, useState } from "react";
import type { InstallerStockItem, MaterialCatalogItem } from "../../types";
import { apiFetch, formatApiErrorMessage } from "../../lib/api";
import "./installer-stock.css";

function formatQty(n: number, unit: string): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  if (unit === "u" || unit === "lot") return String(Math.round(v));
  return v % 1 === 0 ? String(v) : v.toFixed(2);
}

function qtyClass(item: InstallerStockItem): string {
  if (item.quantity <= 0) return "stock-qty is-empty";
  if (item.minQuantity > 0 && item.quantity <= item.minQuantity) return "stock-qty is-low";
  return "stock-qty";
}

type Props = {
  installerId: string;
  installerLabel?: string;
  catalog: MaterialCatalogItem[];
  canEdit?: boolean;
  pollMs?: number;
};

export function InstallerStockPanel({
  installerId,
  installerLabel,
  catalog,
  canEdit = true,
  pollMs = 20000,
}: Props) {
  const [items, setItems] = useState<InstallerStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    catalogItemId: "",
    articleNumber: "",
    label: "",
    unit: "u",
    quantity: "1",
    minQuantity: "0",
  });

  const showToast = (msg: string, ms = 2600) => {
    setToast(msg);
    setTimeout(() => setToast(""), ms);
  };

  const load = useCallback(async () => {
    const q = new URLSearchParams({ installerId });
    const data = await apiFetch<{ items: InstallerStockItem[] }>(`/api/installer-stock?${q}`);
    setItems(
      [...data.items].sort((a, b) =>
        a.label.localeCompare(b.label, "fr", { sensitivity: "base" })
      )
    );
  }, [installerId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .catch((e) => {
        if (!cancelled) showToast(formatApiErrorMessage(e, "Impossible de charger le stock."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (!pollMs) return;
    const t = window.setInterval(() => {
      void load().catch(() => undefined);
    }, pollMs);
    return () => window.clearInterval(t);
  }, [load, pollMs]);

  const catalogSorted = useMemo(
    () =>
      [...catalog].sort((a, b) =>
        a.label.localeCompare(b.label, "fr", { sensitivity: "base" })
      ),
    [catalog]
  );

  async function addItem() {
    const quantity = Number(addForm.quantity);
    const minQuantity = Number(addForm.minQuantity);
    if (!Number.isFinite(quantity) || quantity < 0) {
      showToast("Quantité invalide.");
      return;
    }
    setBusyId("add");
    try {
      const body: Record<string, unknown> = {
        installerId,
        quantity,
        minQuantity: Number.isFinite(minQuantity) ? minQuantity : 0,
      };
      if (addForm.catalogItemId) {
        body.catalogItemId = addForm.catalogItemId;
      } else {
        const label = addForm.label.trim();
        if (!label) {
          showToast("Choisissez un article du catalogue ou saisissez un libellé.");
          setBusyId(null);
          return;
        }
        body.articleNumber = addForm.articleNumber.trim();
        body.label = label;
        body.unit = addForm.unit.trim() || "u";
      }
      await apiFetch("/api/installer-stock/items", {
        method: "POST",
        body: JSON.stringify(body),
      });
      await load();
      setAddOpen(false);
      setAddForm({
        catalogItemId: "",
        articleNumber: "",
        label: "",
        unit: "u",
        quantity: "1",
        minQuantity: "0",
      });
      showToast("Article ajouté au stock.");
    } catch (e) {
      showToast(formatApiErrorMessage(e, "Ajout impossible."));
    } finally {
      setBusyId(null);
    }
  }

  async function move(itemId: string, delta: number) {
    setBusyId(itemId);
    try {
      await apiFetch(`/api/installer-stock/items/${encodeURIComponent(itemId)}/move`, {
        method: "POST",
        body: JSON.stringify({ delta, reason: delta < 0 ? "usage" : "replenish" }),
      });
      await load();
    } catch (e) {
      showToast(formatApiErrorMessage(e, "Mise à jour impossible."));
    } finally {
      setBusyId(null);
    }
  }

  async function setQty(item: InstallerStockItem) {
    const raw = window.prompt(`Quantité pour « ${item.label} »`, String(item.quantity));
    if (raw == null) return;
    const quantity = Number(raw.replace(",", "."));
    if (!Number.isFinite(quantity) || quantity < 0) {
      showToast("Quantité invalide.");
      return;
    }
    setBusyId(item.id);
    try {
      await apiFetch(`/api/installer-stock/items/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
      });
      await load();
      showToast("Quantité mise à jour.");
    } catch (e) {
      showToast(formatApiErrorMessage(e, "Mise à jour impossible."));
    } finally {
      setBusyId(null);
    }
  }

  async function removeItem(item: InstallerStockItem) {
    if (!window.confirm(`Retirer « ${item.label} » de la liste du stock ?`)) return;
    setBusyId(item.id);
    try {
      await apiFetch(`/api/installer-stock/items/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      await load();
      showToast("Ligne supprimée.");
    } catch (e) {
      showToast(formatApiErrorMessage(e, "Suppression impossible."));
    } finally {
      setBusyId(null);
    }
  }

  function onCatalogPick(id: string) {
    const c = catalog.find((x) => x.id === id);
    setAddForm((f) => ({
      ...f,
      catalogItemId: id,
      articleNumber: c?.articleNumber ?? "",
      label: c?.label ?? "",
      unit: c?.unit ?? "u",
    }));
  }

  return (
    <div>
      {toast ? <div className="toast">{toast}</div> : null}
      {installerLabel ? (
        <p className="stock-meta" style={{ marginTop: 0 }}>
          Stock de <strong>{installerLabel}</strong> — mis à jour automatiquement toutes les {pollMs / 1000} s
        </p>
      ) : null}

      <div className="stock-toolbar">
        {canEdit ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setAddOpen((o) => !o)}
            disabled={busyId === "add"}
          >
            {addOpen ? "Fermer" : "Ajouter un article"}
          </button>
        ) : null}
        <button type="button" className="btn btn-ghost" onClick={() => void load()} disabled={loading}>
          Actualiser
        </button>
      </div>

      {addOpen && canEdit ? (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Ajouter au stock</h2>
          <div className="stock-add-grid">
            <div className="field" style={{ margin: 0, gridColumn: "1 / -1" }}>
              <label>Depuis le catalogue</label>
              <select
                className="input"
                value={addForm.catalogItemId}
                onChange={(e) => onCatalogPick(e.target.value)}
              >
                <option value="">— Article personnalisé —</option>
                {catalogSorted.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.articleNumber ? `${c.articleNumber} — ` : ""}
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            {!addForm.catalogItemId ? (
              <>
                <div className="field" style={{ margin: 0 }}>
                  <label>Référence</label>
                  <input
                    className="input"
                    value={addForm.articleNumber}
                    onChange={(e) => setAddForm((f) => ({ ...f, articleNumber: e.target.value }))}
                  />
                </div>
                <div className="field" style={{ margin: 0, gridColumn: "span 2" }}>
                  <label>Libellé</label>
                  <input
                    className="input"
                    value={addForm.label}
                    onChange={(e) => setAddForm((f) => ({ ...f, label: e.target.value }))}
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>Unité</label>
                  <input
                    className="input"
                    value={addForm.unit}
                    onChange={(e) => setAddForm((f) => ({ ...f, unit: e.target.value }))}
                  />
                </div>
              </>
            ) : null}
            <div className="field" style={{ margin: 0 }}>
              <label>Quantité</label>
              <input
                className="input"
                type="number"
                min={0}
                step="any"
                value={addForm.quantity}
                onChange={(e) => setAddForm((f) => ({ ...f, quantity: e.target.value }))}
              />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Seuil alerte</label>
              <input
                className="input"
                type="number"
                min={0}
                step="any"
                title="Alerte visuelle si le stock descend à ce niveau ou en dessous"
                value={addForm.minQuantity}
                onChange={(e) => setAddForm((f) => ({ ...f, minQuantity: e.target.value }))}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void addItem()}
              disabled={busyId === "add"}
            >
              Enregistrer
            </button>
          </div>
        </div>
      ) : null}

      {loading && items.length === 0 ? (
        <p className="stock-empty">Chargement…</p>
      ) : items.length === 0 ? (
        <div className="stock-empty">
          Aucun article en stock.
          {canEdit ? " Ajoutez le contenu de la camionnette pour suivre les quantités en temps réel." : null}
        </div>
      ) : (
        <div className="stock-table-wrap">
          <table className="stock-table">
            <thead>
              <tr>
                <th>Réf.</th>
                <th>Article</th>
                <th>Unité</th>
                <th>Restant</th>
                {canEdit ? <th style={{ width: "9rem" }}>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="stock-meta">{item.articleNumber || "—"}</td>
                  <td>
                    <div>{item.label}</div>
                    {item.minQuantity > 0 ? (
                      <div className="stock-meta">Alerte ≤ {formatQty(item.minQuantity, item.unit)}</div>
                    ) : null}
                  </td>
                  <td>{item.unit}</td>
                  <td>
                    <span className={qtyClass(item)} title="Quantité actuelle">
                      {formatQty(item.quantity, item.unit)}
                    </span>
                  </td>
                  {canEdit ? (
                    <td>
                      <div className="stock-actions">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          title="Utilisé (−1)"
                          disabled={busyId === item.id || item.quantity <= 0}
                          onClick={() => void move(item.id, -1)}
                        >
                          −
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          title="Réappro (+1)"
                          disabled={busyId === item.id}
                          onClick={() => void move(item.id, 1)}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          title="Saisir la quantité exacte"
                          disabled={busyId === item.id}
                          onClick={() => void setQty(item)}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          title="Retirer la ligne"
                          disabled={busyId === item.id}
                          onClick={() => void removeItem(item)}
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
