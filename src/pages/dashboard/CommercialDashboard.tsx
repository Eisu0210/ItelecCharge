import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { statusLabels } from "../../data/store";
import type { Lead, LeadStatus } from "../../types";
import { COMMISSION_PER_INSTALLATION } from "../../types";

function id() {
  return `lead-${crypto.randomUUID().slice(0, 8)}`;
}

export function CommercialDashboard() {
  const { user } = useAuth();
  const { data, createLead, patchLead } = useData();
  const [toast, setToast] = useState("");
  const cid = user!.username.toLowerCase();

  const myLeads = useMemo(
    () => data.leads.filter((l) => l.commercialId === cid),
    [data.leads, cid]
  );

  const stats = useMemo(() => {
    const clotures = myLeads.filter((l) => l.status === "cloture");
    const genere = clotures.length * COMMISSION_PER_INSTALLATION;
    const percu = clotures
      .filter((l) => l.commissionPaid)
      .reduce((s) => s + COMMISSION_PER_INSTALLATION, 0);
    const aPerc = genere - percu;
    return { genere, percu, aPerc, clotures: clotures.length };
  }, [myLeads]);

  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  function submitLead(e: React.FormEvent) {
    e.preventDefault();
    const lead: Lead = {
      id: id(),
      createdAt: new Date().toISOString(),
      commercialId: cid,
      companyName: form.companyName.trim(),
      contactName: form.contactName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      notes: form.notes.trim() || undefined,
      status: "nouveau",
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
    setToast("Demande enregistrée comme nouveau lead.");
    setTimeout(() => setToast(""), 3500);
  }

  function advanceDemo(lead: Lead, next: LeadStatus) {
    patchLead(lead.id, { status: next });
  }

  return (
    <div>
      {toast ? <div className="toast">{toast}</div> : null}

      <h1 style={{ marginTop: 0 }}>Espace commercial</h1>
      <p style={{ color: "var(--color-muted)" }}>
        Création de leads, suivi des dossiers et estimation des commissions (démo :{" "}
        {COMMISSION_PER_INSTALLATION}&nbsp;€ par installation clôturée).
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div className="card">
          <div className="badge badge-yellow">Généré</div>
          <p style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0.35rem 0" }}>{stats.genere}&nbsp;€</p>
        </div>
        <div className="card">
          <div className="badge badge-green">Perçu</div>
          <p style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0.35rem 0" }}>{stats.percu}&nbsp;€</p>
        </div>
        <div className="card">
          <div className="badge">À percevoir</div>
          <p style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0.35rem 0" }}>{stats.aPerc}&nbsp;€</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginTop: 0 }}>Nouvelle demande (lead)</h2>
        <form onSubmit={submitLead}>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
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
            <label>Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary">
            Enregistrer la demande
          </button>
        </form>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        <h2>Mes dossiers</h2>
        <Link to="/app/docs" className="btn btn-ghost">
          Documentation
        </Link>
      </div>
      <div className="table-wrap card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Statut</th>
              <th>Devis HTVA</th>
              <th>Actions démo</th>
            </tr>
          </thead>
          <tbody>
            {myLeads.map((l) => (
              <tr key={l.id}>
                <td>
                  <strong>{l.companyName}</strong>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>{l.contactName}</div>
                </td>
                <td>
                  <span className="badge">{statusLabels[l.status]}</span>
                </td>
                <td>{l.quoteAmountHtva ? `${l.quoteAmountHtva} €` : "—"}</td>
                <td style={{ fontSize: "0.8rem" }}>
                  {l.status === "nouveau" ? (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => advanceDemo(l, "devis_envoye")}
                    >
                      Devis envoyé
                    </button>
                  ) : null}
                  {l.status === "devis_envoye" ? (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() =>
                        patchLead(l.id, { status: "devis_accepte", quoteAmountHtva: l.quoteAmountHtva ?? 1600 })
                      }
                    >
                      Devis accepté
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: "2rem" }}>Rapport synthèse</h2>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Indicateur</th>
              <th>Valeur</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Installations clôturées</td>
              <td>{stats.clotures}</td>
            </tr>
            <tr>
              <td>Commission générée (80&nbsp;€ × clôturés)</td>
              <td>{stats.genere}&nbsp;€</td>
            </tr>
            <tr>
              <td>Déjà perçu</td>
              <td>{stats.percu}&nbsp;€</td>
            </tr>
            <tr>
              <td>Reste à percevoir</td>
              <td>{stats.aPerc}&nbsp;€</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
