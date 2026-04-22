export function DocsPage() {
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Documentation commerciale</h1>
      <p style={{ color: "var(--color-muted)" }}>
        Brochure tarifaire et arguments clés (extrait du document « Orange and White Modern Business Brochure
        Document A4 »).
      </p>
      <div className="card" style={{ marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>À glisser dans votre dossier</h2>
        <ul>
          <li>
            <strong>Installation murale</strong> : 1&nbsp;600&nbsp;€ HTVA (10&nbsp;m câble, 2&nbsp;m tranchée
            max inclus).
          </li>
          <li>
            <strong>Installation sur pied</strong> : 2&nbsp;000&nbsp;€ HTVA (support, semelle, mêmes
            inclus).
          </li>
          <li>
            <strong>Abonnement</strong> : 59&nbsp;€/mois pendant 48 mois, puis 35&nbsp;€/mois — maintenance &
            exploitation incluses.
          </li>
          <li>
            <strong>Revenu client</strong> : 100&nbsp;% des recharges − 12&nbsp;% commission − abonnement.
          </li>
        </ul>
        <p style={{ marginBottom: 0 }}>
          Placez votre PDF final dans <code>public/brochure.pdf</code> puis ajoutez un lien ici vers{" "}
          <code>/brochure.pdf</code>.
        </p>
      </div>
    </div>
  );
}
