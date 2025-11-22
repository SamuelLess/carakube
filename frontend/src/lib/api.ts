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
