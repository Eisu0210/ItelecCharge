import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { statusLabels } from "../../data/store";
import type { Lead } from "../../types";
import { SignaturePad } from "../../components/SignaturePad";
import "./planning-board.css";
const HOUR_START = 7;
const HOUR_END = 20;
const PIXELS_PER_HOUR = 76;
const TECH_COLUMN_WIDTH = 190;
const DEFAULT_SLOT_HOURS = 1;

function toDateInputValue(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localDateAtHour(isoDate: string, hour: number): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hour, 0, 0, 0);
}

function intersectsDay(slotStart: Date, slotEnd: Date, dayStart: Date, dayEnd: Date): boolean {
  return slotStart < dayEnd && slotEnd > dayStart;
}

export function InstallateurDashboard() {
  const { user } = useAuth();
  const myInstallerId = user?.installerId ?? null;
  const { data, patchLead } = useData();
  const [toast, setToast] = useState("");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [selectedDay, setSelectedDay] = useState(() => toDateInputValue(new Date()));
  const [sig, setSig] = useState("");
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();

  const jobs = useMemo(
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
  const tech = useMemo(
    () => (myInstallerId ? data.installers.find((installer) => installer.id === myInstallerId) : undefined),
    [data.installers, myInstallerId]
  );
  const dayStart = useMemo(() => localDateAtHour(selectedDay, 0), [selectedDay]);
  const dayEnd = useMemo(() => localDateAtHour(selectedDay, 24), [selectedDay]);
  const totalHours = HOUR_END - HOUR_START;
  const hours = useMemo(
    () => Array.from({ length: totalHours }, (_v, i) => HOUR_START + i),
    [totalHours]
  );
  const jobsForDay = useMemo(
    () =>
      jobs
        .filter((lead) => {
          if (!lead.slotStart) return false;
          const start = new Date(lead.slotStart);
          const end = lead.slotEnd
            ? new Date(lead.slotEnd)
            : new Date(start.getTime() + DEFAULT_SLOT_HOURS * 3600 * 1000);
          return intersectsDay(start, end, dayStart, dayEnd);
        })
        .sort((a, b) => String(a.slotStart).localeCompare(String(b.slotStart))),
    [dayEnd, dayStart, jobs]
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

  if (!myInstallerId) {
    return (
      <div>
        <h1 style={{ marginTop: 0 }}>Planning & chantiers</h1>
        <p className="card">
          Votre compte n’est pas lié à une fiche technicien. Contactez un administrateur (profil installateur
          manquant).
        </p>
      </div>
    );
  }

  return (
    <div>
      {toast ? <div className="toast">{toast}</div> : null}
      <h1 style={{ marginTop: 0 }}>Planning & chantiers</h1>
      <p style={{ color: "var(--color-muted)" }}>
        Connecté en tant que <strong>{tech?.name ?? "Technicien"}</strong>
        {tech?.phone ? ` · ${tech.phone}` : null}
      </p>

      <div className="card planning-board" style={{ marginBottom: "1rem" }}>
        <div className="planning-toolbar">
          <div>
            <label htmlFor="tech-planning-date">Date</label>
            <input
              id="tech-planning-date"
              type="date"
              className="input planning-date-input"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
            />
          </div>
          <span className="planning-hint">Vue timeline de votre journée</span>
        </div>
        <div className="planning-grid-wrap">
          <div
            className="planning-grid"
            style={{ width: TECH_COLUMN_WIDTH + totalHours * PIXELS_PER_HOUR }}
          >
            <div className="planning-row planning-row-header">
              <div className="planning-grid-header planning-tech-col">Technicien</div>
              <div className="planning-grid-header planning-time-col">
                {hours.map((h) => (
                  <div key={h} className="planning-hour-cell" style={{ width: PIXELS_PER_HOUR }}>
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
              </div>
            </div>
            <div className="planning-row">
              <div className="planning-tech-col">
                <div className="planning-tech-name">{tech?.name ?? "Technicien"}</div>
                <div className="planning-tech-meta">{tech?.phone ?? myInstallerId}</div>
              </div>
              <div className="planning-row-timeline" style={{ width: totalHours * PIXELS_PER_HOUR }}>
                <div className="planning-row-dropzones">
                  {hours.map((hour) => (
                    <div
                      key={`tech-self-${hour}`}
                      className="planning-dropzone"
                      style={{ width: PIXELS_PER_HOUR }}
                    />
                  ))}
                </div>
                {jobsForDay.map((lead) => {
                  if (!lead.slotStart) return null;
                  const startHour = new Date(lead.slotStart).getHours();
                  if (startHour < HOUR_START || startHour >= HOUR_END) return null;
                  const clampedIndex = Math.max(0, Math.min(totalHours - 1, startHour - HOUR_START));
                  const left = clampedIndex * PIXELS_PER_HOUR;
                  const width = PIXELS_PER_HOUR - 6;
                  return (
                    <article
                      key={lead.id}
                      className={`planning-event ${
                        lead.status === "cloture"
                          ? "is-done"
                          : lead.status === "en_cours"
                            ? "is-active"
                            : ""
                      }`}
                      style={{ left, width, cursor: "pointer", opacity: 1 }}
                      title={`${lead.companyName}\n${lead.address}\n${statusLabels[lead.status]}`}
                      onClick={() => setSelected(lead)}
                    >
                      <strong>{lead.contactName}</strong>
                      <span>{lead.companyName}</span>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      {jobsForDay.length === 0 ? (
        <p className="card" style={{ color: "var(--color-muted)" }}>
          Aucun chantier prévu sur cette date.
        </p>
      ) : null}

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
