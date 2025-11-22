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
  id: z.string(),
  type: z.literal("privileged_container"),
  severity: severitySchema,
  title: z.string(),
  container: z.string().optional(),
  details: z.any().optional(),
});

const runningAsRootSchema = z.object({
  id: z.string(),
  type: z.literal("running_as_root"),
  severity: severitySchema,
  title: z.string(),
  container: z.string().optional(),
});

const dangerousCapabilitiesSchema = z.object({
  id: z.string(),
  type: z.literal("dangerous_capabilities"),
  severity: severitySchema,
  title: z.string(),
  container: z.string().optional(),
});

const hostNetworkSchema = z.object({
  id: z.string(),
  type: z.literal("host_network"),
  severity: severitySchema,
  title: z.string(),
  details: z.any().optional(),
});

const hostPidSchema = z.object({
  id: z.string(),
  type: z.literal("host_pid"),
  severity: severitySchema,
  title: z.string(),
  details: z.any().optional(),
});

const hostIpcSchema = z.object({
  id: z.string(),
  type: z.literal("host_ipc"),
  severity: severitySchema,
  title: z.string(),
  details: z.any().optional(),
});

const hostPathMountSchema = z.object({
  id: z.string(),
  type: z.literal("host_path_mount"),
  severity: severitySchema,
  title: z.string(),
  details: z.any().optional(),
});

// Resource Limits vulnerabilities
const missingResourceLimitsSchema = z.object({
  id: z.string(),
  type: z.literal("missing_resource_limits"),
  severity: severitySchema,
  title: z.string(),
  container: z.string().optional(),
  missing_limits: z.array(z.string()).optional(),
});

// ServiceAccount vulnerabilities
const automountedSaTokenSchema = z.object({
  id: z.string(),
  type: z.literal("automounted_sa_token"),
  severity: severitySchema,
  title: z.string(),
  service_account: z.string().optional(),
});

const defaultServiceAccountSchema = z.object({
  id: z.string(),
  type: z.literal("default_serviceaccount"),
  severity: severitySchema,
  title: z.string(),
  service_account: z.string().optional(),
});

// Network Exposure vulnerabilities
const nodeportServiceSchema = z.object({
  id: z.string(),
  type: z.literal("nodeport_service"),
  severity: severitySchema,
  title: z.string(),
  service_type: z.string().optional(),
  details: z.any().optional(),
});

const unrestrictedLoadbalancerSchema = z.object({
  id: z.string(),
  type: z.literal("unrestricted_loadbalancer"),
  severity: severitySchema,
  title: z.string(),
  service_type: z.string().optional(),
  details: z.any().optional(),
});

const loadbalancerServiceSchema = z.object({
  id: z.string(),
  type: z.literal("loadbalancer_service"),
  severity: severitySchema,
  title: z.string(),
  service_type: z.string().optional(),
  details: z.any().optional(),
});

const noNetworkPolicySchema = z.object({
  id: z.string(),
  type: z.literal("no_network_policy"),
  severity: severitySchema,
  title: z.string(),
});

// RBAC vulnerabilities
const rbacWildcardSchema = z.object({
  id: z.string(),
  type: z.literal("rbac_wildcard"),
  severity: severitySchema,
  title: z.string(),
  description: z.string().optional(),
  role_name: z.string().optional(),
});

// Image Security vulnerabilities
const mutableImageTagSchema = z.object({
  id: z.string(),
  type: z.literal("mutable_image_tag"),
  severity: severitySchema,
  title: z.string(),
  container: z.string().optional(),
  image: z.string().optional(),
});

const untrustedRegistrySchema = z.object({
  id: z.string(),
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

// Volume schemas
const volumeSchema = z.object({
  name: z.string(),
  type: z.string().nullable().optional(),
  source: z.record(z.string(), z.any()).optional(),
});

// Toleration schema
const tolerationSchema = z.object({
  key: z.string().nullable().optional(),
  operator: z.string().nullable().optional(),
  value: z.string().nullable().optional(),
  effect: z.string().nullable().optional(),
  toleration_seconds: z.number().nullable().optional(),
});

// Security context schema
const securityContextSchema = z.object({
  run_as_user: z.number().nullable().optional(),
  run_as_group: z.number().nullable().optional(),
  run_as_non_root: z.boolean().nullable().optional(),
  fs_group: z.number().nullable().optional(),
  supplemental_groups: z.array(z.number()).nullable().optional(),
  se_linux_options: z.string().nullable().optional(),
});

// Priority info schema
const priorityInfoSchema = z.object({
  priority: z.number().nullable().optional(),
  priority_class_name: z.string().nullable().optional(),
});

// Event schema
const eventSchema = z.object({
  type: z.string(),
  reason: z.string(),
  message: z.string(),
  count: z.number().nullable().optional(),
  first_timestamp: z.string().nullable().optional(),
  last_timestamp: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
});

// Taint schema
const taintSchema = z.object({
  key: z.string(),
  value: z.string().nullable().optional(),
  effect: z.string(),
});

// Node image schema
const nodeImageSchema = z.object({
  names: z.array(z.string()),
  size_bytes: z.number().nullable().optional(),
});

// Allocated resources schema
const allocatedResourcesSchema = z.object({
  cpu_requests: z.number(),
  cpu_limits: z.number(),
  memory_requests: z.number(),
  memory_limits: z.number(),
  pods: z.number(),
});

// Load balancer status schema
const loadBalancerStatusSchema = z.object({
  ingress: z
    .array(
      z.object({
        ip: z.string().nullable().optional(),
        hostname: z.string().nullable().optional(),
      })
    )
    .optional(),
});

// Resource schemas
const resourceQuantitySchema = z.object({
  cpu: z.string().nullable().optional(),
  memory: z.string().nullable().optional(),
});

const containerResourcesSchema = z.object({
  requests: resourceQuantitySchema.optional(),
  limits: resourceQuantitySchema.optional(),
});

const portSchema = z.object({
  name: z.string().nullable().optional(),
  container_port: z.number().optional(),
  port: z.number().optional(),
  target_port: z.string().nullable().optional(),
  node_port: z.number().nullable().optional(),
  protocol: z.string().nullable().optional(),
});

const containerSchema = z.object({
  name: z.string(),
  image: z.string(),
  image_pull_policy: z.string().nullable().optional(),
  ports: z.array(portSchema).optional(),
  resources: containerResourcesSchema.optional(),
});

const containerStateSchema = z.object({
  state: z.string(),
  started_at: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  exit_code: z.number().nullable().optional(),
});

const containerStatusSchema = z.object({
  name: z.string(),
  ready: z.boolean(),
  restart_count: z.number(),
  image: z.string(),
  state: containerStateSchema.optional(),
});

const conditionSchema = z.object({
  type: z.string(),
  status: z.string(),
  reason: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
});

const ownerInfoSchema = z.object({
  kind: z.string(),
  name: z.string(),
});

const metricsContainerSchema = z.object({
  name: z.string(),
  usage: z.object({
    cpu: z.string().nullable().optional(),
    memory: z.string().nullable().optional(),
  }),
});

const podMetricsSchema = z.object({
  timestamp: z.string().nullable().optional(),
  window: z.string().nullable().optional(),
  containers: z.array(metricsContainerSchema).optional(),
});

const nodeMetricsSchema = z.object({
  timestamp: z.string().nullable().optional(),
  window: z.string().nullable().optional(),
  usage: z
    .object({
      cpu: z.string().nullable().optional(),
      memory: z.string().nullable().optional(),
    })
    .optional(),
});

const nodeInfoSchema = z.object({
  os_image: z.string().optional(),
  kernel_version: z.string().optional(),
  container_runtime: z.string().optional(),
  kubelet_version: z.string().optional(),
  architecture: z.string().optional(),
});

const resourceCapacitySchema = z.object({
  cpu: z.string().nullable().optional(),
  memory: z.string().nullable().optional(),
  pods: z.string().nullable().optional(),
  ephemeral_storage: z.string().nullable().optional(),
});

const endpointAddressSchema = z.object({
  ip: z.string(),
  hostname: z.string().nullable().optional(),
  node_name: z.string().nullable().optional(),
  target_ref: z
    .object({
      kind: z.string(),
      name: z.string(),
    })
    .nullable()
    .optional(),
});

const endpointsInfoSchema = z.object({
  ready: z.number(),
  not_ready: z.number(),
  addresses: z.array(endpointAddressSchema),
});

const quotaSchema = z.object({
  name: z.string(),
  hard: z.record(z.string(), z.string()),
  used: z.record(z.string(), z.string()),
});

const limitRangeItemSchema = z.object({
  type: z.string(),
  default: z.record(z.string(), z.string()).optional(),
  default_request: z.record(z.string(), z.string()).optional(),
  max: z.record(z.string(), z.string()).optional(),
  min: z.record(z.string(), z.string()).optional(),
});

const limitRangeSchema = z.object({
  name: z.string(),
  limits: z.array(limitRangeItemSchema),
});

const resourceCountSchema = z.object({
  pods: z.number(),
  services: z.number(),
  deployments: z.number(),
  configmaps: z.number(),
  secrets: z.number(),
});

// 1. Define the distinct Node shapes
const BaseNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  vulnerabilities: vulnerabilitiesSchema.optional(),
});

const NamespaceNodeSchema = BaseNodeSchema.extend({
  type: z.literal("namespace"),
  status: z.string(), // e.g., "Active"
  creation_timestamp: z.string().nullable().optional(),
  resource_quotas: z.array(quotaSchema).optional(),
  limit_ranges: z.array(limitRangeSchema).optional(),
  resource_count: resourceCountSchema.optional(),
  // Additional kubectl describe equivalent fields
  labels: z.record(z.string(), z.string()).optional(),
  annotations: z.record(z.string(), z.string()).optional(),
});

const ClusterNodeSchema = BaseNodeSchema.extend({
  type: z.literal("node"),
  status: z.string(), // e.g., "ready"
  capacity: resourceCapacitySchema.optional(),
  allocatable: resourceCapacitySchema.optional(),
  conditions: z.array(conditionSchema).optional(),
  node_info: nodeInfoSchema.optional(),
  addresses: z.record(z.string(), z.string()).optional(),
  metrics: nodeMetricsSchema.nullable().optional(),
  // Additional kubectl describe equivalent fields
  labels: z.record(z.string(), z.string()).optional(),
  annotations: z.record(z.string(), z.string()).optional(),
  taints: z.array(taintSchema).optional(),
  images: z.array(nodeImageSchema).optional(),
  allocated_resources: allocatedResourcesSchema.optional(),
});

const PodNodeSchema = BaseNodeSchema.extend({
  type: z.literal("pod"),
  namespace: z.string(),
  status: z.string(), // e.g., "running"
  node_name: z.string().nullable().optional(),
  pod_ip: z.string().nullable().optional(),
  host_ip: z.string().nullable().optional(),
  qos_class: z.string().nullable().optional(),
  restart_policy: z.string().nullable().optional(),
  containers: z.array(containerSchema).optional(),
  container_statuses: z.array(containerStatusSchema).optional(),
  conditions: z.array(conditionSchema).optional(),
  owner: ownerInfoSchema.nullable().optional(),
  metrics: podMetricsSchema.nullable().optional(),
  creation_timestamp: z.string().nullable().optional(),
  // Additional kubectl describe equivalent fields
  labels: z.record(z.string(), z.string()).optional(),
  annotations: z.record(z.string(), z.string()).optional(),
  volumes: z.array(volumeSchema).optional(),
  tolerations: z.array(tolerationSchema).optional(),
  node_selector: z.record(z.string(), z.string()).optional(),
  priority: priorityInfoSchema.optional(),
  service_account: z.string().nullable().optional(),
  security_context: securityContextSchema.optional(),
  events: z.array(eventSchema).optional(),
});

const ServiceNodeSchema = BaseNodeSchema.extend({
  type: z.literal("service"),
  namespace: z.string(),
  status: z.string(), // e.g., "NodePort", "ClusterIP"
  cluster_ip: z.string().nullable().optional(),
  external_ips: z.array(z.string()).optional(),
  load_balancer_ip: z.string().nullable().optional(),
  session_affinity: z.string().nullable().optional(),
  ports: z.array(portSchema).optional(),
  selectors: z.record(z.string(), z.string()).optional(),
  endpoints: endpointsInfoSchema.optional(),
  // Additional kubectl describe equivalent fields
  labels: z.record(z.string(), z.string()).optional(),
  annotations: z.record(z.string(), z.string()).optional(),
  load_balancer_status: loadBalancerStatusSchema.optional(),
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

// Export individual node types for use in components
export type NamespaceNode = z.infer<typeof NamespaceNodeSchema>;
export type ClusterNode = z.infer<typeof ClusterNodeSchema>;
export type PodNode = z.infer<typeof PodNodeSchema>;
export type ServiceNode = z.infer<typeof ServiceNodeSchema>;
export type GraphNode = z.infer<typeof NodeSchema>;
