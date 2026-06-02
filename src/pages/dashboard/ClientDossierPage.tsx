import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { LeadBillingSection } from "../../components/LeadBillingSection";
import { WorkflowDossierSection } from "../../components/WorkflowDossierSection";
import { statusLabels } from "../../data/store";
import { installerDisplayName } from "../../lib/installers";
import { apiFetch } from "../../lib/api";
import { syncInstallerStockFromDossier } from "../../lib/installerStockSync";
import {
  computeQuoteTotalForLead,
  getQuoteMode,
  materialLineTotalHt,
  QUOTE_MODE_LABELS,
} from "../../lib/quotePricing";
import type { InstallerStockItem, Lead, SurveyMaterialItem, SurveyPhoto } from "../../types";

const PHASE_OPTIONS = [
  "Avant travaux",
  "Tableau / TD",
  "Zone pose borne",
  "Accès & parking",
  "Autre",
];

const MATERIAL_UNITS = ["u", "m", "m2", "ml", "kg", "lot"];

async function fileToCompressedDataUrl(file: File, maxW = 1280): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choisissez une image.");
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxW) {
        h = (h * maxW) / w;
        w = maxW;
      }
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas indisponible"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Lecture image impossible"));
    };
    img.src = url;
  });
}

function normalizeMaterials(input: unknown): SurveyMaterialItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw, i) => {
      if (typeof raw === "string") {
        const label = raw.trim();
        if (!label) return null;
        return {
          id: `legacy-${i}`,
          label,
          quantity: 1,
          unit: "u",
        };
      }
      if (!raw || typeof raw !== "object") return null;
      const row = raw as Partial<SurveyMaterialItem>;
      const label = String(row.label ?? "").trim();
      if (!label) return null;
      const qty = Number(row.quantity);
      return {
        id: row.id && String(row.id).trim() ? String(row.id) : `row-${i}`,
        label,
        quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
        unit: row.unit && String(row.unit).trim() ? String(row.unit) : "u",
        catalogItemId: row.catalogItemId ? String(row.catalogItemId) : undefined,
        supplier: row.supplier ? String(row.supplier) : undefined,
        articleNumber: row.articleNumber ? String(row.articleNumber) : undefined,
        unitPriceHt:
          row.unitPriceHt != null && Number.isFinite(Number(row.unitPriceHt))
            ? Number(row.unitPriceHt)
            : undefined,
      };
    })
    .filter((v): v is SurveyMaterialItem => v !== null);
}

function cleanMaterials(input: SurveyMaterialItem[]): SurveyMaterialItem[] {
  return input
    .map((m) => ({
      ...m,
      label: m.label.trim(),
      quantity: Number(m.quantity),
      unit: m.unit.trim() || "u",
      supplier: m.supplier?.trim() || undefined,
      articleNumber: m.articleNumber?.trim() || undefined,
      unitPriceHt:
        m.unitPriceHt != null && Number.isFinite(Number(m.unitPriceHt)) ? Number(m.unitPriceHt) : undefined,
    }))
    .filter((m) => m.label && Number.isFinite(m.quantity) && m.quantity > 0);
}

function serializeMaterials(input: SurveyMaterialItem[]): string {
  return JSON.stringify(input);
}

const DOSSIER_POLL_MS = 12_000;

export function ClientDossierPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const { user } = useAuth();
  const { data, patchLead, refresh } = useData();
  const [toast, setToast] = useState("");
  const [phase, setPhase] = useState(PHASE_OPTIONS[0]);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [materials, setMaterials] = useState<SurveyMaterialItem[]>([]);
  const [materialsSaving, setMaterialsSaving] = useState(false);
  const [selectedCatalogId, setSelectedCatalogId] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogQuantity, setCatalogQuantity] = useState("1");
  const [newMaterial, setNewMaterial] = useState({ label: "", quantity: "1", unit: "u", unitPriceHt: "" });
  const [vanStock, setVanStock] = useState<InstallerStockItem[]>([]);
  const [stockPickQty, setStockPickQty] = useState<Record<string, string>>({});
  const isHydratingMaterialsRef = useRef(true);
  const lastSavedMaterialsRef = useRef("[]");

  const lead = useMemo(
    () => (leadId ? data.leads.find((l) => l.id === leadId) : undefined),
    [data.leads, leadId]
  );

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void refresh({ silent: true });
    };
    const interval = window.setInterval(tick, DOSSIER_POLL_MS);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  const canEditDossier = user?.role === "site_survey" || user?.role === "admin";
  const isTechnician = user?.role === "installateur";
  const canEditMaterials = canEditDossier || isTechnician;
  /** Libellé, réf., unité : réservés au site survey / admin (technicien = stock uniquement). */
  const canEditMaterialMeta = canEditDossier;
  const dossierBackTo =
    user?.role === "site_survey" ? "/app/planning-site-survey" : "/app/clients";
  const dossierBackLabel = user?.role === "site_survey" ? "← Planning site survey" : "← Clients";
  /** Pas de données financières pour le technicien terrain. */
  const showFinance = user?.role !== "installateur";
  const showBilling = user?.role === "admin" || user?.role === "dispatch";
  const canManageBilling = user?.role === "admin";
  const catalogItems = useMemo(
    () =>
      [...data.materialCatalog].sort((a, b) =>
        a.articleNumber.localeCompare(b.articleNumber, "fr", { sensitivity: "base" })
      ),
    [data.materialCatalog]
  );
  const selectedCatalog = useMemo(
    () => catalogItems.find((i) => i.id === selectedCatalogId),
    [catalogItems, selectedCatalogId]
  );
  const catalogSuggestions = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase();
    if (!q) return [];
    return catalogItems
      .filter((item) =>
        [item.articleNumber, item.label, item.supplier].join(" ").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [catalogItems, catalogQuery]);

  useEffect(() => {
    if (!isTechnician || !user?.installerId) {
      setVanStock([]);
      return;
    }
    const q = new URLSearchParams({ installerId: user.installerId });
    void apiFetch<{ items: InstallerStockItem[] }>(`/api/installer-stock?${q}`)
      .then((res) =>
        setVanStock(
          [...res.items].sort((a, b) => a.label.localeCompare(b.label, "fr", { sensitivity: "base" }))
        )
      )
      .catch(() => setVanStock([]));
  }, [isTechnician, user?.installerId]);

  useEffect(() => {
    const normalized = normalizeMaterials(lead?.surveyMaterials);
    setMaterials(normalized);
    lastSavedMaterialsRef.current = serializeMaterials(cleanMaterials(normalized));
    isHydratingMaterialsRef.current = true;
  }, [leadId, lead?.surveyMaterials]);

  useEffect(() => {
    if (!canEditMaterials || !lead) return;
    const cleaned = cleanMaterials(materials);
    const serialized = serializeMaterials(cleaned);

    if (isHydratingMaterialsRef.current) {
      isHydratingMaterialsRef.current = false;
      return;
    }
    if (serialized === lastSavedMaterialsRef.current) return;

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        setMaterialsSaving(true);
        try {
          const previousParsed = normalizeMaterials(JSON.parse(lastSavedMaterialsRef.current) as unknown);
          const leadPatch: Partial<Lead> = { surveyMaterials: cleaned };
          if (!isTechnician) {
            const leadWithMaterials = { ...lead, surveyMaterials: cleaned };
            const totalHtva = computeQuoteTotalForLead(leadWithMaterials);
            leadPatch.quoteAmountHtva = totalHtva;
            leadPatch.projectSpecs = {
              ...(lead.projectSpecs ?? {}),
              quote: { ...(lead.projectSpecs?.quote ?? {}), totalHtva },
            };
          }
          await patchLead(lead.id, leadPatch);

          if (isTechnician) {
            const stockResult = await syncInstallerStockFromDossier(lead.id, previousParsed, cleaned);
            if (stockResult.applied.length > 0) {
              setToast("Matériel enregistré — stock camionnette mis à jour.");
            } else {
              setToast("Matériel enregistré.");
            }
            setTimeout(() => setToast(""), 4200);
            void apiFetch<{ items: InstallerStockItem[] }>(
              `/api/installer-stock?${new URLSearchParams({ installerId: user!.installerId! })}`
            )
              .then((res) => setVanStock(res.items))
              .catch(() => undefined);
          }

          lastSavedMaterialsRef.current = serialized;
        } catch {
          setToast("Enregistrement automatique impossible.");
          setTimeout(() => setToast(""), 2600);
        } finally {
          setMaterialsSaving(false);
        }
      })();
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [materials, canEditMaterials, isTechnician, lead, patchLead, user?.installerId]);

  if (!leadId) return <Navigate to={dossierBackTo} replace />;
  if (!lead) return <Navigate to={dossierBackTo} replace />;

  const L = lead;

  if (
    user?.role === "installateur" &&
    (!user.installerId || L.installerId !== user.installerId || !L.slotStart)
  ) {
    return (
      <div className="card" role="alert">
        <h2 style={{ marginTop: 0 }}>Accès refusé</h2>
        <p style={{ marginBottom: "0.75rem" }}>
          Ce dossier n’est pas (ou plus) planifié sur votre planning technicien.
        </p>
        <Link className="btn btn-ghost" to="/app/clients" style={{ textDecoration: "none" }}>
          ← Retour
        </Link>
      </div>
    );
  }

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !canEditDossier) return;
    setBusy(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      if (dataUrl.length > 2_400_000) {
        setToast("Image trop lourde après compression. Essayez une photo plus petite.");
        setTimeout(() => setToast(""), 4000);
        setBusy(false);
        return;
      }
      const photo: SurveyPhoto = {
        id: `ph-${crypto.randomUUID().slice(0, 12)}`,
        phase: phase || "Autre",
        caption: caption.trim() || "—",
        dataUrl,
        createdAt: new Date().toISOString(),
      };
      patchLead(L.id, { surveyPhotos: [...(L.surveyPhotos ?? []), photo] });
      setCaption("");
      setToast("Photo ajoutée au dossier.");
      setTimeout(() => setToast(""), 2500);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Erreur import photo");
      setTimeout(() => setToast(""), 3500);
    }
    setBusy(false);
  }

  function removePhoto(id: string) {
    if (!canEditDossier) return;
    patchLead(L.id, {
      surveyPhotos: (L.surveyPhotos ?? []).filter((p) => p.id !== id),
    });
  }

  function addMaterial() {
    if (!canEditMaterials) return;
    const label = newMaterial.label.trim();
    const quantity = Number(newMaterial.quantity);
    if (!label || !Number.isFinite(quantity) || quantity <= 0) {
      setToast("Renseignez un matériel et une quantité valide.");
      setTimeout(() => setToast(""), 2500);
      return;
    }
    const unitPriceHt = Number(newMaterial.unitPriceHt);
    setMaterials((prev) => [
      ...prev,
      {
        id: `mat-${crypto.randomUUID().slice(0, 12)}`,
        label,
        quantity,
        unit: newMaterial.unit || "u",
        supplier: "manuel",
        unitPriceHt: Number.isFinite(unitPriceHt) && unitPriceHt > 0 ? unitPriceHt : undefined,
      },
    ]);
    setNewMaterial({ label: "", quantity: "1", unit: newMaterial.unit || "u", unitPriceHt: "" });
  }

  function addMaterialFromCatalog() {
    if (!canEditMaterials) return;
    const q = catalogQuery.trim().toLowerCase();
    const quickMatch = catalogItems.find(
      (item) => item.articleNumber.toLowerCase() === q || item.label.toLowerCase() === q
    );
    const picked = selectedCatalog ?? quickMatch;
    if (!picked) {
      setToast("Choisissez un article du catalogue.");
      setTimeout(() => setToast(""), 2400);
      return;
    }
    const quantity = Number(catalogQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setToast("Quantité invalide.");
      setTimeout(() => setToast(""), 2400);
      return;
    }
    setMaterials((prev) => [
      ...prev,
      {
        id: `mat-${crypto.randomUUID().slice(0, 12)}`,
        label: picked.label,
        quantity,
        unit: picked.unit,
        catalogItemId: picked.id,
        supplier: picked.supplier,
        articleNumber: picked.articleNumber,
        unitPriceHt: picked.unitPriceHt,
      },
    ]);
    setCatalogQuery("");
    setSelectedCatalogId("");
    setCatalogQuantity("1");
  }

  function removeMaterial(id: string) {
    if (!canEditMaterials) return;
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  }

  function updateMaterial(id: string, patch: Partial<SurveyMaterialItem>) {
    if (!canEditMaterials) return;
    if (isTechnician && patch.quantity !== undefined) {
      const line = materials.find((m) => m.id === id);
      if (line) {
        const qty = Number(patch.quantity);
        const max = maxQtyForMaterialLine(line);
        if (!Number.isFinite(qty) || qty <= 0) {
          setToast("Quantité invalide.");
          setTimeout(() => setToast(""), 2400);
          return;
        }
        if (qty > max) {
          const stock = vanStockForMaterial(line);
          setToast(
            stock
              ? `Stock insuffisant : maximum ${max} ${line.unit} (dont ${stock.quantity} encore en camionnette).`
              : "Cet article n’est plus dans votre stock."
          );
          setTimeout(() => setToast(""), 3800);
          return;
        }
      }
    }
    if (isTechnician && (patch.label !== undefined || patch.articleNumber !== undefined || patch.unit !== undefined)) {
      return;
    }
    setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function vanStockForMaterial(m: SurveyMaterialItem): InstallerStockItem | undefined {
    return vanStock.find(
      (item) =>
        (m.catalogItemId && item.catalogItemId === m.catalogItemId) ||
        (!m.catalogItemId &&
          item.label.toLowerCase() === m.label.toLowerCase() &&
          (item.articleNumber ?? "").toLowerCase() === (m.articleNumber ?? "").toLowerCase())
    );
  }

  function maxQtyForMaterialLine(m: SurveyMaterialItem): number {
    const stock = vanStockForMaterial(m);
    if (!stock) return m.quantity;
    return m.quantity + stock.quantity;
  }

  function addMaterialFromVanStock(item: InstallerStockItem) {
    if (!canEditMaterials) return;
    const quantity = Number(stockPickQty[item.id] ?? "1");
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setToast("Quantité invalide.");
      setTimeout(() => setToast(""), 2400);
      return;
    }
    if (quantity > item.quantity) {
      setToast(
        `Stock insuffisant : ${item.quantity} ${item.unit} disponible${item.quantity > 1 ? "s" : ""} dans la camionnette.`
      );
      setTimeout(() => setToast(""), 3600);
      return;
    }
    setMaterials((prev) => {
      const idx = prev.findIndex(
        (m) =>
          (item.catalogItemId && m.catalogItemId === item.catalogItemId) ||
          (!item.catalogItemId &&
            m.label.toLowerCase() === item.label.toLowerCase() &&
            (m.articleNumber ?? "").toLowerCase() === item.articleNumber.toLowerCase())
      );
      const already = idx >= 0 ? prev[idx].quantity : 0;
      if (already + quantity > item.quantity) {
        setToast(
          `Stock insuffisant : il reste ${Math.max(0, item.quantity - already)} ${item.unit} disponible${item.quantity - already > 1 ? "s" : ""}.`
        );
        setTimeout(() => setToast(""), 3600);
        return prev;
      }
      if (idx >= 0) {
        return prev.map((m, i) =>
          i === idx ? { ...m, quantity: m.quantity + quantity } : m
        );
      }
      return [
        ...prev,
        {
          id: `mat-${crypto.randomUUID().slice(0, 12)}`,
          label: item.label,
          quantity,
          unit: item.unit,
          catalogItemId: item.catalogItemId ?? undefined,
          supplier: "stock",
          articleNumber: item.articleNumber,
        },
      ];
    });
    setStockPickQty((p) => ({ ...p, [item.id]: "1" }));
  }

  const quoteMode = lead ? getQuoteMode(lead) : "subscription";
  const totalMaterialHt = materials.reduce((sum, item) => sum + materialLineTotalHt(item), 0);
  const quoteTotalHt = lead ? computeQuoteTotalForLead({ ...lead, surveyMaterials: materials }) : 0;

  const photos = L.surveyPhotos ?? [];

  return (
    <div>
      {toast ? <div className="toast">{toast}</div> : null}

      <p style={{ marginTop: 0 }}>
        <Link to={dossierBackTo}>{dossierBackLabel}</Link>
      </p>

      <h1 style={{ marginTop: "0.25rem" }}>Dossier — {L.companyName}</h1>
      <p style={{ color: "var(--color-muted)" }}>
        Dossier unique partagé entre site survey, dispatch, admin et technicien : photos terrain et liste
        matériel pour préparer l’installation.
      </p>

      <WorkflowDossierSection lead={L} patchLead={patchLead} setToast={setToast} />

      {showBilling ? (
        <div style={{ marginBottom: "1.25rem" }}>
          <LeadBillingSection lead={L} canManage={canManageBilling} setToast={setToast} />
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ marginTop: 0 }}>Fiche client</h2>
        <dl className="u-dl-grid" style={{ margin: 0, fontSize: "0.95rem", gap: "0.35rem 1.25rem" }}>
          <dt style={{ color: "var(--color-muted)" }}>Statut</dt>
          <dd style={{ margin: 0 }}>{statusLabels[L.status]}</dd>
          <dt style={{ color: "var(--color-muted)" }}>Adresse chantier</dt>
          <dd style={{ margin: 0 }}>{L.address}</dd>
          <dt style={{ color: "var(--color-muted)" }}>Contact</dt>
          <dd style={{ margin: 0 }}>
            {L.contactName} — {L.phone} — {L.email}
          </dd>
          <dt style={{ color: "var(--color-muted)" }}>Commercial</dt>
          <dd style={{ margin: 0 }}>{L.commercialDisplayName ?? L.commercialId}</dd>
          <dt style={{ color: "var(--color-muted)" }}>Technicien</dt>
          <dd style={{ margin: 0 }}>{installerDisplayName(L.installerId, data.installers)}</dd>
          {showFinance && L.quoteAmountHtva != null ? (
            <>
              <dt style={{ color: "var(--color-muted)" }}>Montant devis HTVA</dt>
              <dd style={{ margin: 0 }}>{L.quoteAmountHtva}&nbsp;€</dd>
            </>
          ) : null}
        </dl>
      </div>

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ marginTop: 0 }}>Rapport d’intervention / preuve de clôture</h2>
        {L.report ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1rem",
              alignItems: "start",
            }}
          >
            <div>
              <dl className="u-dl-grid" style={{ margin: 0, gap: "0.35rem 0.9rem" }}>
                <dt style={{ color: "var(--color-muted)" }}>Statut</dt>
                <dd style={{ margin: 0 }}>{statusLabels[L.status]}</dd>
                <dt style={{ color: "var(--color-muted)" }}>Date clôture</dt>
                <dd style={{ margin: 0 }}>
                  {L.report.signedAt ? new Date(L.report.signedAt).toLocaleString("fr-BE") : "—"}
                </dd>
                <dt style={{ color: "var(--color-muted)" }}>Technicien</dt>
                <dd style={{ margin: 0 }}>{installerDisplayName(L.installerId, data.installers)}</dd>
              </dl>
              <div style={{ marginTop: "0.85rem" }}>
                <h3 style={{ margin: "0 0 0.4rem", fontSize: "0.98rem" }}>Commentaire d’intervention</h3>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text)",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.45,
                  }}
                >
                  {L.report.comment?.trim() ? L.report.comment : "Aucun commentaire saisi."}
                </p>
              </div>
            </div>

            <div>
              <h3 style={{ margin: "0 0 0.4rem", fontSize: "0.98rem" }}>Signature client</h3>
              {L.report.signaturePng ? (
                <img
                  src={L.report.signaturePng}
                  alt="Signature client"
                  style={{
                    width: "100%",
                    maxWidth: 440,
                    height: 160,
                    objectFit: "contain",
                    border: "1px dashed var(--color-border)",
                    borderRadius: 8,
                    background: "#fafbfc",
                  }}
                />
              ) : (
                <p style={{ margin: 0, color: "var(--color-muted)" }}>Aucune signature enregistrée.</p>
              )}
              {L.report.photoDataUrl ? (
                <div style={{ marginTop: "0.9rem" }}>
                  <h3 style={{ margin: "0 0 0.4rem", fontSize: "0.98rem" }}>Photo de fin d’intervention</h3>
                  <img
                    src={L.report.photoDataUrl}
                    alt="Photo de fin d’intervention"
                    style={{
                      width: "100%",
                      maxWidth: 440,
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      display: "block",
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, color: "var(--color-muted)" }}>
            Aucun rapport d’intervention pour l’instant. Le dossier sera complet après clôture par le technicien.
          </p>
        )}
      </div>

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ marginTop: 0 }}>Photos terrain</h2>
        <p style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>
          {canEditDossier
            ? "Ajoutez des clichés avant / pendant la visite. Ils sont visibles par admin, dispatch et technicien."
            : "Photos renseignées par le site survey ou l’admin (lecture seule pour votre rôle)."}
        </p>

        {canEditDossier ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              marginBottom: "1rem",
              alignItems: "end",
            }}
          >
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="dossier-phase">Phase / lieu</label>
              <select
                id="dossier-phase"
                className="input"
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
              >
                {PHASE_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="dossier-cap">Légende courte</label>
              <input
                id="dossier-cap"
                className="input"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="ex. : goulotte existante"
              />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="dossier-file">Ajouter une photo</label>
              <input
                id="dossier-file"
                type="file"
                accept="image/*"
                className="input"
                disabled={busy}
                onChange={onPickPhoto}
              />
            </div>
          </div>
        ) : null}

        {photos.length === 0 ? (
          <p style={{ color: "var(--color-muted)", marginBottom: 0 }}>Aucune photo pour ce dossier.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "1rem",
            }}
          >
            {photos.map((p) => (
              <figure
                key={p.id}
                className="card"
                style={{ margin: 0, padding: "0.65rem", border: "1px solid var(--color-border)" }}
              >
                <img
                  src={p.dataUrl}
                  alt={p.caption}
                  style={{
                    width: "100%",
                    height: 160,
                    objectFit: "cover",
                    borderRadius: 8,
                    display: "block",
                  }}
                />
                <figcaption style={{ fontSize: "0.8rem", marginTop: "0.5rem", color: "var(--color-muted)" }}>
                  <strong style={{ color: "var(--color-navy)" }}>{p.phase}</strong> — {p.caption}
                  <div>{new Date(p.createdAt).toLocaleString("fr-BE")}</div>
                </figcaption>
                {canEditDossier ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ marginTop: "0.5rem", width: "100%" }}
                    onClick={() => removePhoto(p.id)}
                  >
                    Retirer la photo
                  </button>
                ) : null}
              </figure>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>
          {isTechnician ? "Matériel utilisé sur ce chantier" : "Matériel prévu pour ce client"}
        </h2>
        {isTechnician ? (
          <p style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>
            Seuls les articles déjà présents dans votre{" "}
            <Link to="/app/stock">stock camionnette</Link> peuvent être posés chez le client. Chaque quantité
            enregistrée est <strong>déduite automatiquement</strong> de votre inventaire.
          </p>
        ) : (
          <p style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>
            <strong>{QUOTE_MODE_LABELS[quoteMode]}</strong>
            {quoteMode === "detailed" ? (
              <> — chaque ligne catalogue avec PU HT est additionnée au devis (+ suppléments câble/tranchée).</>
            ) : (
              <>
                {" "}
                — le matériel est <strong>inclus dans le forfait</strong> (1 600 / 2 000 € × bornes). Utilisez cette liste
                pour le suivi chantier ; seuls câble et tranchée s&apos;ajoutent au total.
              </>
            )}
          </p>
        )}
        {(user?.role === "admin" || user?.role === "dispatch") ? (
          <p style={{ marginTop: "-0.3rem", marginBottom: "0.85rem" }}>
            <Link to="/app/catalogue-materiaux">Gérer le catalogue matériaux →</Link>
          </p>
        ) : null}

        {isTechnician && canEditMaterials ? (
          <div className="card" style={{ border: "1px solid var(--color-border)", marginBottom: "1rem" }}>
            <h3 style={{ marginTop: 0, marginBottom: "0.65rem", fontSize: "1rem" }}>Depuis mon stock camionnette</h3>
            {vanStock.length === 0 ? (
              <p style={{ margin: 0, color: "var(--color-muted)", fontSize: "0.88rem" }}>
                Aucun article dans votre stock.{" "}
                <Link to="/app/stock">Renseignez votre inventaire</Link> pour une déduction automatique.
              </p>
            ) : (
              <div
                className="table-wrap table-wrap--scroll-md"
                style={{ border: "1px solid var(--color-border)", borderRadius: 8 }}
              >
                <table>
                  <thead>
                    <tr>
                      <th>Article</th>
                      <th>Réf.</th>
                      <th>En stock</th>
                      <th>Utiliser</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {vanStock.map((item) => (
                      <tr key={item.id}>
                        <td>{item.label}</td>
                        <td style={{ color: "var(--color-muted)", fontSize: "0.85rem" }}>
                          {item.articleNumber || "—"}
                        </td>
                        <td>
                          {item.unit === "u" || item.unit === "lot"
                            ? Math.round(item.quantity)
                            : item.quantity}{" "}
                          {item.unit}
                        </td>
                        <td style={{ width: 90 }}>
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            className="input"
                            value={stockPickQty[item.id] ?? "1"}
                            onChange={(e) =>
                              setStockPickQty((p) => ({ ...p, [item.id]: e.target.value }))
                            }
                          />
                        </td>
                        <td style={{ width: 120 }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => addMaterialFromVanStock(item)}
                          >
                            Ajouter
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {canEditMaterials && !isTechnician ? (
          <div className="card" style={{ border: "1px solid var(--color-border)", marginBottom: "1rem" }}>
            <h3 style={{ marginTop: 0, marginBottom: "0.65rem", fontSize: "1rem" }}>Ajouter depuis le catalogue</h3>
            <div className="u-grid-form-row u-grid-form-row--catalog" style={{ marginBottom: "0.8rem" }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Article catalogue</label>
                <input
                  className="input"
                  value={catalogQuery}
                  onChange={(e) => {
                    setCatalogQuery(e.target.value);
                    if (selectedCatalogId) setSelectedCatalogId("");
                  }}
                  placeholder="Tapez une référence ou un nom de matériel..."
                />
                {catalogQuery.trim() ? (
                  <div
                    style={{
                      marginTop: "0.35rem",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      maxHeight: 170,
                      overflow: "auto",
                      background: "#fff",
                    }}
                  >
                    {catalogSuggestions.length === 0 ? (
                      <div style={{ padding: "0.5rem 0.6rem", color: "var(--color-muted)", fontSize: "0.85rem" }}>
                        Aucun résultat.
                      </div>
                    ) : (
                      catalogSuggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="btn btn-ghost"
                          style={{
                            width: "100%",
                            justifyContent: "flex-start",
                            border: 0,
                            borderRadius: 0,
                            padding: "0.45rem 0.6rem",
                            background: selectedCatalogId === item.id ? "rgba(0,51,88,0.08)" : "transparent",
                          }}
                          onClick={() => {
                            setSelectedCatalogId(item.id);
                            setCatalogQuery(`${item.label} [${item.articleNumber}]`);
                          }}
                        >
                          {item.label} [{item.articleNumber}] — {item.unitPriceHt.toFixed(2)} €
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Quantité</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  className="input"
                  value={catalogQuantity}
                  onChange={(e) => setCatalogQuantity(e.target.value)}
                />
              </div>
              <button type="button" className="btn btn-primary" onClick={addMaterialFromCatalog}>
                Ajouter
              </button>
            </div>
          </div>
        ) : null}

        {canEditMaterialMeta ? (
          <div className="card" style={{ border: "1px solid var(--color-border)", marginBottom: "1rem" }}>
            <h3 style={{ marginTop: 0, marginBottom: "0.65rem", fontSize: "1rem" }}>Ajouter manuellement</h3>
            <div
              className={
                showFinance
                  ? "u-grid-form-row u-grid-form-row--material-finance"
                  : "u-grid-form-row u-grid-form-row--material-simple"
              }
            >
              <div className="field" style={{ margin: 0 }}>
                <label>Matériel</label>
                <input
                  className="input"
                  value={newMaterial.label}
                  onChange={(e) => setNewMaterial((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder="Ex. : Disjoncteur 20 A"
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Quantité</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  className="input"
                  value={newMaterial.quantity}
                  onChange={(e) => setNewMaterial((prev) => ({ ...prev, quantity: e.target.value }))}
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Unité</label>
                <select
                  className="input"
                  value={newMaterial.unit}
                  onChange={(e) => setNewMaterial((prev) => ({ ...prev, unit: e.target.value }))}
                >
                  {MATERIAL_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              {showFinance ? (
                <div className="field" style={{ margin: 0 }}>
                  <label>PU HT (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input"
                    value={newMaterial.unitPriceHt}
                    onChange={(e) => setNewMaterial((prev) => ({ ...prev, unitPriceHt: e.target.value }))}
                    placeholder="0,00"
                  />
                </div>
              ) : null}
              <button type="button" className="btn btn-primary" onClick={addMaterial}>
                Ajouter
              </button>
            </div>
          </div>
        ) : null}

        <div
          className="table-wrap table-wrap--scroll-lg"
          style={{ border: "1px solid var(--color-border)", borderRadius: 10 }}
        >
          <table>
            <thead>
              <tr>
                <th>Matériel</th>
                <th>Référence</th>
                <th>Quantité</th>
                <th>Unité</th>
                {showFinance ? <th>PU HT</th> : null}
                {showFinance ? <th>Total HT</th> : null}
                {canEditMaterials ? <th>Action</th> : null}
              </tr>
            </thead>
            <tbody>
              {materials.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEditMaterials ? (showFinance ? 7 : 5) : showFinance ? 6 : 4}
                    style={{ color: "var(--color-muted)" }}
                  >
                    {isTechnician
                      ? "Aucun matériel posé. Ajoutez des articles depuis votre stock camionnette ci-dessus."
                      : "Aucun matériel renseigné pour l’instant."}
                  </td>
                </tr>
              ) : (
                materials.map((m) => (
                  <tr key={m.id}>
                    <td>
                      {canEditMaterialMeta ? (
                        <input
                          className="input"
                          value={m.label}
                          onChange={(e) => updateMaterial(m.id, { label: e.target.value })}
                        />
                      ) : (
                        m.label
                      )}
                    </td>
                    <td style={{ minWidth: 120 }}>
                      {canEditMaterialMeta ? (
                        <input
                          className="input"
                          value={m.articleNumber ?? ""}
                          onChange={(e) => updateMaterial(m.id, { articleNumber: e.target.value })}
                          placeholder="ex. 1234567"
                        />
                      ) : (
                        m.articleNumber ?? "—"
                      )}
                    </td>
                    <td style={{ width: 120 }}>
                      {canEditMaterials ? (
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          max={isTechnician ? maxQtyForMaterialLine(m) : undefined}
                          className="input"
                          value={m.quantity}
                          onChange={(e) => updateMaterial(m.id, { quantity: Number(e.target.value) || 0 })}
                          title={
                            isTechnician
                              ? `Maximum ${maxQtyForMaterialLine(m)} ${m.unit} (stock camionnette inclus)`
                              : undefined
                          }
                        />
                      ) : (
                        m.quantity
                      )}
                    </td>
                    <td style={{ width: 110 }}>
                      {canEditMaterialMeta ? (
                        <select
                          className="input"
                          value={m.unit}
                          onChange={(e) => updateMaterial(m.id, { unit: e.target.value })}
                        >
                          {MATERIAL_UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      ) : (
                        m.unit
                      )}
                    </td>
                    {showFinance ? (
                      <td style={{ width: 120 }}>
                        {canEditMaterialMeta ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="input"
                            value={m.unitPriceHt ?? 0}
                            onChange={(e) => updateMaterial(m.id, { unitPriceHt: Number(e.target.value) || 0 })}
                          />
                        ) : m.unitPriceHt != null ? (
                          `${m.unitPriceHt.toFixed(2)} €`
                        ) : (
                          "—"
                        )}
                      </td>
                    ) : null}
                    {showFinance ? (
                      <td style={{ width: 120, fontWeight: 600 }}>{materialLineTotalHt(m).toFixed(2)} €</td>
                    ) : null}
                    {canEditMaterials ? (
                      <td style={{ width: 130 }}>
                        <button type="button" className="btn btn-ghost" onClick={() => removeMaterial(m.id)}>
                          Supprimer
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showFinance ? (
          <div style={{ margin: "0.7rem 0 0", textAlign: "right" }}>
            <p style={{ margin: 0, fontWeight: 600 }}>Total matériel HT : {totalMaterialHt.toFixed(2)} €</p>
            <p style={{ margin: "0.35rem 0 0", fontWeight: 800, fontSize: "1.05rem", color: "var(--color-navy)" }}>
              Total devis HTVA (installation + matériel) : {quoteTotalHt.toFixed(2)} €
            </p>
          </div>
        ) : null}

        {canEditMaterials ? (
          <p style={{ margin: "0.6rem 0 0", color: "var(--color-muted)", fontSize: "0.86rem" }}>
            {materialsSaving
              ? isTechnician
                ? "Enregistrement et mise à jour du stock…"
                : "Sauvegarde automatique en cours..."
              : isTechnician
                ? "Sauvegarde automatique — votre stock camionnette est mis à jour à chaque modification."
                : "Sauvegarde automatique activée."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
