import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { InstallerStockPanel } from "./InstallerStockPanel";
import { statusLabels } from "../../data/store";
import { vehicleForInstaller, vehicleLabel } from "../../lib/fleet";
import type { InstallerProfile } from "../../types";

export function TechnicianDetailPage() {
  const { installerId } = useParams<{ installerId: string }>();
  const { user } = useAuth();
  const { data, patchInstaller } = useData();
  const canManage = user?.role === "admin" || user?.role === "dispatch";
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "" });
  const [toast, setToast] = useState("");

  const installer = useMemo(
    () => data.installers.find((i) => i.id === installerId),
    [data.installers, installerId]
  );

  const vehicle = useMemo(
    () => (installer ? vehicleForInstaller(installer.id, data.fleetVehicles) : undefined),
    [installer, data.fleetVehicles]
  );

  const leads = useMemo(
    () =>
      installer
        ? data.leads
            .filter((l) => l.installerId === installer.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : [],
    [data.leads, installer]
  );

  const stats = useMemo(() => {
    const clotures = leads.filter((l) => l.status === "cloture").length;
    const enCours = leads.filter((l) => l.status !== "cloture").length;
    return { total: leads.length, clotures, enCours };
  }, [leads]);

  if (!installerId) return <Navigate to="/app/tech" replace />;
  if (!installer) {
    return (
      <div>
        <p>
          <Link to="/app/tech">← Techniciens</Link>
        </p>
        <p style={{ color: "var(--color-muted)" }}>Technicien introuvable.</p>
      </div>
    );
  }

  function openEdit(t: InstallerProfile) {
    setEditForm({ name: t.name, phone: t.phone, email: t.email });
    setEditOpen(true);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage || !installer) return;
    await patchInstaller(installer.id, {
      name: editForm.name.trim(),
      phone: editForm.phone.trim(),
      email: editForm.email.trim(),
    });
    setEditOpen(false);
    setToast("Profil mis à jour.");
    setTimeout(() => setToast(""), 2500);
  }

  return (
    <div>
      {toast ? <div className="toast">{toast}</div> : null}
      <p style={{ marginTop: 0 }}>
        <Link to="/app/tech">← Techniciens</Link>
        {canManage ? (
          <>
            {" "}
            ·{" "}
            <Link to="/app/flotte-vehicules">Flotte véhicules</Link>
          </>
        ) : null}
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 0.35rem" }}>{installer.name}</h1>
          <p style={{ margin: 0, color: "var(--color-muted)", fontSize: "0.9rem" }}>
            Identifiant : <code>{installer.id}</code>
          </p>
        </div>
        {canManage ? (
          <button type="button" className="btn btn-ghost" onClick={() => openEdit(installer)}>
            Modifier le profil
          </button>
        ) : null}
      </div>

      <div className="u-grid-2" style={{ marginBottom: "1.25rem" }}>
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Coordonnées</h2>
          <dl style={{ margin: 0, display: "grid", gap: "0.5rem" }}>
            <div>
              <dt style={{ color: "var(--color-muted)", fontSize: "0.8rem" }}>E-mail</dt>
              <dd style={{ margin: 0 }}>
                <a href={`mailto:${installer.email}`}>{installer.email || "—"}</a>
              </dd>
            </div>
            <div>
              <dt style={{ color: "var(--color-muted)", fontSize: "0.8rem" }}>Téléphone</dt>
              <dd style={{ margin: 0 }}>{installer.phone || "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Camionnette</h2>
          {vehicle ? (
            <>
              <p style={{ margin: "0 0 0.5rem", fontWeight: 600 }}>{vehicleLabel(vehicle)}</p>
              {vehicle.plate ? (
                <p style={{ margin: "0 0 0.35rem", fontSize: "0.9rem" }}>
                  Plaque : <strong>{vehicle.plate}</strong>
                </p>
              ) : null}
              {vehicle.notes ? (
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-muted)" }}>{vehicle.notes}</p>
              ) : null}
              {canManage ? (
                <Link
                  to="/app/flotte-vehicules"
                  className="btn btn-ghost"
                  style={{ marginTop: "0.75rem", display: "inline-block", textDecoration: "none" }}
                >
                  Gérer la flotte
                </Link>
              ) : null}
            </>
          ) : (
            <p style={{ margin: 0, color: "var(--color-muted)" }}>
              Aucun véhicule assigné.
              {canManage ? (
                <>
                  {" "}
                  <Link to="/app/flotte-vehicules">Assigner une camionnette</Link>
                </>
              ) : null}
            </p>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Activité</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-navy)" }}>{stats.total}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>Dossiers assignés</div>
          </div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-green)" }}>{stats.clotures}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>Clôturés</div>
          </div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{stats.enCours}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>En cours</div>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: "1.05rem" }}>Dossiers assignés</h2>
      <div className="table-wrap table-wrap--scroll-lg card" style={{ padding: 0, marginBottom: "1.5rem" }}>
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Statut</th>
              <th>Adresse</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ color: "var(--color-muted)" }}>
                  Aucun dossier assigné.
                </td>
              </tr>
            ) : (
              leads.map((l) => (
                <tr key={l.id}>
                  <td>
                    <strong>{l.companyName}</strong>
                    <div style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>{l.contactName}</div>
                  </td>
                  <td>{statusLabels[l.status]}</td>
                  <td style={{ fontSize: "0.85rem" }}>{l.address}</td>
                  <td>
                    <Link to={`/app/dossier/${l.id}`} className="btn btn-primary" style={{ textDecoration: "none" }}>
                      Dossier
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: "1.05rem" }}>Stock camionnette</h2>
      <InstallerStockPanel
        installerId={installer.id}
        installerLabel={installer.name}
        catalog={data.materialCatalog}
        canEdit={canManage}
      />

      {canManage && editOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            background: "rgba(26, 43, 60, 0.5)",
            padding: "1.5rem",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            overflow: "auto",
          }}
          onClick={() => setEditOpen(false)}
        >
          <div className="card" style={{ width: "min(480px, 100%)", marginTop: "2rem" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Modifier le technicien</h2>
            <form onSubmit={(e) => void submitEdit(e)}>
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
                <label>E-mail</label>
                <input
                  type="email"
                  className="input"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button type="submit" className="btn btn-primary">
                  Enregistrer
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditOpen(false)}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
