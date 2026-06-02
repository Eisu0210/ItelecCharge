import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { vehicleForInstaller, vehicleLabel } from "../../lib/fleet";
import type { InstallerProfile } from "../../types";
import "./compact-list-page.css";

function newTechId() {
  return `tech-${crypto.randomUUID().slice(0, 8)}`;
}

type TechForm = {
  name: string;
  phone: string;
  email: string;
};

const emptyForm = (): TechForm => ({ name: "", phone: "", email: "" });

/** Techniciens (équipe terrain) — vues admin & dispatch, gestion CRUD si autorisé. */
export function TechTeamPage() {
  const { user } = useAuth();
  const {
    data,
    createInstaller,
    patchInstaller,
    deleteInstaller,
  } = useData();
  const canManage = user?.role === "admin" || user?.role === "dispatch";
  const [toast, setToast] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<TechForm>(() => emptyForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TechForm>(emptyForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const rows = useMemo(() => {
    return data.installers.map((t) => {
      const ls = data.leads.filter((l) => l.installerId === t.id);
      const clotures = ls.filter((l) => l.status === "cloture").length;
      const vehicle = vehicleForInstaller(t.id, data.fleetVehicles);
      return { ...t, assigned: ls.length, clotures, vehicle };
    });
  }, [data.installers, data.leads, data.fleetVehicles]);

  const editingProfile = editId ? data.installers.find((i) => i.id === editId) : null;

  function openEdit(t: InstallerProfile) {
    setEditId(t.id);
    setEditForm({ name: t.name, phone: t.phone, email: t.email });
  }

  function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    const installer: InstallerProfile = {
      id: newTechId(),
      name: createForm.name.trim(),
      phone: createForm.phone.trim(),
      email: createForm.email.trim(),
    };
    createInstaller(installer);
    setCreateForm(emptyForm());
    setShowCreate(false);
    setToast("Technicien ajouté.");
    setTimeout(() => setToast(""), 2500);
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage || !editId) return;
    patchInstaller(editId, {
      name: editForm.name.trim(),
      phone: editForm.phone.trim(),
      email: editForm.email.trim(),
    });
    setEditId(null);
    setToast("Technicien mis à jour.");
    setTimeout(() => setToast(""), 2500);
  }

  function doDelete(id: string) {
    if (!canManage) return;
    deleteInstaller(id);
    setDeleteConfirmId(null);
    if (editId === id) setEditId(null);
    setToast("Technicien supprimé ; les dossiers liés sont désaffectés (créneaux retirés).");
    setTimeout(() => setToast(""), 3000);
  }

  return (
    <div className="compact-list-page">
      {toast ? <div className="toast">{toast}</div> : null}
      {canManage && editingProfile ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-tech-title"
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
          onClick={() => setEditId(null)}
        >
          <div
            className="card"
            style={{ width: "min(480px, 100%)", marginTop: "2rem", maxHeight: "calc(100vh - 4rem)", overflow: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="edit-tech-title" style={{ marginTop: 0 }}>
              Modifier le technicien
            </h2>
            <p style={{ color: "var(--color-muted)", fontSize: "0.9rem", marginTop: 0 }}>
              <strong>{editingProfile.id}</strong>
            </p>
            <form onSubmit={submitEdit} style={{ marginTop: "1rem" }}>
              <div className="field">
                <label>Nom</label>
                <input
                  className="input"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Téléphone</label>
                <input
                  className="input"
                  required
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  className="input"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <button type="submit" className="btn btn-primary">
                  Enregistrer
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditId(null)}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      <p style={{ marginTop: 0 }}>
        <Link to="/app/flotte-vehicules">Flotte véhicules →</Link>
      </p>
      <h1 style={{ marginTop: 0 }}>Techniciens</h1>
      <p style={{ color: "var(--color-muted)" }}>
        {canManage
          ? "Équipe terrain : coordonnées, dossiers et gestion CRUD."
          : "Équipe terrain : coordonnées et charge des dossiers."}
      </p>

      {canManage ? (
        <div className="card compact-list-page__create">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <h2 style={{ margin: 0 }}>Nouveau technicien</h2>
            <button type="button" className="btn btn-primary" onClick={() => setShowCreate((v) => !v)}>
              {showCreate ? "Fermer" : "Ajouter"}
            </button>
          </div>
          {showCreate ? (
            <form onSubmit={submitCreate} style={{ marginTop: "1rem" }}>
              <div className="field">
                <label>Nom</label>
                <input
                  className="input"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Téléphone</label>
                <input
                  className="input"
                  required
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  className="input"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Créer le technicien
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      <div
        className="table-wrap table-wrap--stack-mobile table-wrap--stack-compact compact-list-table card"
        style={{ padding: 0 }}
      >
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Camionnette</th>
              <th>Coordonnées</th>
              <th>Dossiers assignés</th>
              <th>Clôturés</th>
              {canManage ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td className="table-cell-primary">
                  <div className="table-cell-primary-head">
                    <Link
                      to={`/app/tech/${t.id}`}
                      style={{ fontWeight: 700, color: "var(--color-navy)", textDecoration: "none" }}
                    >
                      {t.name}
                    </Link>
                    <span className="table-cell-primary-badge compact-list-badge compact-stat-badge">
                      {t.assigned} doss. · {t.clotures} clôt.
                    </span>
                  </div>
                  {t.vehicle ? (
                    <div className="compact-list-meta compact-vehicle-meta">
                      <Link to={`/app/tech/${t.id}`}>{vehicleLabel(t.vehicle)}</Link>
                    </div>
                  ) : null}
                  <div
                    className={`compact-list-meta${t.vehicle ? "" : " compact-contact-meta"}`}
                  >
                    {t.phone}
                    {t.phone && t.email ? " · " : null}
                    {t.email}
                  </div>
                  <div className="compact-list-id">{t.id}</div>
                </td>
                <td data-label="Camionnette" style={{ fontSize: "0.85rem" }}>
                  {t.vehicle ? (
                    <Link to={`/app/tech/${t.id}`} style={{ textDecoration: "none" }}>
                      {vehicleLabel(t.vehicle)}
                    </Link>
                  ) : (
                    <span style={{ color: "var(--color-muted)" }}>—</span>
                  )}
                </td>
                <td data-label="Coordonnées" style={{ fontSize: "0.85rem" }}>
                  {t.email}
                  <br />
                  {t.phone}
                </td>
                <td data-label="Dossiers assignés">{t.assigned}</td>
                <td data-label="Clôturés">{t.clotures}</td>
                {canManage ? (
                  <td data-label="Actions">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", alignItems: "center" }}>
                      <button
                        type="button"
                        className="btn btn-ghost compact-list-btn-sm"
                        onClick={() => {
                          setDeleteConfirmId(null);
                          openEdit(t);
                        }}
                      >
                        Modifier
                      </button>
                      {deleteConfirmId === t.id ? (
                        <>
                          <button type="button" className="btn btn-danger compact-list-btn-sm" onClick={() => doDelete(t.id)}>
                            Confirmer
                          </button>
                          <button type="button" className="btn btn-ghost compact-list-btn-sm" onClick={() => setDeleteConfirmId(null)}>
                            Annuler
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-ghost compact-list-btn-sm"
                          onClick={() => {
                            setEditId(null);
                            setDeleteConfirmId(t.id);
                          }}
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
