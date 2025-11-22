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

export type VulnerabilityWithId = Vulnerability & { nodeId: string };

interface IncidentStore {
  incidents: VulnerabilityWithId[];
  setIncidents: (incidents: VulnerabilityWithId[]) => void;
}

export const useIncidentStore = create<IncidentStore>((set) => ({
  incidents: [],
  setIncidents: (incidents) => set({ incidents }),
}));
