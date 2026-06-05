import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BILLING_COMMISSION_PERCENT,
  BILLING_SUBSCRIPTION_PHASE1_EUR,
  BILLING_SUBSCRIPTION_PHASE1_MONTHS,
  BILLING_SUBSCRIPTION_PHASE2_EUR,
  billingStatusLabel,
  commissionOnRecharge,
  type LeadBillingPeriodRow,
} from "../lib/billing";
import { apiFetch, formatApiErrorMessage } from "../lib/api";
import type { Lead } from "../types";
import "./lead-billing.css";

type BillingSummary = {
  configured: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string;
  currentPhase: number;
  periods: LeadBillingPeriodRow[];
  model: {
    subscriptionPhase1Eur: number;
    subscriptionPhase2Eur: number;
    subscriptionPhase1Months: number;
    commissionPercent: number;
    note: string;
  };
};

type Props = {
  lead: Lead;
  canManage: boolean;
  setToast: (msg: string) => void;
};

function currentPeriodLabel(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function LeadBillingSection({ lead, canManage, setToast }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [periodLabel, setPeriodLabel] = useState(currentPeriodLabel);
  const [grossRecharge, setGrossRecharge] = useState("");

  const previewCommission = useMemo(() => {
    const g = Number(grossRecharge.replace(",", "."));
    if (!Number.isFinite(g) || g <= 0) return null;
    return commissionOnRecharge(g);
  }, [grossRecharge]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<BillingSummary>(`/api/leads/${lead.id}/billing`);
      setSummary(data);
    } catch (e) {
      setSummary(null);
      setToast(formatApiErrorMessage(e, "Facturation indisponible."));
      setTimeout(() => setToast(""), 3500);
    } finally {
      setLoading(false);
    }
  }, [lead.id, setToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const billing = searchParams.get("billing");
    if (billing === "success") {
      setToast("Mandat enregistré — synchronisation Stripe…");
      void apiFetch(`/api/leads/${lead.id}/billing/sync`, { method: "POST" }).then(() => load());
      searchParams.delete("billing");
      setSearchParams(searchParams, { replace: true });
    } else if (billing === "cancel") {
      setToast("Configuration du prélèvement annulée.");
      searchParams.delete("billing");
      setSearchParams(searchParams, { replace: true });
    }
  }, [lead.id, load, searchParams, setSearchParams, setToast]);

  async function startSubscriptionSetup() {
    setBusy(true);
    try {
      const { url } = await apiFetch<{ url: string }>(
        `/api/leads/${lead.id}/billing/checkout-subscription`,
        { method: "POST" }
      );
      window.open(url, "_blank", "noopener,noreferrer");
      setToast("Ouvrez le lien Stripe (ou envoyez-le au gérant par e-mail). Pas de page publique sur le site.");
    } catch (e) {
      setToast(formatApiErrorMessage(e, "Impossible de créer le lien Stripe."));
    } finally {
      setBusy(false);
      setTimeout(() => setToast(""), 4000);
    }
  }

  async function submitCommission(e: React.FormEvent) {
    e.preventDefault();
    const g = Number(grossRecharge.replace(",", "."));
    if (!Number.isFinite(g) || g <= 0) {
      setToast("Indiquez le CA recharge du mois.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/api/leads/${lead.id}/billing/commission`, {
        method: "POST",
        body: JSON.stringify({ periodLabel, grossRechargeEur: g }),
      });
      setGrossRecharge("");
      setToast(`Commission ${BILLING_COMMISSION_PERCENT} % facturée sur Stripe.`);
      await load();
    } catch (err) {
      setToast(formatApiErrorMessage(err, "Facturation commission impossible."));
    } finally {
      setBusy(false);
      setTimeout(() => setToast(""), 4000);
    }
  }

  const status = summary?.subscriptionStatus ?? lead.projectSpecs?.billing?.subscriptionStatus ?? "none";

  return (
    <section className="card lead-billing" aria-labelledby="lead-billing-title">
      <h2 id="lead-billing-title" style={{ marginTop: 0 }}>
        Facturation gérant (abonnement + commission)
      </h2>
      <p className="lead-billing__lede">
        Pas d’espace client sur le site vitrine. Le <strong>gérant du site</strong> signe un mandat de prélèvement
        (SEPA ou carte) via un lien Stripe généré ici. Itelec encaisse les recharges (CPO) ; chaque mois vous déclarez
        le CA recharge pour prélever la commission de {BILLING_COMMISSION_PERCENT}&nbsp;%.
      </p>

      <div className="lead-billing__model" style={{ background: "rgba(0, 51, 88, 0.03)", padding: "0.75rem 1rem", borderRadius: 8 }}>
        <ul className="lead-billing__model-list">
          <li>
            <strong>Abonnement gestion</strong> : {BILLING_SUBSCRIPTION_PHASE1_EUR}&nbsp;€/mois pendant{" "}
            {BILLING_SUBSCRIPTION_PHASE1_MONTHS}&nbsp;mois, puis {BILLING_SUBSCRIPTION_PHASE2_EUR}&nbsp;€/mois.
          </li>
          <li>
            <strong>Commission recharge</strong> : {BILLING_COMMISSION_PERCENT}&nbsp;% du CA recharge mensuel
            (facture Stripe séparée, prélèvement automatique).
          </li>
        </ul>
      </div>

      {loading ? (
        <p style={{ color: "var(--color-muted)", fontSize: "0.88rem" }}>Chargement…</p>
      ) : !summary?.configured ? (
        <p className="lead-billing__warn" role="alert">
          Paiement en ligne temporairement indisponible.
        </p>
      ) : (
        <>
          <div className="lead-billing__status-row">
            <span className={`lead-billing__status lead-billing__status--${status}`}>
              {billingStatusLabel(status as never)}
            </span>
            {summary.currentPhase === 2 ? (
              <span className="badge">Phase 2 ({BILLING_SUBSCRIPTION_PHASE2_EUR}&nbsp;€/mois)</span>
            ) : (
              <span className="badge badge-yellow">Phase 1 ({BILLING_SUBSCRIPTION_PHASE1_EUR}&nbsp;€/mois)</span>
            )}
            <button type="button" className="btn btn-ghost" style={{ marginLeft: "auto", fontSize: "0.78rem" }} onClick={() => void load()}>
              Actualiser
            </button>
          </div>

          {canManage ? (
            <div className="lead-billing__actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => void startSubscriptionSetup()}
              >
                {busy ? "…" : "Lien mandat + abonnement mensuel"}
              </button>
              <p className="lead-billing__hint">
                Ouvre Stripe Checkout (nouvel onglet). Envoyez le lien au gérant par e-mail — il ne figure pas sur le
                site public. Test carte : <code>4242 4242 4242 4242</code>.
              </p>
            </div>
          ) : null}

          {canManage ? (
            <form className="lead-billing__commission" onSubmit={(e) => void submitCommission(e)}>
              <h3 style={{ fontSize: "0.95rem", margin: "1rem 0 0.5rem" }}>Commission du mois</h3>
              <div className="lead-billing__commission-grid">
                <div className="field">
                  <label htmlFor="billing-period">Période</label>
                  <input
                    id="billing-period"
                    className="input"
                    value={periodLabel}
                    onChange={(e) => setPeriodLabel(e.target.value)}
                    placeholder="2026-05"
                  />
                </div>
                <div className="field">
                  <label htmlFor="billing-gross">CA recharge du mois (€)</label>
                  <input
                    id="billing-gross"
                    className="input"
                    type="text"
                    inputMode="decimal"
                    value={grossRecharge}
                    onChange={(e) => setGrossRecharge(e.target.value)}
                    placeholder="ex. 1250"
                  />
                </div>
              </div>
              {previewCommission != null ? (
                <p style={{ fontSize: "0.85rem", color: "var(--color-muted)", margin: "0.35rem 0 0.65rem" }}>
                  Commission à prélever : <strong>{previewCommission.toFixed(2)}&nbsp;€</strong>
                </p>
              ) : null}
              <button type="submit" className="btn btn-primary" disabled={busy || status !== "active"}>
                Facturer la commission sur Stripe
              </button>
              {status !== "active" ? (
                <p className="lead-billing__hint">Activez d’abord le mandat d’abonnement.</p>
              ) : null}
            </form>
          ) : null}

          {summary.periods.length > 0 ? (
            <div className="lead-billing__history">
              <h3 style={{ fontSize: "0.95rem", margin: "1rem 0 0.5rem" }}>Historique commissions</h3>
              <ul>
                {summary.periods.map((p) => (
                  <li key={p.id}>
                    <span>{p.periodLabel}</span>
                    <span>
                      CA {p.grossRechargeEur.toFixed(2)}&nbsp;€ → {p.commissionEur.toFixed(2)}&nbsp;€
                    </span>
                    <span className={`lead-billing__pill lead-billing__pill--${p.status}`}>{p.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
