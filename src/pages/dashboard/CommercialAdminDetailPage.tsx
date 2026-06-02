import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useData } from "../../context/DataContext";
import { statusLabels, workflowStageLabel } from "../../data/store";
import { COMMISSION_PER_INSTALLATION } from "../../types";
import type { Lead, LeadStatus } from "../../types";

function euro(n: number): string {
  return `${Math.round(n * 100) / 100} €`;
}

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function leadReferenceDate(lead: Lead): Date {
  if (lead.slotStart) return new Date(lead.slotStart);
  return new Date(lead.createdAt);
}

export function CommercialAdminDetailPage() {
  const { commercialId } = useParams();
  const { data } = useData();
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [q, setQ] = useState("");
  const [month, setMonth] = useState(() => monthKey(new Date()));

  const cid = String(commercialId ?? "").toLowerCase().trim();

  const leads = useMemo(() => {
    const base = data.leads
      .filter((l) => l.commercialId === cid)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const text = q.trim().toLowerCase();
    return base.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (!text) return true;
      return (
        l.companyName.toLowerCase().includes(text) ||
        l.contactName.toLowerCase().includes(text) ||
        l.address.toLowerCase().includes(text) ||
        l.phone.toLowerCase().includes(text)
      );
    });
  }, [data.leads, cid, statusFilter, q]);

  const kpi = useMemo(() => {
    const all = data.leads.filter((l) => l.commercialId === cid);
    const clotures = all.filter((l) => l.status === "cloture");
    const genere = clotures.length * COMMISSION_PER_INSTALLATION;
    const percu = clotures.filter((l) => l.commissionPaid).length * COMMISSION_PER_INSTALLATION;
    const aPerc = genere - percu;

    const nowKey = monthKey(new Date());
    const cloturesMois = clotures.filter((l) => monthKey(leadReferenceDate(l)) === nowKey);
    const genereMois = cloturesMois.length * COMMISSION_PER_INSTALLATION;

    const submitted = all.filter((l) => l.workflowStage === "attente_admin").length;
    const planned = all.filter((l) => l.workflowStage === "survey_planifie").length;

    return {
      leads: all.length,
      clotures: clotures.length,
      genere,
      percu,
      aPerc,
      submitted,
      planned,
      cloturesMois: cloturesMois.length,
      genereMois,
    };
  }, [data.leads, cid]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        <div>
          <h1 style={{ marginTop: 0 }}>Commercial — {cid || "?"}</h1>
          <p style={{ color: "var(--color-muted)", marginTop: "0.25rem" }}>
            Vue complète : clients, pipeline et commissions.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Link to="/app/commerciaux" className="btn btn-ghost" style={{ textDecoration: "none" }}>
            ← Liste des commerciaux
          </Link>
          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: "0.8rem" }}>Fiche mensuelle</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="month"
                className="input"
                value={month}
                max={monthKey(new Date())}
                onChange={(e) => setMonth(e.target.value.slice(0, 7))}
              />
              <Link
                to={`/app/commerciaux/${encodeURIComponent(cid)}/fiche-mensuelle?mois=${encodeURIComponent(month)}`}
                className="btn btn-primary"
                style={{ textDecoration: "none", whiteSpace: "nowrap" }}
              >
                Voir
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        <div className="card">
          <div className="badge">À percevoir</div>
          <p style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0.35rem 0" }}>{euro(kpi.aPerc)}</p>
          <p style={{ margin: 0, color: "var(--color-muted)" }}>
            Généré {euro(kpi.genere)} · Perçu {euro(kpi.percu)}
          </p>
        </div>
        <div className="card">
          <div className="badge badge-yellow">Mois en cours</div>
          <p style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0.35rem 0" }}>{euro(kpi.genereMois)}</p>
          <p style={{ margin: 0, color: "var(--color-muted)" }}>{kpi.cloturesMois} clôture(s) ce mois</p>
        </div>
        <div className="card">
          <div className="badge badge-green">Activité</div>
          <p style={{ fontSize: "1.2rem", fontWeight: 800, margin: "0.35rem 0" }}>{kpi.leads} lead(s)</p>
          <p style={{ margin: 0, color: "var(--color-muted)" }}>
            {kpi.submitted} en attente admin · {kpi.planned} survey planifié · {kpi.clotures} clôturé(s)
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
            gap: "0.75rem",
            alignItems: "end",
          }}
        >
          <div className="field" style={{ margin: 0 }}>
            <label>Recherche</label>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Client, adresse, téléphone…" />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Statut</label>
            <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "all")}>
              <option value="all">Tous</option>
              <option value="nouveau">Nouveau</option>
              <option value="devis_envoye">Devis envoyé</option>
              <option value="devis_accepte">Devis accepté</option>
              <option value="installation_planifiee">Installation planifiée</option>
              <option value="en_cours">Installation en cours</option>
              <option value="cloture">Clôturé</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-wrap table-wrap--scroll-md card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Étape</th>
              <th>Statut</th>
              <th>Devis HTVA</th>
              <th>Commission</th>
              <th>Payé client</th>
              <th>Dossier</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => {
              const comm = l.status === "cloture" ? COMMISSION_PER_INSTALLATION : 0;
              const commLabel =
                l.status !== "cloture" ? "—" : l.commissionPaid ? `Payée (${euro(comm)})` : `En attente (${euro(comm)})`;
              const clientLabel =
                l.status !== "cloture" ? "—" : l.clientPaid ? "Payé" : "En attente";
              return (
                <tr key={l.id}>
                  <td>
                    <strong>{l.companyName}</strong>
                    <div style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>
                      {l.contactName} — {l.phone}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>{l.address}</div>
                  </td>
                  <td style={{ fontSize: "0.82rem" }}>{workflowStageLabel(l)}</td>
                  <td>
                    <span className="badge">{statusLabels[l.status]}</span>
                  </td>
                  <td>{l.quoteAmountHtva != null ? euro(l.quoteAmountHtva) : "—"}</td>
                  <td style={{ fontSize: "0.85rem" }}>{commLabel}</td>
                  <td style={{ fontSize: "0.85rem" }}>{clientLabel}</td>
                  <td>
                    <Link to={`/app/dossier/${l.id}`} className="btn btn-primary" style={{ textDecoration: "none" }}>
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              );
            })}
            {leads.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ color: "var(--color-muted)", padding: "0.9rem 0.75rem" }}>
                  Aucun client trouvé.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

