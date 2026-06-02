import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { statusLabels } from "../../data/store";
import { installerDisplayName } from "../../lib/installers";
import {
  compareLeadsByPipeline,
  displayPipelineLabel,
  displayStatusLabel,
  pipelineBadgeClass,
  pipelineRowClass,
} from "../../lib/leadPipeline";
import { LeadClientFormFields } from "../../components/LeadClientFormFields";
import { SectionSearchBar } from "../../components/SectionSearchBar";
import {
  adminCreateWorkflowStage,
  buildCommercialProjectSpecs,
  buildLeadPatchFromClientForm,
  emptyLeadClientForm,
  leadToClientForm,
  type LeadClientFormValues,
} from "../../lib/leadClientForm";
import type { Lead, LeadStatus } from "../../types";
import "./clients-page.css";
import "./compact-list-page.css";

const DOSSIER_ROLES = ["admin", "dispatch", "site_survey", "installateur"] as const;
const STATUS_OPTIONS = Object.keys(statusLabels) as LeadStatus[];
const ADMIN_STATUS_OPTIONS = STATUS_OPTIONS.filter((status) => status !== "cloture");
const DEFAULT_SLOT_HOURS = 1;
const CLIENTS_POLL_MS = 20_000;

function id() {
  return `lead-${crypto.randomUUID().slice(0, 8)}`;
}

function intersectsDay(slotStart: Date, slotEnd: Date, dayStart: Date, dayEnd: Date): boolean {
  return slotStart < dayEnd && slotEnd > dayStart;
}

function ClientStatusControl({
  lead,
  isAdmin,
  onStatusChange,
}: {
  lead: Lead;
  isAdmin: boolean;
  onStatusChange: (lead: Lead, status: LeadStatus) => void;
}) {
  if (isAdmin && lead.status !== "cloture") {
    return (
      <select
        className="input table-cell-select"
        value={lead.status}
        onChange={(e) => onStatusChange(lead, e.target.value as LeadStatus)}
      >
        {ADMIN_STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {statusLabels[s]}
          </option>
        ))}
      </select>
    );
  }
  return <span className={pipelineBadgeClass(lead)}>{displayStatusLabel(lead)}</span>;
}

export function ClientsPage() {
  const { user } = useAuth();
  const myInstallerId = user?.installerId ?? null;
  const { data, patchLead, createLead, deleteLead, refresh } = useData();
  const role = user!.role;
  const surveyLayout = role === "site_survey";
  const showDossier = (DOSSIER_ROLES as readonly string[]).includes(role);
  const isAdmin = role === "admin";
  const canEditClients = role === "admin" || role === "dispatch";
  const [toast, setToast] = useState("");
  const [showCreateClientForm, setShowCreateClientForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState<LeadClientFormValues>(emptyLeadClientForm());
  const [form, setForm] = useState<LeadClientFormValues>(emptyLeadClientForm());
  const [search, setSearch] = useState("");

  const commercialIdOptions = useMemo(() => {
    const ids = new Set<string>(["admin"]);
    for (const l of data.leads) {
      if (l.commercialId?.trim()) ids.add(l.commercialId.trim());
    }
    return [...ids].sort((a, b) => a.localeCompare(b, "fr"));
  }, [data.leads]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void refresh({ silent: true });
    };
    const interval = window.setInterval(tick, CLIENTS_POLL_MS);
    const onFocus = () => tick();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  const listLeads = useMemo(() => {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    return data.leads.filter((lead) => {
      if (role !== "installateur") return true;
      if (!myInstallerId || lead.installerId !== myInstallerId || !lead.slotStart) return false;
      const start = new Date(lead.slotStart);
      const end = lead.slotEnd
        ? new Date(lead.slotEnd)
        : new Date(start.getTime() + DEFAULT_SLOT_HOURS * 3600 * 1000);
      return intersectsDay(start, end, dayStart, dayEnd);
    });
  }, [data.leads, myInstallerId, role]);

  const visibleLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = listLeads.filter((lead) => {
      if (!q) return true;
      return [
        lead.companyName,
        lead.contactName,
        lead.email,
        lead.phone,
        lead.address,
        lead.id,
        lead.commercialId,
        lead.commercialDisplayName ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    return filtered.sort(compareLeadsByPipeline);
  }, [listLeads, search]);

  function submitAdminClient(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    const lead: Lead = {
      id: id(),
      createdAt: new Date().toISOString(),
      commercialId: form.commercialId.trim() || "admin",
      companyName: form.companyName.trim(),
      contactName: form.contactName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      notes: form.notes.trim() || undefined,
      status: "nouveau",
      workflowStage: adminCreateWorkflowStage(),
      projectSpecs: buildCommercialProjectSpecs(form, undefined, { markSubmitted: true }),
    };
    void createLead(lead);
    setForm(emptyLeadClientForm());
    setShowCreateClientForm(false);
    setToast("Dossier créé — prêt pour planification site survey.");
    setTimeout(() => setToast(""), 2800);
  }

  function setLeadStatus(lead: Lead, status: LeadStatus) {
    if (!isAdmin) return;
    if (status === "cloture") {
      setToast("La clôture est réservée au technicien après intervention.");
      setTimeout(() => setToast(""), 2500);
      return;
    }
    patchLead(lead.id, { status });
  }

  function openEdit(lead: Lead) {
    setEditLead(lead);
    setEditForm(leadToClientForm(lead));
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEditClients || !editLead) return;
    void patchLead(
      editLead.id,
      buildLeadPatchFromClientForm(editForm, editLead.projectSpecs, {
        includeCommercialId: isAdmin,
      })
    );
    setEditLead(null);
    setToast("Client mis à jour.");
    setTimeout(() => setToast(""), 2500);
  }

  function patchForm(patch: Partial<LeadClientFormValues>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function patchEditForm(patch: Partial<LeadClientFormValues>) {
    setEditForm((f) => ({ ...f, ...patch }));
  }

  function confirmDelete(leadId: string) {
    if (!canEditClients) return;
    deleteLead(leadId);
    setDeleteConfirmId(null);
    if (editLead?.id === leadId) setEditLead(null);
    setToast("Client supprimé.");
    setTimeout(() => setToast(""), 2500);
  }

  return (
    <div className="clients-page compact-list-page">
      {toast ? <div className="toast">{toast}</div> : null}
      {canEditClients && editLead ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-client-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            background: "rgba(26, 43, 60, 0.5)",
            overflow: "auto",
            padding: "1.5rem",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
          }}
          onClick={() => setEditLead(null)}
        >
          <div
            className="card"
            style={{ width: "min(640px, 100%)", marginTop: "2rem", maxHeight: "calc(100vh - 4rem)", overflow: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="edit-client-title" style={{ marginTop: 0 }}>
              Modifier le client
            </h2>
            <p style={{ color: "var(--color-muted)", fontSize: "0.9rem", marginTop: 0 }}>
              <strong>{editLead.companyName}</strong> — {editLead.id}
            </p>
            <form onSubmit={submitEdit} style={{ marginTop: "1rem" }}>
              <LeadClientFormFields
                form={editForm}
                onChange={patchEditForm}
                showCommercialId={isAdmin}
                commercialIdOptions={commercialIdOptions}
              />
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
                <button type="submit" className="btn btn-primary">
                  Enregistrer
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditLead(null)}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      <h1 style={{ marginTop: 0 }}>Clients</h1>
      <p style={{ color: "var(--color-muted)" }}>
        {surveyLayout
          ? "Ouvrez le dossier d’un site pour y ajouter photos terrain et liste matériel (visible par admin, dispatch et technicien)."
          : "Vue dossiers : suivi, affectation et accès au dossier terrain (photos & matériel)."}
      </p>

      {isAdmin ? (
        <div className="card clients-page__create compact-list-page__create" style={{ marginBottom: "0.7rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Créer un dossier client (complet)</h2>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: "0.45rem 0.8rem", fontSize: "0.86rem" }}
              onClick={() => setShowCreateClientForm((v) => !v)}
            >
              {showCreateClientForm ? "Fermer" : "Créer un client"}
            </button>
          </div>

          {showCreateClientForm ? (
            <>
              <p style={{ margin: "0.75rem 0 0", fontSize: "0.88rem", color: "var(--color-muted)" }}>
                Même contenu que le formulaire commercial : coordonnées, bornes, alimentation et type de pose. Le
                dossier est directement en attente de planification site survey.
              </p>
              <form onSubmit={submitAdminClient} style={{ marginTop: "1rem" }}>
                <LeadClientFormFields
                  form={form}
                  onChange={patchForm}
                  showCommercialId
                  commercialIdOptions={commercialIdOptions}
                />
                <button type="submit" className="btn btn-primary" style={{ marginTop: "1rem" }}>
                  Créer le dossier
                </button>
              </form>
            </>
          ) : null}
        </div>
      ) : null}

      <div
        className="table-wrap table-wrap--stack-mobile table-wrap--stack-compact compact-list-table clients-list-table table-wrap--scroll-xl card"
        style={{ padding: 0 }}
      >
        <SectionSearchBar
          id="clients-search"
          placeholder="Société, contact, téléphone, adresse, e-mail…"
          value={search}
          onChange={setSearch}
          filteredCount={visibleLeads.length}
          totalCount={listLeads.length}
        />
        <table>
          <thead>
            <tr>
              <th>Client</th>
              {!surveyLayout ? <th>Commercial</th> : null}
              <th>Étape</th>
              <th>Statut</th>
              {!surveyLayout ? <th>Technicien</th> : null}
              {!surveyLayout && role === "admin" ? (
                <>
                  <th>Commission payée</th>
                  <th>Payé par le client</th>
                </>
              ) : null}
              {surveyLayout ? <th>Adresse</th> : null}
              {surveyLayout ? <th>Contact</th> : null}
              {showDossier ? <th>Dossier</th> : null}
              {canEditClients ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {visibleLeads.length === 0 ? (
              <tr>
                <td
                  colSpan={20}
                  className="table-empty-row"
                  style={{ color: "var(--color-muted)", textAlign: "center" }}
                >
                  {search.trim() ? `Aucun client pour « ${search.trim()} ».` : "Aucun client à afficher."}
                </td>
              </tr>
            ) : null}
            {visibleLeads.map((l) => {
              const techName = installerDisplayName(l.installerId, data.installers);
              const commercialLabel = l.commercialDisplayName ?? l.commercialId;
              return (
                <tr key={l.id} className={pipelineRowClass(l)}>
                  <td className="table-cell-primary">
                    <div className="table-cell-primary-head">
                      <strong>{l.companyName}</strong>
                      <span className={`table-cell-primary-badge compact-list-badge ${pipelineBadgeClass(l)}`}>
                        {displayPipelineLabel(l)}
                      </span>
                    </div>
                    <div className="compact-list-meta clients-list-address">{l.address}</div>
                    <div className="clients-list-mobile-meta compact-list-meta">
                      {surveyLayout ? (
                        <>
                          <span>{l.contactName}</span>
                          {l.phone ? <span>{l.phone}</span> : null}
                        </>
                      ) : (
                        <>
                          <span>{commercialLabel}</span>
                          <span>{techName}</span>
                        </>
                      )}
                    </div>
                    <div className="clients-list-card-footer--mobile">
                      <div className="clients-list-status">
                        <ClientStatusControl lead={l} isAdmin={isAdmin} onStatusChange={setLeadStatus} />
                      </div>
                      <div className="clients-list-actions">
                        {showDossier ? (
                          <Link
                            to={`/app/dossier/${l.id}`}
                            className="clients-list-link clients-list-link--primary"
                          >
                            Dossier
                          </Link>
                        ) : null}
                        {canEditClients ? (
                          <>
                            <button
                              type="button"
                              className="clients-list-link clients-list-link--ghost"
                              onClick={() => openEdit(l)}
                            >
                              Modifier
                            </button>
                            {deleteConfirmId === l.id ? (
                              <>
                                <button
                                  type="button"
                                  className="clients-list-link clients-list-link--danger"
                                  onClick={() => confirmDelete(l.id)}
                                >
                                  Confirmer
                                </button>
                                <button
                                  type="button"
                                  className="clients-list-link clients-list-link--ghost"
                                  onClick={() => setDeleteConfirmId(null)}
                                >
                                  Annuler
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="clients-list-link clients-list-link--ghost"
                                onClick={() => setDeleteConfirmId(l.id)}
                              >
                                Suppr.
                              </button>
                            )}
                          </>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  {!surveyLayout ? (
                    <td className="clients-list-desktop-only" data-label="Commercial">
                      {commercialLabel}
                    </td>
                  ) : null}
                  <td className="clients-list-desktop-only" data-label="Étape" style={{ fontSize: "0.82rem" }}>
                    <span className={pipelineBadgeClass(l)}>{displayPipelineLabel(l)}</span>
                  </td>
                  <td className="clients-list-desktop-only" data-label="Statut">
                    {isAdmin && l.status !== "cloture" ? (
                      <div style={{ display: "grid", gap: "0.4rem" }}>
                        <ClientStatusControl lead={l} isAdmin={isAdmin} onStatusChange={setLeadStatus} />
                        <span className={pipelineBadgeClass(l)}>{displayStatusLabel(l)}</span>
                      </div>
                    ) : (
                      <ClientStatusControl lead={l} isAdmin={isAdmin} onStatusChange={setLeadStatus} />
                    )}
                  </td>
                  {!surveyLayout ? (
                    <td className="clients-list-desktop-only" data-label="Technicien">
                      {techName}
                    </td>
                  ) : null}
                  {!surveyLayout && role === "admin" ? (
                    <>
                      <td className="clients-list-desktop-only" data-label="Commission payée">
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
                      <td className="clients-list-desktop-only" data-label="Payé par le client">
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
                    </>
                  ) : null}
                  {surveyLayout ? (
                    <td className="clients-list-desktop-only" data-label="Adresse" style={{ fontSize: "0.85rem" }}>
                      {l.address}
                    </td>
                  ) : null}
                  {surveyLayout ? (
                    <td className="clients-list-desktop-only" data-label="Contact" style={{ fontSize: "0.85rem" }}>
                      {l.contactName}
                      <br />
                      {l.phone}
                      <br />
                      {l.email}
                    </td>
                  ) : null}
                  {showDossier ? (
                    <td className="clients-list-desktop-only" data-label="Dossier">
                      <Link to={`/app/dossier/${l.id}`} className="btn btn-primary" style={{ textDecoration: "none" }}>
                        Ouvrir
                      </Link>
                    </td>
                  ) : null}
                  {canEditClients ? (
                    <td className="clients-list-desktop-only" data-label="Actions">
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", alignItems: "center" }}>
                        <button type="button" className="btn btn-ghost" onClick={() => openEdit(l)}>
                          Modifier
                        </button>
                        {deleteConfirmId === l.id ? (
                          <>
                            <button type="button" className="btn btn-danger" onClick={() => confirmDelete(l.id)}>
                              Confirmer
                            </button>
                            <button type="button" className="btn btn-ghost" onClick={() => setDeleteConfirmId(null)}>
                              Annuler
                            </button>
                          </>
                        ) : (
                          <button type="button" className="btn btn-ghost" onClick={() => setDeleteConfirmId(l.id)}>
                            Supprimer
                          </button>
                        )}
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
