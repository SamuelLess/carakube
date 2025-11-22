import { z } from "zod";

const severitySchema = z.union([
  z.literal("info"),
  z.literal("low"),
  z.literal("medium"),
  z.literal("high"),
  z.literal("critical"),
]);

// Container Security vulnerabilities
const privilegedContainerSchema = z.object({
  type: z.literal("privileged_container"),
  severity: severitySchema,
  title: z.string(),
  container: z.string().optional(),
  details: z.any().optional(),
});

const runningAsRootSchema = z.object({
  type: z.literal("running_as_root"),
  severity: severitySchema,
  title: z.string(),
  container: z.string().optional(),
});

const dangerousCapabilitiesSchema = z.object({
  type: z.literal("dangerous_capabilities"),
  severity: severitySchema,
  title: z.string(),
  container: z.string().optional(),
});

const hostNetworkSchema = z.object({
  type: z.literal("host_network"),
  severity: severitySchema,
  title: z.string(),
  details: z.any().optional(),
});

const hostPidSchema = z.object({
  type: z.literal("host_pid"),
  severity: severitySchema,
  title: z.string(),
  details: z.any().optional(),
});

const hostIpcSchema = z.object({
  type: z.literal("host_ipc"),
  severity: severitySchema,
  title: z.string(),
  details: z.any().optional(),
});

const hostPathMountSchema = z.object({
  type: z.literal("host_path_mount"),
  severity: severitySchema,
  title: z.string(),
  details: z.any().optional(),
});

// Resource Limits vulnerabilities
const missingResourceLimitsSchema = z.object({
  type: z.literal("missing_resource_limits"),
  severity: severitySchema,
  title: z.string(),
  container: z.string().optional(),
  missing_limits: z.array(z.string()).optional(),
});

// ServiceAccount vulnerabilities
const automountedSaTokenSchema = z.object({
  type: z.literal("automounted_sa_token"),
  severity: severitySchema,
  title: z.string(),
  service_account: z.string().optional(),
});

const defaultServiceAccountSchema = z.object({
  type: z.literal("default_serviceaccount"),
  severity: severitySchema,
  title: z.string(),
  service_account: z.string().optional(),
});

// Network Exposure vulnerabilities
const nodeportServiceSchema = z.object({
  type: z.literal("nodeport_service"),
  severity: severitySchema,
  title: z.string(),
  service_type: z.string().optional(),
  details: z.any().optional(),
});

const unrestrictedLoadbalancerSchema = z.object({
  type: z.literal("unrestricted_loadbalancer"),
  severity: severitySchema,
  title: z.string(),
  service_type: z.string().optional(),
  details: z.any().optional(),
});

const loadbalancerServiceSchema = z.object({
  type: z.literal("loadbalancer_service"),
  severity: severitySchema,
  title: z.string(),
  service_type: z.string().optional(),
  details: z.any().optional(),
});

const noNetworkPolicySchema = z.object({
  type: z.literal("no_network_policy"),
  severity: severitySchema,
  title: z.string(),
});

// RBAC vulnerabilities
const rbacWildcardSchema = z.object({
  type: z.literal("rbac_wildcard"),
  severity: severitySchema,
  title: z.string(),
  description: z.string().optional(),
  role_name: z.string().optional(),
});

// Image Security vulnerabilities
const mutableImageTagSchema = z.object({
  type: z.literal("mutable_image_tag"),
  severity: severitySchema,
  title: z.string(),
  container: z.string().optional(),
  image: z.string().optional(),
});

const untrustedRegistrySchema = z.object({
  type: z.literal("untrusted_registry"),
  severity: severitySchema,
  title: z.string(),
  container: z.string().optional(),
  image: z.string().optional(),
});

const vulnerabilitySchema = z.discriminatedUnion("type", [
  privilegedContainerSchema,
  runningAsRootSchema,
  dangerousCapabilitiesSchema,
  hostNetworkSchema,
  hostPidSchema,
  hostIpcSchema,
  hostPathMountSchema,
  missingResourceLimitsSchema,
  automountedSaTokenSchema,
  defaultServiceAccountSchema,
  nodeportServiceSchema,
  unrestrictedLoadbalancerSchema,
  loadbalancerServiceSchema,
  noNetworkPolicySchema,
  rbacWildcardSchema,
  mutableImageTagSchema,
  untrustedRegistrySchema,
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

// 5. Main Response Schema - Success case
const ClusterDataSuccessSchema = z.object({
  status: z.literal("success"),
  data: z.object({
    timestamp: z.string(),
    nodes: z.array(NodeSchema),
    links: z.array(LinkSchema),
    stats: StatsSchema,
  }),
});

// Response Schema - Waiting case (no data file yet)
const ClusterDataWaitingSchema = z.object({
  status: z.literal("waiting"),
  message: z.string(),
});

// Response Schema - Initializing case (Kubernetes starting up)
const ClusterDataInitializingSchema = z.object({
  status: z.literal("initializing"),
  message: z.string(),
  data: z
    .object({
      timestamp: z.string(),
      nodes: z.array(NodeSchema),
      links: z.array(LinkSchema),
      stats: StatsSchema,
    })
    .optional(),
});

// Response Schema - Empty case (no resources found)
const ClusterDataEmptySchema = z.object({
  status: z.literal("empty"),
  message: z.string(),
  data: z.object({
    timestamp: z.string(),
    nodes: z.array(NodeSchema),
    links: z.array(LinkSchema),
    stats: StatsSchema,
  }),
});

// Response Schema - Error case
const ClusterDataErrorSchema = z.object({
  status: z.literal("error"),
  error: z.string(),
});

// Union of all possible responses
export const ClusterDataSchema = z.discriminatedUnion("status", [
  ClusterDataSuccessSchema,
  ClusterDataWaitingSchema,
  ClusterDataInitializingSchema,
  ClusterDataEmptySchema,
  ClusterDataErrorSchema,
]);

// Export the inferred TypeScript type
export type ClusterData = z.infer<typeof ClusterDataSchema>;
