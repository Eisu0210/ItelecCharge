import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SeoHead } from "../components/SeoHead";
import { apiFetchPath } from "../lib/apiBase";
import { publicApiErrorMessage } from "../lib/safeUserMessage";
import { buildPageTitle } from "../lib/seo";

type SupplementLine = { label: string; amountHtva: number };

type Offer = {
  companyName: string;
  contactName: string;
  email: string;
  totalHtva: number;
  vatRatePercent: number;
  vatAmount: number;
  totalTvac: number;
  cgvUrl: string;
  quoteNumber: string;
  quoteDate: string;
  validUntil: string;
  address: string;
  baseLabel: string;
  baseInstallationHtva: number;
  supplements: SupplementLine[];
  mountLabel?: string;
  supplyLabel?: string;
  quoteMode?: "subscription" | "detailed";
  alreadySigned?: boolean;
  signedAt?: string;
  clientSignedName?: string;
  acceptanceProofText?: string;
};

function euro(n: number) {
  return new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(n);
}

function formatSignedAt(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("fr-BE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TotalsBlock({ o }: { o: Offer }) {
  return (
    <div
      style={{
        marginBottom: "1.25rem",
        padding: "1rem 1.1rem",
        background: "#f0f7f4",
        borderRadius: 8,
        border: "1px solid rgba(0,104,55,0.15)",
      }}
    >
      <p style={{ margin: "0 0 0.35rem", fontSize: "0.9rem" }}>
        Total HTVA : <strong>{euro(o.totalHtva)}</strong>
      </p>
      <p style={{ margin: "0 0 0.35rem", fontSize: "0.9rem" }}>
        TVA {o.vatRatePercent} % : <strong>{euro(o.vatAmount)}</strong>
      </p>
      <p style={{ margin: 0, fontSize: "1.05rem", color: "#006837" }}>
        Total TVAC à payer : <strong>{euro(o.totalTvac)}</strong>
      </p>
      <p style={{ margin: "0.75rem 0 0", fontSize: "0.8rem", color: "var(--color-muted)" }}>
        Montant total à payer pour un consommateur (TVA comprise), conformément aux règles belges.
      </p>
    </div>
  );
}

export function PublicDevisSignerPage() {
  const { token } = useParams<{ token: string }>();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [err, setErr] = useState("");
  const [signerName, setSignerName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptCgv, setAcceptCgv] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [proofText, setProofText] = useState("");

  useEffect(() => {
    if (!token) {
      setErr("Lien invalide.");
      return;
    }
    void (async () => {
      try {
        const r = await fetch(apiFetchPath(`/api/public/quote-offer/${encodeURIComponent(token)}`));
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          setErr(publicApiErrorMessage(j, "Devis introuvable ou lien expiré."));
          return;
        }
        const data = (await r.json()) as Offer;
        setOffer(data);
        if (data.alreadySigned) {
          setDone(true);
          if (data.acceptanceProofText) setProofText(data.acceptanceProofText);
        } else {
          setSignerName(data.contactName ?? "");
        }
      } catch {
        setErr("Impossible de charger le devis. Vérifiez votre connexion.");
      }
    })();
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !signerName.trim() || !acceptTerms || !acceptCgv || offer?.alreadySigned) return;
    setBusy(true);
    setErr("");
    try {
      const r = await fetch(apiFetchPath(`/api/public/quote-sign/${encodeURIComponent(token)}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accept: true,
          signerName: signerName.trim(),
          acceptTerms: true,
          acceptCgv: true,
        }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setErr(publicApiErrorMessage(j, "Acceptation impossible. Réessayez ou contactez-nous."));
        setBusy(false);
        return;
      }
      const j = (await r.json()) as { proofText?: string };
      const signedName = signerName.trim();
      const signedAt = new Date().toISOString();
      setProofText(j.proofText ?? "");
      setOffer((prev) =>
        prev
          ? { ...prev, alreadySigned: true, clientSignedName: signedName, signedAt }
          : prev
      );
      setDone(true);
    } catch {
      setErr("Erreur réseau. Réessayez dans un instant.");
    }
    setBusy(false);
  }

  function quoteTable(o: Offer) {
    return (
      <div className="table-wrap">
      <table style={{ width: "100%", fontSize: "0.9rem", borderCollapse: "collapse", marginBottom: "1rem" }}>
        <thead>
          <tr style={{ background: "#006837", color: "#fff" }}>
            <th align="left" style={{ padding: "0.5rem 0.65rem" }}>
              Désignation
            </th>
            <th align="right" style={{ padding: "0.5rem 0.65rem" }}>
              HTVA
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: "0.5rem 0.65rem", borderBottom: "1px solid var(--color-border)" }}>{o.baseLabel}</td>
            <td align="right" style={{ padding: "0.5rem 0.65rem", borderBottom: "1px solid var(--color-border)" }}>
              {euro(o.baseInstallationHtva)}
            </td>
          </tr>
          {o.supplements.map((line) => (
            <tr key={line.label}>
              <td
                style={{
                  padding: "0.5rem 0.65rem",
                  borderBottom: "1px solid var(--color-border)",
                  color: "var(--color-muted)",
                }}
              >
                {line.label}
              </td>
              <td align="right" style={{ padding: "0.5rem 0.65rem", borderBottom: "1px solid var(--color-border)" }}>
                {euro(line.amountHtva)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    );
  }

  const cgvHref = offer?.cgvUrl || "/conditions-generales";

  return (
    <>
      <SeoHead
        title={buildPageTitle("Signature de devis")}
        description="Acceptation électronique de votre devis ITELEC CHARGE."
        path={`/devis-signer/${token ?? ""}`}
        noindex
      />
      <div
        className="devis-signer-page"
        style={{ background: "linear-gradient(180deg, #f4f7fa 0%, #e8eef3 100%)" }}
      >
      <div className="devis-signer-inner">
        <div
          style={{
            background: "#003358",
            borderRadius: "12px 12px 0 0",
            padding: "1.5rem 1.75rem",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#fff" }}>Itelec Charge</p>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.85rem", color: "#fdee00" }}>
            Acceptation électronique de votre devis
          </p>
        </div>

        <div
          className="card devis-signer-card"
          style={{
            borderRadius: "0 0 12px 12px",
            border: "1px solid var(--color-border)",
            borderTop: "none",
          }}
        >
          {err ? (
            <p style={{ color: "#c0392b" }} role="alert">
              {err}
            </p>
          ) : null}

          {!offer && !err ? <p>Chargement de votre devis…</p> : null}

          {offer ? (
            <>
              <p style={{ margin: "0 0 0.25rem", fontSize: "0.85rem", color: "var(--color-muted)" }}>
                Devis <strong>{offer.quoteNumber}</strong> · {offer.quoteDate}
                {offer.quoteMode === "subscription" ? " · forfait avec abonnement" : offer.quoteMode === "detailed" ? " · détail sans abonnement" : null}
              </p>
              <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", color: "var(--color-muted)" }}>
                Valable jusqu&apos;au <strong>{offer.validUntil}</strong>
              </p>
              <h1 style={{ marginTop: 0, fontSize: "1.2rem" }}>{offer.companyName}</h1>
              <p style={{ color: "var(--color-muted)", fontSize: "0.95rem", marginTop: 0 }}>
                {offer.contactName} · {offer.email}
                <br />
                {offer.address}
              </p>
              {(offer.mountLabel || offer.supplyLabel) && (
                <p style={{ fontSize: "0.9rem", margin: "0 0 1rem" }}>
                  {offer.mountLabel}
                  {offer.mountLabel && offer.supplyLabel ? " · " : null}
                  {offer.supplyLabel}
                </p>
              )}

              {quoteTable(offer)}
              <TotalsBlock o={offer} />

              <p style={{ fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                <a href={cgvHref} target="_blank" rel="noopener noreferrer">
                  Conditions générales de prestation et d&apos;exploitation
                </a>
              </p>

              {done ? (
                <div
                  style={{
                    padding: "1rem 1.1rem",
                    background: "#f0f7f4",
                    borderRadius: 8,
                    border: "1px solid rgba(0,104,55,0.2)",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "1.05rem", color: "var(--color-navy)" }}>
                    <strong>Devis accepté électroniquement</strong> — merci !
                  </p>
                  <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem", color: "var(--color-muted)" }}>
                    Acceptation enregistrée au nom de <strong>{offer.clientSignedName ?? signerName}</strong>
                    {offer.signedAt ? <> le {formatSignedAt(offer.signedAt)}</> : null}. Une confirmation vous a été
                    envoyée par e-mail avec le PDF du devis accepté.
                  </p>
                  {proofText ? (
                    <p
                      style={{
                        margin: "0.75rem 0 0",
                        fontSize: "0.8rem",
                        color: "var(--color-muted)",
                        fontFamily: "monospace",
                        wordBreak: "break-word",
                      }}
                    >
                      {proofText}
                    </p>
                  ) : offer.acceptanceProofText ? (
                    <p style={{ margin: "0.75rem 0 0", fontSize: "0.8rem", color: "var(--color-muted)" }}>
                      {offer.acceptanceProofText}
                    </p>
                  ) : null}
                  <Link to="/" className="btn btn-ghost" style={{ display: "inline-block", marginTop: "1rem", textDecoration: "none" }}>
                    Retour au site Itelec Charge
                  </Link>
                </div>
              ) : (
                <form onSubmit={submit}>
                  <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Acceptation électronique du devis</h2>
                  <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", color: "var(--color-muted)" }}>
                    Il ne s&apos;agit pas d&apos;une signature électronique qualifiée (eIDAS), mais d&apos;une
                    acceptation électronique enregistrée avec preuve (nom, date, adresse IP, version du document).
                  </p>
                  <div className="field">
                    <label htmlFor="signerName">Nom et prénom de la personne qui accepte</label>
                    <input
                      id="signerName"
                      className="input"
                      required
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="Ex. Jean Dupont"
                    />
                  </div>
                  <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    <input
                      type="checkbox"
                      required
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      style={{ marginTop: "0.25rem" }}
                    />
                    <span style={{ fontSize: "0.9rem" }}>
                      En cochant cette case et en cliquant sur « J&apos;accepte ce devis », je confirme avoir pris
                      connaissance du devis n° <strong>{offer.quoteNumber}</strong>, de son{" "}
                      <strong>montant total TVAC ({euro(offer.totalTvac)})</strong>, des prestations décrites
                      ci-dessus, et je l&apos;accepte électroniquement.
                    </span>
                  </label>
                  <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginBottom: "1rem" }}>
                    <input
                      type="checkbox"
                      required
                      checked={acceptCgv}
                      onChange={(e) => setAcceptCgv(e.target.checked)}
                      style={{ marginTop: "0.25rem" }}
                    />
                    <span style={{ fontSize: "0.9rem" }}>
                      J&apos;ai lu et j&apos;accepte les{" "}
                      <a href={cgvHref} target="_blank" rel="noopener noreferrer">
                        conditions générales de prestation et d&apos;exploitation ITELEC CHARGE
                      </a>
                      .
                    </span>
                  </label>
                  <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: "100%" }}>
                    {busy ? "Enregistrement…" : "J'accepte ce devis"}
                  </button>
                </form>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
    </>
  );
}
