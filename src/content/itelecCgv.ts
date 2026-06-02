/** Conditions générales officielles ITELEC CHARGE (texte contractuel). */

export const CGV_DOCUMENT_TITLE =
  "Conditions générales de prestation et d'exploitation — ITELEC CHARGE";

export type CgvSection = {
  id?: string;
  number: number;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export const ITELEC_CGV_SECTIONS: CgvSection[] = [
  {
    number: 1,
    title: "OBJET",
    paragraphs: [
      "Les présentes conditions générales ont pour objet de définir les droits et obligations des parties dans le cadre de la fourniture, l'installation, l'exploitation et la maintenance de bornes de recharge pour véhicules électriques par ITELEC CHARGE.",
      "Elles complètent le contrat signé entre les parties et en font partie intégrante.",
    ],
  },
  {
    number: 2,
    title: "CHAMP D'APPLICATION",
    paragraphs: [
      "Les présentes conditions générales s'appliquent à toute relation contractuelle entre ITELEC CHARGE et le client.",
      "Elles prévalent sur toutes conditions générales du client, sauf accord écrit contraire.",
    ],
  },
  {
    number: 3,
    title: "FORMATION DU CONTRAT",
    paragraphs: [
      "Le contrat est réputé formé à la signature de l'offre ou du contrat.",
      "Le client reconnaît avoir pris connaissance des présentes conditions générales et les accepter sans réserve.",
    ],
  },
  {
    number: 4,
    title: "DESCRIPTION DES PRESTATIONS",
    paragraphs: ["ITELEC CHARGE fournit notamment les services suivants :"],
    bullets: [
      "installation de la borne",
      "exploitation en qualité d'opérateur de recharge (CPO)",
      "supervision technique à distance",
      "maintenance préventive et corrective",
      "gestion des accès et des utilisateurs",
      "gestion des paiements et facturation des utilisateurs finaux",
    ],
  },
  {
    number: 4,
    title: "",
    paragraphs: ["ITELEC CHARGE agit en tant qu'exploitant technique et commercial du service."],
  },
  {
    number: 5,
    title: "OBLIGATIONS DU CLIENT",
    paragraphs: ["Le client s'engage à :"],
    bullets: [
      "garantir une installation électrique conforme aux normes en vigueur",
      "assurer un accès permanent, sécurisé et libre au site",
      "ne pas modifier ou déplacer la borne sans accord écrit préalable",
      "informer ITELEC CHARGE de toute anomalie",
      "respecter les obligations légales applicables",
    ],
  },
  {
    number: 5,
    title: "",
    paragraphs: ["Le client reste responsable de l'environnement du site."],
  },
  {
    number: 6,
    title: "ACCÈS AU SITE ET INTERVENTIONS",
    paragraphs: [
      "Le client garantit l'accès au site pour toute intervention.",
      "En cas d'impossibilité d'accès :",
    ],
    bullets: [
      "les délais d'intervention sont suspendus",
      "des frais supplémentaires peuvent être facturés",
    ],
  },
  {
    number: 7,
    title: "CONDITIONS D'INSTALLATION",
    paragraphs: [
      "L'installation est réalisée selon les conditions techniques prévues dans l'offre.",
      "Toute contrainte non identifiée préalablement pourra faire l'objet d'un ajustement tarifaire.",
    ],
  },
  {
    number: 8,
    title: "PROPRIÉTÉ",
    paragraphs: [
      "La borne devient propriété du client après paiement complet.",
      "Toutefois, ITELEC CHARGE conserve l'exploitation technique et commerciale ainsi que la gestion des services associés.",
    ],
  },
  {
    number: 9,
    title: "CONDITIONS FINANCIÈRES",
    paragraphs: [
      "Phase initiale (48 mois) : abonnement de 59 € TVAC / mois ; commission de 12 %.",
      "Phase ultérieure : abonnement de 35 € / mois ; commission de 12 %.",
      "La commission est due pendant toute la durée d'exploitation.",
    ],
  },
  {
    number: 10,
    title: "FACTURATION ET PAIEMENT",
    paragraphs: ["Les factures sont payables à 30 jours.", "Conformément à la loi du 2 août 2002 :"],
    bullets: [
      "toute somme impayée porte intérêt de plein droit",
      "une indemnité forfaitaire de 10 % (minimum 150 €) est due",
    ],
  },
  {
    number: 11,
    title: "SUSPENSION DES SERVICES",
    paragraphs: [
      "En cas de manquement du client ou de non-paiement, ITELEC CHARGE se réserve le droit de suspendre tout ou partie des services sans indemnité.",
    ],
  },
  {
    number: 12,
    title: "EXPLOITATION ET REVENUS",
    paragraphs: [
      "ITELEC CHARGE encaisse les paiements des utilisateurs, fixe la tarification et reverse au client les revenus nets après déduction des commissions, abonnements et frais éventuels.",
    ],
  },
  {
    number: 13,
    title: "TARIFICATION",
    paragraphs: [
      "ITELEC CHARGE se réserve le droit d'adapter les tarifs de recharge en fonction des coûts énergétiques, des conditions de marché et de sa stratégie commerciale.",
    ],
  },
  {
    number: 14,
    title: "MAINTENANCE",
    paragraphs: [
      "La maintenance comprend la supervision, les interventions techniques et les mises à jour.",
      "ITELEC CHARGE est tenue d'une obligation de moyens.",
    ],
  },
  {
    number: 15,
    title: "RESPONSABILITÉ",
    paragraphs: [
      "Conformément aux articles 5.86 et suivants du Code civil, ITELEC CHARGE ne pourra être tenue responsable que des dommages directs.",
      "Elle ne pourra en aucun cas être tenue responsable des pertes indirectes ou manque à gagner.",
      "Sa responsabilité est limitée aux montants perçus au cours des 12 derniers mois.",
    ],
  },
  {
    number: 16,
    title: "ASSURANCE ET RISQUES",
    paragraphs: [
      "Le client est responsable du site et s'engage à souscrire les assurances nécessaires couvrant notamment les dommages matériels, incendies et actes de vandalisme.",
    ],
  },
  {
    number: 17,
    title: "INSTALLATIONS COMPLÉMENTAIRES",
    paragraphs: [
      "Toute installation de borne par un tiers doit faire l'objet d'un accord préalable d'ITELEC CHARGE afin de garantir la cohérence technique et la sécurité.",
    ],
  },
  {
    number: 18,
    title: "SOUS-TRAITANCE",
    paragraphs: [
      "ITELEC CHARGE peut recourir à des sous-traitants pour l'exécution de ses prestations.",
    ],
  },
  {
    number: 19,
    id: "donnees-personnelles",
    title: "DONNÉES ET RGPD",
    paragraphs: [
      "Les données sont traitées conformément au RGPD. Le client garantit avoir informé les utilisateurs finaux.",
      "Pour exercer vos droits : hello@itelec-charge.be.",
    ],
  },
  {
    number: 20,
    title: "FORCE MAJEURE",
    paragraphs: [
      "Conformément à l'article 5.226 du Code civil, aucune partie ne pourra être tenue responsable en cas de force majeure.",
    ],
  },
  {
    number: 21,
    title: "RÉSILIATION",
    paragraphs: [
      "Le contrat prévoit un engagement ferme de 48 mois.",
      "Toute résiliation anticipée entraîne le paiement des indemnités prévues.",
    ],
  },
  {
    number: 22,
    title: "RELATION B2B",
    paragraphs: [
      "Les parties reconnaissent agir en qualité de professionnels et excluent l'application des règles relatives aux consommateurs.",
    ],
  },
  {
    number: 23,
    title: "NULLITÉ PARTIELLE",
    paragraphs: ["Si une clause est jugée invalide, les autres restent applicables."],
  },
  {
    number: 24,
    title: "DROIT APPLICABLE",
    paragraphs: [
      "Le droit belge est applicable. Les tribunaux du siège d'ITELEC CHARGE sont compétents.",
    ],
  },
];
