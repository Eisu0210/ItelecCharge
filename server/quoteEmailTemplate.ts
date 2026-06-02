import type { QuoteDocument } from "../src/lib/quoteDocument";
import { formatEuro } from "../src/lib/quoteDocument";

function safeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url.replace(/"/g, "") : "#";
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function linesTableHtml(doc: QuoteDocument): string {
  const rows = [
    `<tr>
      <td style="padding:12px 14px;color:#5a6b7a;border-bottom:1px solid #e8eef3;">${escHtml(doc.baseLabel)}</td>
      <td style="padding:12px 14px;text-align:right;font-weight:600;color:#1a2b3c;border-bottom:1px solid #e8eef3;white-space:nowrap;">${escHtml(formatEuro(doc.baseInstallationHtva))}</td>
    </tr>`,
    ...doc.supplements.map(
      (line) => `<tr>
      <td style="padding:12px 14px;color:#5a6b7a;border-bottom:1px solid #e8eef3;">${escHtml(line.label)}</td>
      <td style="padding:12px 14px;text-align:right;font-weight:600;color:#1a2b3c;border-bottom:1px solid #e8eef3;white-space:nowrap;">${escHtml(formatEuro(line.amountHtva))}</td>
    </tr>`
    ),
    `<tr style="background:#f8fafc;">
      <td style="padding:12px 14px;font-weight:700;color:#003358;border-bottom:1px solid #e8eef3;">Total HTVA</td>
      <td style="padding:12px 14px;text-align:right;font-weight:700;color:#1a2b3c;border-bottom:1px solid #e8eef3;">${escHtml(formatEuro(doc.totalHtva))}</td>
    </tr>`,
    `<tr>
      <td style="padding:12px 14px;color:#5a6b7a;border-bottom:1px solid #e8eef3;">TVA ${doc.vatRatePercent} %</td>
      <td style="padding:12px 14px;text-align:right;font-weight:600;color:#1a2b3c;border-bottom:1px solid #e8eef3;">${escHtml(formatEuro(doc.vatAmount))}</td>
    </tr>`,
    `<tr style="background:#f0f7f4;">
      <td style="padding:14px;font-weight:700;color:#003358;">Total TVAC à payer</td>
      <td style="padding:14px;text-align:right;font-weight:800;font-size:18px;color:#006837;">${escHtml(formatEuro(doc.totalTvac))}</td>
    </tr>`,
  ];
  return rows.join("");
}

function configBullets(doc: QuoteDocument): string {
  const items: string[] = [];
  if (doc.chargerCount) items.push(`${doc.chargerCount} borne(s)`);
  if (doc.mountLabel) items.push(doc.mountLabel);
  if (doc.supplyLabel) items.push(doc.supplyLabel);
  if (doc.cableLengthM != null) items.push(`${doc.cableLengthM} m de câble`);
  if (doc.trenchLengthM != null) items.push(`${doc.trenchLengthM} m de tranchée`);
  if (items.length === 0) return "";
  return `<p style="margin:0 0 16px;font-size:14px;color:#5a6b7a;"><strong style="color:#003358;">Configuration :</strong> ${escHtml(items.join(" · "))}</p>`;
}

export function buildQuoteEmailContent(doc: QuoteDocument): { subject: string; text: string; html: string } {
  const subject = `Votre devis Itelec Charge n° ${doc.quoteNumber} — ${doc.companyName}`;
  const text = [
    `Bonjour ${doc.contactName},`,
    "",
    "Nous avons le plaisir de vous adresser notre proposition pour l'installation de votre borne de recharge.",
    "",
    `Référence devis : ${doc.quoteNumber}`,
    `Date : ${doc.quoteDate}`,
    `Valable jusqu'au : ${doc.validUntil}`,
    "",
    `Client : ${doc.companyName}`,
    `Chantier : ${doc.address}`,
    "",
    "Détail HTVA :",
    `- ${doc.baseLabel} : ${formatEuro(doc.baseInstallationHtva)}`,
    ...doc.supplements.map((l) => `- ${l.label} : ${formatEuro(l.amountHtva)}`),
    `Total HTVA : ${formatEuro(doc.totalHtva)}`,
    `TVA ${doc.vatRatePercent} % : ${formatEuro(doc.vatAmount)}`,
    `Total TVAC à payer : ${formatEuro(doc.totalTvac)}`,
    "",
    doc.cgvUrl
      ? `Conditions générales de prestation et d'exploitation ITELEC CHARGE : ${doc.cgvUrl}`
      : "",
    "",
    "Pour consulter votre devis et l'accepter électroniquement en ligne :",
    doc.portalUrl,
    "",
    "Cordialement,",
    "L'équipe Itelec Charge",
    "hello@itelec-charge.be",
  ].join("\n");

  const href = safeUrl(doc.portalUrl);
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f7fa;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fa;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:#003358;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:0.02em;">Itelec Charge</p>
              <p style="margin:8px 0 0;font-size:13px;color:#fdee00;">Installation professionnelle de bornes de recharge</p>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:32px;border-left:1px solid #e8eef3;border-right:1px solid #e8eef3;">
              <p style="margin:0 0 8px;font-size:15px;color:#1a2b3c;">Bonjour <strong>${escHtml(doc.contactName)}</strong>,</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#5a6b7a;">
                Nous avons le plaisir de vous transmettre notre <strong style="color:#003358;">proposition commerciale</strong>
                pour l'installation de votre infrastructure de recharge sur le site <strong>${escHtml(doc.companyName)}</strong>.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;background:#f8fafc;border-radius:8px;border:1px solid #e8eef3;">
                <tr>
                  <td style="padding:14px 16px;font-size:13px;color:#5a6b7a;">
                    <strong style="color:#003358;">Devis n°</strong> ${escHtml(doc.quoteNumber)}<br />
                    <strong style="color:#003358;">Date</strong> ${escHtml(doc.quoteDate)} ·
                    <strong style="color:#003358;">Valable jusqu'au</strong> ${escHtml(doc.validUntil)}
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 6px;font-size:13px;color:#5a6b7a;"><strong style="color:#003358;">Adresse du chantier</strong><br />${escHtml(doc.address)}</p>
              ${configBullets(doc)}
              <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#003358;">Récapitulatif financier</p>
              <p style="margin:0 0 12px;font-size:12px;color:#5a6b7a;">Prix total à payer (TVA ${doc.vatRatePercent} % comprise) — conformément aux règles belges pour les consommateurs.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e8eef3;border-radius:8px;overflow:hidden;margin-bottom:20px;">
                <tr style="background:#006837;">
                  <th align="left" style="padding:10px 14px;font-size:12px;color:#fff;font-weight:600;">Désignation</th>
                  <th align="right" style="padding:10px 14px;font-size:12px;color:#fff;font-weight:600;">Montant</th>
                </tr>
                ${linesTableHtml(doc)}
              </table>
              <p style="margin:0 0 14px;font-size:14px;color:#5a6b7a;text-align:center;">
                Consultez le détail de votre devis et confirmez votre accord en un clic.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 8px;">
                <tr>
                  <td style="border-radius:8px;background:#006837;">
                    <a href="${href}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Consulter et accepter le devis en ligne</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:12px;color:#5a6b7a;text-align:center;">
                Lien personnel sécurisé — valable jusqu'au ${escHtml(doc.validUntil)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#eef2f6;border-radius:0 0 12px 12px;padding:20px 32px;border:1px solid #e8eef3;border-top:none;text-align:center;">
              <p style="margin:0;font-size:13px;color:#5a6b7a;">
                <strong style="color:#003358;">Itelec Charge</strong> · hello@itelec-charge.be<br />
                Total TVAC indiqué ci-dessus — acceptation électronique possible via le lien
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
