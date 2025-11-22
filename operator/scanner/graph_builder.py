"""
Cluster Graph Builder

Converts Kubernetes cluster topology into a simplified graph format
with nodes (namespaces, nodes, pods, services) and links (contains, runs-on, exposes).
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from kubernetes import client

from .cluster_scanner import ClusterScanner


class ClusterGraphBuilder:
    """Builds a simplified graph representation of Kubernetes cluster topology."""

    def __init__(self, scanner: ClusterScanner, scan_data: Optional[Dict[str, Any]] = None):
        self.scanner = scanner
        self.scan_data = scan_data or {}
        self.nodes: List[Dict[str, Any]] = []
        self.links: List[Dict[str, Any]] = []

    def add_namespace_nodes(self) -> None:
        """Add namespace nodes to the graph."""
        try:
            namespaces = self.scanner.v1_api.list_namespace()
            for ns in namespaces.items:
                namespace_node = {
                    "id": f"ns-{ns.metadata.name}",
                    "label": ns.metadata.name,
                    "type": "namespace",
                    "status": ns.status.phase,
                    "vulnerabilities": self._get_namespace_vulnerabilities(ns.metadata.name)
                }
                self.nodes.append(namespace_node)
        except Exception as e:
            print(f"❌ Error adding namespace nodes: {e}")

    def add_node_nodes(self) -> None:
        """Add cluster node nodes to the graph."""
        try:
            nodes = self.scanner.v1_api.list_node()
            for node in nodes.items:
                status = "ready" if self._is_node_ready(node) else "not-ready"
                self.nodes.append({
                    "id": f"node-{node.metadata.name}",
                    "label": node.metadata.name,
                    "type": "node",
                    "status": status,
                })
        except Exception as e:
            print(f"❌ Error adding node nodes: {e}")

    def add_pod_nodes(self) -> None:
        """Add pod nodes to the graph."""
        try:
            pods = self.scanner.v1_api.list_pod_for_all_namespaces()
            for pod in pods.items:
                pod_status = pod.status.phase.lower() if pod.status.phase else "unknown"
                pod_node = {
                    "id": f"pod-{pod.metadata.namespace}-{pod.metadata.name}",
                    "label": pod.metadata.name,
                    "type": "pod",
                    "namespace": pod.metadata.namespace,
                    "status": pod_status,
                    "vulnerabilities": self._get_pod_vulnerabilities(pod)
                }
                self.nodes.append(pod_node)
        except Exception as e:
            print(f"❌ Error adding pod nodes: {e}")

    def add_service_nodes(self) -> None:
        """Add service nodes to the graph."""
        try:
            services = self.scanner.v1_api.list_service_for_all_namespaces()
            for svc in services.items:
                service_node = {
                    "id": f"svc-{svc.metadata.namespace}-{svc.metadata.name}",
                    "label": svc.metadata.name,
                    "type": "service",
                    "namespace": svc.metadata.namespace,
                    "status": svc.spec.type,
                    "vulnerabilities": self._get_service_vulnerabilities(svc)
                }
                self.nodes.append(service_node)
        except Exception as e:
            print(f"❌ Error adding service nodes: {e}")

    def add_namespace_contains_links(self) -> None:
        """Add links showing namespace contains pods and services."""
        try:
            print("🔗 Adding namespace contains links...", flush=True)
            # Namespace contains pods
            pods = self.scanner.v1_api.list_pod_for_all_namespaces()
            for pod in pods.items:
                ns = pod.metadata.namespace
                self.links.append({
                    "source": f"ns-{ns}",
                    "target": f"pod-{ns}-{pod.metadata.name}",
                    "type": "contains",
                })

            # Namespace contains services
            services = self.scanner.v1_api.list_service_for_all_namespaces()
            for svc in services.items:
                ns = svc.metadata.namespace
                self.links.append({
                    "source": f"ns-{ns}",
                    "target": f"svc-{ns}-{svc.metadata.name}",
                    "type": "contains",
                })
            print("✅ Added namespace contains links", flush=True)
        except Exception as e:
            print(f"❌ Error adding namespace contains links: {e}", flush=True)

    def add_pod_to_node_links(self) -> None:
        """Add links showing pods running on nodes."""
        try:
            pods = self.scanner.v1_api.list_pod_for_all_namespaces()
            for pod in pods.items:
                if pod.spec.node_name:
                    ns = pod.metadata.namespace
                    self.links.append({
                        "source": f"pod-{ns}-{pod.metadata.name}",
                        "target": f"node-{pod.spec.node_name}",
                        "type": "runs-on",
                    })
        except Exception as e:
            print(f"❌ Error adding pod to node links: {e}")

    def add_service_to_pod_links(self) -> None:
        """Add links showing services exposing pods."""
        try:
            services = self.scanner.v1_api.list_service_for_all_namespaces()
            for svc in services.items:
                if not svc.spec.selector:
                    continue

                ns = svc.metadata.namespace
                pods = self.scanner.v1_api.list_namespaced_pod(ns)

                for pod in pods.items:
                    if self._matches_selector(pod.metadata.labels or {}, svc.spec.selector):
                        self.links.append({
                            "source": f"svc-{ns}-{svc.metadata.name}",
                            "target": f"pod-{ns}-{pod.metadata.name}",
                            "type": "exposes",
                        })
        except Exception as e:
            print(f"❌ Error adding service to pod links: {e}")

    def build_graph(self) -> Dict[str, Any]:
        """Build the complete graph by adding all nodes and links."""
        print("🔨 Building cluster graph...")

        # Add all nodes
        self.add_namespace_nodes()
        self.add_node_nodes()
        self.add_pod_nodes()
        self.add_service_nodes()

        # Add all links
        self.add_namespace_contains_links()
        self.add_pod_to_node_links()
        self.add_service_to_pod_links()

        # Create graph with timestamp
        graph = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "nodes": self.nodes,
            "links": self.links,
            "stats": {
                "total_nodes": len(self.nodes),
                "total_links": len(self.links),
                "node_types": self._count_by_type(self.nodes),
                "link_types": self._count_by_type(self.links, "type"),
            }
        }

        total_nodes = graph['stats']['total_nodes']  # type: ignore
        total_links = graph['stats']['total_links']  # type: ignore
        print(f"✅ Graph built: {total_nodes} nodes, {total_links} links")
        return graph

    def _get_pod_vulnerabilities(self, pod: Any) -> List[Dict[str, Any]]:
        """Extract vulnerabilities relevant to a specific pod."""
        vulnerabilities = []
        scans = self.scan_data.get("scans", {})
        
        # Check container security vulnerabilities
        container_security = scans.get("container_security", {}).get("findings", [])
        for finding in container_security:
            if (finding.get("namespace") == pod.metadata.namespace and 
                finding.get("pod_name") == pod.metadata.name):
                # Add pod-level vulnerabilities
                for issue in finding.get("pod_level", []):
                    vulnerabilities.append({
                        "type": issue.get("type"),
                        "severity": issue.get("severity"),
                        "title": issue.get("description"),
                        "details": issue
                    })
                # Add container-level vulnerabilities
                for container in finding.get("containers", []):
                    for vuln in container.get("vulnerabilities", []):
                        vulnerabilities.append({
                            "type": vuln.get("type"),
                            "severity": vuln.get("severity"),
                            "title": vuln.get("description"),
                            "container": container.get("container_name")
                        })
        
        # Check resource limits
        resource_limits = scans.get("resource_limits", {}).get("findings", [])
        for finding in resource_limits:
            if (finding.get("namespace") == pod.metadata.namespace and 
                finding.get("pod_name") == pod.metadata.name):
                for container in finding.get("containers", []):
                    vulnerabilities.append({
                        "type": "missing_resource_limits",
                        "severity": container.get("severity"),
                        "title": container.get("description"),
                        "container": container.get("container_name"),
                        "missing_limits": container.get("missing_limits")
                    })
        
        # Check ServiceAccount security
        sa_security = scans.get("serviceaccount_security", {}).get("findings", [])
        for finding in sa_security:
            if (finding.get("namespace") == pod.metadata.namespace and 
                finding.get("pod_name") == pod.metadata.name):
                for issue in finding.get("issues", []):
                    vulnerabilities.append({
                        "type": issue.get("type"),
                        "severity": issue.get("severity"),
                        "title": issue.get("description"),
                        "service_account": finding.get("service_account")
                    })
        
        # Check image security
        image_security = scans.get("image_security", {}).get("findings", [])
        for finding in image_security:
            if (finding.get("namespace") == pod.metadata.namespace and 
                finding.get("pod_name") == pod.metadata.name):
                for container in finding.get("containers", []):
                    for issue in container.get("issues", []):
                        vulnerabilities.append({
                            "type": issue.get("type"),
                            "severity": issue.get("severity"),
                            "title": issue.get("description"),
                            "container": container.get("container_name"),
                            "image": container.get("image")
                        })
        
        return vulnerabilities
    
    def _get_namespace_vulnerabilities(self, namespace: str) -> List[Dict[str, Any]]:
        """Extract vulnerabilities relevant to a specific namespace."""
        vulnerabilities = []
        scans = self.scan_data.get("scans", {})
        
        # Check network exposure issues for this namespace
        network_exposure = scans.get("network_exposure", {}).get("findings", [])
        for finding in network_exposure:
            if finding.get("namespace") == namespace:
                # Check if it's a namespace without NetworkPolicy
                if finding.get("type") == "namespace_without_netpol":
                    for issue in finding.get("issues", []):
                        vulnerabilities.append({
                            "type": issue.get("type"),
                            "severity": issue.get("severity"),
                            "title": issue.get("description")
                        })
        
        # Check RBAC wildcards (ClusterRoles can affect any namespace)
        rbac_wildcards = scans.get("rbac_wildcards", {}).get("findings", [])
        for finding in rbac_wildcards:
            # ClusterRoles are cluster-wide but we show them in each namespace
            for rule in finding.get("dangerous_rules", []):
                vulnerabilities.append({
                    "type": "rbac_wildcard",
                    "severity": rule.get("severity"),
                    "title": f"Dangerous ClusterRole: {finding.get('role_name')}",
                    "description": rule.get("description"),
                    "role_name": finding.get("role_name")
                })
        
        return vulnerabilities
    
    def _get_service_vulnerabilities(self, service: Any) -> List[Dict[str, Any]]:
        """Extract vulnerabilities relevant to a specific service."""
        vulnerabilities = []
        scans = self.scan_data.get("scans", {})
        
        # Check network exposure (NodePort, LoadBalancer)
        network_exposure = scans.get("network_exposure", {}).get("findings", [])
        for finding in network_exposure:
            if (finding.get("namespace") == service.metadata.namespace and 
                finding.get("service_name") == service.metadata.name):
                for issue in finding.get("issues", []):
                    vulnerabilities.append({
                        "type": issue.get("type"),
                        "severity": issue.get("severity"),
                        "title": issue.get("description"),
                        "service_type": finding.get("type"),
                        "details": issue
                    })
        
        return vulnerabilities

    @staticmethod
    def _is_node_ready(node: client.V1Node) -> bool:
        """Check if a Kubernetes node is in Ready state."""
        if not node.status.conditions:
            return False
        for condition in node.status.conditions:
            if condition.type == "Ready":
                return condition.status == "True"
        return False

    @staticmethod
    def _matches_selector(labels: Optional[Dict[str, str]], selector: Dict[str, str]) -> bool:
        """Check if pod labels match service selector."""
        if not labels:
            return False
        for key, value in selector.items():
            if labels.get(key) != value:
                return False
        return True

    @staticmethod
    def _count_by_type(items: List[Dict[str, Any]], key: str = "type") -> Dict[str, int]:
        """Count items by their type."""
        counts: Dict[str, int] = {}
        for item in items:
            item_type = item.get(key, "unknown")
            counts[item_type] = counts.get(item_type, 0) + 1
        return counts
