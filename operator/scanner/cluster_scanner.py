"""Cluster scanner module for monitoring Kubernetes cluster status"""
import json
import base64
from datetime import datetime
from pathlib import Path
from kubernetes import client, config, watch
from kubernetes.client.rest import ApiException
from typing import Any, Dict, Optional


class ClusterScanner:
    """Advanced scanner for cluster security analysis"""
    
    def __init__(self, output_dir: str = "/app/scanner_output"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.output_file = self.output_dir / "cluster_status.json"
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
    
    # ========== SCAN 1: SECRETS ==========
    def scan_secrets(self) -> dict:
        """Scan for secrets across all namespaces"""
        try:
            secrets = self.v1_api.list_secret_for_all_namespaces()
            findings = []
            
            for secret in secrets.items:
                secret_data = {
                    "namespace": secret.metadata.namespace,
                    "name": secret.metadata.name,
                    "type": secret.type,
                    "keys": [],
                    "decoded_data": {}
                }
                
                if secret.data:
                    for key, value in secret.data.items():
                        secret_data["keys"].append(key)
                        try:
                            # Decode base64
                            decoded = base64.b64decode(value).decode('utf-8', errors='ignore')
                            # Only include first 100 chars for safety
                            secret_data["decoded_data"][key] = decoded[:100]
                        except:
                            secret_data["decoded_data"][key] = "[binary data]"
                
                findings.append(secret_data)
            
            return {
                "success": True,
                "count": len(findings),
                "findings": findings
            }
        except Exception as e:
            return {"success": False, "error": str(e), "count": 0, "findings": []}
    
    # ========== SCAN 2: MISCONFIGS (ConfigMaps) ==========
    def scan_misconfigs(self) -> dict:
        """Scan for potential misconfigurations in ConfigMaps"""
        try:
            configmaps = self.v1_api.list_config_map_for_all_namespaces()
            findings = []
            
            for cm in configmaps.items:
                if cm.data:
                    cm_data = {
                        "namespace": cm.metadata.namespace,
                        "name": cm.metadata.name,
                        "data": cm.data
                    }
                    findings.append(cm_data)
            
            return {
                "success": True,
                "count": len(findings),
                "findings": findings
            }
        except Exception as e:
            return {"success": False, "error": str(e), "count": 0, "findings": []}
    
    # ========== SCAN 3: WORKLOADS ==========
    def scan_workloads(self) -> dict:
        """Scan for workload configurations and environment variables"""
        try:
            deployments = self.apps_api.list_deployment_for_all_namespaces()
            findings = []
            
            for deploy in deployments.items:
                if deploy.spec.template.spec.containers:
                    deploy_data = {
                        "namespace": deploy.metadata.namespace,
                        "name": deploy.metadata.name,
                        "replicas": deploy.spec.replicas,
                        "containers": []
                    }
                    
                    for container in deploy.spec.template.spec.containers:
                        container_data = {
                            "name": container.name,
                            "image": container.image,
                            "env_vars": []
                        }
                        
                        if container.env:
                            for env_var in container.env:
                                container_data["env_vars"].append({
                                    "name": env_var.name,
                                    "value": env_var.value,
                                    "value_from": str(env_var.value_from) if env_var.value_from else None
                                })
                        
                        deploy_data["containers"].append(container_data)
                    
                    findings.append(deploy_data)
            
            return {
                "success": True,
                "count": len(findings),
                "findings": findings
            }
        except Exception as e:
            return {"success": False, "error": str(e), "count": 0, "findings": []}
    
    # ========== SCAN 4: PRIVILEGES ==========
    def scan_privileges(self) -> dict:
        """Scan for privileged ClusterRoles and dangerous permissions"""
        try:
            cluster_roles = self.rbac_api.list_cluster_role()
            findings = []
            
            for role in cluster_roles.items:
                dangerous_rules = []
                
                if role.rules:
                    for rule in role.rules:
                        # Check for wildcard permissions
                        if rule.verbs and ('*' in rule.verbs or '*' in (rule.resources or [])):
                            rule_data = {
                                "verbs": rule.verbs,
                                "resources": rule.resources,
                                "api_groups": rule.api_groups
                            }
                            dangerous_rules.append(rule_data)
                
                if dangerous_rules:
                    role_data = {
                        "name": role.metadata.name,
                        "namespace": role.metadata.namespace,
                        "dangerous_rules": dangerous_rules
                    }
                    findings.append(role_data)
            
            return {
                "success": True,
                "count": len(findings),
                "findings": findings
            }
        except Exception as e:
            return {"success": False, "error": str(e), "count": 0, "findings": []}
    
    # ========== SCAN 5: EXPOSURE (Ingress) ==========
    def scan_exposure(self) -> dict:
        """Scan for exposed services via Ingress"""
        try:
            ingresses = self.networking_api.list_ingress_for_all_namespaces()
            findings = []
            
            for ingress in ingresses.items:
                ingress_data = {
                    "namespace": ingress.metadata.namespace,
                    "name": ingress.metadata.name,
                    "tls": [],
                    "rules": []
                }
                
                # TLS configuration
                if ingress.spec.tls:
                    for tls in ingress.spec.tls:
                        ingress_data["tls"].append({
                            "hosts": tls.hosts,
                            "secret_name": tls.secret_name
                        })
                
                # Ingress rules
                if ingress.spec.rules:
                    for rule in ingress.spec.rules:
                        rule_data = {
                            "host": rule.host,
                            "paths": []
                        }
                        
                        if rule.http and rule.http.paths:
                            for path in rule.http.paths:
                                rule_data["paths"].append({
                                    "path": path.path,
                                    "service_name": path.backend.service.name if path.backend.service else None,
                                    "service_port": path.backend.service.port.number if path.backend.service else None
                                })
                        
                        ingress_data["rules"].append(rule_data)
                
                findings.append(ingress_data)
            
            return {
                "success": True,
                "count": len(findings),
                "findings": findings
            }
        except Exception as e:
            return {"success": False, "error": str(e), "count": 0, "findings": []}
    
    # ========== SCAN 6: CONTAINER IMAGES ==========
    def scan_images(self) -> dict:
        """Scan for container images across all pods"""
        try:
            pods = self.v1_api.list_pod_for_all_namespaces()
            findings = []
            
            for pod in pods.items:
                if pod.spec.containers:
                    pod_data = {
                        "namespace": pod.metadata.namespace,
                        "name": pod.metadata.name,
                        "images": []
                    }
                    
                    for container in pod.spec.containers:
                        image_data = {
                            "container_name": container.name,
                            "image": container.image,
                            "image_pull_policy": container.image_pull_policy
                        }
                        pod_data["images"].append(image_data)
                    
                    findings.append(pod_data)
            
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
                "secrets": self.scan_secrets(),
                "misconfigs": self.scan_misconfigs(),
                "workloads": self.scan_workloads(),
                "privileges": self.scan_privileges(),
                "exposure": self.scan_exposure(),
                "images": self.scan_images()
            }
        }
        return scan_result
    
    def scan_topology(self) -> Dict[str, Any]:
        """Scan cluster topology and build graph"""
        try:
            from .graph_builder import ClusterGraphBuilder
            builder = ClusterGraphBuilder(self)
            graph = builder.build_graph()
            return graph
        except Exception as e:
            print(f"❌ Error scanning topology: {e}", flush=True)
            return {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "nodes": [],
                "links": [],
                "error": str(e)
            }
    
    def save_scan(self, scan_data: dict) -> bool:
        """Save scan result to JSON file"""
        try:
            with open(self.output_file, "w") as f:
                json.dump(scan_data, f, indent=2)
            print(f"✅ Scan saved to {self.output_file}", flush=True)
            return True
        except Exception as e:
            print(f"❌ Error saving scan: {e}", flush=True)
            return False
    
    def save_graph(self, graph_data: dict) -> bool:
        """Save graph result to JSON file"""
        try:
            with open(self.graph_file, "w") as f:
                json.dump(graph_data, f, indent=2)
            print(f"✅ Graph saved to {self.graph_file}", flush=True)
            return True
        except Exception as e:
            print(f"❌ Error saving graph: {e}", flush=True)
            return False
    
    def run_and_save(self) -> dict:
        """Run scan and save result"""
        scan_data = self.scan()
        self.save_scan(scan_data)
        
        # Also run topology scan
        graph_data = self.scan_topology()
        self.save_graph(graph_data)
        
        return scan_data
