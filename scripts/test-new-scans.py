#!/usr/bin/env python3
"""Quick test script for new scanner methods"""

import sys
from pathlib import Path

# Add operator to path
sys.path.insert(0, str(Path(__file__).parent.parent / "operator"))

from scanner.cluster_scanner import ClusterScanner
from unittest.mock import Mock, patch
import json


def test_network_policies():
    """Test network policy scan"""
    print("Testing scan_network_policies()...")
    
    with patch("scanner.cluster_scanner.config"):
        scanner = ClusterScanner(output_dir="/tmp/test_output")
        
        # Mock network policy
        mock_policy = Mock()
        mock_policy.metadata.namespace = "production"
        mock_policy.metadata.name = "deny-all"
        mock_policy.spec.pod_selector = Mock(match_labels={"app": "web"})
        mock_policy.spec.policy_types = ["Ingress", "Egress"]
        mock_policy.spec.ingress = []
        mock_policy.spec.egress = []
        
        # Mock namespace without policy
        mock_ns = Mock()
        mock_ns.metadata.name = "staging"
        
        scanner.networking_api.list_network_policy_for_all_namespaces = Mock(
            return_value=Mock(items=[mock_policy])
        )
        scanner.v1_api.list_namespace = Mock(
            return_value=Mock(items=[mock_ns])
        )
        
        result = scanner.scan_network_policies()
        
        print(f"✅ Success: {result['success']}")
        print(f"✅ Count: {result['count']}")
        print(f"✅ Structure: {json.dumps(result, indent=2, default=str)}")
        assert result["success"] == True
        assert result["count"] == 2  # 1 policy + 1 unprotected namespace
        print("✅ Network policies scan PASSED\n")


def test_resource_constraints():
    """Test resource constraints scan"""
    print("Testing scan_resource_constraints()...")
    
    with patch("scanner.cluster_scanner.config"):
        scanner = ClusterScanner(output_dir="/tmp/test_output")
        
        # Mock pod without limits
        mock_pod = Mock()
        mock_pod.metadata.namespace = "default"
        mock_pod.metadata.name = "nginx"
        mock_pod.status.phase = "Running"
        
        mock_container = Mock()
        mock_container.name = "nginx"
        mock_container.resources = None
        
        mock_pod.spec.containers = [mock_container]
        
        scanner.v1_api.list_pod_for_all_namespaces = Mock(
            return_value=Mock(items=[mock_pod])
        )
        
        result = scanner.scan_resource_constraints()
        
        print(f"✅ Success: {result['success']}")
        print(f"✅ Count: {result['count']}")
        print(f"✅ Structure: {json.dumps(result, indent=2, default=str)}")
        assert result["success"] == True
        assert result["count"] == 1
        print("✅ Resource constraints scan PASSED\n")


def test_security_contexts():
    """Test security contexts scan"""
    print("Testing scan_security_contexts()...")
    
    with patch("scanner.cluster_scanner.config"):
        scanner = ClusterScanner(output_dir="/tmp/test_output")
        
        # Mock privileged pod
        mock_pod = Mock()
        mock_pod.metadata.namespace = "default"
        mock_pod.metadata.name = "privileged-pod"
        mock_pod.status.phase = "Running"
        mock_pod.spec.host_network = True
        mock_pod.spec.host_pid = False
        mock_pod.spec.host_ipc = False
        mock_pod.spec.security_context = None
        
        mock_container = Mock()
        mock_container.name = "app"
        mock_container.security_context = Mock()
        mock_container.security_context.privileged = True
        mock_container.security_context.run_as_user = 0
        mock_container.security_context.read_only_root_filesystem = False
        mock_container.security_context.allow_privilege_escalation = True
        mock_container.security_context.capabilities = None
        
        mock_pod.spec.containers = [mock_container]
        
        scanner.v1_api.list_pod_for_all_namespaces = Mock(
            return_value=Mock(items=[mock_pod])
        )
        
        result = scanner.scan_security_contexts()
        
        print(f"✅ Success: {result['success']}")
        print(f"✅ Count: {result['count']}")
        print(f"✅ Risk level: {result['findings'][0]['risk_level']}")
        print(f"✅ Structure: {json.dumps(result, indent=2, default=str)}")
        assert result["success"] == True
        assert result["count"] == 1
        assert result["findings"][0]["risk_level"] == "critical"
        print("✅ Security contexts scan PASSED\n")


def test_full_scan():
    """Test that scan() includes all new scans"""
    print("Testing complete scan() with new methods...")
    
    with patch("scanner.cluster_scanner.config"):
        scanner = ClusterScanner(output_dir="/tmp/test_output")
        
        # Mock all APIs
        scanner.v1_api.list_secret_for_all_namespaces = Mock(return_value=Mock(items=[]))
        scanner.v1_api.list_config_map_for_all_namespaces = Mock(return_value=Mock(items=[]))
        scanner.apps_api.list_deployment_for_all_namespaces = Mock(return_value=Mock(items=[]))
        scanner.rbac_api.list_cluster_role = Mock(return_value=Mock(items=[]))
        scanner.networking_api.list_ingress_for_all_namespaces = Mock(return_value=Mock(items=[]))
        scanner.v1_api.list_pod_for_all_namespaces = Mock(return_value=Mock(items=[]))
        scanner.networking_api.list_network_policy_for_all_namespaces = Mock(return_value=Mock(items=[]))
        scanner.v1_api.list_namespace = Mock(return_value=Mock(items=[]))
        
        result = scanner.scan()
        
        print(f"✅ Timestamp: {result['timestamp']}")
        print(f"✅ Scans: {list(result['scans'].keys())}")
        
        # Check all 9 scans are present
        expected_scans = [
            "secrets", "misconfigs", "workloads", "privileges", 
            "exposure", "images", "network_policies", 
            "resource_constraints", "security_contexts"
        ]
        for scan_name in expected_scans:
            assert scan_name in result["scans"], f"Missing scan: {scan_name}"
            assert "success" in result["scans"][scan_name]
            print(f"   ✅ {scan_name}: {result['scans'][scan_name]['success']}")
        
        print("✅ Full scan() PASSED\n")


if __name__ == "__main__":
    print("=" * 60)
    print("Testing New Scanner Methods")
    print("=" * 60 + "\n")
    
    try:
        test_network_policies()
        test_resource_constraints()
        test_security_contexts()
        test_full_scan()
        
        print("=" * 60)
        print("🎉 ALL TESTS PASSED! 🎉")
        print("=" * 60)
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
