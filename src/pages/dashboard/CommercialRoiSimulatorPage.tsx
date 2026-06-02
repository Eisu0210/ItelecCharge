import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  computeRoiSimulation,
  formatEuro,
  formatMonths,
  installationPresetHt,
  ITELEC_RECHARGE_COMMISSION_PERCENT,
  MANAGEMENT_FEE_PHASE1_EUR,
  MANAGEMENT_FEE_PHASE1_MONTHS,
  MANAGEMENT_FEE_PHASE2_EUR,
  ROI_DEFAULTS,
  type RoiPricingMode,
} from "../../lib/roiSimulator";
import "./roi-simulator.css";

function num(v: string, fallback: number): number {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

export function CommercialRoiSimulatorPage() {
  const [chargerCount, setChargerCount] = useState("1");
  const [mountPreset, setMountPreset] = useState<"mural" | "pied">("mural");
  const [chargerUnitCostHt, setChargerUnitCostHt] = useState(String(ROI_DEFAULTS.chargerUnitCostHt));
  const [installationCostHt, setInstallationCostHt] = useState(
    String(installationPresetHt("mural", 1))
  );
  const [pricingMode, setPricingMode] = useState<RoiPricingMode>("kwh");
  const [sellPricePerKwh, setSellPricePerKwh] = useState(String(ROI_DEFAULTS.sellPricePerKwh));
  const [sellPricePerSession, setSellPricePerSession] = useState(String(ROI_DEFAULTS.sellPricePerSession));
  const [plugInFeePerSession, setPlugInFeePerSession] = useState(String(ROI_DEFAULTS.plugInFeePerSession));
  const [kwhPerSession, setKwhPerSession] = useState(String(ROI_DEFAULTS.kwhPerSession));
  const [sessionsPerMonth, setSessionsPerMonth] = useState(String(ROI_DEFAULTS.sessionsPerMonth));
  const [sessionsPerDay, setSessionsPerDay] = useState("");
  const [energyCostPerKwh, setEnergyCostPerKwh] = useState(String(ROI_DEFAULTS.energyCostPerKwh));
  const [itelecCommissionPercent, setItelecCommissionPercent] = useState(
    String(ROI_DEFAULTS.itelecCommissionPercent)
  );
  const [managementFeePhase1, setManagementFeePhase1] = useState(
    String(ROI_DEFAULTS.managementFeePhase1Eur)
  );
  const [managementFeePhase1Months, setManagementFeePhase1Months] = useState(
    String(ROI_DEFAULTS.managementFeePhase1Months)
  );
  const [managementFeePhase2, setManagementFeePhase2] = useState(
    String(ROI_DEFAULTS.managementFeePhase2Eur)
  );
  const [monthlyOtherFixedCosts, setMonthlyOtherFixedCosts] = useState(
    String(ROI_DEFAULTS.monthlyOtherFixedCosts)
  );
  const [analysisYears, setAnalysisYears] = useState(String(ROI_DEFAULTS.analysisYears));
  const [vatRatePercent, setVatRatePercent] = useState(String(ROI_DEFAULTS.vatRatePercent));

  function applyMountPreset(mount: "mural" | "pied") {
    setMountPreset(mount);
    const count = Math.max(1, Math.floor(num(chargerCount, 1)));
    setInstallationCostHt(String(installationPresetHt(mount, count)));
  }

  function applyInstallationFromCount(countStr: string) {
    const count = Math.max(1, Math.floor(num(countStr, 1)));
    setInstallationCostHt(String(installationPresetHt(mountPreset, count)));
  }

  const effectiveSessionsPerMonth = useMemo(() => {
    const daily = num(sessionsPerDay, NaN);
    if (Number.isFinite(daily) && daily > 0) return Math.round(daily * 30);
    return Math.max(0, num(sessionsPerMonth, 0));
  }, [sessionsPerDay, sessionsPerMonth]);

  const result = useMemo(
    () =>
      computeRoiSimulation({
        chargerCount: num(chargerCount, 1),
        chargerUnitCostHt: num(chargerUnitCostHt, ROI_DEFAULTS.chargerUnitCostHt),
        installationCostHt: num(installationCostHt, installationPresetHt(mountPreset, 1)),
        vatRatePercent: num(vatRatePercent, ROI_DEFAULTS.vatRatePercent),
        pricingMode,
        sellPricePerKwh: num(sellPricePerKwh, ROI_DEFAULTS.sellPricePerKwh),
        sellPricePerSession: num(sellPricePerSession, ROI_DEFAULTS.sellPricePerSession),
        plugInFeePerSession: num(plugInFeePerSession, ROI_DEFAULTS.plugInFeePerSession),
        kwhPerSession: num(kwhPerSession, ROI_DEFAULTS.kwhPerSession),
        sessionsPerMonth: effectiveSessionsPerMonth,
        energyCostPerKwh: num(energyCostPerKwh, ROI_DEFAULTS.energyCostPerKwh),
        itelecCommissionPercent: num(itelecCommissionPercent, ROI_DEFAULTS.itelecCommissionPercent),
        managementFeePhase1Eur: num(managementFeePhase1, ROI_DEFAULTS.managementFeePhase1Eur),
        managementFeePhase1Months: num(
          managementFeePhase1Months,
          ROI_DEFAULTS.managementFeePhase1Months
        ),
        managementFeePhase2Eur: num(managementFeePhase2, ROI_DEFAULTS.managementFeePhase2Eur),
        monthlyOtherFixedCosts: num(monthlyOtherFixedCosts, ROI_DEFAULTS.monthlyOtherFixedCosts),
        analysisYears: num(analysisYears, ROI_DEFAULTS.analysisYears),
      }),
    [
      chargerCount,
      chargerUnitCostHt,
      installationCostHt,
      vatRatePercent,
      pricingMode,
      sellPricePerKwh,
      sellPricePerSession,
      plugInFeePerSession,
      kwhPerSession,
      effectiveSessionsPerMonth,
      energyCostPerKwh,
      itelecCommissionPercent,
      managementFeePhase1,
      managementFeePhase1Months,
      managementFeePhase2,
      monthlyOtherFixedCosts,
      analysisYears,
      mountPreset,
    ]
  );

  const impliedDaily =
    effectiveSessionsPerMonth > 0 ? (effectiveSessionsPerMonth / 30).toFixed(1) : "0";

  return (
    <div>
      <p style={{ marginTop: 0 }}>
        <Link to="/app">← Statut vente</Link>
      </p>
      <h1>Simulateur ROI</h1>
      <p>
        Estimez la rentabilité pour le gérant du site : CA borne (recharge + frais de branchement
        conducteur), commission Itelec {ITELEC_RECHARGE_COMMISSION_PERCENT} % sur ce CA, coûts d&apos;exploitation
        et retour sur investissement.
      </p>

      <div className="roi-simulator-layout">
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Investissement</h2>
          <div className="roi-preset-row">
            <span style={{ fontSize: "0.8rem", color: "var(--color-muted)", alignSelf: "center" }}>
              Forfait install. Itelec :
            </span>
            <button
              type="button"
              className={`roi-mode-tab${mountPreset === "mural" ? " is-active" : ""}`}
              style={{ flex: "0 1 auto" }}
              onClick={() => applyMountPreset("mural")}
            >
              Murale (1 600 €/borne)
            </button>
            <button
              type="button"
              className={`roi-mode-tab${mountPreset === "pied" ? " is-active" : ""}`}
              style={{ flex: "0 1 auto" }}
              onClick={() => applyMountPreset("pied")}
            >
              Sur pied (2 000 €/borne)
            </button>
          </div>

          <div className="u-grid-2">
            <div className="field">
              <label>Nombre de bornes</label>
              <input
                className="input"
                type="number"
                min={1}
                step={1}
                value={chargerCount}
                onChange={(e) => {
                  setChargerCount(e.target.value);
                  applyInstallationFromCount(e.target.value);
                }}
              />
            </div>
            <div className="field">
              <label>TVA (%)</label>
              <input
                className="input"
                type="number"
                min={0}
                step={0.1}
                value={vatRatePercent}
                onChange={(e) => setVatRatePercent(e.target.value)}
              />
            </div>
          </div>
          <div className="u-grid-2">
            <div className="field">
              <label>Coût unitaire borne (HTVA / borne)</label>
              <input
                className="input"
                type="number"
                min={0}
                step={50}
                value={chargerUnitCostHt}
                onChange={(e) => setChargerUnitCostHt(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Coût installation (HTVA total)</label>
              <input
                className="input"
                type="number"
                min={0}
                step={100}
                value={installationCostHt}
                onChange={(e) => setInstallationCostHt(e.target.value)}
              />
            </div>
          </div>

          <h2 style={{ fontSize: "1rem", marginTop: "1.25rem" }}>Exploitation & fréquentation</h2>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", color: "var(--color-muted)" }}>
            Renseignez soit les sessions par mois, soit une moyenne par jour (× 30 jours).
          </p>
          <div className="u-grid-2">
            <div className="field">
              <label>Sessions / mois</label>
              <input
                className="input"
                type="number"
                min={0}
                step={1}
                value={sessionsPerMonth}
                onChange={(e) => {
                  setSessionsPerMonth(e.target.value);
                  setSessionsPerDay("");
                }}
              />
            </div>
            <div className="field">
              <label>Ou sessions / jour (moy.)</label>
              <input
                className="input"
                type="number"
                min={0}
                step={0.1}
                placeholder="ex. 3"
                value={sessionsPerDay}
                onChange={(e) => {
                  setSessionsPerDay(e.target.value);
                  if (e.target.value.trim()) setSessionsPerMonth("");
                }}
              />
            </div>
          </div>
          <p style={{ margin: "0 0 0.85rem", fontSize: "0.78rem", color: "var(--color-muted)" }}>
            Équivalent utilisé : <strong>{effectiveSessionsPerMonth}</strong> sessions/mois
            {effectiveSessionsPerMonth > 0 ? ` (~${impliedDaily} / jour)` : null}
          </p>

          <label style={{ display: "block", marginBottom: "0.35rem" }}>Mode de facturation client</label>
          <div className="roi-mode-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              className={`roi-mode-tab${pricingMode === "kwh" ? " is-active" : ""}`}
              onClick={() => setPricingMode("kwh")}
            >
              Prix au kWh
            </button>
            <button
              type="button"
              role="tab"
              className={`roi-mode-tab${pricingMode === "session" ? " is-active" : ""}`}
              onClick={() => setPricingMode("session")}
            >
              Prix / session
            </button>
          </div>

          <div className="u-grid-2">
            {pricingMode === "kwh" ? (
              <div className="field">
                <label>Prix recharge (€ / kWh)</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step={0.01}
                  value={sellPricePerKwh}
                  onChange={(e) => setSellPricePerKwh(e.target.value)}
                />
              </div>
            ) : (
              <div className="field">
                <label>Prix recharge forfait (€ / session)</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step={0.5}
                  value={sellPricePerSession}
                  onChange={(e) => setSellPricePerSession(e.target.value)}
                />
              </div>
            )}
            <div className="field">
              <label>Énergie moyenne / session (kWh)</label>
              <input
                className="input"
                type="number"
                min={0.1}
                step={0.5}
                value={kwhPerSession}
                onChange={(e) => setKwhPerSession(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label>Frais de branchement conducteur (€ / session)</label>
            <input
              className="input"
              type="number"
              min={0}
              step={0.1}
              value={plugInFeePerSession}
              onChange={(e) => setPlugInFeePerSession(e.target.value)}
            />
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.78rem", color: "var(--color-muted)" }}>
              Payé par le client qui branche son véhicule — <strong>inclus dans le CA</strong> de la borne ;
              la commission Itelec ({ITELEC_RECHARGE_COMMISSION_PERCENT} %) s&apos;applique aussi sur ce montant.
            </p>
          </div>

          <h2 style={{ fontSize: "1rem", marginTop: "1.25rem" }}>Commission & abonnement Itelec</h2>
          <div className="u-grid-2">
            <div className="field">
              <label>Commission Itelec (% du CA total)</label>
              <input
                className="input"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={itelecCommissionPercent}
                onChange={(e) => setItelecCommissionPercent(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Coût énergie (€ / kWh)</label>
              <input
                className="input"
                type="number"
                min={0}
                step={0.01}
                value={energyCostPerKwh}
                onChange={(e) => setEnergyCostPerKwh(e.target.value)}
              />
            </div>
          </div>
          <p style={{ margin: "0 0 0.55rem", fontSize: "0.8rem", color: "var(--color-muted)" }}>
            Abonnement gestion borne (charge mensuelle au gérant du site, hors CA recharge) :
          </p>
          <div className="u-grid-2">
            <div className="field">
              <label>Gestion — {MANAGEMENT_FEE_PHASE1_MONTHS} premiers mois (€ / mois)</label>
              <input
                className="input"
                type="number"
                min={0}
                step={1}
                value={managementFeePhase1}
                onChange={(e) => setManagementFeePhase1(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Gestion — ensuite (€ / mois)</label>
              <input
                className="input"
                type="number"
                min={0}
                step={1}
                value={managementFeePhase2}
                onChange={(e) => setManagementFeePhase2(e.target.value)}
              />
            </div>
          </div>
          <div className="u-grid-2">
            <div className="field">
              <label>Durée tarif gestion initial (mois)</label>
              <input
                className="input"
                type="number"
                min={0}
                step={1}
                value={managementFeePhase1Months}
                onChange={(e) => setManagementFeePhase1Months(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Autres frais / mois (€)</label>
              <input
                className="input"
                type="number"
                min={0}
                step={5}
                value={monthlyOtherFixedCosts}
                onChange={(e) => setMonthlyOtherFixedCosts(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label>Horizon d&apos;analyse (années)</label>
            <input
              className="input"
              type="number"
              min={1}
              max={20}
              step={1}
              value={analysisYears}
              onChange={(e) => setAnalysisYears(e.target.value)}
              style={{ maxWidth: "8rem" }}
            />
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Rentabilité</h2>

          <div className={`roi-verdict roi-verdict--${result.profitability}`}>
            <p className="roi-verdict-title">Synthèse</p>
            <p className="roi-verdict-text">{result.profitabilityLabel}</p>
          </div>

          <div className="roi-simulator-kpis">
            <div className="roi-kpi roi-kpi--wide">
              <p className="roi-kpi-label">Investissement total (TVAC)</p>
              <p className="roi-kpi-value">{formatEuro(result.totalInvestmentTvac)}</p>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "var(--color-muted)" }}>
                {formatEuro(result.totalInvestmentHt)} HTVA
              </p>
            </div>
            <div className="roi-kpi">
              <p className="roi-kpi-label">CA total borne / mois</p>
              <p className="roi-kpi-value">{formatEuro(result.monthlyGrossRevenue)}</p>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.72rem", color: "var(--color-muted)" }}>
                {formatEuro(result.revenuePerSessionTotal)} / session
              </p>
            </div>
            <div className="roi-kpi">
              <p className="roi-kpi-label">Net client (4 ans)</p>
              <p className="roi-kpi-value">{formatEuro(result.monthlyNetPhase1)}</p>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.72rem", color: "var(--color-muted)" }}>
                puis {formatEuro(result.monthlyNetPhase2)}/mois
              </p>
            </div>
            <div className="roi-kpi">
              <p className="roi-kpi-label">Net client / an (phase 1)</p>
              <p className="roi-kpi-value">{formatEuro(result.annualNet)}</p>
            </div>
            <div className="roi-kpi">
              <p className="roi-kpi-label">Retour sur investissement</p>
              <p className="roi-kpi-value">{formatMonths(result.paybackMonths)}</p>
            </div>
            <div className="roi-kpi">
              <p className="roi-kpi-label">Marge / session</p>
              <p className="roi-kpi-value">{formatEuro(result.marginPerSession)}</p>
            </div>
            {result.roiPercentOverHorizon != null ? (
              <div className="roi-kpi roi-kpi--wide">
                <p className="roi-kpi-label">
                  Gain cumulé sur {num(analysisYears, 5)} ans (après investissement TVAC)
                </p>
                <p className="roi-kpi-value">{formatEuro(result.cumulativeProfitOverHorizon)}</p>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "var(--color-muted)" }}>
                  ROI relatif : {result.roiPercentOverHorizon.toFixed(0)} %
                </p>
              </div>
            ) : null}
          </div>

          <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem" }}>Détail du CA (mensuel)</h3>
          <ul className="roi-breakdown">
            <li>
              <span>Part recharge (énergie)</span>
              <span>{formatEuro(result.monthlyRechargeRevenue)}</span>
            </li>
            <li>
              <span>Frais de branchement conducteur</span>
              <span>{formatEuro(result.monthlyPlugInFeeRevenue)}</span>
            </li>
            <li>
              <span>CA total borne</span>
              <span>{formatEuro(result.monthlyGrossRevenue)}</span>
            </li>
            <li>
              <span>Commission Itelec ({num(itelecCommissionPercent, ITELEC_RECHARGE_COMMISSION_PERCENT)} % du CA)</span>
              <span>− {formatEuro(result.monthlyItelecCommission)}</span>
            </li>
            <li>
              <span>Après commission</span>
              <span>{formatEuro(result.monthlyNetRevenueAfterCommission)}</span>
            </li>
          </ul>

          <h3 style={{ margin: "0.85rem 0 0.5rem", fontSize: "0.9rem" }}>
            Charges & net gérant ({MANAGEMENT_FEE_PHASE1_MONTHS} premiers mois)
          </h3>
          <ul className="roi-breakdown">
            <li>
              <span>Abonnement gestion Itelec</span>
              <span>− {formatEuro(result.monthlyManagementFeePhase1)}</span>
            </li>
            <li>
              <span>Coût énergie</span>
              <span>− {formatEuro(result.monthlyEnergyCost)}</span>
            </li>
            {result.monthlyOtherFixed > 0 ? (
              <li>
                <span>Autres frais</span>
                <span>− {formatEuro(result.monthlyOtherFixed)}</span>
              </li>
            ) : null}
            <li>
              <span>Résultat net gérant</span>
              <span>{formatEuro(result.monthlyNetPhase1)}</span>
            </li>
          </ul>

          <h3 style={{ margin: "0.85rem 0 0.5rem", fontSize: "0.9rem" }}>
            Ensuite ({formatEuro(result.monthlyManagementFeePhase2)}/mois gestion)
          </h3>
          <ul className="roi-breakdown">
            <li>
              <span>Résultat net gérant / mois</span>
              <span>{formatEuro(result.monthlyNetPhase2)}</span>
            </li>
          </ul>

          <p style={{ margin: "1rem 0 0", fontSize: "0.78rem", color: "var(--color-muted)", lineHeight: 1.5 }}>
            Le CA inclut chaque session de recharge et le frais payé par le conducteur au branchement.
            Itelec prélève {ITELEC_RECHARGE_COMMISSION_PERCENT} % sur l&apos;ensemble de ce CA. L&apos;abonnement
            gestion ({MANAGEMENT_FEE_PHASE1_EUR} € puis {MANAGEMENT_FEE_PHASE2_EUR} €/mois) est une charge
            mensuelle distincte pour le gérant du site.
          </p>
        </div>
      </div>
    </div>
  );
}
