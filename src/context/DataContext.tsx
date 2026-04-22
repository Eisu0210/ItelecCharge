import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppData, Lead } from "../types";
import { addLead, loadData, updateLead } from "../data/store";

interface DataContextValue {
  data: AppData;
  refresh: () => void;
  patchLead: (leadId: string, patch: Partial<Lead>) => void;
  createLead: (lead: Lead) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData());

  const refresh = useCallback(() => setData(loadData()), []);

  const patchLead = useCallback((leadId: string, patch: Partial<Lead>) => {
    setData((d) => updateLead(d, leadId, patch));
  }, []);

  const createLead = useCallback((lead: Lead) => {
    setData((d) => addLead(d, lead));
  }, []);

  const value = useMemo(
    () => ({ data, refresh, patchLead, createLead }),
    [data, refresh, patchLead, createLead]
  );

  return (
    <DataContext.Provider value={value}>{children}</DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
