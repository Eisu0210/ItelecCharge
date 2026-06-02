import { BASE_MURAL_HTVA, BASE_PIED_HTVA } from "./quotePricing";

export type RoiPricingMode = "kwh" | "session";
export type ProfitabilityLevel = "excellent" | "good" | "moderate" | "weak" | "negative";

/** Commission Itelec sur le CA total de la borne (recharge + frais de branchement). */
export const ITELEC_RECHARGE_COMMISSION_PERCENT = 12;

/** Abonnement gestion CPO facturé au gérant du site (brochure — distinct des frais de branchement conducteur). */
export const MANAGEMENT_FEE_PHASE1_EUR = 59;
export const MANAGEMENT_FEE_PHASE1_MONTHS = 48;
export const MANAGEMENT_FEE_PHASE2_EUR = 35;

export interface RoiSimulatorInput {
  chargerCount: number;
  chargerUnitCostHt: number;
  installationCostHt: number;
  vatRatePercent: number;
  pricingMode: RoiPricingMode;
  sellPricePerKwh: number;
  /** Part recharge forfaitaire / session (si mode session), hors frais de branchement. */
  sellPricePerSession: number;
  kwhPerSession: number;
  sessionsPerMonth: number;
  energyCostPerKwh: number;
  /** Frais payés par le conducteur à chaque branchement — inclus dans le CA, commission 12 % dessus. */
  plugInFeePerSession: number;
  itelecCommissionPercent: number;
  managementFeePhase1Eur: number;
  managementFeePhase1Months: number;
  managementFeePhase2Eur: number;
  monthlyOtherFixedCosts: number;
  analysisYears: number;
}

export interface RoiSimulatorResult {
  totalInvestmentHt: number;
  totalInvestmentTvac: number;
  /** CA mensuel total borne (recharge + frais de branchement). */
  monthlyGrossRevenue: number;
  monthlyRechargeRevenue: number;
  monthlyPlugInFeeRevenue: number;
  monthlyItelecCommission: number;
  monthlyNetRevenueAfterCommission: number;
  monthlyManagementFeePhase1: number;
  monthlyManagementFeePhase2: number;
  monthlyEnergyCost: number;
  monthlyOtherFixed: number;
  monthlyNetPhase1: number;
  monthlyNetPhase2: number;
  monthlyNet: number;
  annualNet: number;
  revenuePerSessionTotal: number;
  marginPerSession: number;
  paybackMonths: number | null;
  roiPercentOverHorizon: number | null;
  cumulativeProfitOverHorizon: number;
  profitability: ProfitabilityLevel;
  profitabilityLabel: string;
}

const DEFAULT_VAT = 21;

export const ROI_DEFAULTS = {
  chargerUnitCostHt: 2200,
  kwhPerSession: 28,
  sellPricePerKwh: 0.45,
  sellPricePerSession: 10,
  plugInFeePerSession: 2,
  energyCostPerKwh: 0.28,
  sessionsPerMonth: 80,
  itelecCommissionPercent: ITELEC_RECHARGE_COMMISSION_PERCENT,
  managementFeePhase1Eur: MANAGEMENT_FEE_PHASE1_EUR,
  managementFeePhase1Months: MANAGEMENT_FEE_PHASE1_MONTHS,
  managementFeePhase2Eur: MANAGEMENT_FEE_PHASE2_EUR,
  monthlyOtherFixedCosts: 0,
  analysisYears: 5,
  vatRatePercent: DEFAULT_VAT,
};

export function installationPresetHt(mount: "mural" | "pied", chargerCount: number): number {
  const unit = mount === "pied" ? BASE_PIED_HTVA : BASE_MURAL_HTVA;
  return unit * Math.max(1, chargerCount);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function profitabilityFromPayback(months: number | null, monthlyNet: number): {
  level: ProfitabilityLevel;
  label: string;
} {
  if (monthlyNet <= 0) {
    return { level: "negative", label: "Non rentable — charges supérieures aux revenus" };
  }
  if (months == null) {
    return { level: "negative", label: "Non rentable sur l’horizon analysé" };
  }
  if (months <= 24) return { level: "excellent", label: "Très rentable — retour rapide (< 2 ans)" };
  if (months <= 36) return { level: "good", label: "Rentable — retour sous 3 ans" };
  if (months <= 60) return { level: "moderate", label: "Rentabilité modérée — 3 à 5 ans" };
  if (months <= 84) return { level: "weak", label: "Retour long — au-delà de 5 ans" };
  return { level: "weak", label: "Retour très long — à challenger avec le client" };
}

function sessionRevenues(input: RoiSimulatorInput): {
  rechargePerSession: number;
  plugInPerSession: number;
  totalPerSession: number;
} {
  const plugIn = Math.max(0, input.plugInFeePerSession);
  const recharge =
    input.pricingMode === "session"
      ? Math.max(0, input.sellPricePerSession)
      : round2(Math.max(0.1, input.kwhPerSession) * Math.max(0, input.sellPricePerKwh));
  return {
    rechargePerSession: recharge,
    plugInPerSession: plugIn,
    totalPerSession: round2(recharge + plugIn),
  };
}

function monthlyNetForManagementFee(
  gross: number,
  commissionPct: number,
  energy: number,
  managementFee: number,
  otherFixed: number
): {
  commission: number;
  afterCommission: number;
  net: number;
} {
  const commission = round2(gross * (commissionPct / 100));
  const afterCommission = round2(gross - commission);
  const net = round2(afterCommission - energy - managementFee - otherFixed);
  return { commission, afterCommission, net };
}

function buildMonthlyNetSeries(
  input: RoiSimulatorInput,
  gross: number,
  energy: number,
  otherFixed: number
): number[] {
  const phase1Months = Math.max(0, Math.floor(input.managementFeePhase1Months) || 0);
  const mgmt1 = Math.max(0, input.managementFeePhase1Eur);
  const mgmt2 = Math.max(0, input.managementFeePhase2Eur);
  const horizonMonths = Math.max(1, Math.min(240, Math.floor(input.analysisYears) || 5) * 12);
  const commissionPct = Math.max(0, Math.min(100, input.itelecCommissionPercent));

  const series: number[] = [];
  for (let m = 0; m < horizonMonths; m++) {
    const management = m < phase1Months ? mgmt1 : mgmt2;
    series.push(
      monthlyNetForManagementFee(gross, commissionPct, energy, management, otherFixed).net
    );
  }
  return series;
}

function paybackFromSeries(investmentTvac: number, monthlyNets: number[]): number | null {
  if (monthlyNets.length === 0) return null;
  let cumulative = -investmentTvac;
  for (let i = 0; i < monthlyNets.length; i++) {
    cumulative += monthlyNets[i];
    if (cumulative >= 0) return i + 1;
  }
  return null;
}

export function computeRoiSimulation(input: RoiSimulatorInput): RoiSimulatorResult {
  const count = Math.max(1, Math.floor(input.chargerCount) || 1);
  const chargerUnit = Math.max(0, input.chargerUnitCostHt);
  const installation = Math.max(0, input.installationCostHt);
  const vat = Math.max(0, input.vatRatePercent) / 100;
  const sessions = Math.max(0, input.sessionsPerMonth);
  const kwhPerSession = Math.max(0.1, input.kwhPerSession);
  const energyCost = Math.max(0, input.energyCostPerKwh);
  const otherFixed = Math.max(0, input.monthlyOtherFixedCosts);
  const commissionPct = Math.max(0, Math.min(100, input.itelecCommissionPercent));
  const mgmt1 = Math.max(0, input.managementFeePhase1Eur);
  const mgmt2 = Math.max(0, input.managementFeePhase2Eur);

  const perSession = sessionRevenues(input);
  const monthlyRechargeRevenue = round2(sessions * perSession.rechargePerSession);
  const monthlyPlugInFeeRevenue = round2(sessions * perSession.plugInPerSession);
  const monthlyGrossRevenue = round2(sessions * perSession.totalPerSession);

  const totalInvestmentHt = round2(chargerUnit * count + installation);
  const totalInvestmentTvac = round2(totalInvestmentHt * (1 + vat));
  const monthlyEnergyCost = round2(sessions * kwhPerSession * energyCost);

  const phase1 = monthlyNetForManagementFee(
    monthlyGrossRevenue,
    commissionPct,
    monthlyEnergyCost,
    mgmt1,
    otherFixed
  );

  const phase2 = monthlyNetForManagementFee(
    monthlyGrossRevenue,
    commissionPct,
    monthlyEnergyCost,
    mgmt2,
    otherFixed
  );

  const monthlyNetPhase1 = phase1.net;
  const monthlyNetPhase2 = phase2.net;
  const monthlyNet = monthlyNetPhase1;
  const annualNet = round2(monthlyNetPhase1 * 12);

  const commissionPerSession = round2(perSession.totalPerSession * (commissionPct / 100));
  const energyPerSession = round2(kwhPerSession * energyCost);
  const mgmtPerSessionPhase1 = round2(mgmt1 / Math.max(1, sessions));
  const marginPerSession = round2(
    perSession.totalPerSession - commissionPerSession - energyPerSession - mgmtPerSessionPhase1
  );

  const monthlySeries = buildMonthlyNetSeries(input, monthlyGrossRevenue, monthlyEnergyCost, otherFixed);
  const cumulativeProfitOverHorizon = round2(
    monthlySeries.reduce((s, n) => s + n, 0) - totalInvestmentTvac
  );
  const paybackMonths = paybackFromSeries(totalInvestmentTvac, monthlySeries);

  let roiPercentOverHorizon: number | null = null;
  if (totalInvestmentTvac > 0 && cumulativeProfitOverHorizon > 0) {
    roiPercentOverHorizon = round2((cumulativeProfitOverHorizon / totalInvestmentTvac) * 100);
  }

  const { level, label } = profitabilityFromPayback(paybackMonths, monthlyNetPhase1);

  return {
    totalInvestmentHt,
    totalInvestmentTvac,
    monthlyGrossRevenue,
    monthlyRechargeRevenue,
    monthlyPlugInFeeRevenue,
    monthlyItelecCommission: phase1.commission,
    monthlyNetRevenueAfterCommission: phase1.afterCommission,
    monthlyManagementFeePhase1: mgmt1,
    monthlyManagementFeePhase2: mgmt2,
    monthlyEnergyCost,
    monthlyOtherFixed: otherFixed,
    monthlyNetPhase1,
    monthlyNetPhase2,
    monthlyNet,
    annualNet,
    revenuePerSessionTotal: perSession.totalPerSession,
    marginPerSession,
    paybackMonths,
    roiPercentOverHorizon,
    cumulativeProfitOverHorizon,
    profitability: level,
    profitabilityLabel: label,
  };
}

export function formatEuro(n: number): string {
  return new Intl.NumberFormat("fr-BE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

export function formatMonths(months: number | null): string {
  if (months == null) return "—";
  if (months < 12) return `${months} mois`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (m === 0) return `${y} an${y > 1 ? "s" : ""}`;
  return `${y} an${y > 1 ? "s" : ""} et ${m} mois`;
}
