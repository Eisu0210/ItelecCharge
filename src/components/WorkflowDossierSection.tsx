import { useEffect, useMemo, useRef, useState } from "react";
import type { Lead, ProjectSpecs, SiteSurveyProjectSpecs, WorkflowStage } from "../types";
import { workflowLabels } from "../data/store";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { formatApiErrorMessage } from "../lib/api";
import type { QuotePricingMode } from "../types";
import {
  BASE_MURAL_HTVA,
  BASE_PIED_HTVA,
  EUR_CABLE_SUPP_PER_M,
  EUR_TRENCH_CONCRETE_PER_M,
  EUR_TRENCH_EARTH_PER_M,
  INCLUDED_CABLE_M,
  INCLUDED_TRENCH_M,
  QUOTE_MODE_LABELS,
  billableCableMeters,
  billableTrenchMeters,
  buildSiteSurveyPricing,
  defaultSubscriptionBase,
  getQuoteMode,
  suggestedInstallationBase,
  subscriptionBaseLabel,
} from "../lib/quotePricing";

function mergeSpecs(lead: Lead, patch: Partial<ProjectSpecs>): ProjectSpecs {
  const base = lead.projectSpecs ?? {};
  return {
    commercial: { ...(base.commercial ?? {}), ...(patch.commercial ?? {}) },
    admin: { ...(base.admin ?? {}), ...(patch.admin ?? {}) },
    siteSurvey: { ...(base.siteSurvey ?? {}), ...(patch.siteSurvey ?? {}) },
    quote: { ...(base.quote ?? {}), ...(patch.quote ?? {}) },
  };
}

type Props = {
  lead: Lead;
  patchLead: (id: string, patch: Partial<Lead>) => Promise<void>;
  setToast: (msg: string) => void;
};

export function WorkflowDossierSection({ lead, patchLead, setToast }: Props) {
  const { user } = useAuth();
  const { data, sendQuoteEmailToClient } = useData();
  const role = user?.role;
  const canEditSurvey = role === "site_survey" || role === "admin" || role === "dispatch";
  const w = lead.workflowStage;
  const [sendingMail, setSendingMail] = useState(false);

  const [siteForm, setSiteForm] = useState<SiteSurveyProjectSpecs>(() => lead.projectSpecs?.siteSurvey ?? {});

  const skipHydrateFromServerRef = useRef(false);

  useEffect(() => {
    if (skipHydrateFromServerRef.current) {
      skipHydrateFromServerRef.current = false;
      return;
    }
    setSiteForm(lead.projectSpecs?.siteSurvey ?? {});
  }, [lead.id, lead.projectSpecs?.siteSurvey]);

  const quoteMode = getQuoteMode(lead);
  const suggestedBase = useMemo(() => suggestedInstallationBase(lead), [lead, siteForm.baseInstallationHtva]);

  const livePricing = useMemo(
    () => buildSiteSurveyPricing(siteForm, lead),
    [siteForm, lead, lead.surveyMaterials, lead.projectSpecs?.commercial?.quoteMode, lead.projectSpecs?.commercial?.chargerCount, lead.projectSpecs?.commercial?.mountType]
  );

  async function setQuoteMode(mode: QuotePricingMode) {
    const merged = mergeSpecs(lead, { commercial: { ...(lead.projectSpecs?.commercial ?? {}), quoteMode: mode } });
    const leadNext = { ...lead, projectSpecs: merged };
    const { siteSurvey, totalHtva } = buildSiteSurveyPricing(siteForm, leadNext);
    merged.siteSurvey = { ...siteSurvey, baseInstallationHtva: siteSurvey.baseInstallationHtva };
    skipHydrateFromServerRef.current = true;
    await patchLead(lead.id, {
      projectSpecs: { ...merged, quote: { ...(merged.quote ?? {}), totalHtva } },
      quoteAmountHtva: totalHtva,
    });
    setToast(mode === "subscription" ? "Mode forfait abonnement activé." : "Mode devis détaillé activé.");
    setTimeout(() => setToast(""), 2800);
  }

  const cableBillM = billableCableMeters(siteForm.cableLengthM);
  const trenchBillM = billableTrenchMeters(siteForm.trenchLengthM);
  const trenchRate = (siteForm.trenchType ?? "earth") === "concrete" ? EUR_TRENCH_CONCRETE_PER_M : EUR_TRENCH_EARTH_PER_M;

  const pricingAutoSaveRef = useRef<string>("");

  useEffect(() => {
    if (!canEditSurvey) return;
    if (w !== "survey_terrain" && w !== "devis_pret" && w !== "survey_planifie") return;

    const snapshot = JSON.stringify({
      cableLengthM: siteForm.cableLengthM,
      trenchLengthM: siteForm.trenchLengthM,
      trenchType: siteForm.trenchType,
      baseInstallationHtva: siteForm.baseInstallationHtva,
    });
    if (snapshot === pricingAutoSaveRef.current) return;

    const timer = window.setTimeout(() => {
      pricingAutoSaveRef.current = snapshot;
      const { siteSurvey, totalHtva } = buildSiteSurveyPricing(siteForm, lead);
      const merged = mergeSpecs(lead, {
        siteSurvey,
        quote: { ...(lead.projectSpecs?.quote ?? {}), totalHtva },
      });
      skipHydrateFromServerRef.current = true;
      void patchLead(lead.id, { projectSpecs: merged, quoteAmountHtva: totalHtva });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [
    canEditSurvey,
    w,
    siteForm.cableLengthM,
    siteForm.trenchLengthM,
    siteForm.trenchType,
    siteForm.baseInstallationHtva,
    lead.id,
    lead.projectSpecs?.commercial?.quoteMode,
    lead.projectSpecs?.commercial?.chargerCount,
    lead.projectSpecs?.commercial?.mountType,
    patchLead,
  ]);

  if (!w) {
    return (
      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ marginTop: 0 }}>Parcours dossier</h2>
        <p style={{ margin: 0, color: "var(--color-muted)" }}>
          Ce dossier suit l’ancien flux (sans étapes commercial → admin → site survey). Les nouveaux dossiers
          créés par un commercial utilisent le parcours multi-étapes.
        </p>
      </div>
    );
  }

  const stepsOrder = Object.keys(workflowLabels) as WorkflowStage[];
  const idx = stepsOrder.indexOf(w);

  async function saveSiteSurvey(partial: Partial<SiteSurveyProjectSpecs>, nextWorkflow?: Lead["workflowStage"]) {
    const merged = mergeSpecs(lead, {
      siteSurvey: { ...siteForm, ...partial },
    });
    await patchLead(lead.id, {
      projectSpecs: merged,
      ...(nextWorkflow ? { workflowStage: nextWorkflow } : {}),
    });
    setToast("Enregistré.");
    setTimeout(() => setToast(""), 2200);
  }

  async function finalizeSurveyToQuote() {
    const { siteSurvey, totalHtva } = buildSiteSurveyPricing(siteForm, lead);
    const merged = mergeSpecs(lead, {
      siteSurvey: { ...siteSurvey, completedAt: new Date().toISOString() },
      quote: { ...(lead.projectSpecs?.quote ?? {}), totalHtva },
    });
    await patchLead(lead.id, {
      projectSpecs: merged,
      workflowStage: "devis_pret",
      quoteAmountHtva: totalHtva,
    });
    setToast("Relevé terminé — montant devis calculé.");
    setTimeout(() => setToast(""), 2800);
  }

  async function sendQuoteToClient() {
    setSendingMail(true);
    try {
      const { portalUrl } = await sendQuoteEmailToClient(lead.id);
      const onLocal =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
      if (onLocal && portalUrl) {
        setToast(
          `Devis envoyé à ${lead.email}. Lien de test (même ordinateur, app ouverte) : ${portalUrl}`
        );
        setTimeout(() => setToast(""), 12000);
      } else {
        setToast(`Devis envoyé par e-mail à ${lead.email}.`);
        setTimeout(() => setToast(""), 4000);
      }
    } catch (e) {
      setToast(formatApiErrorMessage(e, "Envoi impossible. Vérifiez la configuration SMTP dans .env."));
      setTimeout(() => setToast(""), 6000);
    } finally {
      setSendingMail(false);
    }
  }

  const signUrl =
    lead.projectSpecs?.quote?.clientPortalUrl ||
    (typeof window !== "undefined" && lead.projectSpecs?.quote?.accessToken
      ? `${window.location.origin}/devis-signer/${lead.projectSpecs.quote.accessToken}`
      : "");

  return (
    <div className="card" style={{ marginBottom: "1.25rem" }}>
      <h2 style={{ marginTop: 0 }}>Parcours dossier (multi-étapes)</h2>
      <p style={{ color: "var(--color-muted)", fontSize: "0.9rem", marginTop: 0 }}>
        Étape actuelle : <strong>{workflowLabels[w]}</strong>
      </p>
      <ol style={{ margin: "0 0 1rem 1rem", padding: 0, fontSize: "0.88rem", color: "var(--color-muted)" }}>
        {stepsOrder.map((key, i) => (
          <li
            key={key}
            style={{
              marginBottom: "0.25rem",
              fontWeight: i === idx ? 700 : 400,
              color: i <= idx ? "var(--text)" : "var(--color-muted)",
            }}
          >
            {workflowLabels[key]}
          </li>
        ))}
      </ol>

      <div
        style={{
          display: "grid",
          gap: "0.75rem",
          fontSize: "0.9rem",
          marginBottom: "1rem",
          padding: "0.75rem",
          background: "var(--color-surface-2, #f4f6f8)",
          borderRadius: 8,
        }}
      >
        <div>
          <strong>Commercial</strong>
          {lead.projectSpecs?.commercial?.submittedAt ? (
            <span style={{ color: "var(--color-muted)", marginLeft: "0.5rem" }}>
              (transmis le {new Date(lead.projectSpecs.commercial.submittedAt).toLocaleString("fr-BE")})
            </span>
          ) : null}
          <ul style={{ margin: "0.35rem 0 0 1rem" }}>
            <li>
              Devis :{" "}
              <strong>
                {quoteMode === "subscription" ? "avec abonnement (forfait)" : "sans abonnement (détail catalogue)"}
              </strong>
            </li>
            <li>
              Bornes : {lead.projectSpecs?.commercial?.chargerCount ?? "—"} — Alimentation :{" "}
              {lead.projectSpecs?.commercial?.supplyType === "mono"
                ? "monophasé"
                : lead.projectSpecs?.commercial?.supplyType === "tri"
                  ? "triphasé"
                  : "—"}{" "}
              — Pose :{" "}
              {lead.projectSpecs?.commercial?.mountType === "mural"
                ? "murale"
                : lead.projectSpecs?.commercial?.mountType === "pied"
                  ? "sur pied"
                  : "—"}
            </li>
          </ul>
        </div>
        <div>
          <strong>Admin — planification site survey</strong>
          <ul style={{ margin: "0.35rem 0 0 1rem" }}>
            <li>
              Site survey :
              {" "}
              {lead.projectSpecs?.admin?.surveyAssigneeUserId
                ? data.siteSurveyUsers.find(
                    (u) => u.id === lead.projectSpecs?.admin?.surveyAssigneeUserId
                  )?.displayName ?? `u${lead.projectSpecs.admin.surveyAssigneeUserId}`
                : "—"}
            </li>
            <li>
              Créneau :{" "}
              {lead.projectSpecs?.admin?.surveyScheduledStart
                ? `${new Date(lead.projectSpecs.admin.surveyScheduledStart).toLocaleString("fr-BE")} → ${lead.projectSpecs.admin.surveyScheduledEnd ? new Date(lead.projectSpecs.admin.surveyScheduledEnd).toLocaleString("fr-BE") : "—"}`
                : "—"}
            </li>
            {lead.projectSpecs?.admin?.surveyNotes ? <li>Notes : {lead.projectSpecs.admin.surveyNotes}</li> : null}
          </ul>
        </div>
      </div>

      {canEditSurvey && (w === "survey_planifie" || w === "survey_terrain" || w === "devis_pret") ? (
        <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1rem" }}>
          <h3 style={{ marginTop: 0, fontSize: "1.02rem" }}>Relevé terrain & chiffrage</h3>
          <div className="field" style={{ maxWidth: 520, marginBottom: "0.75rem" }}>
            <label>Type de devis (modifiable)</label>
            <select
              className="input"
              value={quoteMode}
              onChange={(e) => void setQuoteMode(e.target.value as QuotePricingMode)}
            >
              <option value="subscription">{QUOTE_MODE_LABELS.subscription}</option>
              <option value="detailed">{QUOTE_MODE_LABELS.detailed}</option>
            </select>
          </div>
          {w === "survey_planifie" ? (
            <p style={{ fontSize: "0.9rem", color: "var(--color-muted)" }}>
              Démarrez le relevé pour passer l’étape en « en cours ».
            </p>
          ) : null}
          <div style={{ display: "grid", gap: "0.65rem", maxWidth: 520 }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                checked={!!siteForm.siteCheckOk}
                onChange={(e) => {
                  const siteCheckOk = e.target.checked;
                  setSiteForm((s) => ({ ...s, siteCheckOk }));
                  void saveSiteSurvey({ siteCheckOk });
                }}
              />
              Check de site OK (accès, faisabilité)
            </label>
            <div className="field">
              <label>Ampérage tête / disjoncteur (A)</label>
              <input
                className="input"
                type="number"
                min={0}
                step={1}
                value={siteForm.headAmperageA ?? ""}
                onChange={(e) =>
                  setSiteForm((s) => ({ ...s, headAmperageA: e.target.value === "" ? undefined : Number(e.target.value) }))
                }
                onBlur={() => void saveSiteSurvey({ headAmperageA: siteForm.headAmperageA })}
              />
            </div>
            <div className="field">
              <label>Chemin de câble / description</label>
              <textarea
                className="input"
                value={siteForm.cableRouteDescription ?? ""}
                onChange={(e) => setSiteForm((s) => ({ ...s, cableRouteDescription: e.target.value }))}
                onBlur={() => void saveSiteSurvey({ cableRouteDescription: siteForm.cableRouteDescription })}
              />
            </div>
            <p style={{ fontSize: "0.88rem", color: "var(--color-muted)", margin: 0 }}>
              <strong>Forfait de base :</strong> {INCLUDED_CABLE_M} m de câble et {INCLUDED_TRENCH_M} m de tranchée inclus.
              Vous saisissez uniquement les longueurs réelles du chantier.
            </p>
            <div className="field">
              <label>Longueur totale de câble sur le chantier (m)</label>
              <input
                className="input"
                type="number"
                min={0}
                step={0.1}
                placeholder="Ex. 14,5"
                value={siteForm.cableLengthM ?? ""}
                onChange={(e) =>
                  setSiteForm((s) => ({
                    ...s,
                    cableLengthM: e.target.value === "" ? undefined : Number(e.target.value),
                  }))
                }
              />
              {Number.isFinite(Number(siteForm.cableLengthM)) ? (
                <p style={{ margin: "0.35rem 0 0", fontSize: "0.82rem", color: "var(--color-muted)" }}>
                  {cableBillM > 0 ? (
                    <>
                      Supplément câble : <strong>{cableBillM.toFixed(1)} m</strong> × {EUR_CABLE_SUPP_PER_M} €/m ={" "}
                      <strong>{(cableBillM * EUR_CABLE_SUPP_PER_M).toFixed(2)} €</strong> HTVA
                    </>
                  ) : (
                    <>Aucun supplément câble ({INCLUDED_CABLE_M} m inclus dans le forfait).</>
                  )}
                </p>
              ) : null}
            </div>
            <div className="u-grid-2" style={{ gap: "0.65rem" }}>
              <div className="field">
                <label>Longueur de tranchée (m)</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step={0.1}
                  placeholder="Ex. 3,5"
                  value={siteForm.trenchLengthM ?? ""}
                  onChange={(e) =>
                    setSiteForm((s) => ({
                      ...s,
                      trenchLengthM: e.target.value === "" ? undefined : Number(e.target.value),
                    }))
                  }
                />
                {Number.isFinite(Number(siteForm.trenchLengthM)) ? (
                  <p style={{ margin: "0.35rem 0 0", fontSize: "0.82rem", color: "var(--color-muted)" }}>
                    {trenchBillM > 0 ? (
                      <>
                        Supplément tranchée : <strong>{trenchBillM.toFixed(1)} m</strong> × {trenchRate} €/m ={" "}
                        <strong>{(trenchBillM * trenchRate).toFixed(2)} €</strong> HTVA
                      </>
                    ) : (
                      <>Aucun supplément tranchée ({INCLUDED_TRENCH_M} m inclus dans le forfait).</>
                    )}
                  </p>
                ) : null}
              </div>
              <div className="field">
                <label>Type de tranchée</label>
                <select
                  className="input"
                  value={siteForm.trenchType ?? "earth"}
                  onChange={(e) => {
                    const trenchType = e.target.value === "concrete" ? "concrete" : "earth";
                    setSiteForm((s) => ({ ...s, trenchType }));
                  }}
                >
                  <option value="earth">Terre plein (40 €/m)</option>
                  <option value="concrete">Béton, réfection comprise (68 €/m)</option>
                </select>
              </div>
            </div>
            <div className="card" style={{ padding: "0.85rem 1rem", background: "#f0f7f4", border: "1px solid rgba(0,104,55,0.15)" }}>
              <strong style={{ fontSize: "0.95rem" }}>Détail du devis (calcul automatique)</strong>
              <table style={{ width: "100%", marginTop: "0.65rem", fontSize: "0.88rem", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "0.35rem 0", color: "var(--color-muted)" }}>
                      {quoteMode === "subscription" ? "Forfait abonnement HTVA" : "Installation / pose HTVA"}
                    </td>
                    <td style={{ padding: "0.35rem 0", textAlign: "right", fontWeight: 600 }}>
                      {livePricing.baseInstallationHtva.toFixed(2)} €
                    </td>
                  </tr>
                  {livePricing.installationSupplements.length === 0 ? (
                    <tr>
                      <td colSpan={2} style={{ padding: "0.35rem 0", color: "var(--color-muted)", fontStyle: "italic" }}>
                        Aucun supplément installation (longueurs dans le forfait)
                      </td>
                    </tr>
                  ) : (
                    livePricing.installationSupplements.map((line) => (
                      <tr key={line.id}>
                        <td style={{ padding: "0.35rem 0.5rem 0.35rem 0", color: "var(--color-muted)" }}>{line.label}</td>
                        <td style={{ padding: "0.35rem 0", textAlign: "right", fontWeight: 600 }}>
                          {Number(line.amountHtva).toFixed(2)} €
                        </td>
                      </tr>
                    ))
                  )}
                  {livePricing.materialLines.length > 0 ? (
                    <>
                      <tr>
                        <td
                          colSpan={2}
                          style={{
                            padding: "0.5rem 0 0.2rem",
                            fontWeight: 700,
                            fontSize: "0.82rem",
                            color: "var(--color-navy)",
                          }}
                        >
                          Matériel & produits
                          {livePricing.materialsIncludedInForfait ? " (inclus dans le forfait)" : null}
                        </td>
                      </tr>
                      {livePricing.materialLines.map((line) => (
                        <tr key={line.id}>
                          <td style={{ padding: "0.35rem 0.5rem 0.35rem 0", color: "var(--color-muted)" }}>{line.label}</td>
                          <td style={{ padding: "0.35rem 0", textAlign: "right", fontWeight: 600 }}>
                            {livePricing.materialsIncludedInForfait ? (
                              <span style={{ color: "var(--color-muted)", fontWeight: 500 }}>inclus</span>
                            ) : (
                              <>{Number(line.amountHtva).toFixed(2)} €</>
                            )}
                          </td>
                        </tr>
                      ))}
                    </>
                  ) : null}
                  <tr>
                    <td style={{ padding: "0.65rem 0 0.25rem", fontWeight: 700 }}>Total HTVA</td>
                    <td style={{ padding: "0.65rem 0 0.25rem", textAlign: "right", fontWeight: 800, fontSize: "1.05rem" }}>
                      {livePricing.totalHtva.toFixed(2)} €
                    </td>
                  </tr>
                </tbody>
              </table>
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "var(--color-muted)" }}>
                {quoteMode === "subscription" ? (
                  <>
                    Total = forfait ({BASE_MURAL_HTVA} € murale / {BASE_PIED_HTVA} € sur pied × nombre de bornes) +
                    suppléments câble/tranchée. Le matériel catalogue est inclus (non additionné).
                  </>
                ) : (
                  <>
                    Total = lignes catalogue matériel + suppléments câble/tranchée + éventuelle base installation
                    (saisie ci-dessous).
                  </>
                )}
              </p>
            </div>
            <div className="field">
              <label>
                {quoteMode === "subscription"
                  ? `Installation forfait abonnement HTVA (${subscriptionBaseLabel(lead)} — modifiable)`
                  : "Frais d’installation / pose HTVA (optionnel, 0 € par défaut)"}
              </label>
              <input
                className="input"
                type="number"
                min={0}
                step={1}
                placeholder={String(suggestedBase)}
                value={siteForm.baseInstallationHtva ?? ""}
                onChange={(e) =>
                  setSiteForm((s) => ({
                    ...s,
                    baseInstallationHtva: e.target.value === "" ? undefined : Number(e.target.value),
                  }))
                }
              />
            </div>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-muted)" }}>
              Base retenue : <strong>{siteForm.baseInstallationHtva ?? suggestedBase}&nbsp;€ HTVA</strong>
              {siteForm.baseInstallationHtva == null && quoteMode === "subscription" ? (
                <> — calcul : {defaultSubscriptionBase(lead).toLocaleString("fr-BE")} €</>
              ) : null}
            </p>
            <p style={{ margin: 0, fontSize: "0.95rem" }}>
              <strong>Total estimé HTVA :</strong> {livePricing.totalHtva.toFixed(2)}&nbsp;€
            </p>
            {w === "survey_planifie" ? (
              <button type="button" className="btn btn-primary" onClick={() => void saveSiteSurvey({}, "survey_terrain")}>
                Démarrer le relevé terrain
              </button>
            ) : null}
            {w === "survey_terrain" ? (
              <button type="button" className="btn btn-primary" onClick={() => void finalizeSurveyToQuote()}>
                Terminer le relevé et préparer le devis
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {canEditSurvey && w === "devis_pret" ? (
        <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border)" }}>
          <h3 style={{ marginTop: 0, fontSize: "1.02rem" }}>Envoi du devis au client</h3>
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>
            <strong>Montant du devis :</strong> {(lead.quoteAmountHtva ?? livePricing.totalHtva).toFixed(2)}&nbsp;€ HTVA
          </p>
          <p style={{ fontSize: "0.9rem", color: "var(--color-muted)" }}>
            Un e-mail professionnel part de <strong>hello@itelec-charge.be</strong> : récapitulatif détaillé, charte
            Itelec Charge, <strong>PDF du devis en pièce jointe</strong> et lien d&apos;acceptation électronique (TVA
            comprise, preuve conservée).
          </p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={sendingMail}
            onClick={() => void sendQuoteToClient()}
          >
            {sendingMail ? "Envoi en cours…" : "Envoyer le devis par e-mail"}
          </button>
        </div>
      ) : null}

      {w === "devis_envoye_sign" && signUrl ? (
        <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#fff8e6", borderRadius: 8, fontSize: "0.9rem" }}>
          <strong>Lien inclus dans l’e-mail (copie de secours) :</strong>
          <div style={{ wordBreak: "break-all", marginTop: "0.35rem" }}><a href={signUrl} target="_blank" rel="noreferrer">{signUrl}</a></div>
        </div>
      ) : null}

      {w === "devis_signe" || lead.projectSpecs?.quote?.signedAt ? (
        <div style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
          <strong>Signature client</strong> : {lead.projectSpecs?.quote?.clientSignedName ?? "—"} le{" "}
          {lead.projectSpecs?.quote?.signedAt
            ? new Date(lead.projectSpecs.quote.signedAt).toLocaleString("fr-BE")
            : "—"}
          . Le dossier peut passer au dispatch pour planifier l’installation.
        </div>
      ) : null}
    </div>
  );
}
