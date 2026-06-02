import "./db/loadEnv";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildQuoteDocument } from "../src/lib/quoteDocument";
import type { Lead } from "../src/types";
import { generateQuotePdfBuffer } from "./quotePdf";

const sample: Lead = {
  id: "lead-demo-001",
  createdAt: new Date().toISOString(),
  commercialId: "demo",
  companyName: "Garage Dupont SPRL",
  contactName: "Jean Dupont",
  email: "client@example.com",
  phone: "+32 470 00 00 00",
  address: "Rue du Bosquet 19, 6181 Gouy-lez-Pieton",
  status: "devis_envoye",
  workflowStage: "devis_pret",
  projectSpecs: {
    commercial: { mountType: "mural", supplyType: "tri", chargerCount: 1 },
    siteSurvey: {
      cableLengthM: 18,
      trenchLengthM: 5,
      trenchType: "earth",
      baseInstallationHtva: 1600,
    },
  },
  surveyMaterials: [{ id: "1", label: "Borne Hager Witty", quantity: 1, unit: "u" }],
};

async function main() {
  const doc = buildQuoteDocument(sample, "https://itelec-charge.be/devis-signer/demo");
  const buf = await generateQuotePdfBuffer(doc);
  const out = join(process.cwd(), "devis-apercu.pdf");
  await writeFile(out, buf);
  console.log("PDF écrit :", out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
