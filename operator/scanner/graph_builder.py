"""
Cluster Graph Builder

Converts Kubernetes cluster topology into a simplified graph format
with nodes (namespaces, nodes, pods, services) and links (contains, runs-on, exposes).
"""

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from kubernetes import client

from .cluster_scanner import ClusterScanner


class ClusterGraphBuilder:
    """Builds a simplified graph representation of Kubernetes cluster topology."""

    def __init__(self, scanner: ClusterScanner):
        self.scanner = scanner
        self.nodes: List[Dict[str, Any]] = []
        self.links: List[Dict[str, Any]] = []

    def add_namespace_nodes(self) -> None:
        """Add namespace nodes to the graph."""
        try:
            namespaces = self.scanner.v1_api.list_namespace()
            for ns in namespaces.items:
                self.nodes.append({
                    "id": f"ns-{ns.metadata.name}",
                    "label": ns.metadata.name,
                    "type": "namespace",
                    "status": ns.status.phase,
                })
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
                self.nodes.append({
                    "id": f"pod-{pod.metadata.namespace}-{pod.metadata.name}",
                    "label": pod.metadata.name,
                    "type": "pod",
                    "namespace": pod.metadata.namespace,
                    "status": pod_status,
                })
        except Exception as e:
            print(f"❌ Error adding pod nodes: {e}")

    def add_service_nodes(self) -> None:
        """Add service nodes to the graph."""
        try:
            services = self.scanner.v1_api.list_service_for_all_namespaces()
            for svc in services.items:
                self.nodes.append({
                    "id": f"svc-{svc.metadata.namespace}-{svc.metadata.name}",
                    "label": svc.metadata.name,
                    "type": "service",
                    "namespace": svc.metadata.namespace,
                    "status": svc.spec.type,
                })
        except Exception as e:
            print(f"❌ Error adding service nodes: {e}")

    def add_namespace_contains_links(self) -> None:
        """Add links showing namespace contains pods and services."""
        try:
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
        except Exception as e:
            print(f"❌ Error adding namespace contains links: {e}")

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

        print(f"✅ Graph built: {graph['stats']['total_nodes']} nodes, {graph['stats']['total_links']} links")
        return graph

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
