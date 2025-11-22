import { create } from "zustand";

export type IncidentLevel = "medium" | "high" | "critical";

export interface Incident {
  level: IncidentLevel;
  title: string;
  description: string;
  prLink: string;
}

interface IncidentStore {
  incidents: Incident[];
}

const sampleIncidents: Incident[] = [
  {
    level: "high",
    title: "Network Policy Not Enforced",
    description:
      "Namespace lacks network policies, allowing unrestricted pod-to-pod communication.",
    prLink: "pull/245",
  },
  {
    level: "medium",
    title: "Outdated Image Version",
    description: "A container is using an outdated image version with known vulnerabilities.",
    prLink: "pull/246",
  },
  {
    level: "critical",
    title: "Privileged Container",
    description: "A container is running with privileged access, which can be a security risk.",
    prLink: "pull/247",
  },
  {
    level: "high",
    title: "Missing Resource Limits",
    description:
      "A container has no resource limits defined, which can lead to resource exhaustion.",
    prLink: "pull/248",
  },
];

export const useIncidentStore = create<IncidentStore>(() => ({
  incidents: sampleIncidents,
}));
