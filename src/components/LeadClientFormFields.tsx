import type { LeadClientFormValues } from "../lib/leadClientForm";
import { QUOTE_MODE_LABELS } from "../lib/quotePricing";
import type { MountType, QuotePricingMode, SupplyType } from "../types";

type Props = {
  form: LeadClientFormValues;
  onChange: (patch: Partial<LeadClientFormValues>) => void;
  showCommercialId?: boolean;
  commercialIdOptions?: string[];
};

export function LeadClientFormFields({ form, onChange, showCommercialId, commercialIdOptions }: Props) {
  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div>
        <h3 style={{ margin: "0 0 0.65rem", fontSize: "0.95rem", color: "var(--color-navy)" }}>
          Identité & coordonnées
        </h3>
        <div style={{ display: "grid", gap: "0.65rem" }}>
          <div className="field">
            <label>Société / site</label>
            <input
              className="input"
              required
              value={form.companyName}
              onChange={(e) => onChange({ companyName: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Contact</label>
            <input
              className="input"
              required
              value={form.contactName}
              onChange={(e) => onChange({ contactName: e.target.value })}
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
                onChange={(e) => onChange({ email: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Téléphone</label>
              <input
                className="input"
                required
                value={form.phone}
                onChange={(e) => onChange({ phone: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <label>Adresse du chantier</label>
            <input
              className="input"
              required
              value={form.address}
              onChange={(e) => onChange({ address: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Notes</label>
            <textarea className="input" value={form.notes} onChange={(e) => onChange({ notes: e.target.value })} />
          </div>
        </div>
      </div>

      <div>
        <h3 style={{ margin: "0 0 0.65rem", fontSize: "0.95rem", color: "var(--color-navy)" }}>
          Besoins techniques & type de devis
        </h3>
        <div style={{ display: "grid", gap: "0.65rem" }}>
          <div className="field">
            <label>Type de devis</label>
            <select
              className="input"
              value={form.quoteMode}
              onChange={(e) => onChange({ quoteMode: e.target.value as QuotePricingMode })}
            >
              <option value="subscription">{QUOTE_MODE_LABELS.subscription}</option>
              <option value="detailed">{QUOTE_MODE_LABELS.detailed}</option>
            </select>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem", color: "var(--color-muted)" }}>
              {form.quoteMode === "subscription"
                ? "Forfait 1 600 € (murale) ou 2 000 € (sur pied) par borne, matériel inclus. Suppléments câble et tranchée en sus."
                : "Montant basé sur le catalogue matériel du dossier + suppléments câble/tranchée (sans forfait abonnement)."}
            </p>
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
              onChange={(e) => onChange({ chargerCount: e.target.value })}
            />
          </div>
          <div className="u-grid-2">
            <div className="field">
              <label>Alimentation</label>
              <select
                className="input"
                value={form.supplyType}
                onChange={(e) => onChange({ supplyType: e.target.value as SupplyType })}
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
                onChange={(e) => onChange({ mountType: e.target.value as MountType })}
              >
                <option value="mural">Installation murale</option>
                <option value="pied">Sur pied / colonne</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {showCommercialId ? (
        <div className="field">
          <label>Commercial référent</label>
          {commercialIdOptions && commercialIdOptions.length > 0 ? (
            <select
              className="input"
              value={form.commercialId}
              onChange={(e) => onChange({ commercialId: e.target.value })}
            >
              {commercialIdOptions.map((cid) => (
                <option key={cid} value={cid}>
                  {cid}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="input"
              value={form.commercialId}
              onChange={(e) => onChange({ commercialId: e.target.value })}
              placeholder="ex. commercial"
            />
          )}
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem", color: "var(--color-muted)" }}>
            Laissez « admin » si le dossier est créé directement par l’administration.
          </p>
        </div>
      ) : null}
    </div>
  );
}
