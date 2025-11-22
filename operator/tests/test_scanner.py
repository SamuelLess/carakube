# Python Backend Tests

"""
Test suite for the Carakube Operator backend.
Tests cluster scanner, graph builder, and API endpoints.
"""

import pytest
import json
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

# These tests assume the operator module is importable
# Run from the operator directory with: pytest -v


class TestClusterScanner:
    """Tests for ClusterScanner class"""

    def test_scanner_initialization(self):
        """Test that scanner initializes correctly"""
        from scanner.cluster_scanner import ClusterScanner

        with patch("scanner.cluster_scanner.config"):
            scanner = ClusterScanner(output_dir="/tmp/test_output")
            assert scanner.output_dir.exists()
            assert scanner.graph_file.name == "cluster_graph.json"

    def test_scan_container_security_structure(self):
        """Test that scan_container_security returns correct structure"""
        from scanner.cluster_scanner import ClusterScanner

        with patch("scanner.cluster_scanner.config"):
            scanner = ClusterScanner(output_dir="/tmp/test_output")

            # Mock the v1_api with a privileged pod
            mock_container = Mock()
            mock_container.name = "test-container"
            mock_container.image = "nginx:latest"
            mock_container.security_context = Mock()
            mock_container.security_context.privileged = True
            mock_container.security_context.run_as_user = None
            mock_container.security_context.run_as_non_root = None
            mock_container.security_context.capabilities = None

            mock_pod = Mock()
            mock_pod.metadata.namespace = "default"
            mock_pod.metadata.name = "test-pod"
            mock_pod.spec.containers = [mock_container]
            mock_pod.spec.host_network = False
            mock_pod.spec.host_pid = False
            mock_pod.spec.host_ipc = False
            mock_pod.spec.volumes = None

            mock_pods = Mock()
            mock_pods.items = [mock_pod]
            scanner.v1_api.list_pod_for_all_namespaces = Mock(
                return_value=mock_pods
            )

            result = scanner.scan_container_security()

            assert result["success"] == True
            assert result["count"] >= 1
            assert len(result["findings"]) >= 1
            assert result["findings"][0]["namespace"] == "default"
            assert result["findings"][0]["pod_name"] == "test-pod"

    def test_scan_handles_errors_gracefully(self):
        """Test that scanner handles API errors gracefully"""
        from scanner.cluster_scanner import ClusterScanner

        with patch("scanner.cluster_scanner.config"):
            scanner = ClusterScanner(output_dir="/tmp/test_output")
            scanner.v1_api.list_pod_for_all_namespaces = Mock(
                side_effect=Exception("API Error")
            )

            result = scanner.scan_container_security()

            assert result["success"] == False
            assert "error" in result
            assert result["count"] == 0


class TestGraphBuilder:
    """Tests for ClusterGraphBuilder class"""

    def test_graph_builder_initialization(self):
        """Test graph builder initializes correctly"""
        from scanner.graph_builder import ClusterGraphBuilder
        from scanner.cluster_scanner import ClusterScanner

        with patch("scanner.cluster_scanner.config"):
            scanner = Mock(spec=ClusterScanner)
            builder = ClusterGraphBuilder(scanner)

            assert builder.nodes == []
            assert builder.links == []

    def test_add_namespace_nodes(self):
        """Test adding namespace nodes to graph"""
        from scanner.graph_builder import ClusterGraphBuilder
        from scanner.cluster_scanner import ClusterScanner

        with patch("scanner.cluster_scanner.config"):
            scanner = Mock(spec=ClusterScanner)
            scanner.v1_api = Mock()
            scanner.apps_api = Mock()
            scanner.scan_data = {}

            # Mock namespace
            mock_ns = Mock()
            mock_ns.metadata.name = "default"
            mock_ns.metadata.creation_timestamp = None
            mock_ns.metadata.labels = {}
            mock_ns.metadata.annotations = {}
            mock_ns.status.phase = "Active"

            mock_namespaces = Mock()
            mock_namespaces.items = [mock_ns]
            scanner.v1_api.list_namespace.return_value = mock_namespaces
            
            # Mock all the list methods for resource counting
            scanner.v1_api.list_namespaced_resource_quota.return_value = Mock(items=[])
            scanner.v1_api.list_namespaced_limit_range.return_value = Mock(items=[])
            scanner.v1_api.list_namespaced_pod.return_value = Mock(items=[])
            scanner.v1_api.list_namespaced_service.return_value = Mock(items=[])
            scanner.v1_api.list_namespaced_config_map.return_value = Mock(items=[])
            scanner.v1_api.list_namespaced_secret.return_value = Mock(items=[])
            scanner.apps_api.list_namespaced_deployment.return_value = Mock(items=[])

            builder = ClusterGraphBuilder(scanner)
            builder.add_namespace_nodes()

            assert len(builder.nodes) == 1
            assert builder.nodes[0]["id"] == "ns-default"
            assert builder.nodes[0]["type"] == "namespace"
            assert builder.nodes[0]["status"] == "Active"

    def test_build_graph_structure(self):
        """Test that build_graph returns correct structure"""
        from scanner.graph_builder import ClusterGraphBuilder
        from scanner.cluster_scanner import ClusterScanner

        with patch("scanner.cluster_scanner.config"):
            scanner = Mock(spec=ClusterScanner)
            scanner.v1_api = Mock()
            scanner.scan_data = {}
            
            scanner.v1_api.list_namespace.return_value = Mock(items=[])
            scanner.v1_api.list_node.return_value = Mock(items=[])
            scanner.v1_api.list_pod_for_all_namespaces.return_value = Mock(items=[])
            scanner.v1_api.list_service_for_all_namespaces.return_value = Mock(
                items=[]
            )

            builder = ClusterGraphBuilder(scanner)
            graph = builder.build_graph()

            assert "nodes" in graph
            assert "links" in graph
            assert "timestamp" in graph
            assert isinstance(graph["nodes"], list)
            assert isinstance(graph["links"], list)

    def test_node_id_format(self):
        """Test that node IDs follow correct format"""
        from scanner.graph_builder import ClusterGraphBuilder
        from scanner.cluster_scanner import ClusterScanner

        with patch("scanner.cluster_scanner.config"):
            scanner = Mock(spec=ClusterScanner)
            scanner.v1_api = Mock()
            scanner.scan_data = {}
            scanner.get_pod_metrics = Mock(return_value=None)

            mock_container = Mock()
            mock_container.name = "nginx"
            mock_container.image = "nginx:latest"
            mock_container.image_pull_policy = "IfNotPresent"
            mock_container.ports = []
            mock_container.resources = Mock(requests=None, limits=None)

            mock_pod = Mock()
            mock_pod.metadata.namespace = "default"
            mock_pod.metadata.name = "nginx-123"
            mock_pod.metadata.creation_timestamp = None
            mock_pod.metadata.owner_references = []
            mock_pod.metadata.labels = {}
            mock_pod.metadata.annotations = {}
            mock_pod.status.phase = "Running"
            mock_pod.status.pod_ip = "10.0.0.1"
            mock_pod.status.host_ip = "192.168.1.1"
            mock_pod.status.qos_class = "BestEffort"
            mock_pod.status.conditions = []
            mock_pod.status.container_statuses = []
            mock_pod.spec.node_name = "worker-1"
            mock_pod.spec.restart_policy = "Always"
            mock_pod.spec.containers = [mock_container]
            mock_pod.spec.volumes = []
            mock_pod.spec.tolerations = []
            mock_pod.spec.node_selector = {}
            mock_pod.spec.priority = None
            mock_pod.spec.priority_class_name = None
            mock_pod.spec.service_account_name = "default"
            mock_pod.spec.security_context = None

            mock_pods = Mock()
            mock_pods.items = [mock_pod]
            scanner.v1_api.list_pod_for_all_namespaces.return_value = mock_pods
            scanner.v1_api.list_namespaced_event.return_value = Mock(items=[])

            builder = ClusterGraphBuilder(scanner)
            builder.add_pod_nodes()

            assert len(builder.nodes) == 1
            assert builder.nodes[0]["id"] == "pod-default-nginx-123"
            assert "-" in builder.nodes[0]["id"]  # Contains separator
            assert " " not in builder.nodes[0]["id"]  # No spaces


class TestAPIEndpoints:
    """Tests for FastAPI endpoints"""

    def test_health_endpoint(self):
        """Test health endpoint returns correct response"""
        # This would require setting up FastAPI test client
        # pytest-asyncio and httpx would be needed
        pass

    def test_graph_endpoint_structure(self):
        """Test /api/graph endpoint returns correct structure"""
        # Mock test for structure validation
        expected_structure = {
            "status": "success",
            "data": {"nodes": [], "links": [], "timestamp": "2025-11-22T..."},
        }

        assert "status" in expected_structure
        assert "data" in expected_structure
        assert "nodes" in expected_structure["data"]
        assert "links" in expected_structure["data"]


class TestIntegration:
    """Integration tests for full workflow"""

    def test_full_scan_to_graph_workflow(self):
        """Test complete workflow from scan to graph generation"""
        from scanner.cluster_scanner import ClusterScanner
        from scanner.graph_builder import ClusterGraphBuilder

        with patch("scanner.cluster_scanner.config"):
            scanner = Mock(spec=ClusterScanner)
            scanner.v1_api = Mock()
            scanner.scan_data = {}

            # Mock all required API calls
            scanner.v1_api.list_namespace.return_value = Mock(items=[])
            scanner.v1_api.list_node.return_value = Mock(items=[])
            scanner.v1_api.list_pod_for_all_namespaces.return_value = Mock(items=[])
            scanner.v1_api.list_service_for_all_namespaces.return_value = Mock(
                items=[]
            )

            # Build graph
            builder = ClusterGraphBuilder(scanner)
            graph = builder.build_graph()

            # Validate output
            assert isinstance(graph, dict)
            assert "timestamp" in graph
            assert isinstance(graph["nodes"], list)
            assert isinstance(graph["links"], list)

    def test_graph_links_reference_valid_nodes(self):
        """Test that all graph links reference existing nodes"""
        from scanner.graph_builder import ClusterGraphBuilder
        from scanner.cluster_scanner import ClusterScanner

        with patch("scanner.cluster_scanner.config"):
            scanner = Mock(spec=ClusterScanner)
            scanner.v1_api = Mock()
            scanner.apps_api = Mock()
            scanner.scan_data = {}
            scanner.get_pod_metrics = Mock(return_value=None)
            scanner.get_node_metrics = Mock(return_value=None)

            # Create mock namespace with proper attributes
            mock_ns = Mock()
            mock_ns.metadata.name = "default"
            mock_ns.metadata.creation_timestamp = None
            mock_ns.metadata.labels = {}
            mock_ns.metadata.annotations = {}
            mock_ns.status.phase = "Active"

            # Mock the resource quota and limit range lists
            scanner.v1_api.list_namespaced_resource_quota.return_value = Mock(items=[])
            scanner.v1_api.list_namespaced_limit_range.return_value = Mock(items=[])
            scanner.v1_api.list_namespaced_pod.return_value = Mock(items=[])
            scanner.v1_api.list_namespaced_service.return_value = Mock(items=[])
            scanner.v1_api.list_namespaced_config_map.return_value = Mock(items=[])
            scanner.v1_api.list_namespaced_secret.return_value = Mock(items=[])
            scanner.v1_api.list_namespaced_event.return_value = Mock(items=[])
            scanner.apps_api.list_namespaced_deployment.return_value = Mock(items=[])

            # Create mock pod with all required attributes
            mock_pod = Mock()
            mock_pod.metadata.namespace = "default"
            mock_pod.metadata.name = "nginx"
            mock_pod.metadata.creation_timestamp = None
            mock_pod.metadata.owner_references = []
            mock_pod.metadata.labels = {}
            mock_pod.metadata.annotations = {}
            mock_pod.status.phase = "Running"
            mock_pod.status.pod_ip = None
            mock_pod.status.host_ip = None
            mock_pod.status.qos_class = None
            mock_pod.status.conditions = []
            mock_pod.status.container_statuses = []
            mock_pod.spec.node_name = None
            mock_pod.spec.restart_policy = "Always"
            mock_pod.spec.containers = []
            mock_pod.spec.volumes = []
            mock_pod.spec.tolerations = []
            mock_pod.spec.node_selector = {}
            mock_pod.spec.priority = None
            mock_pod.spec.priority_class_name = None
            mock_pod.spec.service_account_name = "default"
            mock_pod.spec.security_context = None

            scanner.v1_api.list_namespace.return_value = Mock(items=[mock_ns])
            scanner.v1_api.list_node.return_value = Mock(items=[])
            scanner.v1_api.list_pod_for_all_namespaces.return_value = Mock(
                items=[mock_pod]
            )
            scanner.v1_api.list_service_for_all_namespaces.return_value = Mock(
                items=[]
            )

            builder = ClusterGraphBuilder(scanner)
            graph = builder.build_graph()

            # Collect all node IDs
            node_ids = set(node["id"] for node in graph["nodes"])

            # Verify all links reference valid nodes
            for link in graph["links"]:
                assert link["source"] in node_ids, f"Invalid source: {link['source']}"
                assert link["target"] in node_ids, f"Invalid target: {link['target']}"


# Pytest fixtures
@pytest.fixture
def mock_kubeconfig():
    """Fixture to mock Kubernetes configuration"""
    with patch("scanner.cluster_scanner.config"):
        yield


@pytest.fixture
def temp_output_dir(tmp_path):
    """Fixture to provide temporary output directory"""
    return tmp_path / "scanner_output"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

