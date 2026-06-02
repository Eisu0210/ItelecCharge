import type { QuoteAuditEvent, QuoteElectronicAcceptance } from "./lib/quoteAcceptance";

export type Role = "admin" | "commercial" | "installateur" | "dispatch" | "site_survey";

export type LeadStatus =
  | "nouveau"
  | "devis_envoye"
  | "devis_accepte"
  | "installation_planifiee"
  | "en_cours"
  | "cloture";

export type InstallerId = string;

export type WorkflowStage =
  | "commercial_brouillon"
  | "attente_admin"
  | "survey_planifie"
  | "survey_terrain"
  | "devis_pret"
  | "devis_envoye_sign"
  | "devis_signe";

export type MountType = "mural" | "pied";
export type SupplyType = "mono" | "tri";

/** subscription = forfait 1600/2000 € × bornes (matériel inclus) ; detailed = catalogue + suppléments. */
export type QuotePricingMode = "subscription" | "detailed";

export interface QuoteSupplementLine {
  id: string;
  label: string;
  amountHtva: number;
}

export interface SiteSurveyProjectSpecs {
  siteCheckOk?: boolean;
  headAmperageA?: number;
  cableRouteDescription?: string;
  /** Longueur totale de câble sur le chantier (m). */
  cableLengthM?: number;
  trenchLengthM?: number;
  trenchType?: "earth" | "concrete";
  baseInstallationHtva?: number;
  supplements?: QuoteSupplementLine[];
  completedAt?: string;
}

export interface ProjectSpecs {
  /** Origine du dossier (ex. formulaire « Demande de devis » du site). */
  intakeSource?: string;
  /** Facturation Stripe (abonnement + commissions) — espace pro uniquement. */
  billing?: {
    subscriptionStatus?: "none" | "pending_mandate" | "active" | "past_due" | "canceled";
    currentPhase?: 1 | 2;
    lastWebhookAt?: string;
  };
  commercial?: {
    chargerCount?: number;
    supplyType?: SupplyType;
    mountType?: MountType;
    /** Défaut : forfait avec abonnement. */
    quoteMode?: QuotePricingMode;
    submittedAt?: string;
  };
  admin?: {
    surveyAssigneeUserId?: number;
    surveyScheduledStart?: string;
    surveyScheduledEnd?: string;
    surveyNotes?: string;
    plannedAt?: string;
  };
  siteSurvey?: SiteSurveyProjectSpecs;
  quote?: {
    totalHtva?: number;
    quoteNumber?: string;
    issuedAt?: string;
    validUntil?: string;
    vatRate?: number;
    cgvUrl?: string;
    accessToken?: string;
    clientPortalUrl?: string;
    sentAt?: string;
    /** SHA-256 du PDF envoyé au client (version figée). */
    documentSha256?: string;
    signedAt?: string;
    clientSignedName?: string;
    acceptance?: QuoteElectronicAcceptance;
    auditLog?: QuoteAuditEvent[];
  };
}

export interface SiteSurveyUser {
  id: number;
  displayName: string;
}

export interface InstallationReport {
  signedAt: string;
  signaturePng: string;
  comment: string;
  photoDataUrl?: string;
}

/** Photo terrain (site survey) rattachée au dossier client. */
export interface SurveyPhoto {
  id: string;
  /** Ex. : « Avant travaux », « Tableau », « Zone pose » */
  phase: string;
  caption: string;
  dataUrl: string;
  createdAt: string;
}

/** Ligne de matériel prévue pour un dossier client. */
export interface SurveyMaterialItem {
  id: string;
  label: string;
  quantity: number;
  unit: string;
  catalogItemId?: string;
  supplier?: string;
  articleNumber?: string;
  unitPriceHt?: number;
}

export interface MaterialCatalogItem {
  id: string;
  supplier: string;
  articleNumber: string;
  label: string;
  unit: string;
  unitPriceHt: number;
  compatibleModels: string[];
  createdAt: string;
  updatedAt: string;
}

export type StockMovementReason = "set" | "usage" | "replenish" | "adjustment" | "initial";

export interface InstallerStockItem {
  id: string;
  installerId: string;
  catalogItemId: string | null;
  articleNumber: string;
  label: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  updatedAt: string;
  updatedBy: string | null;
}

export interface StockSummaryLine {
  catalogItemId: string | null;
  articleNumber: string;
  label: string;
  unit: string;
  totalQuantity: number;
  byInstaller: Array<{
    installerId: string;
    installerName: string;
    quantity: number;
    itemId: string;
  }>;
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
  /** Travaux / devis réglés par le client (distinct de la commission commercial). */
  clientPaid?: boolean;
  report?: InstallationReport;
  /** Photos relevé / avant travaux (remplies par site survey). */
  surveyPhotos?: SurveyPhoto[];
  /** Liste matériel prévu pour l’installation (une ligne = un item structuré). */
  surveyMaterials?: SurveyMaterialItem[];
  workflowStage?: WorkflowStage;
  projectSpecs?: ProjectSpecs;
  commercialDisplayName?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface InstallerProfile {
  id: InstallerId;
  name: string;
  phone: string;
  email: string;
}

/** Véhicule de la flotte (camionnette) — optionnellement assigné à un technicien. */
export interface FleetVehicle {
  id: string;
  label: string;
  plate: string;
  makeModel: string;
  notes?: string;
  installerId?: InstallerId;
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  leads: Lead[];
  installers: InstallerProfile[];
  fleetVehicles: FleetVehicle[];
  siteSurveyUsers: SiteSurveyUser[];
  materialCatalog: MaterialCatalogItem[];
  version: number;
}

export const COMMISSION_PER_INSTALLATION = 100;
