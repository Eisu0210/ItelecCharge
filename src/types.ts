export type Role = "admin" | "commercial" | "installateur" | "dispatch";

export type LeadStatus =
  | "nouveau"
  | "devis_envoye"
  | "devis_accepte"
  | "installation_planifiee"
  | "en_cours"
  | "cloture";

export type InstallerId = string;

export interface InstallationReport {
  signedAt: string;
  signaturePng: string;
  comment: string;
  photoDataUrl?: string;
}

export interface Lead {
  id: string;
  createdAt: string;
  commercialId: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  notes?: string;
  status: LeadStatus;
  quoteAmountHtva?: number;
  installerId?: InstallerId;
  slotStart?: string;
  slotEnd?: string;
  onsiteNotifiedAt?: string;
  commissionPaid?: boolean;
  report?: InstallationReport;
}

export interface InstallerProfile {
  id: InstallerId;
  name: string;
  phone: string;
  email: string;
}

export interface AppData {
  leads: Lead[];
  installers: InstallerProfile[];
  version: number;
}

export const COMMISSION_PER_INSTALLATION = 80;
