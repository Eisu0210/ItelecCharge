import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { statusLabels, workflowStageLabel } from "../../data/store";
import { QUOTE_MODE_LABELS } from "../../lib/quotePricing";
import type { Lead, LeadStatus, MountType, QuotePricingMode, SupplyType } from "../../types";
import { COMMISSION_PER_INSTALLATION } from "../../types";

function id() {
  return `lead-${crypto.randomUUID().slice(0, 8)}`;
}

type WizardStep = 0 | 1 | 2;

export function CommercialDashboard() {
  const { user } = useAuth();
  const { data, createLead, patchLead } = useData();
  const [toast, setToast] = useState("");
  const cid = user!.username.toLowerCase();

  const myLeads = useMemo(() => data.leads.filter((l) => l.commercialId === cid), [data.leads, cid]);

  const stats = useMemo(() => {
    const clotures = myLeads.filter((l) => l.status === "cloture");
    const genere = clotures.length * COMMISSION_PER_INSTALLATION;
    const percu = clotures
      .filter((l) => l.commissionPaid)
      .reduce((s) => s + COMMISSION_PER_INSTALLATION, 0);
    const aPerc = genere - percu;
    return { genere, percu, aPerc, clotures: clotures.length };
  }, [myLeads]);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [step, setStep] = useState<WizardStep>(0);

  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    chargerCount: "1",
    supplyType: "mono" as SupplyType,
    mountType: "mural" as MountType,
    quoteMode: "subscription" as QuotePricingMode,
  });

  const editingLead = editingLeadId ? myLeads.find((l) => l.id === editingLeadId) : undefined;

  function openNewWizard() {
    setEditingLeadId(null);
    setStep(0);
    setForm({
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
      chargerCount: "1",
      supplyType: "mono",
      mountType: "mural",
      quoteMode: "subscription",
    });
    setWizardOpen(true);
  }

  function openEditWizard(lead: Lead) {
    setEditingLeadId(lead.id);
    setStep(0);
    setForm({
      companyName: lead.companyName,
      contactName: lead.contactName,
      email: lead.email,
      phone: lead.phone,
      address: lead.address,
      notes: lead.notes ?? "",
      chargerCount: String(lead.projectSpecs?.commercial?.chargerCount ?? 1),
      supplyType: lead.projectSpecs?.commercial?.supplyType ?? "mono",
      mountType: lead.projectSpecs?.commercial?.mountType ?? "mural",
      quoteMode: lead.projectSpecs?.commercial?.quoteMode === "detailed" ? "detailed" : "subscription",
    });
    setWizardOpen(true);
  }

  async function persistStep1(): Promise<string | null> {
    const chargerCount = Math.max(1, Math.floor(Number(form.chargerCount) || 1));
    if (!editingLead) {
      const newId = id();
      const lead: Lead = {
        id: newId,
        createdAt: new Date().toISOString(),
        commercialId: cid,
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        notes: form.notes.trim() || undefined,
        status: "nouveau",
        workflowStage: "commercial_brouillon",
        projectSpecs: {
          commercial: {
            chargerCount,
            supplyType: form.supplyType,
            mountType: form.mountType,
            quoteMode: form.quoteMode,
          },
        },
      };
      await createLead(lead);
      setEditingLeadId(newId);
      setToast("Brouillon créé — étape suivante : vérifiez les infos techniques.");
      setTimeout(() => setToast(""), 3200);
      return newId;
    }
    await patchLead(editingLead.id, {
      companyName: form.companyName.trim(),
      contactName: form.contactName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      notes: form.notes.trim() || undefined,
      projectSpecs: {
        ...(editingLead.projectSpecs ?? {}),
        commercial: {
          ...(editingLead.projectSpecs?.commercial ?? {}),
          chargerCount,
          supplyType: form.supplyType,
          mountType: form.mountType,
          quoteMode: form.quoteMode,
        },
      },
    });
    setToast("Dossier mis à jour.");
    setTimeout(() => setToast(""), 2500);
    return editingLead.id;
  }

  function advanceDemo(lead: Lead, next: LeadStatus) {
    patchLead(lead.id, { status: next });
  }

  async function submitToAdmin() {
    const leadId = editingLead?.id ?? editingLeadId;
    if (!leadId) {
      setToast("Créez d’abord le brouillon (étape 1).");
      setTimeout(() => setToast(""), 2800);
      return;
    }
    const target = myLeads.find((l) => l.id === leadId) ?? editingLead;
    const chargerCount = Math.max(1, Math.floor(Number(form.chargerCount) || 1));
    await patchLead(leadId, {
      workflowStage: "attente_admin",
      projectSpecs: {
        ...(target?.projectSpecs ?? {}),
        commercial: {
          ...(target?.projectSpecs?.commercial ?? {}),
          chargerCount,
          supplyType: form.supplyType,
          mountType: form.mountType,
          quoteMode: form.quoteMode,
          submittedAt: new Date().toISOString(),
        },
      },
    });
    setWizardOpen(false);
    setEditingLeadId(null);
    setToast("Dossier transmis à l’administration pour planification du site survey.");
    setTimeout(() => setToast(""), 3500);
  }

  return (
    <div>
      {toast ? <div className="toast">{toast}</div> : null}

      <h1 style={{ marginTop: 0 }}>Espace commercial</h1>
      <p style={{ color: "var(--color-muted)" }}>
        Création de dossiers clients en plusieurs étapes : identité du site, besoins techniques (bornes, mono/tri,
        pose murale ou sur pied), puis transmission à l’admin pour planifier le site survey. Commission démo :{" "}
        {COMMISSION_PER_INSTALLATION}&nbsp;€ par installation clôturée.
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

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
        <button type="button" className="btn btn-primary" onClick={openNewWizard}>
          Nouveau client (formulaire guidé)
        </button>
        <Link to="/app/docs" className="btn btn-ghost">
          Documentation
        </Link>
      </div>

      {wizardOpen ? (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
            <h2 style={{ margin: 0 }}>
              {editingLeadId ? "Modifier le dossier" : "Nouveau dossier"} — étape {step + 1} / 3
            </h2>
            <button type="button" className="btn btn-ghost" onClick={() => setWizardOpen(false)}>
              Fermer
            </button>
          </div>
          <p style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>
            {step === 0 ? "Identité du client et coordonnées du chantier." : null}
            {step === 1 ? "Besoins techniques : nombre de bornes, alimentation, type de pose." : null}
            {step === 2 ? "Récapitulatif et envoi à l’admin." : null}
          </p>

          {step === 0 ? (
            <div style={{ display: "grid", gap: "0.65rem", maxWidth: 560 }}>
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
                <label>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void persistStep1().then(() => setStep(1))}
              >
                Suivant
              </button>
            </div>
          ) : null}

          {step === 1 ? (
            <div style={{ display: "grid", gap: "0.65rem", maxWidth: 560 }}>
              <div className="field">
                <label>Type de devis</label>
                <select
                  className="input"
                  value={form.quoteMode}
                  onChange={(e) => setForm({ ...form, quoteMode: e.target.value as QuotePricingMode })}
                >
                  <option value="subscription">{QUOTE_MODE_LABELS.subscription}</option>
                  <option value="detailed">{QUOTE_MODE_LABELS.detailed}</option>
                </select>
              </div>
              <div className="field">
                <label>Nombre de bornes</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  step={1}
                  required
                  value={form.chargerCount}
                  onChange={(e) => setForm({ ...form, chargerCount: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Alimentation</label>
                <select
                  className="input"
                  value={form.supplyType}
                  onChange={(e) => setForm({ ...form, supplyType: e.target.value as SupplyType })}
                >
                  <option value="mono">Monophasé</option>
                  <option value="tri">Triphasé</option>
                </select>
              </div>
              <div className="field">
                <label>Type de pose</label>
                <select
                  className="input"
                  value={form.mountType}
                  onChange={(e) => setForm({ ...form, mountType: e.target.value as MountType })}
                >
                  <option value="mural">Installation murale</option>
                  <option value="pied">Sur pied / colonne</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}>
                  Retour
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void persistStep1().then(() => setStep(2))}
                >
                  Suivant
                </button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div style={{ maxWidth: 560 }}>
              <ul style={{ lineHeight: 1.5 }}>
                <li>
                  <strong>{form.companyName}</strong> — {form.contactName}
                </li>
                <li>
                  {form.email} / {form.phone}
                </li>
                <li>{form.address}</li>
                <li>
                  Devis : {form.quoteMode === "subscription" ? "avec abonnement (forfait)" : "sans abonnement (détail)"}
                </li>
                <li>
                  {form.chargerCount} borne(s), {form.supplyType === "mono" ? "mono" : "tri"},{" "}
                  {form.mountType === "mural" ? "murale" : "sur pied"}
                </li>
              </ul>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                  Retour
                </button>
                <button type="button" className="btn btn-primary" onClick={() => void submitToAdmin()}>
                  Transmettre à l’admin (planif. site survey)
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        <h2>Mes dossiers</h2>
      </div>
      <div className="table-wrap table-wrap--stack-mobile table-wrap--scroll-xl card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Étape</th>
              <th>Statut</th>
              <th>Devis HTVA</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {myLeads.map((l) => (
              <tr key={l.id}>
                <td className="table-cell-primary">
                  <strong>{l.companyName}</strong>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>{l.contactName}</div>
                </td>
                <td data-label="Étape" style={{ fontSize: "0.82rem" }}>
                  {workflowStageLabel(l)}
                </td>
                <td data-label="Statut">
                  <span className="badge">{statusLabels[l.status]}</span>
                </td>
                <td data-label="Devis HTVA">{l.quoteAmountHtva ? `${l.quoteAmountHtva} €` : "—"}</td>
                <td data-label="Actions" style={{ fontSize: "0.8rem" }}>
                  {l.workflowStage === "commercial_brouillon" ? (
                    <button type="button" className="btn btn-ghost" onClick={() => openEditWizard(l)}>
                      Continuer
                    </button>
                  ) : null}
                  {l.workflowStage === "attente_admin" ? (
                    <span style={{ color: "var(--color-muted)" }}>Chez l’admin</span>
                  ) : null}
                  {!l.workflowStage && l.status === "nouveau" ? (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => advanceDemo(l, "devis_envoye")}
                    >
                      Devis envoyé (démo)
                    </button>
                  ) : null}
                  {!l.workflowStage && l.status === "devis_envoye" ? (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() =>
                        patchLead(l.id, { status: "devis_accepte", quoteAmountHtva: l.quoteAmountHtva ?? 1600 })
                      }
                    >
                      Devis accepté (démo)
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
              <td>Commission générée ({COMMISSION_PER_INSTALLATION}&nbsp;€ × clôturés)</td>
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
