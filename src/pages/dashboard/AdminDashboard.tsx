import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SectionSearchBar } from "../../components/SectionSearchBar";
import { useData } from "../../context/DataContext";
import { statusLabels, workflowStageLabel } from "../../data/store";
import { installerDisplayName } from "../../lib/installers";
import { matchesSearchQuery } from "../../lib/searchText";
import { COMMISSION_PER_INSTALLATION } from "../../types";
import { AdminCollapsibleSection } from "./AdminCollapsibleSection";
import "./admin-dashboard.css";
import "./compact-list-page.css";

const SURVEY_PENDING_LABEL = "En attente planification";

export function AdminDashboard() {
  const { data, patchLead } = useData();
  const [searchSurvey, setSearchSurvey] = useState("");
  const [searchCommercials, setSearchCommercials] = useState("");
  const [searchInstallers, setSearchInstallers] = useState("");
  const [searchLeads, setSearchLeads] = useState("");

  const commercials = useMemo(() => {
    const ids = [...new Set(data.leads.map((l) => l.commercialId))];
    return ids.map((id) => {
      const ls = data.leads.filter((l) => l.commercialId === id);
      const clotures = ls.filter((l) => l.status === "cloture").length;
      const displayNames = [...new Set(ls.map((l) => l.commercialDisplayName).filter(Boolean))] as string[];
      return {
        id,
        displayNames,
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

  const pendingAdminSurvey = useMemo(
    () => data.leads.filter((l) => l.workflowStage === "attente_admin"),
    [data.leads]
  );

  const filteredSurvey = useMemo(
    () =>
      pendingAdminSurvey.filter((l) =>
        matchesSearchQuery(
          [
            l.companyName,
            l.contactName,
            l.address,
            l.email,
            l.phone,
            l.commercialDisplayName,
            l.commercialId,
            l.notes,
            l.id,
          ],
          searchSurvey
        )
      ),
    [pendingAdminSurvey, searchSurvey]
  );

  const filteredCommercials = useMemo(
    () =>
      commercials.filter((c) =>
        matchesSearchQuery([c.id, ...c.displayNames, String(c.leads), String(c.clotures)], searchCommercials)
      ),
    [commercials, searchCommercials]
  );

  const filteredTechStats = useMemo(
    () =>
      techStats.filter((t) =>
        matchesSearchQuery([t.name, t.id, t.email, t.phone, String(t.assigned), String(t.clotures)], searchInstallers)
      ),
    [techStats, searchInstallers]
  );

  const filteredLeads = useMemo(
    () =>
      [...data.leads]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .filter((l) =>
          matchesSearchQuery(
            [
              l.companyName,
              l.contactName,
              l.email,
              l.phone,
              l.address,
              l.commercialDisplayName,
              l.commercialId,
              l.id,
              statusLabels[l.status],
              workflowStageLabel(l),
              installerDisplayName(l.installerId, data.installers),
            ],
            searchLeads
          )
        ),
    [data.leads, data.installers, searchLeads]
  );

  function emptyRow(colSpan: number, message: string) {
    return (
      <tr>
        <td colSpan={colSpan} className="table-empty-row" style={{ color: "var(--color-muted)" }}>
          {message}
        </td>
      </tr>
    );
  }

  const surveyCountLabel =
    pendingAdminSurvey.length === 0
      ? "Aucun dossier en attente"
      : pendingAdminSurvey.length === 1
        ? "1 dossier en attente"
        : `${pendingAdminSurvey.length} dossiers en attente`;

  const commercialsCountLabel =
    commercials.length === 0
      ? "Aucun commercial"
      : commercials.length === 1
        ? "1 commercial"
        : `${commercials.length} commerciaux`;

  const installersCountLabel =
    techStats.length === 0
      ? "Aucun installateur"
      : techStats.length === 1
        ? "1 installateur"
        : `${techStats.length} installateurs`;

  const leadsCountLabel =
    data.leads.length === 0
      ? "Aucun dossier"
      : data.leads.length === 1
        ? "1 dossier"
        : `${data.leads.length} dossiers`;

  return (
    <div className="admin-dashboard-page">
      <h1 style={{ marginTop: 0 }}>Administration</h1>
      <p style={{ color: "var(--color-muted)", marginBottom: "1.25rem" }}>
        Accès complet aux dossiers, aux équipes et aux indicateurs. Utilisez les flèches pour afficher chaque liste.
      </p>

      <AdminCollapsibleSection
        title="Planification site survey"
        description={
          <>
            Aperçu des dossiers en attente. Pour fixer les créneaux, utilisez le menu{" "}
            <strong>Planning site survey</strong>.
          </>
        }
        countLabel={surveyCountLabel}
        isEmpty={pendingAdminSurvey.length === 0}
        emptyMessage="Aucun dossier en attente de planification."
        actions={
          <Link
            to="/app/planning-site-survey"
            className="btn btn-primary admin-section-cta"
            style={{ textDecoration: "none" }}
          >
            Ouvrir le planning
          </Link>
        }
      >
        <div className="table-wrap table-wrap--stack-mobile table-wrap--stack-compact compact-list-table admin-survey-preview">
          <SectionSearchBar
            id="admin-search-survey"
            placeholder="Client, adresse, commercial, contact…"
            value={searchSurvey}
            onChange={setSearchSurvey}
            filteredCount={filteredSurvey.length}
            totalCount={pendingAdminSurvey.length}
          />
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Statut</th>
                <th>Commercial</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSurvey.length === 0
                ? emptyRow(
                    4,
                    searchSurvey.trim()
                      ? `Aucun résultat pour « ${searchSurvey.trim()} ».`
                      : "Aucun dossier en attente."
                  )
                : filteredSurvey.map((l) => (
                    <tr key={l.id}>
                      <td className="table-cell-primary">
                        <div className="table-cell-primary-head">
                          <strong>{l.companyName}</strong>
                          <span className="table-cell-primary-badge compact-list-badge admin-survey-badge">
                            {SURVEY_PENDING_LABEL}
                          </span>
                        </div>
                        <div className="compact-list-meta">{l.address}</div>
                        <div className="compact-list-meta">
                          {l.commercialDisplayName ?? l.commercialId}
                          {l.contactName ? ` · ${l.contactName}` : null}
                        </div>
                      </td>
                      <td data-label="Statut">
                        <span className="badge badge-yellow">{SURVEY_PENDING_LABEL}</span>
                      </td>
                      <td data-label="Commercial" style={{ fontSize: "0.88rem" }}>
                        {l.commercialDisplayName ?? l.commercialId}
                      </td>
                      <td data-label="Actions">
                        <Link
                          to="/app/planning-site-survey"
                          className="btn btn-primary compact-list-btn-sm"
                          style={{ textDecoration: "none" }}
                        >
                          Planifier
                        </Link>
                        <Link
                          to={`/app/dossier/${l.id}`}
                          className="btn btn-ghost compact-list-btn-sm"
                          style={{ textDecoration: "none" }}
                        >
                          Dossier
                        </Link>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title="Commerciaux (agrégé)"
        countLabel={commercialsCountLabel}
        isEmpty={commercials.length === 0}
        emptyMessage="Aucun commercial enregistré."
      >
        <div className="table-wrap table-wrap--stack-mobile table-wrap--scroll-md">
          <SectionSearchBar
            id="admin-search-commercials"
            placeholder="Identifiant commercial, nom…"
            value={searchCommercials}
            onChange={setSearchCommercials}
            filteredCount={filteredCommercials.length}
            totalCount={commercials.length}
          />
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
              {filteredCommercials.length === 0
                ? emptyRow(
                    4,
                    searchCommercials.trim()
                      ? `Aucun commercial pour « ${searchCommercials.trim()} ».`
                      : "Aucun commercial."
                  )
                : filteredCommercials.map((c) => (
                    <tr key={c.id}>
                      <td className="table-cell-primary">
                        {c.id}
                        {c.displayNames.length ? (
                          <div style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>
                            {c.displayNames.join(", ")}
                          </div>
                        ) : null}
                      </td>
                      <td data-label="Leads">{c.leads}</td>
                      <td data-label="Clôturés">{c.clotures}</td>
                      <td data-label="Commission théorique">{c.commission}&nbsp;€</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title="Installateurs"
        countLabel={installersCountLabel}
        isEmpty={techStats.length === 0}
        emptyMessage="Aucun installateur enregistré."
      >
        <div className="table-wrap table-wrap--stack-mobile table-wrap--scroll-md">
          <SectionSearchBar
            id="admin-search-installers"
            placeholder="Nom, e-mail, téléphone, identifiant…"
            value={searchInstallers}
            onChange={setSearchInstallers}
            filteredCount={filteredTechStats.length}
            totalCount={techStats.length}
          />
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
              {filteredTechStats.length === 0
                ? emptyRow(
                    4,
                    searchInstallers.trim()
                      ? `Aucun installateur pour « ${searchInstallers.trim()} ».`
                      : "Aucun installateur."
                  )
                : filteredTechStats.map((t) => (
                    <tr key={t.id}>
                      <td className="table-cell-primary">
                        <Link to={`/app/tech/${t.id}`} style={{ fontWeight: 700, textDecoration: "none" }}>
                          {t.name}
                        </Link>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{t.id}</div>
                      </td>
                      <td data-label="Coordonnées" style={{ fontSize: "0.85rem" }}>
                        {t.email}
                        <br />
                        {t.phone}
                      </td>
                      <td data-label="Dossiers assignés">{t.assigned}</td>
                      <td data-label="Clôturés">{t.clotures}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title="Tous les dossiers"
        countLabel={leadsCountLabel}
        isEmpty={data.leads.length === 0}
        emptyMessage="Aucun dossier."
      >
        <div className="table-wrap table-wrap--stack-mobile table-wrap--stack-compact table-wrap--scroll-xl">
          <SectionSearchBar
            id="admin-search-leads"
            placeholder="Client, commercial, technicien, statut, adresse…"
            value={searchLeads}
            onChange={setSearchLeads}
            filteredCount={filteredLeads.length}
            totalCount={data.leads.length}
          />
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Commercial</th>
                <th>Étape</th>
                <th>Statut</th>
                <th>Tech</th>
                <th>Commission payée</th>
                <th>Payé par le client</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0
                ? emptyRow(
                    7,
                    searchLeads.trim() ? `Aucun dossier pour « ${searchLeads.trim()} ».` : "Aucun dossier."
                  )
                : filteredLeads.map((l) => (
                    <tr key={l.id}>
                      <td className="table-cell-primary">
                        <div className="table-cell-primary-head">
                          <Link to={`/app/dossier/${l.id}`} style={{ fontWeight: 600, textDecoration: "none" }}>
                            {l.companyName}
                          </Link>
                          <span className="table-cell-primary-badge badge">{workflowStageLabel(l)}</span>
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--color-muted)", marginTop: "0.15rem" }}>
                          {l.address}
                        </div>
                      </td>
                      <td data-label="Commercial">{l.commercialDisplayName ?? l.commercialId}</td>
                      <td data-label="Étape" style={{ fontSize: "0.85rem" }}>
                        {workflowStageLabel(l)}
                      </td>
                      <td data-label="Statut">{statusLabels[l.status]}</td>
                      <td data-label="Technicien">{installerDisplayName(l.installerId, data.installers)}</td>
                      <td data-label="Commission payée">
                        {l.status === "cloture" ? (
                          <label style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            <input
                              type="checkbox"
                              checked={!!l.commissionPaid}
                              onChange={(e) => patchLead(l.id, { commissionPaid: e.target.checked })}
                            />
                            Oui
                          </label>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td data-label="Payé par le client">
                        {l.status === "cloture" ? (
                          <label style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            <input
                              type="checkbox"
                              checked={!!l.clientPaid}
                              onChange={(e) => patchLead(l.id, { clientPaid: e.target.checked })}
                            />
                            Oui
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
      </AdminCollapsibleSection>
    </div>
  );
}
