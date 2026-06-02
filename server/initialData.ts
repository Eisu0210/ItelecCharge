import type { Lead, InstallerProfile } from "../src/types";

export const SEED_INSTALLERS: InstallerProfile[] = [
  {
    id: "tech-1",
    name: "Jean Dupont",
    phone: "+32 470 12 34 56",
    email: "j.dupont@itelec-charge.be",
  },
  {
    id: "tech-2",
    name: "Marie Lambert",
    phone: "+32 471 98 76 54",
    email: "m.lambert@itelec-charge.be",
  },
];

function d(now: Date, days: number) {
  return new Date(now.getTime() + days * 86400000).toISOString();
}

export function buildSeedLeads(anchor: Date = new Date()): Lead[] {
  return [
    {
      id: "lead-1",
      createdAt: d(anchor, -12),
      commercialId: "commercial",
      companyName: "Boulangerie du Centre",
      contactName: "P. Martin",
      email: "contact@boulangerie-centre.be",
      phone: "+32 2 123 45 67",
      address: "Rue de la Loi 10, 1000 Bruxelles",
      status: "cloture",
      quoteAmountHtva: 1600,
      installerId: "tech-1",
      slotStart: d(anchor, -5),
      slotEnd: d(anchor, -5),
      commissionPaid: true,
      report: {
        signedAt: d(anchor, -5),
        signaturePng: "",
        comment: "Installation murale OK, test charge effectué.",
      },
    },
    {
      id: "lead-2",
      createdAt: d(anchor, -8),
      commercialId: "commercial",
      companyName: "Syndic Résidence Les Tilleuls",
      contactName: "Mme Leroy",
      email: "syndic.tilleuls@mail.be",
      phone: "+32 10 555 010",
      address: "Avenue des Tilleuls 45, 1348 Louvain-la-Neuve",
      status: "en_cours",
      quoteAmountHtva: 2000,
      installerId: "tech-2",
      slotStart: d(anchor, 0),
      slotEnd: d(anchor, 0),
      onsiteNotifiedAt: d(anchor, 0),
    },
    {
      id: "lead-3",
      createdAt: d(anchor, -3),
      commercialId: "commercial",
      companyName: "Parking Carrefour Express",
      contactName: "Direction régionale",
      email: "parking.ouest@retail.be",
      phone: "+32 9 400 00 01",
      address: "Chaussée de Gand 200, 1080 Molenbeek",
      status: "installation_planifiee",
      quoteAmountHtva: 2000,
      installerId: "tech-1",
      slotStart: d(anchor, 2),
      slotEnd: d(anchor, 2),
    },
    {
      id: "lead-4",
      createdAt: d(anchor, -1),
      commercialId: "commercial",
      companyName: "PME Logistique Nord",
      contactName: "K. Janssens",
      email: "k.janssens@lognord.be",
      phone: "+32 50 11 22 33",
      address: "Zone industrielle 3, 8000 Bruges",
      status: "devis_accepte",
      quoteAmountHtva: 1600,
      surveyMaterials: [
        { id: "mat-1", label: "Borne murale 22 kW tri", quantity: 1, unit: "u" },
        { id: "mat-2", label: "Câble U-1000 R2V 5G6", quantity: 40, unit: "m" },
        { id: "mat-3", label: "Disjoncteur 4P 40 A type A", quantity: 1, unit: "u" },
      ],
    },
    {
      id: "lead-5",
      createdAt: d(anchor, -6),
      commercialId: "commercial",
      companyName: "Garage Auto Pro",
      contactName: "S. Noah",
      email: "s.noah@autopro.be",
      phone: "+32 81 44 55 66",
      address: "Rue des Artisans 8, 4000 Liège",
      status: "devis_envoye",
      quoteAmountHtva: 1600,
    },
  ];
}
