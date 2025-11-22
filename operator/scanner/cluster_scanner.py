"""Cluster scanner module for monitoring Kubernetes cluster status"""
import json
from datetime import datetime
from pathlib import Path
from kubernetes import client, config
from kubernetes.client import CustomObjectsApi
from typing import Any, Dict, Optional


class ClusterScanner:
    """Advanced scanner for cluster security analysis"""
    
    def __init__(self, output_dir: str = "/app/scanner_output"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.graph_file = self.output_dir / "cluster_graph.json"
        self._init_k8s_clients()
    
    def _init_k8s_clients(self):
        """Initialize Kubernetes API clients"""
        try:
            config.load_incluster_config()
        except config.config_exception.ConfigException:
            try:
                config.load_kube_config()
            except config.config_exception.ConfigException:
                raise RuntimeError("Cannot load Kubernetes config")
        
        self.v1_api = client.CoreV1Api()
        self.apps_api = client.AppsV1Api()
        self.rbac_api = client.RbacAuthorizationV1Api()
        self.networking_api = client.NetworkingV1Api()
        
        # Try to initialize metrics API (may not be available)
        try:
            self.metrics_api = CustomObjectsApi()
            self.has_metrics = True
        except Exception:
            self.metrics_api = None
            self.has_metrics = False
    
    # ========== SCAN 1: CONTAINER SECURITY ==========
    def scan_container_security(self) -> dict:
        """Detect critical container security risks: privileged containers, host access, root users"""
        try:
            pods = self.v1_api.list_pod_for_all_namespaces()
            findings = []
            
            # System namespaces to exclude from security scans to avoid false positives
            system_namespaces = ["kube-system", "kube-public", "kube-node-lease", "local-path-storage"]
            
            for pod in pods.items:
                # Skip system namespaces
                if pod.metadata.namespace in system_namespaces:
                    continue

                if not pod.spec.containers:
                    continue
                    
                pod_issues = []
                
                for container in pod.spec.containers:
                    container_issues = {
                        "container_name": container.name,
                        "image": container.image,
                        "vulnerabilities": []
                    }
                    
                    # Check for privileged container
                    if container.security_context and container.security_context.privileged:
                        container_issues["vulnerabilities"].append({
                            "type": "privileged_container",
                            "severity": "critical",
                            "description": "Container runs in privileged mode with full host access"
                        })
                    
                    # Check for running as root
                    run_as_root = False
                    if container.security_context:
                        if container.security_context.run_as_user == 0:
                            run_as_root = True
                        elif container.security_context.run_as_non_root is False:
                            run_as_root = True
                    else:
                        # No security context means defaults (often root)
                        run_as_root = True
                    
                    if run_as_root:
                        container_issues["vulnerabilities"].append({
                            "type": "running_as_root",
                            "severity": "high",
                            "description": "Container allowed to run as root (UID 0)"
                        })
                    
                    # Check for dangerous capabilities
                    if container.security_context and container.security_context.capabilities:
                        if container.security_context.capabilities.add:
                            dangerous_caps = ["SYS_ADMIN", "NET_ADMIN", "SYS_MODULE", "DAC_READ_SEARCH"]
                            added_caps = [cap for cap in container.security_context.capabilities.add if cap in dangerous_caps]
                            if added_caps:
                                container_issues["vulnerabilities"].append({
                                    "type": "dangerous_capabilities",
                                    "severity": "high",
                                    "description": f"Container has dangerous capabilities: {', '.join(added_caps)}"
                                })
                    
                    if container_issues["vulnerabilities"]:
                        pod_issues.append(container_issues)
                
                # Check pod-level security issues
                pod_level_issues = []
                
                if pod.spec.host_network:
                    pod_level_issues.append({
                        "type": "host_network",
                        "severity": "critical",
                        "description": "Pod uses host network namespace, can sniff traffic"
                    })
                
                if pod.spec.host_pid:
                    pod_level_issues.append({
                        "type": "host_pid",
                        "severity": "critical",
                        "description": "Pod uses host PID namespace, can see all processes"
                    })
                
                if pod.spec.host_ipc:
                    pod_level_issues.append({
                        "type": "host_ipc",
                        "severity": "high",
                        "description": "Pod uses host IPC namespace"
                    })
                
                # Check for hostPath volumes
                if pod.spec.volumes:
                    for volume in pod.spec.volumes:
                        if volume.host_path:
                            pod_level_issues.append({
                                "type": "host_path_mount",
                                "severity": "critical",
                                "description": f"Pod mounts host path: {volume.host_path.path}",
                                "path": volume.host_path.path
                            })
                
                if pod_issues or pod_level_issues:
                    findings.append({
                        "namespace": pod.metadata.namespace,
                        "pod_name": pod.metadata.name,
                        "containers": pod_issues,
                        "pod_level": pod_level_issues
                    })
            
            return {
                "success": True,
                "count": len(findings),
                "findings": findings
            }
        except Exception as e:
            return {"success": False, "error": str(e), "count": 0, "findings": []}
    
    # ========== SCAN 2: RESOURCE LIMITS ==========
    def scan_resource_limits(self) -> dict:
        """Detect containers without CPU/memory limits (DoS risk)"""
        try:
            pods = self.v1_api.list_pod_for_all_namespaces()
            findings = []
            
            # System namespaces to exclude
            system_namespaces = ["kube-system", "kube-public", "kube-node-lease", "local-path-storage"]
            
            for pod in pods.items:
                # Skip system namespaces
                if pod.metadata.namespace in system_namespaces:
                    continue

                if not pod.spec.containers:
                    continue
                
                containers_without_limits = []
                
                for container in pod.spec.containers:
                    missing_limits = []
                    
                    if not container.resources or not container.resources.limits:
                        missing_limits = ["cpu", "memory"]
                    else:
                        if "cpu" not in container.resources.limits:
                            missing_limits.append("cpu")
                        if "memory" not in container.resources.limits:
                            missing_limits.append("memory")
                    
                    if missing_limits:
                        # Determine severity: missing memory limit is critical/high, missing CPU is medium
                        severity = "high"
                        if "memory" not in missing_limits and "cpu" in missing_limits:
                            severity = "medium"
                            
                        containers_without_limits.append({
                            "container_name": container.name,
                            "image": container.image,
                            "missing_limits": missing_limits,
                            "severity": severity,
                            "description": f"Container missing resource limits: {', '.join(missing_limits)}"
                        })
                
                if containers_without_limits:
                    findings.append({
                        "namespace": pod.metadata.namespace,
                        "pod_name": pod.metadata.name,
                        "containers": containers_without_limits
                    })
            
            return {
                "success": True,
                "count": len(findings),
                "findings": findings
            }
        except Exception as e:
            return {"success": False, "error": str(e), "count": 0, "findings": []}
    
    # ========== SCAN 3: SERVICEACCOUNT SECURITY ==========
    def scan_serviceaccount_security(self) -> dict:
        """Detect ServiceAccount token exposure and dangerous default SA permissions"""
        try:
            pods = self.v1_api.list_pod_for_all_namespaces()
            findings = []
            
            # System namespaces to exclude
            system_namespaces = ["kube-system", "kube-public", "kube-node-lease", "local-path-storage"]
            
            for pod in pods.items:
                # Skip system namespaces
                if pod.metadata.namespace in system_namespaces:
                    continue

                issues = []
                
                # Check if ServiceAccount token is automounted
                automount = True
                if pod.spec.automount_service_account_token is False:
                    automount = False
                
                sa_name = pod.spec.service_account_name or "default"
                
                if automount:
                    # If it's the default SA, it's more concerning because it's often unintentional
                    severity = "medium" if sa_name == "default" else "low"
                    desc = "ServiceAccount token automatically mounted"
                    if sa_name == "default":
                        desc += " (default SA token is usually useless but increases attack surface)"
                    else:
                        desc += " (verify if pod needs API access)"
                        
                    issues.append({
                        "type": "automounted_sa_token",
                        "severity": severity,
                        "description": desc,
                        "service_account": sa_name
                    })
                
                # Check if using default ServiceAccount
                if sa_name == "default":
                    issues.append({
                        "type": "default_serviceaccount",
                        "severity": "low", # Lowered from medium as it's only bad if permissions exist
                        "description": "Pod uses default ServiceAccount (best practice: create dedicated SA)"
                    })
                
                if issues:
                    findings.append({
                        "namespace": pod.metadata.namespace,
                        "pod_name": pod.metadata.name,
                        "service_account": sa_name,
                        "issues": issues
                    })
            
            return {
                "success": True,
                "count": len(findings),
                "findings": findings
            }
        except Exception as e:
            return {"success": False, "error": str(e), "count": 0, "findings": []}
    
    # ========== SCAN 4: NETWORK EXPOSURE ==========
    def scan_network_exposure(self) -> dict:
        """Detect NodePort/LoadBalancer services and missing NetworkPolicies"""
        try:
            findings = []
            
            # System namespaces to exclude
            system_namespaces = ["kube-system", "kube-public", "kube-node-lease", "local-path-storage"]
            
            # Check for exposed services
            services = self.v1_api.list_service_for_all_namespaces()
            for svc in services.items:
                # Skip system namespaces
                if svc.metadata.namespace in system_namespaces:
                    continue

                issues = []
                
                if svc.spec.type == "NodePort":
                    issues.append({
                        "type": "nodeport_service",
                        "severity": "medium", # Downgraded from high as it's often intentional
                        "description": "Service exposed on all nodes via NodePort",
                        "ports": [{"port": port.node_port, "target_port": port.target_port} 
                                 for port in (svc.spec.ports or []) if port.node_port]
                    })
                
                if svc.spec.type == "LoadBalancer":
                    # Check if source ranges are restricted
                    if not svc.spec.load_balancer_source_ranges:
                        issues.append({
                            "type": "unrestricted_loadbalancer",
                            "severity": "critical",
                            "description": "LoadBalancer service accessible from any IP (0.0.0.0/0)",
                            "external_ips": svc.status.load_balancer.ingress if svc.status.load_balancer else []
                        })
                    else:
                        issues.append({
                            "type": "loadbalancer_service",
                            "severity": "low", # Downgraded from medium as this is secure configuration
                            "description": "LoadBalancer service with restricted source ranges",
                            "source_ranges": svc.spec.load_balancer_source_ranges
                        })
                
                if issues:
                    findings.append({
                        "namespace": svc.metadata.namespace,
                        "service_name": svc.metadata.name,
                        "type": svc.spec.type,
                        "issues": issues
                    })
            
            # Check for namespaces without NetworkPolicies
            namespaces = self.v1_api.list_namespace()
            network_policies = self.networking_api.list_network_policy_for_all_namespaces()
            
            # Build set of namespaces with policies
            ns_with_policies = set()
            for np in network_policies.items:
                ns_with_policies.add(np.metadata.namespace)
            
            for ns in namespaces.items:
                ns_name = ns.metadata.name
                # Skip system namespaces
                if ns_name in system_namespaces:
                    continue
                    
                if ns_name not in ns_with_policies:
                    findings.append({
                        "namespace": ns_name,
                        "type": "namespace_without_netpol",
                        "issues": [{
                            "type": "no_network_policy",
                            "severity": "medium", # Downgraded from high as it's a best practice, not an exploit
                            "description": "Namespace has no NetworkPolicy (unrestricted pod-to-pod traffic)"
                        }]
                    })
            
            return {
                "success": True,
                "count": len(findings),
                "findings": findings
            }
        except Exception as e:
            return {"success": False, "error": str(e), "count": 0, "findings": []}
    
    # ========== SCAN 5: RBAC WILDCARDS ==========
    def scan_rbac_wildcards(self) -> dict:
        """Detect dangerous RBAC permissions with wildcard (*) access"""
        try:
            cluster_roles = self.rbac_api.list_cluster_role()
            findings = []
            
            # System roles to exclude (they are expected to be powerful)
            excluded_roles = ["cluster-admin", "admin", "edit", "view"]
            
            for role in cluster_roles.items:
                role_name = role.metadata.name
                
                # Skip system roles
                if role_name in excluded_roles or role_name.startswith("system:"):
                    continue
                    
                dangerous_rules = []
                
                if role.rules:
                    for rule in role.rules:
                        # Check for wildcard permissions
                        has_wildcard_verb = rule.verbs and '*' in rule.verbs
                        has_wildcard_resource = rule.resources and '*' in rule.resources
                        has_wildcard_apigroup = rule.api_groups and '*' in rule.api_groups
                        
                        if has_wildcard_verb or has_wildcard_resource or has_wildcard_apigroup:
                            # Determine severity
                            severity = "medium" # Default
                            description = "Has wildcard permissions"
                            
                            if has_wildcard_verb and has_wildcard_resource:
                                severity = "critical"
                                description = "Full cluster admin access (can do anything on any resource)"
                            elif has_wildcard_verb:
                                severity = "high"
                                description = f"Can perform any action on: {', '.join(rule.resources or ['all'])}"
                            elif has_wildcard_resource:
                                # Check if verbs are read-only
                                read_only_verbs = {"get", "list", "watch"}
                                rule_verbs = set(rule.verbs or [])
                                if rule_verbs.issubset(read_only_verbs):
                                    severity = "medium"
                                    description = f"Can read all resources ({', '.join(rule.verbs)})"
                                else:
                                    severity = "high"
                                    description = f"Can access all resources with: {', '.join(rule.verbs or ['all'])}"
                            else:
                                severity = "low"
                                description = "Has wildcard permissions in API groups"
                            
                            dangerous_rules.append({
                                "verbs": rule.verbs,
                                "resources": rule.resources,
                                "api_groups": rule.api_groups,
                                "severity": severity,
                                "description": description
                            })
                
                if dangerous_rules:
                    findings.append({
                        "role_name": role_name,
                        "role_type": "ClusterRole",
                        "dangerous_rules": dangerous_rules
                    })
            
            return {
                "success": True,
                "count": len(findings),
                "findings": findings
            }
        except Exception as e:
            return {"success": False, "error": str(e), "count": 0, "findings": []}
    
    # ========== SCAN 6: IMAGE SECURITY ==========
    def scan_image_security(self) -> dict:
        """Detect insecure image configurations: :latest tags, missing tags, untrusted registries"""
        try:
            pods = self.v1_api.list_pod_for_all_namespaces()
            findings = []
            
            # System namespaces to exclude
            system_namespaces = ["kube-system", "kube-public", "kube-node-lease", "local-path-storage"]
            
            # Trusted registries
            trusted_registries = [
                "docker.io",
                "gcr.io",
                "ghcr.io",
                "registry.k8s.io",
                "k8s.gcr.io",
                "quay.io",
                "mcr.microsoft.com",
                "public.ecr.aws",
            ]
            
            for pod in pods.items:
                # Skip system namespaces
                if pod.metadata.namespace in system_namespaces:
                    continue

                if not pod.spec.containers:
                    continue
                
                image_issues = []
                
                for container in pod.spec.containers:
                    image = container.image
                    issues = []
                    
                    # Check for :latest or missing tag
                    if image.endswith(":latest") or ":" not in image:
                        issues.append({
                            "type": "mutable_image_tag",
                            "severity": "medium",
                            "description": "Image uses :latest tag or no tag (unpredictable, not reproducible)"
                        })
                    
                    # Check registry
                    registry = image.split("/")[0] if "/" in image else "docker.io"
                    if "." not in registry:  # Short form like "nginx" implies docker.io
                        registry = "docker.io"
                    
                    is_trusted = False
                    # Check exact match or suffix match for trusted registries
                    if any(registry.endswith(trusted) or registry == trusted for trusted in trusted_registries):
                        is_trusted = True
                    
                    # Check for AWS ECR pattern (*.dkr.ecr.*.amazonaws.com)
                    if "dkr.ecr" in registry and "amazonaws.com" in registry:
                        is_trusted = True
                        
                    if not is_trusted:
                        issues.append({
                            "type": "untrusted_registry",
                            "severity": "medium", # Downgraded from high as it's likely a private registry
                            "description": f"Image from unknown/private registry: {registry} (verify trust)"
                        })
                    
                    if issues:
                        image_issues.append({
                            "container_name": container.name,
                            "image": image,
                            "issues": issues
                        })
                
                if image_issues:
                    findings.append({
                        "namespace": pod.metadata.namespace,
                        "pod_name": pod.metadata.name,
                        "containers": image_issues
                    })
            
            return {
                "success": True,
                "count": len(findings),
                "findings": findings
            }
        except Exception as e:
            return {"success": False, "error": str(e), "count": 0, "findings": []}
    
    def scan(self) -> dict:
        """Perform complete security scan"""
        scan_result = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "scans": {
                "container_security": self.scan_container_security(),
                "resource_limits": self.scan_resource_limits(),
                "serviceaccount_security": self.scan_serviceaccount_security(),
                "network_exposure": self.scan_network_exposure(),
                "rbac_wildcards": self.scan_rbac_wildcards(),
                "image_security": self.scan_image_security()
            }
        }
        return scan_result
    
    def scan_topology(self, scan_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Scan cluster topology and build graph with vulnerability data"""
        try:
            from .graph_builder import ClusterGraphBuilder
            builder = ClusterGraphBuilder(self, scan_data)
            graph = builder.build_graph()
            return graph
        except Exception as e:
            print(f"❌ Error scanning topology: {e} 🚨", flush=True)
            import traceback
            traceback.print_exc()
            return {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "nodes": [],
                "links": [],
                "error": str(e)
            }
    
    def get_pod_metrics(self, namespace: str, pod_name: str) -> Optional[Dict[str, Any]]:
        """Get metrics for a specific pod if metrics-server is available"""
        if not self.has_metrics or not self.metrics_api:
            return None
        
        try:
            metrics = self.metrics_api.get_namespaced_custom_object(
                group="metrics.k8s.io",
                version="v1beta1",
                namespace=namespace,
                plural="pods",
                name=pod_name
            )
            
            containers = []
            if metrics.get("containers"):
                for container in metrics["containers"]:
                    containers.append({
                        "name": container.get("name"),
                        "usage": {
                            "cpu": container.get("usage", {}).get("cpu"),
                            "memory": container.get("usage", {}).get("memory")
                        }
                    })
            
            return {
                "timestamp": metrics.get("timestamp"),
                "window": metrics.get("window"),
                "containers": containers
            }
        except Exception:
            return None
    
    def get_node_metrics(self, node_name: str) -> Optional[Dict[str, Any]]:
        """Get metrics for a specific node if metrics-server is available"""
        if not self.has_metrics or not self.metrics_api:
            return None
        
        try:
            metrics = self.metrics_api.get_cluster_custom_object(
                group="metrics.k8s.io",
                version="v1beta1",
                plural="nodes",
                name=node_name
            )
            
            return {
                "timestamp": metrics.get("timestamp"),
                "window": metrics.get("window"),
                "usage": {
                    "cpu": metrics.get("usage", {}).get("cpu"),
                    "memory": metrics.get("usage", {}).get("memory")
                }
            }
        except Exception:
            return None
    
    def save_graph(self, graph_data: dict) -> bool:
        """Save graph result to JSON file"""
        try:
            with open(self.graph_file, "w") as f:
                json.dump(graph_data, f, indent=2)
            print(f"✅ Graph saved to {self.graph_file} 🌐", flush=True)
            return True
        except Exception as e:
            print(f"❌ Error saving graph: {e} 🚨", flush=True)
            return False
    
    def run_and_save(self) -> dict:
        """Run scan and save graph with integrated vulnerability data"""
        # Run vulnerability scans
        scan_data = self.scan()
        
        # Build topology graph with vulnerability data integrated
        graph_data = self.scan_topology(scan_data)
        self.save_graph(graph_data)
        
        return graph_data
