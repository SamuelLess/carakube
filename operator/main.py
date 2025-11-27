import json
from fastapi import FastAPI, HTTPException
import uvicorn
from pathlib import Path
from typing import Optional, Dict, Any

from autofix import fix_vulnerability
from vulnerability_state import (
    get_all_states,
    get_vulnerability_state,
    update_vulnerability_state,
)

app = FastAPI(title="Carakube Operator API")
GRAPH_OUTPUT_FILE = Path("/app/scanner_output/cluster_graph.json")


@app.get("/test")
async def test_endpoint():
    """Test endpoint for quick verification"""
    import time

    return {
        "message": "Test endpoint working!",
        "timestamp": time.time(),
        "operator": "carakube-operator",
    }


@app.get("/api/graph")
async def get_graph():
    """Get cluster topology graph with nodes and links"""
    try:
        if GRAPH_OUTPUT_FILE.exists():
            with open(GRAPH_OUTPUT_FILE, "r") as f:
                data = json.load(f)

            # Check if cluster is initializing (has data file but no nodes)
            nodes = data.get("nodes", [])
            timestamp = data.get("timestamp")

            if len(nodes) == 0:
                # If we have a recent timestamp but no nodes, cluster is still initializing
                # If timestamp exists, it means scanner ran but found nothing (Kubernetes API not ready)
                if timestamp:
                    return {
                        "status": "initializing",
                        "message": "Kubernetes API is starting up. Waiting for nodes to become available...",
                        "data": data,
                    }
                else:
                    # No timestamp means this is genuinely an empty result
                    return {
                        "status": "empty",
                        "message": "Cluster appears to be empty (no resources found)",
                        "data": data,
                    }

            return {"status": "success", "data": data}
        else:
            return {
                "status": "waiting",
                "message": "Waiting for initial scan to complete...",
            }
    except Exception as e:
        return {"status": "error", "error": str(e)}


@app.get("/api/vulnerability-states")
async def get_vulnerability_states():
    """
    Get all vulnerability states.

    Returns:
        Dictionary of vulnerability IDs to their state information
    """
    try:
        states = get_all_states()
        return {"status": "success", "states": states}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/vulnerability-states/{vuln_id}")
async def get_vulnerability_state_endpoint(vuln_id: str):
    """
    Get the state of a specific vulnerability.

    Args:
        vuln_id: The vulnerability ID

    Returns:
        State information for the vulnerability
    """
    try:
        state = get_vulnerability_state(vuln_id)
        return {"status": "success", "vuln_id": vuln_id, "state": state}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/vulnerability-fix/{vuln_id}")
async def fix_specific_vulnerability_endpoint(vuln_id: str):
    """
    Fix a specific vulnerability by its ID.

    Args:
        vuln_id: The vulnerability ID to fix

    Returns:
        Result of the fix operation
    """
    try:
        # Check if scan report exists
        if not GRAPH_OUTPUT_FILE.exists():
            raise HTTPException(
                status_code=404, detail="No scan report available. Run a scan first."
            )

        # Load the scan report
        with open(GRAPH_OUTPUT_FILE, "r") as f:
            graph_data = json.load(f)

        # Find the specific vulnerability in the graph
        vulnerability = None
        node_info: Optional[Dict[str, Any]] = None

        nodes = graph_data.get("nodes", [])
        for node in nodes:
            if "vulnerabilities" in node:
                for vuln in node["vulnerabilities"]:
                    if vuln.get("id") == vuln_id:
                        vulnerability = vuln
                        node_info = {
                            "id": node.get("id"),
                            "label": node.get("label"),
                            "type": node.get("type"),
                            "namespace": node.get("namespace"),
                        }
                        break
            if vulnerability:
                break

        if not vulnerability:
            raise HTTPException(
                status_code=404,
                detail=f"Vulnerability with ID {vuln_id} not found in scan report",
            )

        # Update state to in_processing
        print(f"[API] Setting vulnerability {vuln_id} to in_processing", flush=True)
        update_vulnerability_state(vuln_id, "in_processing")

        try:
            # Pass to fix function with context
            print(f"[API] Starting fix for vulnerability {vuln_id}", flush=True)
            # fix_vulnerability expects node_info to be Dict[str, Any] but has default=None
            # So we pass it directly (the type annotation is incorrect in autofix module)
            result = fix_vulnerability(vulnerability, node_info)  # type: ignore

            # Update state based on result
            if result.get("success"):
                pr_url = result.get("pr_url")
                print(f"[API] Fix successful, PR URL: {pr_url}", flush=True)
                update_vulnerability_state(vuln_id, "pr_available", pr_url=pr_url)
                return {
                    "status": "success",
                    "message": f"Successfully created PR for vulnerability {vuln_id}",
                    "result": result,
                    "state": {"state": "pr_available", "pr_url": pr_url},
                }
            else:
                # If fix failed, reset to untouched
                print(f"[API] Fix failed: {result.get('message')}", flush=True)
                update_vulnerability_state(vuln_id, "untouched")
                return {
                    "status": "error",
                    "message": result.get("message", "Fix failed"),
                    "result": result,
                }
        except Exception as fix_error:
            # If exception occurs, reset to untouched
            print(f"[API] Fix exception: {str(fix_error)}", flush=True)
            update_vulnerability_state(vuln_id, "untouched")
            raise HTTPException(
                status_code=500, detail=f"Failed to fix vulnerability: {str(fix_error)}"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/autofix/fix/")
async def fix_vulnerability_endpoint():
    """
    Fix the first vulnerability found in the scan report.

    Reads cluster_graph.json, finds the first vulnerability from any node,
    and passes it to the fix function.

    DEPRECATED: Use /api/vulnerability-fix/{vuln_id} instead
    """
    try:
        # Check if scan report exists
        if not GRAPH_OUTPUT_FILE.exists():
            return {
                "status": "error",
                "message": "No scan report available. Run a scan first.",
            }

        # Load the scan report
        with open(GRAPH_OUTPUT_FILE, "r") as f:
            graph_data = json.load(f)

        # Find the first vulnerability in the graph
        # The file has nodes directly at top level, not wrapped in "data"
        vulnerability = None
        node_info: Optional[Dict[str, Any]] = None

        nodes = graph_data.get("nodes", [])
        for node in nodes:
            if "vulnerabilities" in node and len(node["vulnerabilities"]) > 0:
                vulnerability = node["vulnerabilities"][0]
                node_info = {
                    "id": node.get("id"),
                    "label": node.get("label"),
                    "type": node.get("type"),
                    "namespace": node.get("namespace"),
                }
                break

        if not vulnerability:
            return {
                "status": "success",
                "message": "No vulnerabilities found in scan report",
            }

        vuln_id = vulnerability.get("id")
        if vuln_id:
            # Update state to in_processing
            update_vulnerability_state(vuln_id, "in_processing")

        # Pass to fix function with context
        # fix_vulnerability expects node_info to be Dict[str, Any] but has default=None
        # So we pass it directly (the type annotation is incorrect in autofix module)
        result = fix_vulnerability(vulnerability, node_info)  # type: ignore

        # Update state based on result
        if vuln_id and result.get("success"):
            pr_url = result.get("pr_url")
            update_vulnerability_state(vuln_id, "pr_available", pr_url=pr_url)
        elif vuln_id:
            # Reset to untouched if failed
            update_vulnerability_state(vuln_id, "untouched")

        return result

    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to process scan report: {str(e)}",
        }


@app.on_event("startup")
async def startup_event():
    """Startup event"""
    print("🚀 Operator API started on port 8000 🌟", flush=True)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
