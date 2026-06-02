import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../../context/DataContext";
import type { Lead } from "../../types";

export function DispatchDashboard({
  showTimelineLink = true,
  embedded = false,
}: {
  showTimelineLink?: boolean;
  /** Intégré dans la page Planning (titres secondaires, pas de lien timeline). */
  embedded?: boolean;
} = {}) {
  const { data, patchLead } = useData();
  const [toast, setToast] = useState("");

  const pool = useMemo(
    () =>
      data.leads.filter(
        (l) => l.status === "devis_accepte" && !l.installerId && !l.slotStart
      ),
    [data.leads]
  );

  const [assign, setAssign] = useState<Record<string, { tech: string; start: string; end: string }>>({});

  const defaultTech = data.installers[0]?.id ?? "";

  function rowState(lead: Lead) {
    return assign[lead.id] ?? { tech: defaultTech, start: "", end: "" };
  }

  function setRow(leadId: string, part: Partial<{ tech: string; start: string; end: string }>) {
    setAssign((prev) => {
      const base = prev[leadId] ?? { tech: defaultTech, start: "", end: "" };
      return { ...prev, [leadId]: { ...base, ...part } };
    });
  }

  function dispatchLead(lead: Lead) {
    const a = rowState(lead);
    if (!a.tech || !a.start || !a.end) {
      setToast("Renseignez technicien et créneau.");
      setTimeout(() => setToast(""), 2500);
      return;
    }
    const start = new Date(a.start).toISOString();
    const end = new Date(a.end).toISOString();
    patchLead(lead.id, {
      installerId: a.tech,
      slotStart: start,
      slotEnd: end,
      status: "installation_planifiee",
    });
    setToast("Installation planifiée.");
    setTimeout(() => setToast(""), 2500);
  }

  return (
    <div>
      {toast ? <div className="toast">{toast}</div> : null}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        {embedded ? (
          <h2 style={{ marginTop: 0, color: "var(--color-navy)" }}>Pool à affecter</h2>
        ) : (
          <h1 style={{ marginTop: 0 }}>Dispatch</h1>
        )}
        {showTimelineLink ? (
          <Link to="/app/planning#timeline-planning" className="btn btn-primary">
            Vue timeline techniciens
          </Link>
        ) : null}
      </div>
      <p style={{ color: "var(--color-muted)" }}>
        Dossiers avec devis accepté et signé, en attente d’affectation. Ajustez le créneau horaire selon la
        complexité du chantier.
      </p>

      <h2>Pool à affecter</h2>
      {pool.length === 0 ? (
        <p className="card">Aucun dossier en attente.</p>
      ) : (
        pool.map((l) => {
          const r = rowState(l);
          return (
            <div key={l.id} className="card" style={{ marginBottom: "1rem" }}>
              <strong>{l.companyName}</strong> — {l.address}
              <div style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>
                {l.contactName} · {l.phone}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "0.75rem",
                  marginTop: "0.75rem",
                }}
              >
                <div className="field" style={{ margin: 0 }}>
                  <label>Technicien</label>
                  <select
                    className="input"
                    value={r.tech}
                    onChange={(e) => setRow(l.id, { tech: e.target.value })}
                  >
                    {data.installers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>Début créneau</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={r.start}
                    onChange={(e) => setRow(l.id, { start: e.target.value })}
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>Fin créneau</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={r.end}
                    onChange={(e) => setRow(l.id, { end: e.target.value })}
                  />
                </div>
              </div>
              <button type="button" className="btn btn-accent" style={{ marginTop: "0.75rem" }} onClick={() => dispatchLead(l)}>
                Affecter & planifier
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
