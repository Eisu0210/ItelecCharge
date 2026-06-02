import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useData } from "../../context/DataContext";
import { COMMISSION_PER_INSTALLATION } from "../../types";
import type { Lead } from "../../types";

/** Liste agrégée des commerciaux — admin uniquement. */
export function CommerciauxListPage() {
  const { data } = useData();

  const commercials = useMemo(() => {
    const ids = [...new Set(data.leads.map((l) => l.commercialId))];
    return ids
      .map((id) => {
      const ls = data.leads.filter((l) => l.commercialId === id);
      const clotures = ls.filter((l) => l.status === "cloture").length;
      const payees = ls.filter((l) => l.status === "cloture" && l.commissionPaid).length;
      const enAttente = clotures - payees;
      return {
        id,
        leads: ls.length,
        clotures,
        commissionGeneree: clotures * COMMISSION_PER_INSTALLATION,
        commissionPercue: payees * COMMISSION_PER_INSTALLATION,
        commissionEnAttente: enAttente * COMMISSION_PER_INSTALLATION,
      };
    })
      .sort((a, b) => b.commissionEnAttente - a.commissionEnAttente);
  }, [data.leads]);

  const topWaitingLeads = useMemo(() => {
    return data.leads
      .filter((l) => l.workflowStage === "attente_admin")
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
      .slice(0, 6);
  }, [data.leads]);

  function leadLabel(l: Lead): string {
    return `${l.companyName} — ${l.address}`;
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Commerciaux</h1>
      <p style={{ color: "var(--color-muted)" }}>
        Vue complète : sélectionnez un commercial pour voir ses clients, pipeline et montants.
      </p>

      <div className="table-wrap table-wrap--scroll-md card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Identifiant</th>
              <th>Leads</th>
              <th>Clôturés</th>
              <th>Commission en attente</th>
              <th>Commission perçue</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {commercials.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.id}</strong>
                </td>
                <td>{c.leads}</td>
                <td>{c.clotures}</td>
                <td>{c.commissionEnAttente}&nbsp;€</td>
                <td>{c.commissionPercue}&nbsp;€</td>
                <td>
                  <Link
                    to={`/app/commerciaux/${encodeURIComponent(c.id)}`}
                    className="btn btn-primary"
                    style={{ textDecoration: "none" }}
                  >
                    Ouvrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: "1.5rem" }}>Dossiers en attente admin (aperçu)</h2>
      {topWaitingLeads.length === 0 ? (
        <p className="card" style={{ color: "var(--color-muted)" }}>
          Aucun dossier en attente.
        </p>
      ) : (
        <div className="card">
          <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
            {topWaitingLeads.map((l) => (
              <li key={l.id} style={{ margin: "0.25rem 0" }}>
                <Link to={`/app/commerciaux/${encodeURIComponent(l.commercialId)}`} style={{ textDecoration: "none" }}>
                  <strong>{l.commercialDisplayName ?? l.commercialId}</strong>
                </Link>{" "}
                — <span style={{ color: "var(--color-muted)" }}>{leadLabel(l)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
