/** Taux TVA par défaut (Belgique, prestations courantes — configurable via QUOTE_VAT_RATE). */
export function getDefaultVatRate(): number {
  const raw = process.env.QUOTE_VAT_RATE?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0 && n < 1) return n;
    if (Number.isFinite(n) && n >= 1 && n <= 100) return n / 100;
  }
  return 0.21;
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export interface QuoteVatBreakdown {
  vatRate: number;
  vatRatePercent: number;
  vatAmount: number;
  totalTvac: number;
}

export function quoteVatBreakdown(totalHtva: number, vatRate = getDefaultVatRate()): QuoteVatBreakdown {
  const vatAmount = roundMoney(totalHtva * vatRate);
  const totalTvac = roundMoney(totalHtva + vatAmount);
  return {
    vatRate,
    vatRatePercent: Math.round(vatRate * 100),
    vatAmount,
    totalTvac,
  };
}
