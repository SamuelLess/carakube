# Cluster Scanner Module

Advanced Kubernetes security scanner with 6 comprehensive analysis categories.

## Scans

### 1️⃣ Secrets (`scan_secrets`)
**API:** `CoreV1Api.list_secret_for_all_namespaces()`

Scans for secrets across all namespaces and extracts:
- Secret name and namespace
- Secret type (e.g., Helm, ServiceAccountToken, etc.)
- Keys stored in the secret
- Base64-decoded values (first 100 chars for safety)

**Use Case:** Detect exposed secrets, Helm chart values, credentials

---

### 2️⃣ Misconfigs (`scan_misconfigs`)
**API:** `CoreV1Api.list_config_map_for_all_namespaces()`

Scans for configuration issues:
- ConfigMaps with plaintext data (often contains secrets)
- Configuration patterns that might indicate security issues
- Credentials stored in config files

**Use Case:** Find plaintext secrets in ConfigMaps

---

### 3️⃣ Workloads (`scan_workloads`)
**API:** `AppsV1Api.list_deployment_for_all_namespaces()`

Analyzes deployment configurations:
- Deployment metadata and replica counts
- Container images and configurations
- Environment variables (sensitive data exposure)
- Value sources (ConfigMap, Secret references)

**Use Case:** Audit workload configurations and detect env var leaks

---

### 4️⃣ Privileges (`scan_privileges`)
**API:** `RbacAuthorizationV1Api.list_cluster_role()`

Detects dangerous RBAC configurations:
- Wildcard (`*`) permissions in verbs
- Wildcard (`*`) in resource access
- Over-privileged roles

**Use Case:** Identify privilege escalation risks

---

### 5️⃣ Exposure (`scan_exposure`)
**API:** `NetworkingV1Api.list_ingress_for_all_namespaces()`

Maps exposed services:
- TLS configuration and certificates
- Ingress rules and host routing
- Backend service information
- Exposed endpoints

**Use Case:** Audit public exposure, certificate management

---

### 6️⃣ Images (`scan_images`)
**API:** `CoreV1Api.list_pod_for_all_namespaces()`

Catalogs container images:
- All container images across pods
- Image pull policies
- Pod and container metadata

**Use Case:** Scan images for vulnerabilities, track image versions

---

## Output Format

All scans save to `/app/scanner_output/cluster_status.json`:

```json
{
  "timestamp": "2025-11-22T13:01:25.696301Z",
  "scans": {
    "secrets": {
      "success": true,
      "count": 5,
      "findings": [...]
    },
    "misconfigs": { ... },
    "workloads": { ... },
    "privileges": { ... },
    "exposure": { ... },
    "images": { ... }
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

The main API server reads scanner output via `/cluster/status` endpoint.
