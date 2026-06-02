import { useMemo, useState, type DragEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { apiFetch } from "../../lib/api";
import type { Lead } from "../../types";
import { InstallateurDashboard } from "./InstallateurDashboard";
import "./planning-board.css";

const HOUR_START = 7;
const HOUR_END = 20;
const PIXELS_PER_HOUR = 76;
const TECH_COLUMN_WIDTH = 190;
const DEFAULT_SLOT_HOURS = 1;
type BatchLeadUpdate = { id: string; patch: Partial<Lead> };

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

function statusLabel(status: Lead["status"]): string {
  if (status === "devis_accepte") return "Devis accepté";
  if (status === "installation_planifiee") return "Planifiée";
  if (status === "en_cours") return "En cours";
  if (status === "cloture") return "Clôturé";
  if (status === "devis_envoye") return "Devis envoyé";
  return "Nouveau";
}

function leadHoverSummary(lead: Lead): string {
  return [
    lead.companyName,
    `Contact: ${lead.contactName}`,
    `Tel: ${lead.phone}`,
    `Adresse: ${lead.address}`,
    `Statut: ${statusLabel(lead.status)}`,
  ].join("\n");
}

function leadHourOnSelectedDay(lead: Lead, dayStart: Date, dayEnd: Date): number | null {
  if (!lead.slotStart) return null;
  const start = new Date(lead.slotStart);
  const end = lead.slotEnd
    ? new Date(lead.slotEnd)
    : new Date(start.getTime() + DEFAULT_SLOT_HOURS * 3600 * 1000);
  if (!intersectsDay(start, end, dayStart, dayEnd)) return null;
  return start.getHours();
}

/** Planning perso (tech) ou planning dispatch (admin/dispatch) avec drag & drop. */
export function PlanningPage() {
  const { user } = useAuth();
  const { data, patchLead, refresh } = useData();
  const [selectedDay, setSelectedDay] = useState(() => toDateInputValue(new Date()));
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);
  const [poolDropActive, setPoolDropActive] = useState(false);
  const [toast, setToast] = useState("");

  if (user?.role === "installateur") return <InstallateurDashboard />;

  const dayStart = useMemo(() => localDateAtHour(selectedDay, 0), [selectedDay]);
  const dayEnd = useMemo(() => localDateAtHour(selectedDay, 24), [selectedDay]);
  const totalHours = HOUR_END - HOUR_START;
  const hours = useMemo(
    () => Array.from({ length: totalHours }, (_v, i) => HOUR_START + i),
    [totalHours]
  );

  const pool = useMemo(
    () =>
      data.leads
        .filter(
          (lead) => lead.status === "devis_accepte" && (!lead.installerId || !lead.slotStart)
        )
        .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))),
    [data.leads]
  );

  const scheduledByInstaller = useMemo(() => {
    const map = new Map<string, Lead[]>();
    for (const installer of data.installers) map.set(installer.id, []);

    for (const lead of data.leads) {
      if (!lead.installerId || !lead.slotStart) continue;
      const start = new Date(lead.slotStart);
      const end = lead.slotEnd
        ? new Date(lead.slotEnd)
        : new Date(start.getTime() + DEFAULT_SLOT_HOURS * 3600 * 1000);
      if (!intersectsDay(start, end, dayStart, dayEnd)) continue;
      const row = map.get(lead.installerId) ?? [];
      row.push(lead);
      map.set(lead.installerId, row);
    }

    for (const row of map.values()) {
      row.sort((a, b) => String(a.slotStart).localeCompare(String(b.slotStart)));
    }
    return map;
  }, [data.installers, data.leads, dayEnd, dayStart]);

  async function scheduleLead(leadId: string, installerId: string, hour: number) {
    if (hour < HOUR_START || hour >= HOUR_END) return;
    const dragged = data.leads.find((lead) => lead.id === leadId);
    if (!dragged) return;

    const rowLeads = data.leads.filter(
      (lead) =>
        lead.installerId === installerId &&
        (lead.status === "installation_planifiee" || lead.status === "en_cours") &&
        lead.id !== leadId
    );

    const slotMap = new Map<number, Lead>();
    for (const lead of rowLeads) {
      const h = leadHourOnSelectedDay(lead, dayStart, dayEnd);
      if (h == null || h < HOUR_START || h >= HOUR_END) continue;
      slotMap.set(h, lead);
    }

    const blocker = slotMap.get(hour);
    if (blocker?.status === "en_cours") {
      setToast("Créneau occupé par un chantier en cours.");
      window.setTimeout(() => setToast(""), 2200);
      return;
    }

    const shiftedIds: string[] = [];
    let carry = slotMap.get(hour);
    slotMap.set(hour, dragged);
    let probe = hour + 1;
    while (carry) {
      if (carry.status === "en_cours") {
        setToast("Décalage impossible: chantier en cours juste après.");
        window.setTimeout(() => setToast(""), 2200);
        return;
      }
      if (probe >= HOUR_END) {
        setToast("Placement impossible: plus de case libre sur cette journée.");
        window.setTimeout(() => setToast(""), 2500);
        return;
      }
      const nextCarry = slotMap.get(probe);
      slotMap.set(probe, carry);
      shiftedIds.push(carry.id);
      carry = nextCarry;
      probe += 1;
    }

    const updates: BatchLeadUpdate[] = [];
    for (const [targetHour, lead] of slotMap.entries()) {
      const previousHour = leadHourOnSelectedDay(lead, dayStart, dayEnd);
      const sameInstaller = lead.installerId === installerId;
      if (previousHour === targetHour && sameInstaller) continue;
      const slotStart = localDateAtHour(selectedDay, targetHour);
      const slotEnd = new Date(slotStart.getTime() + DEFAULT_SLOT_HOURS * 3600 * 1000);
      updates.push({
        id: lead.id,
        patch: {
          installerId,
          slotStart: slotStart.toISOString(),
          slotEnd: slotEnd.toISOString(),
          status: lead.id === leadId ? "installation_planifiee" : lead.status,
        },
      });
    }
    if (updates.length === 0) return;

    setBusyLeadId(leadId);
    try {
      const scrollY = window.scrollY;
      await apiFetch("/api/leads/batch-patch", {
        method: "POST",
        body: JSON.stringify({ updates }),
      });
      await refresh();
      if (window.scrollY !== scrollY) window.scrollTo({ top: scrollY, behavior: "auto" });
      setToast(
        shiftedIds.length > 0
          ? `Client planifié, ${shiftedIds.length} client(s) décalé(s).`
          : "Client planifié sur la timeline."
      );
      window.setTimeout(() => setToast(""), 2200);
    } finally {
      setBusyLeadId(null);
    }
  }

  async function unscheduleLead(leadId: string) {
    const lead = data.leads.find((item) => item.id === leadId);
    if (!lead) return;
    if (lead.status === "en_cours" || lead.status === "cloture") {
      setToast("Impossible de renvoyer un chantier en cours ou clôturé.");
      window.setTimeout(() => setToast(""), 2200);
      return;
    }
    setBusyLeadId(leadId);
    try {
      await patchLead(leadId, {
        installerId: "",
        slotStart: "",
        slotEnd: "",
        status: lead.status === "installation_planifiee" ? "devis_accepte" : lead.status,
      });
      setToast("Client renvoyé dans la liste à planifier.");
      window.setTimeout(() => setToast(""), 2200);
    } finally {
      setBusyLeadId(null);
    }
  }

  function readDraggedLeadId(event: DragEvent) {
    const payload = event.dataTransfer.getData("text/lead-id");
    return payload || draggingLeadId;
  }

  async function onDropCell(event: DragEvent, installerId: string, hour: number) {
    event.preventDefault();
    const leadId = readDraggedLeadId(event);
    setDraggingLeadId(null);
    if (!leadId) return;
    await scheduleLead(leadId, installerId, hour);
  }

  async function onDropPool(event: DragEvent) {
    event.preventDefault();
    setPoolDropActive(false);
    const leadId = readDraggedLeadId(event);
    setDraggingLeadId(null);
    if (!leadId) return;
    await unscheduleLead(leadId);
  }

  return (
    <div className="planning-page">
      {toast ? <div className="toast">{toast}</div> : null}
      <div className="planning-page__header">
        <h1 style={{ marginTop: 0 }}>Planning dispatch</h1>
      </div>

      <div className="planning-page__board">
      <div id="timeline-planning" className="card planning-board">
        <div className="planning-toolbar">
          <div>
            <label htmlFor="planning-date">Date</label>
            <input
              id="planning-date"
              type="date"
              className="input planning-date-input"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
            />
          </div>
          <span className="planning-hint">Glisser un client sur un créneau (1 case = 1h)</span>
        </div>

        <div className="planning-grid-wrap">
          <div
            className="planning-grid"
            style={{ width: TECH_COLUMN_WIDTH + totalHours * PIXELS_PER_HOUR }}
          >
            <div className="planning-row planning-row-header">
              <div className="planning-grid-header planning-tech-col">Techniciens</div>
              <div className="planning-grid-header planning-time-col">
                {hours.map((h) => (
                  <div key={h} className="planning-hour-cell" style={{ width: PIXELS_PER_HOUR }}>
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
              </div>
            </div>

            {data.installers.map((installer) => {
              const rowLeads = scheduledByInstaller.get(installer.id) ?? [];
              return (
                <div key={installer.id} className="planning-row">
                  <div className="planning-tech-col">
                    <div className="planning-tech-name">{installer.name}</div>
                    <div className="planning-tech-meta">{installer.phone}</div>
                  </div>

                  <div
                    className="planning-row-timeline"
                    style={{ width: totalHours * PIXELS_PER_HOUR }}
                  >
                    <div className="planning-row-dropzones">
                      {hours.map((hour) => (
                        <div
                          key={`${installer.id}-${hour}`}
                          className="planning-dropzone"
                          style={{ width: PIXELS_PER_HOUR }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => void onDropCell(e, installer.id, hour)}
                        />
                      ))}
                    </div>

                    {rowLeads.map((lead) => {
                      if (!lead.slotStart) return null;
                      const slotStart = new Date(lead.slotStart);
                      const startHour = slotStart.getHours();
                      if (startHour < HOUR_START || startHour >= HOUR_END) return null;
                      const clampedIndex = Math.max(
                        0,
                        Math.min(totalHours - 1, startHour - HOUR_START)
                      );
                      const left = clampedIndex * PIXELS_PER_HOUR;
                      const width = PIXELS_PER_HOUR - 6;

                      return (
                        <article
                          key={lead.id}
                          className={`planning-event ${
                            lead.status === "cloture"
                              ? "is-done"
                              : lead.status === "en_cours"
                                ? "is-active is-locked"
                                : ""
                          }`}
                          style={{ left, width }}
                          title={leadHoverSummary(lead)}
                          draggable={lead.status !== "en_cours" && busyLeadId !== lead.id}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            const targetHour = slotStart.getHours();
                            void onDropCell(e, installer.id, targetHour);
                          }}
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/lead-id", lead.id);
                            setDraggingLeadId(lead.id);
                          }}
                          onDragEnd={() => setDraggingLeadId(null)}
                        >
                          <strong>{lead.contactName}</strong>
                          <span>{lead.companyName}</span>
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </div>

      <div
        id="pool-dispatch"
        className={`planning-page__pool card planning-pool ${poolDropActive ? "planning-pool-drop-active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setPoolDropActive(true);
        }}
        onDragEnter={() => setPoolDropActive(true)}
        onDragLeave={() => setPoolDropActive(false)}
        onDrop={(e) => void onDropPool(e)}
      >
        <div className="planning-page__pool-head">
          <h2>Liste clients actifs ({pool.length})</h2>
        </div>
        <div className="planning-page__pool-body">
          {pool.length === 0 ? (
            <p style={{ margin: 0 }}>Aucun client en attente.</p>
          ) : (
            <div className="planning-pool-grid">
              {pool.map((lead) => (
                <article
                  key={lead.id}
                  className={`planning-pool-card ${busyLeadId === lead.id ? "is-busy" : ""}`}
                  title={leadHoverSummary(lead)}
                  draggable={busyLeadId !== lead.id}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/lead-id", lead.id);
                    setDraggingLeadId(lead.id);
                  }}
                  onDragEnd={() => setDraggingLeadId(null)}
                >
                  <strong>{lead.companyName}</strong>
                  <span>{lead.contactName}</span>
                  <span>{lead.address}</span>
                  <span className="planning-pool-status">{statusLabel(lead.status)}</span>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
