const items = [
  {
    q: "Combien une borne peut-elle rapporter ?",
    a: "Le rendement dépend du trafic, du tarif appliqué aux utilisateurs et de l’occupation. Le modèle brochure retient que vous percevez 100 % des recharges, moins 12 % de commission et l’abonnement fixe (59 € puis 35 €). Une étude de fréquentation permet d’affiner une fourchette réaliste pour votre site.",
  },
  {
    q: "Combien de temps dure l’installation sur place ?",
    a: "La durée varie selon la configuration (murale ou sur pied), la longueur de câble et le type de sol. En règle générale, comptez une demi-journée à une journée pour une installation standard incluant les essais.",
  },
  {
    q: "Quel est le délai entre la signature et la mise en route ?",
    a: "Après signature du devis, le dispatch planifie un créneau avec le technicien. Selon disponibilités matérielles et administratives, il faut en pratique souvent entre 2 et 6 semaines ; les projets complexes peuvent s’étaler davantage.",
  },
  {
    q: "Qui gère l’exploitation au quotidien ?",
    a: "L’offre inclut maintenance et exploitation : vous n’avez pas à gérer les incidents techniques courants ni la plateforme de recharge.",
  },
  {
    q: "Pour quels types de sites ?",
    a: "PME, copropriétés, parkings de magasins, sites semi-publics : chaque configuration est étudiée pour la puissance disponible, l’accès et la réglementation locale.",
  },
];

export function FaqPage() {
  return (
    <div className="container" style={{ padding: "2.5rem 0 3rem" }}>
      <h1>Questions fréquentes</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.5rem" }}>
        {items.map((it) => (
          <div key={it.q} className="card">
            <h2 style={{ marginTop: 0, fontSize: "1.15rem" }}>{it.q}</h2>
            <p style={{ marginBottom: 0, color: "var(--color-muted)" }}>{it.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
