import { useMemo, useState } from "react";
import { useData } from "../../context/DataContext";
import { formatApiErrorMessage } from "../../lib/api";

const MATERIAL_UNITS = ["u", "m", "m2", "ml", "kg", "lot"];

export function MaterialCatalogPage() {
  const {
    data,
    createMaterialCatalogItem,
    deleteMaterialCatalogItem,
    importMaterialCatalogFromUrl,
  } = useData();
  const [toast, setToast] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [form, setForm] = useState({
    articleNumber: "",
    label: "",
    unit: "u",
    unitPriceHt: "0",
  });

  const items = useMemo(
    () =>
      [...data.materialCatalog].sort((a, b) =>
        a.articleNumber.localeCompare(b.articleNumber, "fr", { sensitivity: "base" })
      ),
    [data.materialCatalog]
  );

  async function createItem() {
    const articleNumber = form.articleNumber.trim();
    const label = form.label.trim();
    const unit = form.unit.trim() || "u";
    const unitPriceHt = Number(form.unitPriceHt);
    if (!articleNumber || !label) {
      setToast("Référence et libellé requis.");
      setTimeout(() => setToast(""), 2400);
      return;
    }
    try {
      await createMaterialCatalogItem({
        supplier: "rexel",
        articleNumber,
        label,
        unit,
        unitPriceHt: Number.isFinite(unitPriceHt) ? unitPriceHt : 0,
        compatibleModels: [],
      });
      setImportUrl("");
      setForm((prev) => ({ ...prev, articleNumber: "", label: "", unitPriceHt: "0" }));
      setToast("Article ajouté au catalogue.");
      setTimeout(() => setToast(""), 2400);
    } catch {
      setToast("Erreur lors de l’ajout de l’article.");
      setTimeout(() => setToast(""), 2600);
    }
  }

  async function removeItem(id: string) {
    try {
      await deleteMaterialCatalogItem(id);
      setToast("Article supprimé.");
      setTimeout(() => setToast(""), 2200);
    } catch {
      setToast("Suppression impossible.");
      setTimeout(() => setToast(""), 2400);
    }
  }

  async function importFromUrl() {
    const url = importUrl.trim();
    if (!url) {
      setToast("Collez une URL produit Rexel.");
      setTimeout(() => setToast(""), 2200);
      return;
    }
    setImportBusy(true);
    try {
      const extracted = await importMaterialCatalogFromUrl(url);
      setForm((prev) => ({
        ...prev,
        label: extracted.label,
        articleNumber: extracted.articleNumber,
        unitPriceHt: String(extracted.unitPriceHt),
      }));
      setToast("Article détecté: formulaire prérempli.");
      setTimeout(() => setToast(""), 2600);
    } catch (e) {
      setToast(formatApiErrorMessage(e, "Import impossible depuis cette URL Rexel."));
      setTimeout(() => setToast(""), 2800);
    } finally {
      setImportBusy(false);
    }
  }

  return (
    <div>
      {toast ? <div className="toast">{toast}</div> : null}
      <h1 style={{ marginTop: 0 }}>Catalogue matériaux</h1>
      <p style={{ color: "var(--color-muted)" }}>
        Les articles du catalogue sont verrouillés après création pour éviter les modifications accidentelles.
      </p>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, marginBottom: "0.7rem", fontSize: "1.05rem" }}>Ajouter un article</h2>
        <div
          className="card"
          style={{ border: "1px solid var(--color-border)", marginBottom: "0.85rem", padding: "0.75rem 0.9rem" }}
        >
          <h3 style={{ marginTop: 0, marginBottom: "0.55rem", fontSize: "0.98rem" }}>
            Import automatique depuis URL Rexel
          </h3>
          <div className="u-grid-form-row u-grid-form-row--url">
            <div className="field" style={{ margin: 0 }}>
              <label>URL produit Rexel</label>
              <input
                className="input"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://www.rexel.be/frx/..."
              />
            </div>
            <button type="button" className="btn btn-primary" onClick={() => void importFromUrl()} disabled={importBusy}>
              {importBusy ? "Import..." : "Importer URL"}
            </button>
          </div>
          <p style={{ margin: "0.45rem 0 0", color: "var(--color-muted)", fontSize: "0.85rem" }}>
            Le système récupère automatiquement le nom produit, la référence et le prix puis préremplit le formulaire.
          </p>
        </div>
        <div className="u-grid-form-row u-grid-form-row--material-finance">
          <div className="field" style={{ margin: 0 }}>
            <label>Libellé (nom produit)</label>
            <input
              className="input"
              value={form.label}
              onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Référence</label>
            <input
              className="input"
              value={form.articleNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, articleNumber: e.target.value }))}
              placeholder="ex. 1234567"
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Unité</label>
            <select
              className="input"
              value={form.unit}
              onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
            >
              {MATERIAL_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>PU HT (€)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={form.unitPriceHt}
              onChange={(e) => setForm((prev) => ({ ...prev, unitPriceHt: e.target.value }))}
            />
          </div>
          <button type="button" className="btn btn-primary" onClick={() => void createItem()}>
            Créer
          </button>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0, marginBottom: "0.7rem", fontSize: "1.05rem" }}>Articles existants</h2>
        <div className="table-wrap" style={{ border: "1px solid var(--color-border)", borderRadius: 10 }}>
          <table>
            <thead>
              <tr>
                <th>Libellé</th>
                <th>Réf.</th>
                <th>Unité</th>
                <th>PU HT</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ color: "var(--color-muted)" }}>
                    Catalogue vide.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.label}</td>
                    <td>{item.articleNumber}</td>
                    <td style={{ width: 90 }}>{item.unit}</td>
                    <td style={{ width: 110 }}>{item.unitPriceHt.toFixed(2)} €</td>
                    <td style={{ width: 110 }}>
                      <button type="button" className="btn btn-ghost" onClick={() => void removeItem(item.id)}>
                        Suppr.
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
