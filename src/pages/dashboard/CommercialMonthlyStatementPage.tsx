import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { apiFetch, formatApiErrorMessage } from "../../lib/api";
import { useData } from "../../context/DataContext";
import { COMMISSION_PER_INSTALLATION } from "../../types";
import type { Lead } from "../../types";

type UserRow = {
  id: number;
  login: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
};

function euro(n: number): string {
  return `${Math.round(n * 100) / 100} €`;
}

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function clampMonthNotFuture(ym: string, maxYm: string): string {
  const m = (ym || "").slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(m)) return maxYm;
  return m > maxYm ? maxYm : m;
}

function leadReferenceDateForMonth(lead: Lead): Date {
  return new Date(lead.report?.signedAt ?? lead.slotStart ?? lead.createdAt);
}

function prettyMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y ?? 2000, (m ?? 1) - 1, 1);
  return d.toLocaleDateString("fr-BE", { year: "numeric", month: "long" });
}

export function CommercialMonthlyStatementPage() {
  const { commercialId } = useParams();
  const { data } = useData();
  const [searchParams, setSearchParams] = useSearchParams();

  const cid = String(commercialId ?? "").toLowerCase().trim();
  const currentMonth = monthKey(new Date());
  const rawMonth = searchParams.get("mois") || currentMonth;
  const month = clampMonthNotFuture(rawMonth, currentMonth);

  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [userErr, setUserErr] = useState<string | null>(null);

  useEffect(() => {
    if (month !== rawMonth.slice(0, 7)) {
      setSearchParams({ mois: month }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setUserErr(null);
        const u = await apiFetch<UserRow[]>("/api/users");
        if (!cancel) setUsers(u);
      } catch (e) {
        if (!cancel) setUserErr(formatApiErrorMessage(e, "Impossible de charger la fiche commercial (coordonnées)."));
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const commercialUser = useMemo(() => {
    if (!users) return null;
    return users.find((u) => u.login.toLowerCase() === cid) ?? null;
  }, [users, cid]);

  const monthLeads = useMemo(() => {
    return data.leads
      .filter((l) => l.commercialId === cid && l.status === "cloture" && !l.commissionPaid)
      .filter((l) => monthKey(leadReferenceDateForMonth(l)) === month)
      .sort((a, b) =>
        String(leadReferenceDateForMonth(a).toISOString()).localeCompare(leadReferenceDateForMonth(b).toISOString())
      );
  }, [data.leads, cid, month]);

  const totalMonth = useMemo(
    () => monthLeads.length * COMMISSION_PER_INSTALLATION,
    [monthLeads]
  );

  return (
    <div>
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        <div>
          <h1 style={{ marginTop: 0 }}>Fiche mensuelle — {cid}</h1>
          <p style={{ color: "var(--color-muted)", marginTop: "0.25rem" }}>
            Imprimez ou enregistrez en PDF la fiche “clients gagnés” du mois.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Link to={`/app/commerciaux/${encodeURIComponent(cid)}`} className="btn btn-ghost" style={{ textDecoration: "none" }}>
            ← Détail commercial
          </Link>
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            Imprimer / PDF
          </button>
        </div>
      </div>

      <div className="no-print card" style={{ marginBottom: "1rem" }}>
        <div className="field" style={{ margin: 0, maxWidth: 260 }}>
          <label>Mois</label>
          <input
            type="month"
            className="input"
            value={month}
            max={currentMonth}
            onChange={(e) => setSearchParams({ mois: clampMonthNotFuture(e.target.value, currentMonth) })}
          />
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "0.9rem", color: "var(--color-muted)" }}>Document</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>Fiche mensuelle — vos commissions</div>
            <div style={{ color: "var(--color-muted)" }}>Période : {prettyMonth(month)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.9rem", color: "var(--color-muted)" }}>Émis le</div>
            <div style={{ fontWeight: 700 }}>{new Date().toLocaleDateString("fr-BE")}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Coordonnées</h2>
        {userErr ? <p style={{ color: "#c0392b", margin: 0 }}>{userErr}</p> : null}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.75rem" }}>
          <div>
            <div style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>Commercial</div>
            <div style={{ fontWeight: 800 }}>
              {commercialUser
                ? [commercialUser.firstName, commercialUser.lastName].filter(Boolean).join(" ") || commercialUser.login
                : cid}
            </div>
            <div style={{ color: "var(--color-muted)" }}>Identifiant : {cid}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>Entreprise</div>
            <div style={{ fontWeight: 800 }}>ITELEC CHARGE</div>
            <div style={{ color: "var(--color-muted)" }}>Récapitulatif commissions</div>
          </div>
        </div>
        <p style={{ marginTop: "0.75rem", marginBottom: 0, color: "var(--color-muted)", fontSize: "0.9rem" }}>
          Note : si tu veux des coordonnées complètes (adresse, téléphone, IBAN…), il faut qu’on ajoute ces champs au profil
          utilisateur “commercial”.
        </p>
      </div>

      <div className="table-wrap table-wrap--scroll-md card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Adresse</th>
              <th>À percevoir</th>
            </tr>
          </thead>
          <tbody>
            {monthLeads.map((l) => {
              const d = leadReferenceDateForMonth(l);
              return (
                <tr key={l.id}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {d.toLocaleDateString("fr-BE", { dateStyle: "short" })}
                  </td>
                  <td>
                    <strong>{l.companyName}</strong>
                    <div style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>
                      {l.contactName} — {l.phone}
                    </div>
                  </td>
                  <td style={{ fontSize: "0.85rem" }}>{l.address}</td>
                  <td style={{ fontSize: "0.85rem" }}>{euro(COMMISSION_PER_INSTALLATION)}</td>
                </tr>
              );
            })}
            {monthLeads.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ color: "var(--color-muted)", padding: "0.9rem 0.75rem" }}>
                  Aucun dossier clôturé à payer sur ce mois.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Total à percevoir</h2>
        <p style={{ fontSize: "1.75rem", fontWeight: 900, margin: 0 }}>{euro(totalMonth)}</p>
      </div>
    </div>
  );
}

