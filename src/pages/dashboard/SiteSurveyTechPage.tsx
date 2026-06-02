import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { statusLabels, workflowStageLabel } from "../../data/store";
import type { Lead } from "../../types";

function needsSiteSurveyPipeline(l: Lead): boolean {
  if (!l.workflowStage) {
    return ["nouveau", "devis_envoye", "devis_accepte"].includes(l.status);
  }
  return ["survey_planifie", "survey_terrain", "devis_pret"].includes(l.workflowStage);
}

/** Visites terrain / relevé site — vue technicien (démo). */
export function SiteSurveyTechPage() {
  const { user } = useAuth();
  const { data } = useData();

  const candidates = useMemo(() => {
    const base = data.leads.filter(needsSiteSurveyPipeline);
    if (user?.role !== "installateur") return base;
    if (!user.installerId) return [];
    return base
      .filter((l) => l.installerId === user.installerId && !!l.slotStart)
      .sort((a, b) => String(a.slotStart ?? "").localeCompare(String(b.slotStart ?? "")));
  }, [data.leads, user]);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Site survey</h1>
      <p style={{ color: "var(--color-muted)" }}>
        {user?.role === "installateur"
          ? "Vos dossiers planifiés : coordonnées client + photos terrain + matériel prévu (lecture seule)."
          : "Dossiers pouvant nécessiter une visite terrain ou un relevé avant installation (données de démo)."}
      </p>
      <div className="table-wrap table-wrap--stack-mobile table-wrap--scroll-lg card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Site</th>
              <th>Adresse</th>
              <th>Étape</th>
              <th>Statut</th>
              <th>Dossier</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((l) => (
              <tr key={l.id}>
                <td className="table-cell-primary">
                  <strong>{l.companyName}</strong>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>
                    {l.contactName} — {l.phone}
                  </div>
                </td>
                <td data-label="Adresse" style={{ fontSize: "0.85rem" }}>
                  {l.address}
                </td>
                <td data-label="Étape" style={{ fontSize: "0.82rem" }}>
                  {workflowStageLabel(l)}
                </td>
                <td data-label="Statut">{statusLabels[l.status]}</td>
                <td data-label="Dossier">
                  <Link to={`/app/dossier/${l.id}`} className="btn btn-primary" style={{ textDecoration: "none" }}>
                    Ouvrir
                  </Link>
                </td>
              </tr>
            ))}
            {candidates.length === 0 ? (
              <tr>
                <td colSpan={5} className="table-empty-row" style={{ color: "var(--color-muted)" }}>
                  Aucun dossier planifié.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
