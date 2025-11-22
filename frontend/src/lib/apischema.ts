import { z } from "zod";

const severitySchema = z.union([
  z.literal("info"),
  z.literal("low"),
  z.literal("medium"),
  z.literal("high"),
  z.literal("critical"),
]);

const envVarSchema = z.object({
  name: z.string(),
  value: z.string().nullable(),
  value_from: z.any(),
});

const misconfigVulnerabilitySchema = z.object({
  type: z.literal("misconfig"),
  severity: severitySchema,
  title: z.string(),
  data_keys: z.array(z.string()),
});

const secretVulnerabilitySchema = z.object({
  type: z.literal("secret"),
  severity: severitySchema,
  title: z.string(),
  secret_type: z.string(),
  keys: z.array(z.string()),
});

const imageVulnerabilitySchema = z.object({
  type: z.literal("image"),
  severity: severitySchema,
  title: z.string(),
  image: z.string(),
  pull_policy: z.string(),
});

const workloadVulnerabilitySchema = z.object({
  type: z.literal("workload"),
  severity: severitySchema,
  title: z.string(),
  container: z.string(),
  env_vars: z.array(envVarSchema),
});

const vulnerabilitySchema = z.discriminatedUnion("type", [
  misconfigVulnerabilitySchema,
  secretVulnerabilitySchema,
  imageVulnerabilitySchema,
  workloadVulnerabilitySchema,
]);

export type Vulnerability = z.infer<typeof vulnerabilitySchema>;

const vulnerabilitiesSchema = z.array(vulnerabilitySchema);

// 1. Define the distinct Node shapes
const BaseNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  vulnerabilities: vulnerabilitiesSchema.optional(),
});

const NamespaceNodeSchema = BaseNodeSchema.extend({
  type: z.literal("namespace"),
  status: z.string(), // e.g., "Active"
});

const ClusterNodeSchema = BaseNodeSchema.extend({
  type: z.literal("node"),
  status: z.string(), // e.g., "ready"
});

const PodNodeSchema = BaseNodeSchema.extend({
  type: z.literal("pod"),
  namespace: z.string(),
  status: z.string(), // e.g., "running"
});

const ServiceNodeSchema = BaseNodeSchema.extend({
  type: z.literal("service"),
  namespace: z.string(),
  status: z.string(), // e.g., "NodePort", "ClusterIP"
});

// 2. Create a Discriminated Union for the nodes array
// This allows TS to know that if type is "pod", the "namespace" field exists
const NodeSchema = z.discriminatedUnion("type", [
  NamespaceNodeSchema,
  ClusterNodeSchema,
  PodNodeSchema,
  ServiceNodeSchema,
]);

// 3. Define Links
const LinkSchema = z.object({
  source: z.string(),
  target: z.string(),
  type: z.enum(["contains", "runs-on", "exposes"]),
});

// 4. Define Stats
const StatsSchema = z.object({
  total_nodes: z.number(),
  total_links: z.number(),
  node_types: z.object({
    namespace: z.number(),
    node: z.number(),
    pod: z.number(),
    service: z.number(),
  }),
  link_types: z.object({
    contains: z.number(),
    "runs-on": z.number(),
    exposes: z.number(),
  }),
});

// 5. Main Response Schema
export const ClusterDataSchema = z.object({
  status: z.literal("success"),
  data: z.object({
    timestamp: z.string(),
    nodes: z.array(NodeSchema),
    links: z.array(LinkSchema),
    stats: StatsSchema,
  }),
});

// Export the inferred TypeScript type
export type ClusterData = z.infer<typeof ClusterDataSchema>;
