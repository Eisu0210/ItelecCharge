import { useMemo, useState, type DragEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { apiFetch } from "../../lib/api";
import type { Lead } from "../../types";

const HOUR_START = 7;
const HOUR_END = 20;
const PIXELS_PER_HOUR = 76;
const SURVEY_COLUMN_WIDTH = 190;
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

function surveyHourOnSelectedDay(lead: Lead, dayStart: Date, dayEnd: Date): number | null {
  const startIso = lead.projectSpecs?.admin?.surveyScheduledStart;
  if (!startIso) return null;
  const start = new Date(startIso);
  const end = lead.projectSpecs?.admin?.surveyScheduledEnd
    ? new Date(lead.projectSpecs.admin.surveyScheduledEnd)
    : new Date(start.getTime() + DEFAULT_SLOT_HOURS * 3600 * 1000);
  if (!intersectsDay(start, end, dayStart, dayEnd)) return null;
  return start.getHours();
}

function leadHoverSummary(lead: Lead): string {
  return [
    lead.companyName,
    `Contact: ${lead.contactName}`,
    `Tel: ${lead.phone}`,
    `Adresse: ${lead.address}`,
  ].join("\n");
}

export function SiteSurveyPlanningPage() {
  const { user } = useAuth();
  const { data, refresh } = useData();
  const [selectedDay, setSelectedDay] = useState(() => toDateInputValue(new Date()));
  const [busySurveyLeadId, setBusySurveyLeadId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [poolDropActive, setPoolDropActive] = useState(false);

  const readOnly = user?.role === "site_survey";

  const dayStart = useMemo(() => localDateAtHour(selectedDay, 0), [selectedDay]);
  const dayEnd = useMemo(() => localDateAtHour(selectedDay, 24), [selectedDay]);
  const totalHours = HOUR_END - HOUR_START;
  const hours = useMemo(
    () => Array.from({ length: totalHours }, (_v, i) => HOUR_START + i),
    [totalHours]
  );

  const siteSurveyPool = useMemo(
    () =>
      data.leads.filter((lead) => {
        if (!lead.workflowStage) {
          return ["nouveau", "devis_envoye", "devis_accepte"].includes(lead.status);
        }
        if (lead.projectSpecs?.siteSurvey?.completedAt) return false;
        return lead.workflowStage === "attente_admin" || lead.workflowStage === "survey_planifie";
      }),
    [data.leads]
  );

  const unplannedPool = useMemo(
    () =>
      siteSurveyPool
        .filter((lead) => !lead.projectSpecs?.admin?.surveyScheduledStart)
        .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))),
    [siteSurveyPool]
  );

  const plannedByAssignee = useMemo(() => {
    const map = new Map<number, Lead[]>();
    for (const u of data.siteSurveyUsers) map.set(u.id, []);
    for (const lead of siteSurveyPool) {
      const assigneeId = lead.projectSpecs?.admin?.surveyAssigneeUserId;
      const startIso = lead.projectSpecs?.admin?.surveyScheduledStart;
      if (!assigneeId || !startIso) continue;
      const start = new Date(startIso);
      const end = lead.projectSpecs?.admin?.surveyScheduledEnd
        ? new Date(lead.projectSpecs.admin.surveyScheduledEnd)
        : new Date(start.getTime() + DEFAULT_SLOT_HOURS * 3600 * 1000);
      if (!intersectsDay(start, end, dayStart, dayEnd)) continue;
      const row = map.get(assigneeId) ?? [];
      row.push(lead);
      map.set(assigneeId, row);
    }
    for (const row of map.values()) {
      row.sort((a, b) =>
        String(a.projectSpecs?.admin?.surveyScheduledStart ?? "").localeCompare(
          String(b.projectSpecs?.admin?.surveyScheduledStart ?? "")
        )
      );
    }
    if (readOnly && user) {
      return new Map<number, Lead[]>([[user.id, map.get(user.id) ?? []]]);
    }
    return map;
  }, [data.siteSurveyUsers, siteSurveyPool, dayStart, dayEnd, readOnly, user]);

  function readDraggedLeadId(event: DragEvent) {
    const payload = event.dataTransfer.getData("text/lead-id");
    return payload || draggingLeadId;
  }

  function leadIsLockedForShift(lead: Lead): boolean {
    return lead.workflowStage === "survey_terrain";
  }

  async function unscheduleByDrop(leadId: string) {
    const lead = data.leads.find((l) => l.id === leadId);
    if (!lead) return;
    if (lead.workflowStage === "survey_terrain") {
      setToast("Impossible de déplanifier : relevé terrain en cours.");
      window.setTimeout(() => setToast(""), 2400);
      return;
    }
    setBusySurveyLeadId(leadId);
    try {
      await apiFetch(`/api/leads/${encodeURIComponent(leadId)}`, {
        method: "PATCH",
        body: JSON.stringify({
          workflowStage:
            lead.workflowStage === "survey_planifie" && !lead.projectSpecs?.siteSurvey?.completedAt
              ? "attente_admin"
              : lead.workflowStage,
          projectSpecs: {
            ...(lead.projectSpecs ?? {}),
            admin: {
              ...(lead.projectSpecs?.admin ?? {}),
              surveyAssigneeUserId: undefined,
              surveyScheduledStart: undefined,
              surveyScheduledEnd: undefined,
            },
          },
        } satisfies Partial<Lead>),
      });
      await refresh();
      setToast("Visite remise dans la liste à planifier.");
      window.setTimeout(() => setToast(""), 1800);
    } finally {
      setBusySurveyLeadId(null);
    }
  }

  async function scheduleByDrop(leadId: string, assigneeId: number, hour: number) {
    if (hour < HOUR_START || hour >= HOUR_END) return;
    const lead = data.leads.find((l) => l.id === leadId);
    if (!lead) return;

    const rowLeads = data.leads.filter(
      (l) =>
        l.id !== leadId &&
        l.projectSpecs?.admin?.surveyAssigneeUserId === assigneeId &&
        !!l.projectSpecs?.admin?.surveyScheduledStart
    );

    const slotMap = new Map<number, Lead>();
    for (const l of rowLeads) {
      const h = surveyHourOnSelectedDay(l, dayStart, dayEnd);
      if (h == null || h < HOUR_START || h >= HOUR_END) continue;
      slotMap.set(h, l);
    }

    const blocker = slotMap.get(hour);
    if (blocker && leadIsLockedForShift(blocker)) {
      setToast("Créneau occupé par un relevé terrain en cours.");
      window.setTimeout(() => setToast(""), 2400);
      return;
    }

    const shiftedIds: string[] = [];
    let carry = slotMap.get(hour);
    slotMap.set(hour, lead);
    let probe = hour + 1;
    while (carry) {
      if (leadIsLockedForShift(carry)) {
        setToast("Décalage impossible : relevé terrain en cours juste après.");
        window.setTimeout(() => setToast(""), 2400);
        return;
      }
      if (probe >= HOUR_END) {
        setToast("Placement impossible : plus de case libre sur cette journée.");
        window.setTimeout(() => setToast(""), 2600);
        return;
      }
      const nextCarry = slotMap.get(probe);
      slotMap.set(probe, carry);
      shiftedIds.push(carry.id);
      carry = nextCarry;
      probe += 1;
    }

    const updates: BatchLeadUpdate[] = [];
    for (const [targetHour, l] of slotMap.entries()) {
      const previousHour = surveyHourOnSelectedDay(l, dayStart, dayEnd);
      const sameAssignee = l.projectSpecs?.admin?.surveyAssigneeUserId === assigneeId;
      if (previousHour === targetHour && sameAssignee) continue;
      const slotStart = localDateAtHour(selectedDay, targetHour);
      const slotEnd = new Date(slotStart.getTime() + DEFAULT_SLOT_HOURS * 3600 * 1000);
      updates.push({
        id: l.id,
        patch: {
          workflowStage: "survey_planifie",
          projectSpecs: {
            ...(l.projectSpecs ?? {}),
            admin: {
              ...(l.projectSpecs?.admin ?? {}),
              surveyAssigneeUserId: assigneeId,
              surveyScheduledStart: slotStart.toISOString(),
              surveyScheduledEnd: slotEnd.toISOString(),
              plannedAt: new Date().toISOString(),
            },
          },
        },
      });
    }
    if (updates.length === 0) return;

    setBusySurveyLeadId(leadId);
    try {
      await apiFetch("/api/leads/batch-patch", {
        method: "POST",
        body: JSON.stringify({ updates }),
      });
      await refresh();
      setToast("Site survey planifié sur le planning.");
      window.setTimeout(() => setToast(""), 1800);
    } finally {
      setBusySurveyLeadId(null);
    }
  }

  async function onDropCell(event: DragEvent, assigneeId: number, hour: number) {
    if (readOnly) return;
    event.preventDefault();
    const leadId = readDraggedLeadId(event);
    setDraggingLeadId(null);
    if (!leadId) return;
    await scheduleByDrop(leadId, assigneeId, hour);
  }

  async function onDropPool(event: DragEvent) {
    if (readOnly) return;
    event.preventDefault();
    setPoolDropActive(false);
    const leadId = readDraggedLeadId(event);
    setDraggingLeadId(null);
    if (!leadId) return;
    await unscheduleByDrop(leadId);
  }

  return (
    <div className="planning-page">
      {toast ? <div className="toast">{toast}</div> : null}
      <div className="planning-page__header">
        <h1 style={{ marginTop: 0 }}>Planning site survey</h1>
        <div className="card planning-page__toolbar">
          <div className="planning-toolbar">
            <div>
              <label htmlFor="site-survey-planning-date">Date</label>
              <input
                id="site-survey-planning-date"
                type="date"
                className="input planning-date-input"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
              />
            </div>
            <span className="planning-hint">
              Planifiez les visites terrain (site survey) sur la journée sélectionnée.
            </span>
          </div>
        </div>
      </div>

      <div className="planning-page__board">
      <div className="card planning-board">
        {data.siteSurveyUsers.length === 0 ? (
          <p style={{ margin: 0 }}>
            Aucun utilisateur « site_survey » disponible. Créez-en dans Utilisateurs pour pouvoir dispatcher.
          </p>
        ) : (
          <div className="planning-grid-wrap">
            <div
              className="planning-grid"
              style={{ width: SURVEY_COLUMN_WIDTH + totalHours * PIXELS_PER_HOUR }}
            >
              <div className="planning-row planning-row-header">
                <div className="planning-grid-header planning-tech-col">Site survey</div>
                <div className="planning-grid-header planning-time-col">
                  {hours.map((h) => (
                    <div key={h} className="planning-hour-cell" style={{ width: PIXELS_PER_HOUR }}>
                      {String(h).padStart(2, "0")}:00
                    </div>
                  ))}
                </div>
              </div>

              {(readOnly && user
                ? data.siteSurveyUsers.filter((u) => u.id === user.id)
                : data.siteSurveyUsers
              ).map((u) => {
                const rowLeads = plannedByAssignee.get(u.id) ?? [];
                return (
                  <div key={u.id} className="planning-row">
                    <div className="planning-tech-col">
                      <div className="planning-tech-name">{u.displayName}</div>
                      <div className="planning-tech-meta">u{u.id}</div>
                    </div>

                    <div className="planning-row-timeline" style={{ width: totalHours * PIXELS_PER_HOUR }}>
                      {!readOnly ? (
                        <div className="planning-row-dropzones">
                          {hours.map((hour) => (
                            <div
                              key={`${u.id}-${hour}`}
                              className="planning-dropzone"
                              style={{ width: PIXELS_PER_HOUR }}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => void onDropCell(e, u.id, hour)}
                            />
                          ))}
                        </div>
                      ) : null}

                      {rowLeads.map((lead) => {
                        const startIso = lead.projectSpecs?.admin?.surveyScheduledStart;
                        if (!startIso) return null;
                        const slotStart = new Date(startIso);
                        const startHour = slotStart.getHours();
                        if (startHour < HOUR_START || startHour >= HOUR_END) return null;
                        const clampedIndex = Math.max(0, Math.min(totalHours - 1, startHour - HOUR_START));
                        const left = clampedIndex * PIXELS_PER_HOUR;
                        const width = PIXELS_PER_HOUR - 6;
                        const locked = leadIsLockedForShift(lead);
                        const eventClass = `planning-event ${
                          locked ? "is-active is-locked" : busySurveyLeadId === lead.id ? "is-busy" : ""
                        }`;

                        if (readOnly) {
                          return (
                            <Link
                              key={lead.id}
                              to={`/app/dossier/${lead.id}`}
                              className={`${eventClass} planning-event--link`}
                              style={{ left, width }}
                              title={`${leadHoverSummary(lead)}\n\nOuvrir le dossier client`}
                            >
                              <strong>{lead.contactName}</strong>
                              <span>{lead.companyName}</span>
                            </Link>
                          );
                        }

                        return (
                          <article
                            key={lead.id}
                            className={eventClass}
                            style={{ left, width }}
                            title={leadHoverSummary(lead)}
                            draggable={!locked && busySurveyLeadId !== lead.id}
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
        )}
      </div>
      </div>

      {!readOnly ? (
        <div
          id="pool-site-survey"
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
            <h2>Liste dossiers à planifier ({unplannedPool.length})</h2>
          </div>
          <div className="planning-page__pool-body">
            {unplannedPool.length === 0 ? (
              <p style={{ margin: 0 }}>Aucun dossier en attente.</p>
            ) : (
              <div className="planning-pool-grid">
                {unplannedPool.map((lead) => (
                  <article
                    key={lead.id}
                    className={`planning-pool-card ${busySurveyLeadId === lead.id ? "is-busy" : ""}`}
                    title={leadHoverSummary(lead)}
                    draggable={busySurveyLeadId !== lead.id}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/lead-id", lead.id);
                      setDraggingLeadId(lead.id);
                    }}
                    onDragEnd={() => setDraggingLeadId(null)}
                  >
                    <strong>{lead.companyName}</strong>
                    <span>{lead.contactName}</span>
                    <span>{lead.address}</span>
                    <span className="planning-pool-status">{lead.status}</span>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Ma journée</h2>
          <p style={{ margin: 0, color: "var(--color-muted)" }}>
            Lecture seule : votre planning est défini par l’admin/dispatch.
          </p>
        </div>
      )}
    </div>
  );
}

