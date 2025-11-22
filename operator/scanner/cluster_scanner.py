"""Cluster scanner module for monitoring Kubernetes cluster status"""
import subprocess
import json
import os
from datetime import datetime
from pathlib import Path


class ClusterScanner:
    """Scanner for cluster health and status"""
    
    def __init__(self, output_dir: str = "/app/scanner_output"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.output_file = self.output_dir / "cluster_status.json"
    
    def run_kubectl_command(self, command: list) -> dict:
        """Run a kubectl command and return the result"""
        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                check=True
            )
            return {
                "success": True,
                "output": result.stdout.strip(),
                "error": None
            }
        except subprocess.CalledProcessError as e:
            return {
                "success": False,
                "output": e.stdout.strip(),
                "error": e.stderr.strip()
            }
        except Exception as e:
            return {
                "success": False,
                "output": None,
                "error": str(e)
            }
    
    def get_nodes(self) -> dict:
        """Get cluster nodes"""
        return self.run_kubectl_command(["kubectl", "get", "nodes", "-o", "json"])
    
    def get_flux_pods(self) -> dict:
        """Get Flux system pods"""
        return self.run_kubectl_command(["kubectl", "get", "pods", "-n", "flux-system", "-o", "json"])
    
    def get_default_pods(self) -> dict:
        """Get default namespace pods"""
        return self.run_kubectl_command(["kubectl", "get", "pods", "-n", "default", "-o", "json"])
    
    def scan(self) -> dict:
        """Perform a complete cluster scan"""
        scan_result = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "nodes": self.get_nodes(),
            "flux_pods": self.get_flux_pods(),
            "default_pods": self.get_default_pods()
        }
        return scan_result
    
    def save_scan(self, scan_data: dict) -> bool:
        """Save scan result to JSON file"""
        try:
            with open(self.output_file, "w") as f:
                json.dump(scan_data, f, indent=2)
            print(f"Scan saved to {self.output_file}", flush=True)
            return True
        except Exception as e:
            print(f"Error saving scan: {e}", flush=True)
            return False
    
    def run_and_save(self) -> dict:
        """Run scan and save result"""
        scan_data = self.scan()
        self.save_scan(scan_data)
        return scan_data
