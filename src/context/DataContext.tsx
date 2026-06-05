import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, formatApiErrorMessage } from "../lib/api";
import { applyLeadPatch, normalizeLeadPatch } from "../lib/leadPipeline";
import { useAuth } from "./AuthContext";
import type { AppData, FleetVehicle, InstallerProfile, Lead, MaterialCatalogItem } from "../types";

const empty: AppData = {
  version: 1,
  leads: [],
  installers: [],
  fleetVehicles: [],
  siteSurveyUsers: [],
  materialCatalog: [],
};

interface DataContextValue {
  data: AppData;
  loading: boolean;
  error: string | null;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
  patchLead: (leadId: string, patch: Partial<Lead>) => Promise<void>;
  createLead: (lead: Lead) => Promise<void>;
  deleteLead: (leadId: string) => Promise<void>;
  createInstaller: (installer: InstallerProfile) => Promise<void>;
  patchInstaller: (
    installerId: string,
    patch: Partial<Pick<InstallerProfile, "name" | "phone" | "email">>
  ) => Promise<void>;
  deleteInstaller: (installerId: string) => Promise<void>;
  createFleetVehicle: (
    vehicle: Pick<FleetVehicle, "id" | "label" | "plate" | "makeModel"> & {
      notes?: string;
      installerId?: string;
    }
  ) => Promise<void>;
  patchFleetVehicle: (
    vehicleId: string,
    patch: Partial<{
      label: string;
      plate: string;
      makeModel: string;
      notes: string | null;
      installerId: string | null;
    }>
  ) => Promise<void>;
  deleteFleetVehicle: (vehicleId: string) => Promise<void>;
  createMaterialCatalogItem: (
    item: Omit<MaterialCatalogItem, "id" | "createdAt" | "updatedAt">
  ) => Promise<void>;
  patchMaterialCatalogItem: (
    itemId: string,
    patch: Partial<Omit<MaterialCatalogItem, "id" | "createdAt" | "updatedAt">>
  ) => Promise<void>;
  deleteMaterialCatalogItem: (itemId: string) => Promise<void>;
  importMaterialCatalogFromUrl: (
    url: string
  ) => Promise<{ label: string; articleNumber: string; unitPriceHt: number }>;
  /** Envoie le devis par e-mail (SMTP) et met à jour le dossier. */
  sendQuoteEmailToClient: (leadId: string) => Promise<{ ok: boolean; portalUrl: string }>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const [data, setData] = useState<AppData>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!user) {
      setData(empty);
      setLoading(false);
      return;
    }
    const silent = options?.silent === true;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const d = await apiFetch<AppData>("/api/app");
      setData({ ...d, fleetVehicles: d.fleetVehicles ?? [] });
    } catch (e) {
      if (!silent) {
        setError(formatApiErrorMessage(e, "Chargement impossible. Réessayez ou contactez l’administrateur."));
        setData(empty);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!ready) return;
    void refresh();
  }, [ready, user, refresh]);

  const patchLead = useCallback(
    async (leadId: string, patch: Partial<Lead>) => {
      const normalized = normalizeLeadPatch(patch);
      setData((prev) => ({
        ...prev,
        leads: prev.leads.map((l) => (l.id === leadId ? applyLeadPatch(l, normalized) : l)),
      }));
      try {
        await apiFetch(`/api/leads/${encodeURIComponent(leadId)}`, {
          method: "PATCH",
          body: JSON.stringify(normalized),
        });
        await refresh({ silent: true });
      } catch (e) {
        await refresh({ silent: true });
        throw e;
      }
    },
    [refresh]
  );

  const createLead = useCallback(
    async (lead: Lead) => {
      await apiFetch("/api/leads", { method: "POST", body: JSON.stringify(lead) });
      await refresh({ silent: true });
    },
    [refresh]
  );

  const deleteLead = useCallback(
    async (leadId: string) => {
      await apiFetch(`/api/leads/${encodeURIComponent(leadId)}`, { method: "DELETE" });
      await refresh();
    },
    [refresh]
  );

  const createInstaller = useCallback(
    async (installer: InstallerProfile) => {
      await apiFetch("/api/installers", { method: "POST", body: JSON.stringify(installer) });
      await refresh();
    },
    [refresh]
  );

  const patchInstaller = useCallback(
    async (
      installerId: string,
      patch: Partial<Pick<InstallerProfile, "name" | "phone" | "email">>
    ) => {
      await apiFetch(`/api/installers/${encodeURIComponent(installerId)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      await refresh();
    },
    [refresh]
  );

  const deleteInstaller = useCallback(
    async (installerId: string) => {
      await apiFetch(`/api/installers/${encodeURIComponent(installerId)}`, { method: "DELETE" });
      await refresh();
    },
    [refresh]
  );

  const createFleetVehicle = useCallback(
    async (
      vehicle: Pick<FleetVehicle, "id" | "label" | "plate" | "makeModel"> & {
        notes?: string;
        installerId?: string;
      }
    ) => {
      await apiFetch("/api/fleet-vehicles", {
        method: "POST",
        body: JSON.stringify({
          id: vehicle.id,
          label: vehicle.label,
          plate: vehicle.plate,
          makeModel: vehicle.makeModel,
          notes: vehicle.notes,
          installerId: vehicle.installerId ?? null,
        }),
      });
      await refresh();
    },
    [refresh]
  );

  const patchFleetVehicle = useCallback(
    async (
      vehicleId: string,
      patch: Partial<{
        label: string;
        plate: string;
        makeModel: string;
        notes: string | null;
        installerId: string | null;
      }>
    ) => {
      const body: Record<string, unknown> = { ...patch };
      if (Object.prototype.hasOwnProperty.call(patch, "installerId")) {
        body.installerId = patch.installerId ?? null;
      }
      await apiFetch(`/api/fleet-vehicles/${encodeURIComponent(vehicleId)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await refresh();
    },
    [refresh]
  );

  const deleteFleetVehicle = useCallback(
    async (vehicleId: string) => {
      await apiFetch(`/api/fleet-vehicles/${encodeURIComponent(vehicleId)}`, { method: "DELETE" });
      await refresh();
    },
    [refresh]
  );

  const createMaterialCatalogItem = useCallback(
    async (item: Omit<MaterialCatalogItem, "id" | "createdAt" | "updatedAt">) => {
      await apiFetch("/api/material-catalog", { method: "POST", body: JSON.stringify(item) });
      await refresh();
    },
    [refresh]
  );

  const patchMaterialCatalogItem = useCallback(
    async (
      itemId: string,
      patch: Partial<Omit<MaterialCatalogItem, "id" | "createdAt" | "updatedAt">>
    ) => {
      await apiFetch(`/api/material-catalog/${encodeURIComponent(itemId)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      await refresh();
    },
    [refresh]
  );

  const deleteMaterialCatalogItem = useCallback(
    async (itemId: string) => {
      await apiFetch(`/api/material-catalog/${encodeURIComponent(itemId)}`, { method: "DELETE" });
      await refresh();
    },
    [refresh]
  );

  const importMaterialCatalogFromUrl = useCallback(async (url: string) => {
    return apiFetch<{ label: string; articleNumber: string; unitPriceHt: number }>(
      "/api/material-catalog/import-url",
      {
        method: "POST",
        body: JSON.stringify({ url }),
      }
    );
  }, []);

  const sendQuoteEmailToClient = useCallback(
    async (leadId: string) => {
      const r = await apiFetch<{ ok: boolean; portalUrl: string }>(
        `/api/leads/${encodeURIComponent(leadId)}/send-quote-email`,
        { method: "POST", body: JSON.stringify({}) }
      );
      await refresh({ silent: true });
      return r;
    },
    [refresh]
  );

  const value = useMemo(
    () => ({
      data,
      loading,
      error,
      refresh,
      patchLead,
      createLead,
      deleteLead,
      createInstaller,
      patchInstaller,
      deleteInstaller,
      createFleetVehicle,
      patchFleetVehicle,
      deleteFleetVehicle,
      createMaterialCatalogItem,
      patchMaterialCatalogItem,
      deleteMaterialCatalogItem,
      importMaterialCatalogFromUrl,
      sendQuoteEmailToClient,
    }),
    [
      data,
      loading,
      error,
      refresh,
      patchLead,
      createLead,
      deleteLead,
      createInstaller,
      patchInstaller,
      deleteInstaller,
      createFleetVehicle,
      patchFleetVehicle,
      deleteFleetVehicle,
      createMaterialCatalogItem,
      patchMaterialCatalogItem,
      deleteMaterialCatalogItem,
      importMaterialCatalogFromUrl,
      sendQuoteEmailToClient,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
