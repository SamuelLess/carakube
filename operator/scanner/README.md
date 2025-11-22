# Cluster Scanner Module

Advanced Kubernetes security scanner detecting real vulnerabilities and misconfigurations with high security impact.

## Scans

### 1️⃣ Container Security (`scan_container_security`)
**Severity: CRITICAL/HIGH**  
**API:** `CoreV1Api.list_pod_for_all_namespaces()`

Detects critical container security risks:
- **Privileged containers** - Containers with `privileged: true` (full host access)
- **Running as root** - Containers without `runAsNonRoot: true` or with `runAsUser: 0`
- **Dangerous capabilities** - Containers with `SYS_ADMIN`, `NET_ADMIN`, `SYS_MODULE`, etc.
- **Host network access** - Pods using `hostNetwork: true` (can sniff traffic)
- **Host PID namespace** - Pods using `hostPID: true` (can see all processes)
- **Host IPC namespace** - Pods using `hostIPC: true`
- **Host path mounts** - Volumes mounting host directories with `hostPath`

**Impact:** Container escape, full host compromise, privilege escalation

---

### 2️⃣ Resource Limits (`scan_resource_limits`)
**Severity: HIGH**  
**API:** `CoreV1Api.list_pod_for_all_namespaces()`

Detects containers without resource limits:
- Missing CPU limits
- Missing memory limits

**Impact:** Denial of Service (DoS) - single container can exhaust cluster resources

---

### 3️⃣ ServiceAccount Security (`scan_serviceaccount_security`)
**Severity: MEDIUM**  
**API:** `CoreV1Api.list_pod_for_all_namespaces()`

Detects ServiceAccount security issues:
- **Automounted SA tokens** - Pods with `automountServiceAccountToken: true` (default)
- **Default ServiceAccount usage** - Pods using `default` ServiceAccount

**Impact:** Unnecessary token exposure, potential API server access

---

### 4️⃣ Network Exposure (`scan_network_exposure`)
**Severity: CRITICAL/HIGH**  
**API:** `CoreV1Api.list_service_for_all_namespaces()`, `NetworkingV1Api.list_network_policy_for_all_namespaces()`

Detects network security issues:
- **NodePort services** - Services exposed on all cluster nodes
- **Unrestricted LoadBalancer** - LoadBalancer services without `loadBalancerSourceRanges` (accessible from 0.0.0.0/0)
- **Missing NetworkPolicies** - Namespaces without any NetworkPolicy (unrestricted pod-to-pod traffic)

**Impact:** Public internet exposure, lateral movement, network-based attacks

---

### 5️⃣ RBAC Wildcards (`scan_rbac_wildcards`)
**Severity: CRITICAL**  
**API:** `RbacAuthorizationV1Api.list_cluster_role()`

Detects dangerous RBAC configurations:
- Wildcard (`*`) in verbs - Can perform any action
- Wildcard (`*`) in resources - Can access any resource
- Wildcard (`*`) in API groups - Can access any API group
- Combined wildcards - Full cluster admin access

**Impact:** Privilege escalation, cluster takeover

---

### 6️⃣ Image Security (`scan_image_security`)
**Severity: HIGH/MEDIUM**  
**API:** `CoreV1Api.list_pod_for_all_namespaces()`

Detects insecure image configurations:
- **Mutable tags** - Images using `:latest` or no tag (unpredictable deployments)
- **Untrusted registries** - Images from registries outside trusted list

**Trusted registries:** docker.io, gcr.io, ghcr.io, registry.k8s.io, quay.io, mcr.microsoft.com

**Impact:** Supply chain attacks, unpredictable behavior, compromised images

---

## Output Format

All scans save to `/app/scanner_output/cluster_graph.json`:

```json
{
  "timestamp": "2025-11-22T13:01:25.696301Z",
  "scans": {
    "container_security": {
      "success": true,
      "count": 3,
      "findings": [...]
    },
    "resource_limits": { ... },
    "serviceaccount_security": { ... },
    "network_exposure": { ... },
    "rbac_wildcards": { ... },
    "image_security": { ... }
  }
}
```

## Running the Scanner

```bash
# Run daemon (scans every 2 minutes)
uv run scanner/daemon.py

# Or with supervisord (in container)
supervisord -c /etc/supervisor/conf.d/supervisord.conf
```

## Integration with API

The main API server reads scanner output via `/api/graph` endpoint.
