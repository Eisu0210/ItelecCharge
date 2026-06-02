import { apiFetch } from "./api";
import type { SurveyMaterialItem } from "../types";

export type StockDossierSyncResult = {
  applied: Array<{
    label: string;
    articleNumber: string;
    delta: number;
    stockItemId: string;
    quantityAfter: number;
  }>;
  warnings: string[];
};

export function materialsToStockLines(items: SurveyMaterialItem[]) {
  return items.map((m) => ({
    catalogItemId: m.catalogItemId ?? null,
    articleNumber: m.articleNumber,
    label: m.label,
    quantity: m.quantity,
  }));
}

export async function syncInstallerStockFromDossier(
  leadId: string,
  previous: SurveyMaterialItem[],
  next: SurveyMaterialItem[]
): Promise<StockDossierSyncResult> {
  return apiFetch<StockDossierSyncResult>("/api/installer-stock/sync-dossier", {
    method: "POST",
    body: JSON.stringify({
      leadId,
      previousMaterials: materialsToStockLines(previous),
      nextMaterials: materialsToStockLines(next),
    }),
  });
}
