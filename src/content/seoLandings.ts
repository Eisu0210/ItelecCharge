export type SeoLandingPage = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  sections: Array<{ h2: string; body: string }>;
  keywords: string[];
};

export const SEO_LANDING_PAGES: SeoLandingPage[] = [
  {
    slug: "bornes-recharge-entreprises",
    title: "Bornes de recharge pour entreprises et PME",
    description:
      "Équipez le parking de votre entreprise ou PME avec une borne de recharge clé en main. Installation, maintenance et exploitation par ITELEC CHARGE en Belgique.",
    h1: "Bornes de recharge pour entreprises et PME",
    intro:
      "Vos collaborateurs, visiteurs et flottes électriques ont besoin d’une recharge fiable sur site. ITELEC CHARGE dimensionne, installe et exploite des bornes adaptées aux parkings d’entreprise — sans charge administrative pour vous.",
    sections: [
      {
        h2: "Pourquoi une borne en entreprise ?",
        body: "Attirez les talents sensibles à la mobilité durable, valorisez votre image RSE et préparez votre site aux véhicules électriques. Avec notre modèle abonnement + CPO, vous percevez les recharges nettes de commission ; nous gérons maintenance et plateforme.",
      },
      {
        h2: "Installation murale ou sur pied",
        body: "Selon la configuration de votre parking, nous proposons une installation murale (à partir de 1 600 € HTVA) ou sur pied (2 000 € HTVA), avec câblage, protections et essais de conformité. Bornes Hager Witty+ ou Witty Pro selon le trafic attendu.",
      },
      {
        h2: "Accompagnement de A à Z",
        body: "Étude du site, devis détaillé, planification avec nos techniciens certifiés, mise en route et suivi. Un interlocuteur commercial dédié pour les PME et sites multi-places en Wallonie et en Belgique.",
      },
    ],
    keywords: [
      "borne recharge entreprise",
      "borne recharge PME",
      "parking entreprise voiture électrique",
      "wallbox entreprise Belgique",
      "installation borne pro",
    ],
  },
  {
    slug: "bornes-recharge-coproprietes",
    title: "Bornes de recharge pour copropriétés et syndics",
    description:
      "Solution de recharge pour copropriétés et syndics : installation de bornes, gestion CPO et maintenance. ITELEC CHARGE accompagne les résidences en Belgique.",
    h1: "Bornes de recharge pour copropriétés et syndics",
    intro:
      "Les copropriétés doivent répondre à la demande croissante de recharge sans complexifier la vie du syndic. Nous proposons une offre clé en main : étude, installation aux normes, exploitation et entretien des bornes.",
    sections: [
      {
        h2: "Un projet lisible pour le conseil syndical",
        body: "Devis transparent, planning d’intervention et explication du modèle économique (revenus des recharges, abonnement de gestion). Nous adaptons le nombre de points de charge à la demande réelle du bâtiment.",
      },
      {
        h2: "Conformité et sécurité",
        body: "Installations réalisées par des techniciens qualifiés : câblage, différentiels, mise à la terre et tests avant remise. Documentation pour l’assemblée générale et le syndic.",
      },
      {
        h2: "Exploitation sans charge pour le syndic",
        body: "Maintenance et plateforme de recharge incluses dans l’offre abonnement. Le syndic n’a pas à gérer les incidents techniques courants ni la facturation aux utilisateurs.",
      },
    ],
    keywords: [
      "borne recharge copropriété",
      "borne recharge syndic",
      "installation borne immeuble",
      "recharge véhicule électrique copropriété Belgique",
    ],
  },
  {
    slug: "bornes-recharge-parkings-commerces",
    title: "Bornes de recharge pour parkings de magasins et sites semi-publics",
    description:
      "Installez des bornes de recharge sur le parking de votre commerce ou site semi-public. Attirez des clients VE et générez un revenu complémentaire avec ITELEC CHARGE.",
    h1: "Bornes de recharge pour commerces et parkings semi-publics",
    intro:
      "Supermarchés, retail, zones d’activité, parkings visiteurs : les conducteurs électriques choisissent les lieux où ils peuvent recharger. Transformez votre parking en service visible et rentable.",
    sections: [
      {
        h2: "Attirer et fidéliser",
        body: "Une borne bien placée et fiable augmente le temps passé sur site et améliore la satisfaction client. Notre modèle vous permet de percevoir une part nette des sessions de recharge.",
      },
      {
        h2: "Totems et multi-places",
        body: "Pour les flux plus importants, la gamme Hager Witty Park (double charge sur colonne) peut être envisagée. Nous dimensionnons la puissance disponible et le raccordement au tableau.",
      },
      {
        h2: "De la demande de devis à la mise en service",
        body: "Contact commercial, proposition chiffrée, signature électronique du devis, intervention planifiée et formation rapide à l’exploitation. Demandez votre étude gratuite via notre formulaire.",
      },
    ],
    keywords: [
      "borne recharge parking magasin",
      "recharge semi-publique",
      "borne recharge commerce",
      "parking client voiture électrique",
      "CPO parking retail",
    ],
  },
  {
    slug: "installation-borne-hager-witty",
    title: "Installation borne Hager Witty — installateur agréé",
    description:
      "Installateur de bornes Hager Witty+, Witty Pro et Witty Park en Belgique. Pose, raccordement et mise en conformité par ITELEC CHARGE, partenaire Rexel et Hager.",
    h1: "Installation de bornes Hager Witty en Belgique",
    intro:
      "ITELEC CHARGE installe la gamme Hager Witty pour particuliers, entreprises et parkings structurés. Witty+ pour maison et petit tertiaire, Witty Pro pour sites professionnels, Witty Park pour double charge sur totem.",
    sections: [
      {
        h2: "Witty+, Witty Pro, Witty Park : le bon modèle",
        body: "Nous sélectionnons la borne en fonction de votre usage, de la puissance du tableau et de l’emplacement (mur, pied, totem). Chaque choix est justifié sur le devis — pas de surdimensionnement inutile.",
      },
      {
        h2: "Pose aux normes",
        body: "Câblage, protections, tranchée si nécessaire, essais de charge et remise d’un dossier clair. Suppléments câble et tranchée chiffrés à l’avance (20 €/m câble, tranchée terre ou béton selon barème public).",
      },
      {
        h2: "Installation classique ou offre abonnement",
        body: "Besoin d’une pose simple sur devis sans abonnement ? Consultez notre page installation classique. Pour l’exploitation CPO et les revenus de recharge, découvrez l’offre abonnement sur l’accueil.",
      },
    ],
    keywords: [
      "installateur Hager Witty",
      "borne Hager Witty Belgique",
      "Witty Pro installation",
      "Witty+ installateur",
      "Witty Park totem",
      "Rexel Hager recharge",
    ],
  },
  {
    slug: "borne-recharge-belgique-wallonie",
    title: "Borne de recharge en Belgique et Wallonie — installateur local",
    description:
      "Installateur de bornes de recharge basé en Hainaut (Gouy-lez-Pieton), interventions en Wallonie et en Belgique. Devis, installation et maintenance ITELEC CHARGE.",
    h1: "Installateur de bornes de recharge en Belgique et Wallonie",
    intro:
      "ITELEC CHARGE est implanté en Wallonie et intervient pour des projets de recharge en Belgique : entreprises, copropriétés, parkings commerciaux et sites semi-publics. Proximité, réactivité et suivi commercial dédié.",
    sections: [
      {
        h2: "Un partenaire de proximité",
        body: "Basés à Gouy-lez-Pieton (6181), nous couvons le Hainaut, la Wallonie et l’ensemble du territoire belge selon la nature du projet. Prise de contact rapide par formulaire ou e-mail.",
      },
      {
        h2: "Connaissance du marché belge",
        body: "Réglementation locale, contraintes de copropriété, tarification énergétique et modèles CPO adaptés au marché belge. Nous parlons français et accompagnons les décideurs pas à pas.",
      },
      {
        h2: "Demandez votre devis",
        body: "Décrivez votre site (adresse, type de parking, usage visé) : un commercial revient vers vous avec une proposition adaptée, sans engagement.",
      },
    ],
    keywords: [
      "installateur borne recharge Belgique",
      "borne recharge Wallonie",
      "borne recharge Hainaut",
      "borne recharge Charleroi",
      "installateur recharge électrique Belgique",
    ],
  },
  {
    slug: "charge-voiture-electrique-professionnels",
    title: "Charge voiture électrique pour professionnels — solution clé en main",
    description:
      "Solution de charge voiture électrique pour professionnels : installation borne, maintenance, plateforme CPO et revenus de recharge. ITELEC CHARGE, expert recharge pro.",
    h1: "Charge voiture électrique pour les professionnels",
    intro:
      "Flottes, collaborateurs, clients et visiteurs : la recharge sur site devient un standard. ITELEC CHARGE déploie une infrastructure fiable avec un modèle économique clair pour les professionnels.",
    sections: [
      {
        h2: "Modèle abonnement + revenus",
        body: "Vous percevez 100 % des recharges, moins 12 % de commission et l’abonnement de gestion (59 €/mois pendant 48 mois, puis 35 €/mois). Maintenance et exploitation incluses.",
      },
      {
        h2: "Techniciens certifiés",
        body: "Pose, câblage, protections, tests et remise des clés. Nos équipes planifient les interventions via notre outil dispatch pour respecter vos contraintes de site.",
      },
      {
        h2: "Alternative sans abonnement",
        body: "Pour une installation au forfait sans exploitation CPO, notre offre installation classique convient aux particuliers et entreprises qui gèrent eux-mêmes la recharge.",
      },
    ],
    keywords: [
      "charge voiture électrique entreprise",
      "infrastructure recharge pro",
      "CPO professionnel Belgique",
      "flotte électrique recharge site",
      "borne recharge tertiaire",
    ],
  },
];


export function landingPath(slug: string): string {
  return `/solutions/${slug}`;
}

export function findLandingBySlug(slug: string | undefined): SeoLandingPage | undefined {
  return SEO_LANDING_PAGES.find((p) => p.slug === slug);
}
