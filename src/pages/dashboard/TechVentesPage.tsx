import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { statusLabels } from "../../data/store";
import type { Lead } from "../../types";

function id() {
  return `lead-${crypto.randomUUID().slice(0, 8)}`;
}

/** Vue « ventes » / chantiers pour le compte technicien. */
export function TechVentesPage() {
  const { user } = useAuth();
  const myInstallerId = user?.installerId ?? null;
  const { data, createLead } = useData();
  const [toast, setToast] = useState("");
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  const assigned = useMemo(
    () =>
      !myInstallerId
        ? []
        : data.leads.filter(
            (l) =>
              l.installerId === myInstallerId &&
              ["installation_planifiee", "en_cours", "cloture"].includes(l.status)
          ),
    [data.leads, myInstallerId]
  );

  const pipeline = useMemo(
    () => data.leads.filter((l) => ["nouveau", "devis_envoye", "devis_accepte"].includes(l.status)),
    [data.leads]
  );

  function submitLeadRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!myInstallerId) return;
    const lead: Lead = {
      id: id(),
      createdAt: new Date().toISOString(),
      commercialId: "demande-tech",
      companyName: form.companyName.trim(),
      contactName: form.contactName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      notes: form.notes.trim() || undefined,
      status: "nouveau",
      installerId: myInstallerId,
    };
    createLead(lead);
    setForm({
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    });
    setToast("Lead créé.");
    setTimeout(() => setToast(""), 3500);
  }

  if (!myInstallerId) {
    return (
      <div>
        <h1 style={{ marginTop: 0 }}>Ventes & dossiers</h1>
        <p className="card">
          Votre compte n’est pas lié à une fiche technicien. Contactez un administrateur.
        </p>
      </div>
    );
  }

  return (
    <div>
      {toast ? <div className="toast">{toast}</div> : null}
      <h1 style={{ marginTop: 0 }}>Ventes & dossiers</h1>
      <p style={{ color: "var(--color-muted)" }}>
        Chantiers qui vous concernent et aperçu du pipeline commercial.
      </p>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginTop: 0 }}>Nouveau lead terrain (technicien)</h2>
        <p style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>
          Ajoutez un nouveau client détecté sur le terrain.
        </p>
        <form onSubmit={submitLeadRequest}>
          <div className="field">
            <label>Société / site</label>
            <input
              className="input"
              required
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Contact</label>
            <input
              className="input"
              required
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
            />
          </div>
          <div className="u-grid-2">
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                className="input"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Téléphone</label>
              <input
                className="input"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <label>Adresse du chantier</label>
            <input
              className="input"
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Observations terrain</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary">
            Créer le lead
          </button>
        </form>
      </div>

      <h2 style={{ color: "var(--color-navy)" }}>Mes affectations</h2>
      <div className="table-wrap table-wrap--scroll-lg card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Statut</th>
              <th>Créneau</th>
              <th>Dossier</th>
            </tr>
          </thead>
          <tbody>
            {assigned.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ color: "var(--color-muted)" }}>
                  Aucun dossier assigné pour l’instant.
                </td>
              </tr>
            ) : (
              assigned.map((l) => (
                <tr key={l.id}>
                  <td>
                    <strong>{l.companyName}</strong>
                    <div style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>{l.address}</div>
                  </td>
                  <td>{statusLabels[l.status]}</td>
                  <td style={{ fontSize: "0.85rem" }}>
                    {l.slotStart ? new Date(l.slotStart).toLocaleString("fr-BE") : "—"}
                  </td>
                  <td>
                    <Link to={`/app/dossier/${l.id}`} className="btn btn-primary" style={{ textDecoration: "none" }}>
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: "2rem", color: "var(--color-navy)" }}>Pipeline (lecture)</h2>
      <p style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>
        Dossiers en amont pour contexte terrain — non modifiable ici.
      </p>
      <div className="table-wrap table-wrap--scroll-lg card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Statut</th>
              <th>Commercial</th>
              <th>Dossier</th>
            </tr>
          </thead>
          <tbody>
            {pipeline.map((l) => (
              <tr key={l.id}>
                <td>
                  <strong>{l.companyName}</strong>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>{l.address}</div>
                </td>
                <td>{statusLabels[l.status]}</td>
                <td>{l.commercialId}</td>
                <td>
                  <Link to={`/app/dossier/${l.id}`} className="btn btn-primary" style={{ textDecoration: "none" }}>
                    Ouvrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
