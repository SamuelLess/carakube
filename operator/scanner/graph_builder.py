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
                # Get resource quotas for this namespace
                quotas = []
                try:
                    quota_list = self.scanner.v1_api.list_namespaced_resource_quota(ns.metadata.name)
                    for quota in quota_list.items:
                        quota_info = {
                            "name": quota.metadata.name,
                            "hard": {},
                            "used": {}
                        }
                        if quota.status:
                            if quota.status.hard:
                                quota_info["hard"] = dict(quota.status.hard)
                            if quota.status.used:
                                quota_info["used"] = dict(quota.status.used)
                        quotas.append(quota_info)
                except Exception:
                    pass
                
                # Get limit ranges for this namespace
                limit_ranges = []
                try:
                    limit_list = self.scanner.v1_api.list_namespaced_limit_range(ns.metadata.name)
                    for limit in limit_list.items:
                        limit_info = {
                            "name": limit.metadata.name,
                            "limits": []
                        }
                        if limit.spec.limits:
                            for limit_item in limit.spec.limits:
                                limit_info["limits"].append({
                                    "type": limit_item.type,
                                    "default": dict(limit_item.default) if limit_item.default else {},
                                    "default_request": dict(limit_item.default_request) if limit_item.default_request else {},
                                    "max": dict(limit_item.max) if limit_item.max else {},
                                    "min": dict(limit_item.min) if limit_item.min else {}
                                })
                        limit_ranges.append(limit_info)
                except Exception:
                    pass
                
                # Count resources in namespace
                resource_count = {
                    "pods": 0,
                    "services": 0,
                    "deployments": 0,
                    "configmaps": 0,
                    "secrets": 0
                }
                try:
                    pods = self.scanner.v1_api.list_namespaced_pod(ns.metadata.name)
                    resource_count["pods"] = len(pods.items)
                    
                    services = self.scanner.v1_api.list_namespaced_service(ns.metadata.name)
                    resource_count["services"] = len(services.items)
                    
                    deployments = self.scanner.apps_api.list_namespaced_deployment(ns.metadata.name)
                    resource_count["deployments"] = len(deployments.items)
                    
                    configmaps = self.scanner.v1_api.list_namespaced_config_map(ns.metadata.name)
                    resource_count["configmaps"] = len(configmaps.items)
                    
                    secrets = self.scanner.v1_api.list_namespaced_secret(ns.metadata.name)
                    resource_count["secrets"] = len(secrets.items)
                except Exception:
                    pass
                
                # Extract labels and annotations
                labels = dict(ns.metadata.labels) if ns.metadata.labels else {}
                annotations = dict(ns.metadata.annotations) if ns.metadata.annotations else {}
                
                namespace_node = {
                    "id": f"ns-{ns.metadata.name}",
                    "label": ns.metadata.name,
                    "type": "namespace",
                    "status": ns.status.phase,
                    "creation_timestamp": ns.metadata.creation_timestamp.isoformat() if ns.metadata.creation_timestamp else None,
                    "resource_quotas": quotas,
                    "limit_ranges": limit_ranges,
                    "resource_count": resource_count,
                    "vulnerabilities": self._get_namespace_vulnerabilities(ns.metadata.name),
                    # Additional kubectl describe equivalent fields
                    "labels": labels,
                    "annotations": annotations,
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
                
                # Extract resource information
                capacity = node.status.capacity or {}
                allocatable = node.status.allocatable or {}
                
                # Extract node conditions
                conditions = []
                if node.status.conditions:
                    for condition in node.status.conditions:
                        conditions.append({
                            "type": condition.type,
                            "status": condition.status,
                            "reason": condition.reason,
                            "message": condition.message
                        })
                
                # Extract node info
                node_info = {}
                if node.status.node_info:
                    node_info = {
                        "os_image": node.status.node_info.os_image,
                        "kernel_version": node.status.node_info.kernel_version,
                        "container_runtime": node.status.node_info.container_runtime_version,
                        "kubelet_version": node.status.node_info.kubelet_version,
                        "architecture": node.status.node_info.architecture,
                    }
                
                # Extract addresses
                addresses = {}
                if node.status.addresses:
                    for addr in node.status.addresses:
                        addresses[addr.type] = addr.address
                
                # Try to get metrics if available
                metrics = self.scanner.get_node_metrics(node.metadata.name)
                
                # Extract taints
                taints = []
                if node.spec.taints:
                    for taint in node.spec.taints:
                        taints.append({
                            "key": taint.key,
                            "value": taint.value,
                            "effect": taint.effect
                        })
                
                # Extract labels and annotations
                labels = dict(node.metadata.labels) if node.metadata.labels else {}
                annotations = dict(node.metadata.annotations) if node.metadata.annotations else {}
                
                # Extract images (cached on node)
                images_list = []
                if node.status.images:
                    for img in node.status.images[:10]:  # Limit to first 10
                        images_list.append({
                            "names": img.names[:3] if img.names else [],  # First 3 names
                            "size_bytes": img.size_bytes
                        })
                
                # Extract node resources (actual usage vs capacity)
                allocated_resources = {
                    "cpu_requests": 0,
                    "cpu_limits": 0,
                    "memory_requests": 0,
                    "memory_limits": 0,
                    "pods": 0
                }
                
                # Count resources allocated by pods on this node
                try:
                    pods_on_node = self.scanner.v1_api.list_pod_for_all_namespaces(
                        field_selector=f"spec.nodeName={node.metadata.name}"
                    )
                    allocated_resources["pods"] = len(pods_on_node.items)
                    
                    for pod in pods_on_node.items:
                        if pod.spec.containers:
                            for container in pod.spec.containers:
                                if container.resources:
                                    if container.resources.requests:
                                        cpu_req = container.resources.requests.get("cpu", "0")
                                        mem_req = container.resources.requests.get("memory", "0")
                                        # Simple accumulation (proper parsing would convert units)
                                        allocated_resources["cpu_requests"] += 1 if cpu_req and cpu_req != "0" else 0
                                        allocated_resources["memory_requests"] += 1 if mem_req and mem_req != "0" else 0
                                    if container.resources.limits:
                                        cpu_lim = container.resources.limits.get("cpu", "0")
                                        mem_lim = container.resources.limits.get("memory", "0")
                                        allocated_resources["cpu_limits"] += 1 if cpu_lim and cpu_lim != "0" else 0
                                        allocated_resources["memory_limits"] += 1 if mem_lim and mem_lim != "0" else 0
                except Exception:
                    pass
                
                self.nodes.append({
                    "id": f"node-{node.metadata.name}",
                    "label": node.metadata.name,
                    "type": "node",
                    "status": status,
                    "capacity": {
                        "cpu": capacity.get("cpu"),
                        "memory": capacity.get("memory"),
                        "pods": capacity.get("pods"),
                        "ephemeral_storage": capacity.get("ephemeral-storage")
                    },
                    "allocatable": {
                        "cpu": allocatable.get("cpu"),
                        "memory": allocatable.get("memory"),
                        "pods": allocatable.get("pods"),
                        "ephemeral_storage": allocatable.get("ephemeral-storage")
                    },
                    "conditions": conditions,
                    "node_info": node_info,
                    "addresses": addresses,
                    "metrics": metrics,
                    # Additional kubectl describe equivalent fields
                    "labels": labels,
                    "annotations": annotations,
                    "taints": taints,
                    "images": images_list,
                    "allocated_resources": allocated_resources,
                })
        except Exception as e:
            print(f"❌ Error adding node nodes: {e}")

    def _get_pod_events(self, namespace: str, pod_name: str) -> List[Dict[str, Any]]:
        """Get events related to a specific pod"""
        try:
            events = self.scanner.v1_api.list_namespaced_event(
                namespace=namespace,
                field_selector=f"involvedObject.name={pod_name}"
            )
            event_list = []
            for event in events.items:
                event_list.append({
                    "type": event.type,
                    "reason": event.reason,
                    "message": event.message,
                    "count": event.count,
                    "first_timestamp": event.first_timestamp.isoformat() if event.first_timestamp else None,
                    "last_timestamp": event.last_timestamp.isoformat() if event.last_timestamp else None,
                    "source": f"{event.source.component}" if event.source else None,
                })
            return event_list
        except Exception:
            return []

    def add_pod_nodes(self) -> None:
        """Add pod nodes to the graph with comprehensive kubectl describe equivalent data."""
        try:
            pods = self.scanner.v1_api.list_pod_for_all_namespaces()
            for pod in pods.items:
                pod_status = pod.status.phase.lower() if pod.status.phase else "unknown"
                
                # Extract container information with resources
                containers = []
                if pod.spec.containers:
                    for container in pod.spec.containers:
                        container_info = {
                            "name": container.name,
                            "image": container.image,
                            "image_pull_policy": container.image_pull_policy,
                            "ports": [],
                            "resources": {
                                "requests": {},
                                "limits": {}
                            }
                        }
                        
                        # Extract ports
                        if container.ports:
                            for port in container.ports:
                                container_info["ports"].append({
                                    "name": port.name,
                                    "container_port": port.container_port,
                                    "protocol": port.protocol
                                })
                        
                        # Extract resource requests/limits
                        if container.resources:
                            if container.resources.requests:
                                container_info["resources"]["requests"] = {
                                    "cpu": container.resources.requests.get("cpu"),
                                    "memory": container.resources.requests.get("memory")
                                }
                            if container.resources.limits:
                                container_info["resources"]["limits"] = {
                                    "cpu": container.resources.limits.get("cpu"),
                                    "memory": container.resources.limits.get("memory")
                                }
                        
                        containers.append(container_info)
                
                # Extract container statuses (for restart counts, current state)
                container_statuses = []
                if pod.status.container_statuses:
                    for status in pod.status.container_statuses:
                        state_info = {}
                        if status.state:
                            if status.state.running:
                                state_info = {
                                    "state": "running",
                                    "started_at": status.state.running.started_at.isoformat() if status.state.running.started_at else None
                                }
                            elif status.state.waiting:
                                state_info = {
                                    "state": "waiting",
                                    "reason": status.state.waiting.reason,
                                    "message": status.state.waiting.message
                                }
                            elif status.state.terminated:
                                state_info = {
                                    "state": "terminated",
                                    "reason": status.state.terminated.reason,
                                    "exit_code": status.state.terminated.exit_code
                                }
                        
                        container_statuses.append({
                            "name": status.name,
                            "ready": status.ready,
                            "restart_count": status.restart_count,
                            "image": status.image,
                            "state": state_info
                        })
                
                # Extract pod conditions
                conditions = []
                if pod.status.conditions:
                    for condition in pod.status.conditions:
                        conditions.append({
                            "type": condition.type,
                            "status": condition.status,
                            "reason": condition.reason,
                            "message": condition.message
                        })
                
                # Get owner reference to determine if part of deployment/replicaset
                owner_info = None
                if pod.metadata.owner_references:
                    for owner in pod.metadata.owner_references:
                        if owner.kind in ["ReplicaSet", "StatefulSet", "DaemonSet", "Job"]:
                            owner_info = {
                                "kind": owner.kind,
                                "name": owner.name
                            }
                            break
                
                # Try to get metrics if available
                metrics = self.scanner.get_pod_metrics(pod.metadata.namespace, pod.metadata.name)
                
                # Get events for this pod
                events = self._get_pod_events(pod.metadata.namespace, pod.metadata.name)
                
                # Extract volumes information
                volumes = []
                if pod.spec.volumes:
                    for vol in pod.spec.volumes:
                        vol_info = {
                            "name": vol.name,
                            "type": None,
                            "source": {}
                        }
                        
                        # Determine volume type and source
                        if vol.config_map:
                            vol_info["type"] = "ConfigMap"
                            vol_info["source"] = {"name": vol.config_map.name}
                        elif vol.secret:
                            vol_info["type"] = "Secret"
                            vol_info["source"] = {"name": vol.secret.secret_name}
                        elif vol.persistent_volume_claim:
                            vol_info["type"] = "PersistentVolumeClaim"
                            vol_info["source"] = {"claim_name": vol.persistent_volume_claim.claim_name}
                        elif vol.empty_dir:
                            vol_info["type"] = "EmptyDir"
                            vol_info["source"] = {"medium": vol.empty_dir.medium if vol.empty_dir.medium else ""}
                        elif vol.host_path:
                            vol_info["type"] = "HostPath"
                            vol_info["source"] = {"path": vol.host_path.path, "type": vol.host_path.type}
                        elif vol.projected:
                            vol_info["type"] = "Projected"
                        
                        volumes.append(vol_info)
                
                # Extract tolerations
                tolerations = []
                if pod.spec.tolerations:
                    for tol in pod.spec.tolerations:
                        tolerations.append({
                            "key": tol.key,
                            "operator": tol.operator,
                            "value": tol.value,
                            "effect": tol.effect,
                            "toleration_seconds": tol.toleration_seconds
                        })
                
                # Extract node selector
                node_selector = dict(pod.spec.node_selector) if pod.spec.node_selector else {}
                
                # Extract priority and priority class
                priority_info = {
                    "priority": pod.spec.priority,
                    "priority_class_name": pod.spec.priority_class_name
                }
                
                # Extract service account
                service_account = pod.spec.service_account_name
                
                # Extract security context
                security_context = {}
                if pod.spec.security_context:
                    security_context = {
                        "run_as_user": pod.spec.security_context.run_as_user,
                        "run_as_group": pod.spec.security_context.run_as_group,
                        "run_as_non_root": pod.spec.security_context.run_as_non_root,
                        "fs_group": pod.spec.security_context.fs_group,
                        "supplemental_groups": pod.spec.security_context.supplemental_groups,
                        "se_linux_options": str(pod.spec.security_context.se_linux_options) if pod.spec.security_context.se_linux_options else None
                    }
                
                # Extract labels and annotations
                labels = dict(pod.metadata.labels) if pod.metadata.labels else {}
                annotations = dict(pod.metadata.annotations) if pod.metadata.annotations else {}
                
                pod_node = {
                    "id": f"pod-{pod.metadata.namespace}-{pod.metadata.name}",
                    "label": pod.metadata.name,
                    "type": "pod",
                    "namespace": pod.metadata.namespace,
                    "status": pod_status,
                    "node_name": pod.spec.node_name,
                    "pod_ip": pod.status.pod_ip,
                    "host_ip": pod.status.host_ip,
                    "qos_class": pod.status.qos_class,
                    "restart_policy": pod.spec.restart_policy,
                    "containers": containers,
                    "container_statuses": container_statuses,
                    "conditions": conditions,
                    "owner": owner_info,
                    "metrics": metrics,
                    "creation_timestamp": pod.metadata.creation_timestamp.isoformat() if pod.metadata.creation_timestamp else None,
                    "vulnerabilities": self._get_pod_vulnerabilities(pod),
                    # Additional kubectl describe equivalent fields
                    "labels": labels,
                    "annotations": annotations,
                    "volumes": volumes,
                    "tolerations": tolerations,
                    "node_selector": node_selector,
                    "priority": priority_info,
                    "service_account": service_account,
                    "security_context": security_context,
                    "events": events,
                }
                self.nodes.append(pod_node)
        except Exception as e:
            print(f"❌ Error adding pod nodes: {e}")

    def add_service_nodes(self) -> None:
        """Add service nodes to the graph."""
        try:
            services = self.scanner.v1_api.list_service_for_all_namespaces()
            for svc in services.items:
                # Extract ports
                ports = []
                if svc.spec.ports:
                    for port in svc.spec.ports:
                        ports.append({
                            "name": port.name,
                            "protocol": port.protocol,
                            "port": port.port,
                            "target_port": str(port.target_port) if port.target_port else None,
                            "node_port": port.node_port
                        })
                
                # Extract selectors
                selectors = svc.spec.selector if svc.spec.selector else {}
                
                # Get endpoints to see how many pods are backing this service
                endpoints_info = {
                    "ready": 0,
                    "not_ready": 0,
                    "addresses": []
                }
                try:
                    endpoints = self.scanner.v1_api.read_namespaced_endpoints(
                        name=svc.metadata.name,
                        namespace=svc.metadata.namespace
                    )
                    if endpoints.subsets:
                        for subset in endpoints.subsets:
                            if subset.addresses:
                                endpoints_info["ready"] += len(subset.addresses)
                                for addr in subset.addresses:
                                    endpoints_info["addresses"].append({
                                        "ip": addr.ip,
                                        "hostname": addr.hostname,
                                        "node_name": addr.node_name,
                                        "target_ref": {
                                            "kind": addr.target_ref.kind,
                                            "name": addr.target_ref.name
                                        } if addr.target_ref else None
                                    })
                            if subset.not_ready_addresses:
                                endpoints_info["not_ready"] += len(subset.not_ready_addresses)
                except Exception:
                    # Endpoints might not exist for some services
                    pass
                
                # Extract labels and annotations
                labels = dict(svc.metadata.labels) if svc.metadata.labels else {}
                annotations = dict(svc.metadata.annotations) if svc.metadata.annotations else {}
                
                # Get load balancer status
                load_balancer_status = {}
                if svc.status and svc.status.load_balancer:
                    if svc.status.load_balancer.ingress:
                        load_balancer_status = {
                            "ingress": [
                                {
                                    "ip": ing.ip,
                                    "hostname": ing.hostname
                                } for ing in svc.status.load_balancer.ingress
                            ]
                        }
                
                service_node = {
                    "id": f"svc-{svc.metadata.namespace}-{svc.metadata.name}",
                    "label": svc.metadata.name,
                    "type": "service",
                    "namespace": svc.metadata.namespace,
                    "status": svc.spec.type,
                    "cluster_ip": svc.spec.cluster_ip,
                    "external_ips": svc.spec.external_i_ps if svc.spec.external_i_ps else [],
                    "load_balancer_ip": svc.spec.load_balancer_ip,
                    "session_affinity": svc.spec.session_affinity,
                    "ports": ports,
                    "selectors": selectors,
                    "endpoints": endpoints_info,
                    "vulnerabilities": self._get_service_vulnerabilities(svc),
                    # Additional kubectl describe equivalent fields
                    "labels": labels,
                    "annotations": annotations,
                    "load_balancer_status": load_balancer_status,
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
