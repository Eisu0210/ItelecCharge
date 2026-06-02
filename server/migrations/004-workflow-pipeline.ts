/** Pipeline multi-étapes : commercial → admin (planif survey) → site survey → devis / signature. */
export const MIGRATION_004_STATEMENTS: string[] = [
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS workflow_stage TEXT`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS project_specs JSONB NOT NULL DEFAULT '{}'::jsonb`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users (id) ON DELETE SET NULL`,
  `ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_workflow_stage_check`,
  `ALTER TABLE leads ADD CONSTRAINT leads_workflow_stage_check CHECK (
    workflow_stage IS NULL OR workflow_stage IN (
      'commercial_brouillon',
      'attente_admin',
      'survey_planifie',
      'survey_terrain',
      'devis_pret',
      'devis_envoye_sign',
      'devis_signe'
    )
  )`,
  `CREATE INDEX IF NOT EXISTS idx_leads_workflow_stage ON leads (workflow_stage)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_created_by_user ON leads (created_by_user_id)`,
];
