import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SectionSearchBar } from "../../components/SectionSearchBar";
import { useData } from "../../context/DataContext";
import type { FleetVehicle } from "../../types";
import "./compact-list-page.css";

function newVehicleId() {
  return `veh-${crypto.randomUUID().slice(0, 8)}`;
}

type VehicleForm = {
  label: string;
  plate: string;
  makeModel: string;
  notes: string;
  installerId: string;
};

const emptyForm = (): VehicleForm => ({
  label: "",
  plate: "",
  makeModel: "",
  notes: "",
  installerId: "",
});

function normalizeSearch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function FleetVehiclesPage() {
  const { data, createFleetVehicle, patchFleetVehicle, deleteFleetVehicle } = useData();
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<VehicleForm>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<VehicleForm>(emptyForm);

  const installerNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of data.installers) m.set(i.id, i.name);
    return m;
  }, [data.installers]);

  const rows = useMemo(
    () =>
      [...data.fleetVehicles].sort((a, b) => a.label.localeCompare(b.label, "fr", { sensitivity: "base" })),
    [data.fleetVehicles]
  );

  const filteredRows = useMemo(() => {
    const q = normalizeSearch(search);
    if (!q) return rows;
    return rows.filter((v) => {
      const techName = v.installerId ? installerNameById.get(v.installerId) ?? "" : "";
      const haystack = [
        v.label,
        v.plate,
        v.makeModel,
        v.notes ?? "",
        v.id,
        techName,
        v.installerId ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "");
      return haystack.includes(q);
    });
  }, [rows, search, installerNameById]);

  const assignedInstallerIds = useMemo(
    () => new Set(data.fleetVehicles.map((v) => v.installerId).filter(Boolean)),
    [data.fleetVehicles]
  );

  function installerOptions(currentInstallerId?: string) {
    return data.installers.filter(
      (i) => !assignedInstallerIds.has(i.id) || i.id === currentInstallerId
    );
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    const label = createForm.label.trim();
    if (!label) return;
    try {
      await createFleetVehicle({
        id: newVehicleId(),
        label,
        plate: createForm.plate.trim(),
        makeModel: createForm.makeModel.trim(),
        notes: createForm.notes.trim() || undefined,
        installerId: createForm.installerId.trim() || undefined,
      });
      setCreateForm(emptyForm());
      setShowCreate(false);
      setToast("Véhicule ajouté.");
      setTimeout(() => setToast(""), 2500);
    } catch {
      setToast("Création impossible.");
      setTimeout(() => setToast(""), 2500);
    }
  }

  function openEdit(v: FleetVehicle) {
    setEditId(v.id);
    setEditForm({
      label: v.label,
      plate: v.plate,
      makeModel: v.makeModel,
      notes: v.notes ?? "",
      installerId: v.installerId ?? "",
    });
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    try {
      await patchFleetVehicle(editId, {
        label: editForm.label.trim(),
        plate: editForm.plate.trim(),
        makeModel: editForm.makeModel.trim(),
        notes: editForm.notes.trim() || null,
        installerId: editForm.installerId.trim() || null,
      });
      setEditId(null);
      setToast("Véhicule mis à jour.");
      setTimeout(() => setToast(""), 2500);
    } catch {
      setToast("Mise à jour impossible.");
      setTimeout(() => setToast(""), 2500);
    }
  }

  async function assignInstaller(vehicleId: string, installerId: string) {
    try {
      await patchFleetVehicle(vehicleId, {
        installerId: installerId.trim() || null,
      });
      setToast("Technicien assigné.");
      setTimeout(() => setToast(""), 2200);
    } catch {
      setToast("Assignation impossible.");
      setTimeout(() => setToast(""), 2500);
    }
  }

  async function removeVehicle(id: string) {
    if (!window.confirm("Supprimer ce véhicule de la flotte ?")) return;
    try {
      await deleteFleetVehicle(id);
      if (editId === id) setEditId(null);
      setToast("Véhicule supprimé.");
      setTimeout(() => setToast(""), 2500);
    } catch {
      setToast("Suppression impossible.");
      setTimeout(() => setToast(""), 2500);
    }
  }

  return (
    <div className="compact-list-page">
      {toast ? <div className="toast">{toast}</div> : null}
      <p style={{ marginTop: 0 }}>
        <Link to="/app/tech">← Techniciens</Link>
      </p>
      <h1 style={{ marginTop: 0 }}>Flotte véhicules</h1>
      <p style={{ color: "var(--color-muted)" }}>
        Camionnettes et affectation technicien (1 véhicule max. par technicien).
      </p>

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
          <h2 style={{ margin: 0 }}>Nouveau véhicule</h2>
          <button type="button" className="btn btn-primary" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? "Fermer" : "Ajouter"}
          </button>
        </div>
        {showCreate ? (
          <form onSubmit={(e) => void submitCreate(e)} style={{ marginTop: "1rem" }}>
            <div className="field">
              <label>Libellé (ex. Camionnette 1)</label>
              <input
                className="input"
                required
                value={createForm.label}
                onChange={(e) => setCreateForm({ ...createForm, label: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Plaque d&apos;immatriculation</label>
              <input
                className="input"
                value={createForm.plate}
                onChange={(e) => setCreateForm({ ...createForm, plate: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Marque / modèle</label>
              <input
                className="input"
                value={createForm.makeModel}
                onChange={(e) => setCreateForm({ ...createForm, makeModel: e.target.value })}
                placeholder="Ex. Renault Kangoo"
              />
            </div>
            <div className="field">
              <label>Notes</label>
              <input
                className="input"
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Technicien assigné</label>
              <select
                className="input"
                value={createForm.installerId}
                onChange={(e) => setCreateForm({ ...createForm, installerId: e.target.value })}
              >
                <option value="">— Non assigné —</option>
                {installerOptions().map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary">
              Créer le véhicule
            </button>
          </form>
        ) : null}
      </div>

      <div
        className="table-wrap table-wrap--stack-mobile table-wrap--stack-compact compact-list-table card"
        style={{ padding: 0 }}
      >
        <SectionSearchBar
          id="fleet-search"
          placeholder="Plaque, technicien, libellé, marque, notes…"
          value={search}
          onChange={setSearch}
          filteredCount={filteredRows.length}
          totalCount={rows.length}
        />
        <table>
          <thead>
            <tr>
              <th>Véhicule</th>
              <th>Plaque</th>
              <th>Technicien</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="table-empty-row" style={{ color: "var(--color-muted)" }}>
                  Aucun véhicule enregistré.
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="table-empty-row" style={{ color: "var(--color-muted)" }}>
                  Aucun véhicule ne correspond à « {search.trim()} ».
                </td>
              </tr>
            ) : (
              filteredRows.map((v) => (
                <tr key={v.id}>
                  <td className="table-cell-primary">
                    <div className="table-cell-primary-head">
                      <strong>{v.label}</strong>
                      {v.plate ? (
                        <span className="table-cell-primary-badge compact-list-badge compact-plate-badge">{v.plate}</span>
                      ) : null}
                    </div>
                    {v.makeModel ? (
                      <div className="compact-list-meta">
                        {v.makeModel}
                      </div>
                    ) : null}
                    <div className="compact-list-id">
                      {v.id}
                    </div>
                  </td>
                  <td data-label="Plaque">{v.plate || "—"}</td>
                  <td data-label="Technicien">
                    <select
                      className="input table-cell-select"
                      value={v.installerId ?? ""}
                      onChange={(e) => void assignInstaller(v.id, e.target.value)}
                    >
                      <option value="">— Non assigné —</option>
                      {installerOptions(v.installerId).map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                    {v.installerId ? (
                      <div className="compact-list-meta" style={{ marginTop: "0.2rem" }}>
                        <Link to={`/app/tech/${v.installerId}`} style={{ fontSize: "0.85rem" }}>
                          Fiche →
                        </Link>
                      </div>
                    ) : null}
                  </td>
                  <td data-label="Actions">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
                      <button type="button" className="btn btn-ghost compact-list-btn-sm" onClick={() => openEdit(v)}>
                        Modifier
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost compact-list-btn-sm"
                        onClick={() => void removeVehicle(v.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editId ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            background: "rgba(26, 43, 60, 0.5)",
            padding: "1.5rem",
            overflow: "auto",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
          }}
          onClick={() => setEditId(null)}
        >
          <div className="card" style={{ width: "min(480px, 100%)", marginTop: "2rem" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Modifier le véhicule</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>{editForm.label || editId}</p>
            <form onSubmit={(e) => void submitEdit(e)}>
              <div className="field">
                <label>Libellé</label>
                <input
                  className="input"
                  required
                  value={editForm.label}
                  onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Plaque</label>
                <input
                  className="input"
                  value={editForm.plate}
                  onChange={(e) => setEditForm({ ...editForm, plate: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Marque / modèle</label>
                <input
                  className="input"
                  value={editForm.makeModel}
                  onChange={(e) => setEditForm({ ...editForm, makeModel: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Notes</label>
                <input
                  className="input"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Technicien</label>
                <select
                  className="input"
                  value={editForm.installerId}
                  onChange={(e) => setEditForm({ ...editForm, installerId: e.target.value })}
                >
                  <option value="">— Non assigné —</option>
                  {installerOptions(editForm.installerId || undefined).map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
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
    </div>
  );
}
