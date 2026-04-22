import type { AppData, Lead, LeadStatus } from "../types";

const STORAGE_KEY = "itelec_charge_data_v1";

function seed(): AppData {
  const now = new Date();
  const d = (days: number) =>
    new Date(now.getTime() + days * 86400000).toISOString();

  const installers = [
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

  const leads: Lead[] = [
    {
      id: "lead-1",
      createdAt: d(-12),
      commercialId: "commercial",
      companyName: "Boulangerie du Centre",
      contactName: "P. Martin",
      email: "contact@boulangerie-centre.be",
      phone: "+32 2 123 45 67",
      address: "Rue de la Loi 10, 1000 Bruxelles",
      status: "cloture",
      quoteAmountHtva: 1600,
      installerId: "tech-1",
      slotStart: d(-5),
      slotEnd: d(-5),
      commissionPaid: true,
      report: {
        signedAt: d(-5),
        signaturePng: "",
        comment: "Installation murale OK, test charge effectué.",
      },
    },
    {
      id: "lead-2",
      createdAt: d(-8),
      commercialId: "commercial",
      companyName: "Syndic Résidence Les Tilleuls",
      contactName: "Mme Leroy",
      email: "syndic.tilleuls@mail.be",
      phone: "+32 10 555 010",
      address: "Avenue des Tilleuls 45, 1348 Louvain-la-Neuve",
      status: "en_cours",
      quoteAmountHtva: 2000,
      installerId: "tech-2",
      slotStart: d(0),
      slotEnd: d(0),
      onsiteNotifiedAt: d(0),
    },
    {
      id: "lead-3",
      createdAt: d(-3),
      commercialId: "commercial",
      companyName: "Parking Carrefour Express",
      contactName: "Direction régionale",
      email: "parking.ouest@retail.be",
      phone: "+32 9 400 00 01",
      address: "Chaussée de Gand 200, 1080 Molenbeek",
      status: "installation_planifiee",
      quoteAmountHtva: 2000,
      installerId: "tech-1",
      slotStart: d(2),
      slotEnd: d(2),
    },
    {
      id: "lead-4",
      createdAt: d(-1),
      commercialId: "commercial",
      companyName: "PME Logistique Nord",
      contactName: "K. Janssens",
      email: "k.janssens@lognord.be",
      phone: "+32 50 11 22 33",
      address: "Zone industrielle 3, 8000 Bruges",
      status: "devis_accepte",
      quoteAmountHtva: 1600,
    },
    {
      id: "lead-5",
      createdAt: d(-6),
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

  return { version: 1, leads, installers };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = seed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed.leads || !parsed.installers) return seed();
    return parsed;
  } catch {
    return seed();
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function updateLead(
  data: AppData,
  leadId: string,
  patch: Partial<Lead>
): AppData {
  const leads = data.leads.map((l) =>
    l.id === leadId ? { ...l, ...patch } : l
  );
  const next = { ...data, leads };
  saveData(next);
  return next;
}

export function addLead(data: AppData, lead: Lead): AppData {
  const next = { ...data, leads: [lead, ...data.leads] };
  saveData(next);
  return next;
}

export const statusLabels: Record<LeadStatus, string> = {
  nouveau: "Nouveau",
  devis_envoye: "Devis envoyé",
  devis_accepte: "Devis accepté",
  installation_planifiee: "Installation planifiée",
  en_cours: "Installation en cours",
  cloture: "Clôturé",
};
