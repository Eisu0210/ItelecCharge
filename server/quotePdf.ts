import { createWriteStream } from "node:fs";
import { access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";
import type { QuoteDocument } from "../src/lib/quoteDocument";
import { formatEuro } from "../src/lib/quoteDocument";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(here, "..");
const LOGO_PATH = join(projectRoot, "public", "Itelec charge transparent.png");

const NAVY = "#003358";
const GREEN = "#006837";
const MUTED = "#5a6b7a";
const BORDER = "#d8e0e6";

function companyBlock(): { name: string; lines: string[] } {
  const name = process.env.COMPANY_LEGAL_NAME?.trim() || "Itelec Charge";
  const lines = [
    process.env.COMPANY_ADDRESS?.trim() || "Belgique",
    process.env.COMPANY_EMAIL?.trim() || "hello@itelec-charge.be",
    process.env.COMPANY_PHONE?.trim() || "",
    process.env.COMPANY_VAT?.trim() ? `TVA : ${process.env.COMPANY_VAT.trim()}` : "",
  ].filter(Boolean);
  return { name, lines };
}

async function tryEmbedLogo(doc: InstanceType<typeof PDFDocument>): Promise<number> {
  try {
    await access(LOGO_PATH);
    doc.image(LOGO_PATH, 50, 42, { width: 72 });
    return 95;
  } catch {
    return 50;
  }
}

/** Génère le PDF du devis en mémoire. */
export function generateQuotePdfBuffer(doc: QuoteDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: "A4", margin: 50, info: {
      Title: `Devis ${doc.quoteNumber}`,
      Author: "Itelec Charge",
      Subject: doc.companyName,
    }});
    const chunks: Buffer[] = [];
    pdf.on("data", (c) => chunks.push(c as Buffer));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    void (async () => {
      const company = companyBlock();
      const contentTop = await tryEmbedLogo(pdf);

      pdf.rect(0, 0, pdf.page.width, 28).fill(NAVY);
      pdf.fillColor("#ffffff").fontSize(11).text("DEVIS — INSTALLATION BORNE DE RECHARGE", 50, 9, {
        align: "right",
        width: pdf.page.width - 100,
      });

      pdf.fillColor(NAVY).fontSize(20).font("Helvetica-Bold").text(company.name, 130, contentTop);
      pdf.fillColor(MUTED).fontSize(9).font("Helvetica");
      company.lines.forEach((line, i) => {
        pdf.text(line, 130, contentTop + 26 + i * 12);
      });

      const metaY = contentTop + 70;
      pdf.fillColor(NAVY).fontSize(10).font("Helvetica-Bold").text("DEVIS N°", 50, metaY);
      pdf.font("Helvetica").fillColor(MUTED).text(doc.quoteNumber, 110, metaY);
      pdf.fillColor(NAVY).font("Helvetica-Bold").text("Date", 280, metaY);
      pdf.font("Helvetica").fillColor(MUTED).text(doc.quoteDate, 320, metaY);
      pdf.fillColor(NAVY).font("Helvetica-Bold").text("Valable jusqu’au", 50, metaY + 18);
      pdf.font("Helvetica").fillColor(MUTED).text(doc.validUntil, 150, metaY + 18);

      const clientY = metaY + 52;
      pdf.roundedRect(50, clientY, pdf.page.width - 100, 88, 6).lineWidth(1).strokeColor(BORDER).stroke();
      pdf.fillColor(NAVY).fontSize(11).font("Helvetica-Bold").text("Client & chantier", 62, clientY + 12);
      pdf.font("Helvetica").fillColor(MUTED).fontSize(9);
      const clientLines = [
        doc.companyName,
        `Contact : ${doc.contactName}`,
        doc.address,
        `${doc.email} · ${doc.phone}`,
      ];
      clientLines.forEach((line, i) => pdf.text(line, 62, clientY + 30 + i * 13));

      let y = clientY + 108;
      if (doc.mountLabel || doc.supplyLabel || doc.chargerCount) {
        pdf.fillColor(NAVY).fontSize(10).font("Helvetica-Bold").text("Configuration retenue", 50, y);
        y += 16;
        pdf.font("Helvetica").fillColor(MUTED).fontSize(9);
        if (doc.chargerCount) {
          pdf.text(`Nombre de bornes : ${doc.chargerCount}`, 50, y);
          y += 13;
        }
        if (doc.mountLabel) {
          pdf.text(doc.mountLabel, 50, y);
          y += 13;
        }
        if (doc.supplyLabel) {
          pdf.text(doc.supplyLabel, 50, y);
          y += 13;
        }
        if (doc.headAmperageA) {
          pdf.text(`Intensité tête de colonne : ${doc.headAmperageA} A`, 50, y);
          y += 13;
        }
        if (doc.cableLengthM != null) {
          pdf.text(`Longueur câble estimée : ${doc.cableLengthM} m`, 50, y);
          y += 13;
        }
        if (doc.trenchLengthM != null) {
          pdf.text(
            `Longueur tranchée : ${doc.trenchLengthM} m${doc.trenchLabel ? ` (${doc.trenchLabel})` : ""}`,
            50,
            y
          );
          y += 13;
        }
        y += 8;
      }

      const tableTop = y;
      const colLabel = 50;
      const colAmount = pdf.page.width - 130;
      const rowH = 22;

      pdf.fillColor(GREEN).rect(50, tableTop, pdf.page.width - 100, rowH).fill();
      pdf.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold");
      pdf.text("Désignation", colLabel + 8, tableTop + 7);
      pdf.text("Montant HTVA", colAmount, tableTop + 7, { width: 80, align: "right" });

      let rowY = tableTop + rowH;
      const drawRow = (label: string, amount: number, bold = false) => {
        pdf.fillColor(bold ? "#f0f7f4" : "#ffffff").rect(50, rowY, pdf.page.width - 100, rowH).fill();
        pdf.strokeColor(BORDER).lineWidth(0.5).moveTo(50, rowY + rowH).lineTo(pdf.page.width - 50, rowY + rowH).stroke();
        pdf.fillColor(bold ? NAVY : MUTED).font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9);
        pdf.text(label, colLabel + 8, rowY + 7, { width: colAmount - colLabel - 16 });
        pdf.text(formatEuro(amount), colAmount, rowY + 7, { width: 80, align: "right" });
        rowY += rowH;
      };

      drawRow(doc.baseLabel, doc.baseInstallationHtva);
      for (const line of doc.supplements) {
        drawRow(line.label, line.amountHtva);
      }
      drawRow("TOTAL HTVA", doc.totalHtva, true);
      drawRow(`TVA ${doc.vatRatePercent} %`, doc.vatAmount);
      drawRow("TOTAL TVAC À PAYER", doc.totalTvac, true);

      y = rowY + 16;

      const cgvNote = doc.cgvUrl
        ? `Conditions générales de prestation et d'exploitation ITELEC CHARGE : ${doc.cgvUrl}`
        : "Conditions générales de prestation et d'exploitation ITELEC CHARGE — disponibles sur le site.";
      pdf.fillColor(MUTED).fontSize(8).text(
        "Montants en euros. Le total TVAC est le montant total à payer pour un consommateur (TVA comprise). " +
          "Ce document est une offre commerciale, pas une facture. " +
          cgvNote,
        50,
        y,
        { width: pdf.page.width - 100 }
      );

      pdf.end();
    })().catch(reject);
  });
}

/** Écrit le PDF sur disque (debug / tests). */
export async function writeQuotePdfFile(doc: QuoteDocument, outPath: string): Promise<void> {
  const buf = await generateQuotePdfBuffer(doc);
  await new Promise<void>((resolve, reject) => {
    const ws = createWriteStream(outPath);
    ws.on("finish", () => resolve());
    ws.on("error", reject);
    ws.end(buf);
  });
}
