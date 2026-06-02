export const MIGRATION_008_STATEMENTS: string[] = [
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT`,
  `CREATE INDEX IF NOT EXISTS idx_leads_stripe_customer ON leads (stripe_customer_id)`,
  `CREATE TABLE IF NOT EXISTS lead_billing_periods (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
    period_label TEXT NOT NULL,
    gross_recharge_eur NUMERIC(12, 2) NOT NULL,
    commission_percent NUMERIC(5, 2) NOT NULL DEFAULT 12,
    commission_eur NUMERIC(12, 2) NOT NULL,
    stripe_invoice_id TEXT,
    status TEXT NOT NULL DEFAULT 'invoiced' CHECK (status IN ('invoiced', 'paid', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_lead_billing_periods_lead ON lead_billing_periods (lead_id)`,
];
