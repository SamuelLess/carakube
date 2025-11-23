import { ClusterDataSchema } from "./apischema";

export const fetchGraph = async () => {
  try {
    const response = await fetch("/api/graph");
    const json = await response.json();
    const parsed = ClusterDataSchema.safeParse(json);
    if (!parsed.success) return { success: false } as const;
    return { success: true, data: parsed.data } as const;
  } catch {
    return { success: false } as const;
  }
};

export type VulnerabilityState = "untouched" | "in_processing" | "pr_available";

export interface VulnerabilityStateInfo {
  state: VulnerabilityState;
  pr_url: string | null;
  updated_at: string | null;
}

export interface VulnerabilityStatesResponse {
  status: "success";
  states: Record<string, VulnerabilityStateInfo>;
}

export interface VulnerabilityStateResponse {
  status: "success";
  vuln_id: string;
  state: VulnerabilityStateInfo;
}

export interface VulnerabilityFixResponse {
  status: "success" | "error";
  message: string;
  result?: {
    success: boolean;
    message: string;
    vulnerability?: unknown;
    node?: unknown;
    repo_path?: string;
    pr_url?: string;
    branch?: string;
    files_analyzed?: number;
    patch_size?: number;
  };
  state?: VulnerabilityStateInfo;
}

/**
 * Fetch all vulnerability states from the backend
 */
export const fetchVulnerabilityStates = async (): Promise<
  VulnerabilityStatesResponse | { success: false }
> => {
  try {
    const response = await fetch("/api/vulnerability-states");
    if (!response.ok) {
      return { success: false };
    }
    const json = await response.json();
    return json;
  } catch {
    return { success: false };
  }
};

/**
 * Fetch the state of a specific vulnerability
 */
export const fetchVulnerabilityState = async (
  vulnId: string
): Promise<VulnerabilityStateResponse | { success: false }> => {
  try {
    const response = await fetch(`/api/vulnerability-states/${vulnId}`);
    if (!response.ok) {
      return { success: false };
    }
    const json = await response.json();
    return json;
  } catch {
    return { success: false };
  }
};

/**
 * Trigger a fix for a specific vulnerability
 */
export const triggerVulnerabilityFix = async (
  vulnId: string
): Promise<VulnerabilityFixResponse> => {
  try {
    const response = await fetch(`/api/vulnerability-fix/${vulnId}`, {
      method: "POST",
    });
    const json = await response.json();
    return json;
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};
