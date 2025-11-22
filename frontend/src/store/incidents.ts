import { create } from "zustand";
import type { Vulnerability } from "@/lib/apischema";

// export type IncidentLevel = "medium" | "high" | "critical";

// export interface Incident {
//   containerid: string;
//   level: IncidentLevel;
//   title: string;
//   description: string;
//   prLink: string;
// }

export type VulnerabilityWithId = Vulnerability & { id: string };

interface IncidentStore {
  incidents: VulnerabilityWithId[];
  byId: string | null;
  setIncidentFilter: (id: string | null) => void;
  setIncidents: (incidents: VulnerabilityWithId[]) => void;
}

export const useIncidentStore = create<IncidentStore>((set) => ({
  incidents: [],
  byId: null,
  setIncidents: (incidents) => set({ incidents }),
  setIncidentFilter: (id: string | null) => set({ byId: id }),
}));
