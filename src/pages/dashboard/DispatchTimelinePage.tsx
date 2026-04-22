import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useData } from "../../context/DataContext";
import type { Lead } from "../../types";

function bucket(lead: Lead): "done" | "active" | "upcoming" {
  if (lead.status === "cloture") return "done";
  if (lead.status === "en_cours") return "active";
  return "upcoming";
}

const colors = {
  done: "var(--color-lime)",
  active: "var(--color-orange)",
  upcoming: "#ffffff",
};

export function DispatchTimelinePage() {
  const { data } = useData();

  const byTech = useMemo(() => {
    const m = new Map<string, Lead[]>();
    for (const t of data.installers) m.set(t.id, []);
    for (const l of data.leads) {
      if (!l.installerId || !l.slotStart) continue;
      if (!["installation_planifiee", "en_cours", "cloture"].includes(l.status)) continue;
      m.set(l.installerId, [...(m.get(l.installerId) ?? []), l]);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => String(a.slotStart).localeCompare(String(b.slotStart)));
    }
    return m;
  }, [data.leads, data.installers]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        <h1 style={{ marginTop: 0 }}>Vue timeline</h1>
        <Link to="/app" className="btn btn-ghost">
          Retour dispatch
        </Link>
      </div>
      <p style={{ color: "var(--color-muted)" }}>
        Légende : <span style={{ color: colors.done }}>■</span> clôturé ·{" "}
        <span style={{ color: colors.active }}>■</span> en cours ·{" "}
        <span style={{ border: "1px solid #ccc", display: "inline-block", width: 10, height: 10 }} /> à
        venir
      </p>

      {data.installers.map((t) => {
        const list = byTech.get(t.id) ?? [];
        return (
          <div key={t.id} className="card" style={{ marginBottom: "1rem" }}>
            <h2 style={{ marginTop: 0 }}>
              {t.name}{" "}
              <span style={{ fontSize: "0.85rem", color: "var(--color-muted)", fontWeight: 400 }}>
                {t.phone}
              </span>
            </h2>
            {list.length === 0 ? (
              <p style={{ color: "var(--color-muted)" }}>Aucune installation planifiée.</p>
            ) : (
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  overflowX: "auto",
                  paddingBottom: "0.35rem",
                }}
              >
                {list.map((l) => {
                  const b = bucket(l);
                  return (
                    <div
                      key={l.id}
                      style={{
                        minWidth: 200,
                        borderRadius: 10,
                        border: b === "upcoming" ? "1px solid var(--color-border)" : "none",
                        background: colors[b],
                        color: b === "upcoming" ? "var(--text)" : "#fff",
                        padding: "0.65rem 0.75rem",
                        fontSize: "0.85rem",
                        boxShadow: "var(--shadow)",
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{l.companyName}</div>
                      <div>{l.slotStart ? new Date(l.slotStart).toLocaleString("fr-BE") : ""}</div>
                      <div style={{ opacity: 0.9 }}>{l.status}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
