import { useMemo } from "react";
import { useData } from "../../context/DataContext";
import { statusLabels } from "../../data/store";
import { COMMISSION_PER_INSTALLATION } from "../../types";

export function AdminDashboard() {
  const { data, patchLead } = useData();

  const commercials = useMemo(() => {
    const ids = [...new Set(data.leads.map((l) => l.commercialId))];
    return ids.map((id) => {
      const ls = data.leads.filter((l) => l.commercialId === id);
      const clotures = ls.filter((l) => l.status === "cloture").length;
      return {
        id,
        leads: ls.length,
        clotures,
        commission: clotures * COMMISSION_PER_INSTALLATION,
      };
    });
  }, [data.leads]);

  const techStats = useMemo(() => {
    return data.installers.map((t) => {
      const ls = data.leads.filter((l) => l.installerId === t.id);
      const clotures = ls.filter((l) => l.status === "cloture").length;
      return { ...t, assigned: ls.length, clotures };
    });
  }, [data.installers, data.leads]);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Administration</h1>
      <p style={{ color: "var(--color-muted)" }}>
        Accès complet aux dossiers, aux équipes et aux indicateurs (données locales de démonstration).
      </p>

      <h2>Commerciaux (agrégé)</h2>
      <div className="table-wrap card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Identifiant</th>
              <th>Leads</th>
              <th>Clôturés</th>
              <th>Commission théorique</th>
            </tr>
          </thead>
          <tbody>
            {commercials.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.leads}</td>
                <td>{c.clotures}</td>
                <td>{c.commission}&nbsp;€</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Installateurs</h2>
      <div className="table-wrap card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Coordonnées</th>
              <th>Dossiers assignés</th>
              <th>Clôturés</th>
            </tr>
          </thead>
          <tbody>
            {techStats.map((t) => (
              <tr key={t.id}>
                <td>
                  <strong>{t.name}</strong>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{t.id}</div>
                </td>
                <td style={{ fontSize: "0.85rem" }}>
                  {t.email}
                  <br />
                  {t.phone}
                </td>
                <td>{t.assigned}</td>
                <td>{t.clotures}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Tous les dossiers</h2>
      <div className="table-wrap card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Commercial</th>
              <th>Statut</th>
              <th>Tech</th>
              <th>Commission payée</th>
            </tr>
          </thead>
          <tbody>
            {data.leads.map((l) => (
              <tr key={l.id}>
                <td>{l.companyName}</td>
                <td>{l.commercialId}</td>
                <td>{statusLabels[l.status]}</td>
                <td>{l.installerId ?? "—"}</td>
                <td>
                  {l.status === "cloture" ? (
                    <label style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <input
                        type="checkbox"
                        checked={!!l.commissionPaid}
                        onChange={(e) => patchLead(l.id, { commissionPaid: e.target.checked })}
                      />
                      Payé
                    </label>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
