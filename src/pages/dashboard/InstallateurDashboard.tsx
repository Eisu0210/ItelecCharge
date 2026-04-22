import { useEffect, useMemo, useState } from "react";
import { useData } from "../../context/DataContext";
import { statusLabels } from "../../data/store";
import type { Lead } from "../../types";
import { SignaturePad } from "../../components/SignaturePad";

/** Compte démo « installateur » : associé au technicien tech-1 */
const TECH_ID = "tech-1";

export function InstallateurDashboard() {
  const { data, patchLead } = useData();
  const [toast, setToast] = useState("");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [sig, setSig] = useState("");
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();

  const jobs = useMemo(
    () =>
      data.leads.filter(
        (l) =>
          l.installerId === TECH_ID &&
          ["installation_planifiee", "en_cours", "cloture"].includes(l.status)
      ),
    [data.leads]
  );

  useEffect(() => {
    if (!selected) return;
    const fresh = data.leads.find((l) => l.id === selected.id);
    if (fresh) setSelected(fresh);
  }, [data.leads, selected?.id]);

  function notifyOnRoute(lead: Lead) {
    const msg = `ITELEC CHARGE : votre technicien est en route pour ${lead.companyName}. Créneau prévu : ${lead.slotStart ? new Date(lead.slotStart).toLocaleString("fr-BE") : "à confirmer"}.`;
    patchLead(lead.id, { onsiteNotifiedAt: new Date().toISOString() });
    setToast(`SMS simulé au ${lead.phone} : ${msg}`);
    setTimeout(() => setToast(""), 6000);
  }

  function startJob(lead: Lead) {
    patchLead(lead.id, { status: "en_cours" });
    setToast("Installation démarrée.");
    setTimeout(() => setToast(""), 2500);
  }

  function submitReport(lead: Lead) {
    if (!sig) {
      setToast("Signature requise.");
      setTimeout(() => setToast(""), 2500);
      return;
    }
    patchLead(lead.id, {
      status: "cloture",
      report: {
        signedAt: new Date().toISOString(),
        signaturePng: sig,
        comment: comment.trim(),
        photoDataUrl: photo,
      },
    });
    setSelected(null);
    setSig("");
    setComment("");
    setPhoto(undefined);
    setToast("Rapport enregistré — dossier clôturé.");
    setTimeout(() => setToast(""), 3500);
  }

  return (
    <div>
      {toast ? <div className="toast">{toast}</div> : null}
      <h1 style={{ marginTop: 0 }}>Planning & chantiers</h1>
      <p style={{ color: "var(--color-muted)" }}>
        Compte démo lié au technicien <strong>Jean Dupont</strong> ({TECH_ID}).
      </p>

      <div className="table-wrap card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Statut</th>
              <th>Créneau</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((l) => (
              <tr key={l.id}>
                <td>
                  <strong>{l.companyName}</strong>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>{l.address}</div>
                </td>
                <td>
                  <span className="badge">{statusLabels[l.status]}</span>
                </td>
                <td style={{ fontSize: "0.85rem" }}>
                  {l.slotStart ? new Date(l.slotStart).toLocaleString("fr-BE") : "—"}
                </td>
                <td>
                  <button type="button" className="btn btn-ghost" onClick={() => setSelected(l)}>
                    Fiche & rapport
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 900,
          }}
          role="dialog"
          aria-modal
        >
          <div
            className="card"
            style={{ maxWidth: 560, width: "100%", maxHeight: "90vh", overflow: "auto" }}
          >
            <h2 style={{ marginTop: 0 }}>Fiche client</h2>
            <p>
              <strong>{selected.companyName}</strong>
            </p>
            <p style={{ margin: "0.25rem 0" }}>
              {selected.contactName} — {selected.email} — {selected.phone}
            </p>
            <p style={{ color: "var(--color-muted)" }}>{selected.address}</p>
            {selected.notes ? (
              <p>
                <em>Notes : {selected.notes}</em>
              </p>
            ) : null}

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", margin: "1rem 0" }}>
              <button type="button" className="btn btn-accent" onClick={() => notifyOnRoute(selected)}>
                On route (SMS client)
              </button>
              {selected.status === "installation_planifiee" ? (
                <button type="button" className="btn btn-primary" onClick={() => startJob(selected)}>
                  Démarrer l’installation
                </button>
              ) : null}
            </div>

            {selected.status === "en_cours" ? (
              <div style={{ marginTop: "1rem", borderTop: "1px solid var(--color-border)", paddingTop: "1rem" }}>
                <h3>Rapport d’installation</h3>
                <SignaturePad onChange={setSig} />
                <div className="field">
                  <label>Commentaire</label>
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} />
                </div>
                <div className="field">
                  <label>Photo (optionnel)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) {
                        setPhoto(undefined);
                        return;
                      }
                      const r = new FileReader();
                      r.onload = () => setPhoto(String(r.result));
                      r.readAsDataURL(f);
                    }}
                  />
                  {photo ? (
                    <img src={photo} alt="" style={{ maxWidth: "100%", marginTop: "0.5rem", borderRadius: 8 }} />
                  ) : null}
                </div>
                <button type="button" className="btn btn-primary" onClick={() => submitReport(selected)}>
                  Clôturer avec ce rapport
                </button>
              </div>
            ) : null}

            {selected.status === "cloture" && selected.report ? (
              <div style={{ marginTop: "1rem" }}>
                <h3>Rapport archivé</h3>
                <p style={{ fontSize: "0.9rem" }}>{selected.report.comment || "—"}</p>
                {selected.report.photoDataUrl ? (
                  <img
                    src={selected.report.photoDataUrl}
                    alt=""
                    style={{ maxWidth: "100%", borderRadius: 8 }}
                  />
                ) : null}
              </div>
            ) : null}

            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: "1rem" }}
              onClick={() => {
                setSelected(null);
                setSig("");
                setComment("");
                setPhoto(undefined);
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
