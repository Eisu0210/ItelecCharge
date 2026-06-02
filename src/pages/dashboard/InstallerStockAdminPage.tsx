import { useCallback, useEffect, useMemo, useState } from "react";
import { useData } from "../../context/DataContext";
import type { StockSummaryLine } from "../../types";
import { apiFetch, formatApiErrorMessage } from "../../lib/api";
import { InstallerStockPanel } from "./InstallerStockPanel";
import "./installer-stock.css";

function formatQty(n: number, unit: string): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  if (unit === "u" || unit === "lot") return String(Math.round(v));
  return v % 1 === 0 ? String(v) : v.toFixed(2);
}

type Tab = "global" | "technicien";

export function InstallerStockAdminPage() {
  const { data } = useData();
  const [tab, setTab] = useState<Tab>("global");
  const [lines, setLines] = useState<StockSummaryLine[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [selectedInstallerId, setSelectedInstallerId] = useState("");

  const installers = useMemo(
    () => [...data.installers].sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [data.installers]
  );

  useEffect(() => {
    if (!selectedInstallerId && installers[0]) {
      setSelectedInstallerId(installers[0].id);
    }
  }, [installers, selectedInstallerId]);

  const selectedInstaller = installers.find((i) => i.id === selectedInstallerId);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await apiFetch<{ lines: StockSummaryLine[] }>("/api/installer-stock/summary");
      setLines(res.lines);
    } catch (e) {
      setToast(formatApiErrorMessage(e, "Vue globale indisponible."));
      setTimeout(() => setToast(""), 2800);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== "global") return;
    void loadSummary();
    const t = window.setInterval(() => void loadSummary(), 20000);
    return () => window.clearInterval(t);
  }, [tab, loadSummary]);

  return (
    <div>
      {toast ? <div className="toast">{toast}</div> : null}
      <h1>Stock techniciens</h1>
      <p>
        Vue consolidée de tout le matériel en camionnette et gestion individuelle par technicien.
      </p>

      <div className="stock-page-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className={`stock-page-tab${tab === "global" ? " is-active" : ""}`}
          onClick={() => setTab("global")}
        >
          Vue globale
        </button>
        <button
          type="button"
          role="tab"
          className={`stock-page-tab${tab === "technicien" ? " is-active" : ""}`}
          onClick={() => setTab("technicien")}
        >
          Par technicien
        </button>
      </div>

      {tab === "global" ? (
        <section>
          <div className="stock-toolbar">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void loadSummary()}
              disabled={summaryLoading}
            >
              Actualiser
            </button>
          </div>
          {summaryLoading && lines.length === 0 ? (
            <p className="stock-empty">Chargement…</p>
          ) : lines.length === 0 ? (
            <p className="stock-empty">
              Aucun stock enregistré. Les techniciens peuvent renseigner leur inventaire depuis
              « Stock camionnette ».
            </p>
          ) : (
            <div className="stock-table-wrap">
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>Réf.</th>
                    <th>Article</th>
                    <th>Unité</th>
                    <th>Total (tous)</th>
                    <th>Détail par technicien</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.catalogItemId ?? `${line.articleNumber}:${line.label}`}>
                      <td className="stock-meta">{line.articleNumber || "—"}</td>
                      <td>{line.label}</td>
                      <td>{line.unit}</td>
                      <td>
                        <span className="stock-qty">{formatQty(line.totalQuantity, line.unit)}</span>
                      </td>
                      <td>
                        <ul className="stock-summary-detail">
                          {line.byInstaller.map((b) => (
                            <li key={b.itemId}>
                              <strong>{b.installerName}</strong> : {formatQty(b.quantity, line.unit)}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section>
          {installers.length === 0 ? (
            <p className="stock-empty">Aucun technicien enregistré.</p>
          ) : (
            <>
              <div className="stock-toolbar">
                <div className="field" style={{ margin: 0, minWidth: "14rem" }}>
                  <label>Technicien</label>
                  <select
                    className="input"
                    value={selectedInstallerId}
                    onChange={(e) => setSelectedInstallerId(e.target.value)}
                  >
                    {installers.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {selectedInstallerId && selectedInstaller ? (
                <InstallerStockPanel
                  key={selectedInstallerId}
                  installerId={selectedInstallerId}
                  installerLabel={selectedInstaller.name}
                  catalog={data.materialCatalog}
                  canEdit
                />
              ) : null}
            </>
          )}
        </section>
      )}
    </div>
  );
}
