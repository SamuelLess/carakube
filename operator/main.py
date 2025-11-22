import json
from fastapi import FastAPI
import uvicorn
from pathlib import Path

from autofix import fix_vulnerability

app = FastAPI(title="Carakube Operator API")
GRAPH_OUTPUT_FILE = Path("/app/scanner_output/cluster_graph.json")

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "carakube-operator"}

@app.get("/test")
async def test_endpoint():
    """Test endpoint for quick verification"""
    import time
    return {
        "message": "Test endpoint working!",
        "timestamp": time.time(),
        "operator": "carakube-operator"
    }

@app.get("/api/graph")
async def get_graph():
    """Get cluster topology graph with nodes and links"""
    try:
        if GRAPH_OUTPUT_FILE.exists():
            with open(GRAPH_OUTPUT_FILE, "r") as f:
                data = json.load(f)
            return {"status": "success", "data": data}
        else:
            return {"status": "no_data", "message": "No graph data available yet"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@app.post("/api/autofix/fix/")
async def fix_vulnerability_endpoint():
    """
    Fix the first vulnerability found in the scan report.
    
    Reads cluster_graph.json, finds the first vulnerability from any node,
    and passes it to the fix function.
    """
    try:
        # Check if scan report exists
        if not GRAPH_OUTPUT_FILE.exists():
            return {
                "status": "error",
                "message": "No scan report available. Run a scan first."
            }
        
        # Load the scan report
        with open(GRAPH_OUTPUT_FILE, "r") as f:
            graph_data = json.load(f)
        
        # Find the first vulnerability in the graph
        # The file has nodes directly at top level, not wrapped in "data"
        vulnerability = None
        node_info = None
        
        nodes = graph_data.get("nodes", [])
        for node in nodes:
            if "vulnerabilities" in node and len(node["vulnerabilities"]) > 0:
                vulnerability = node["vulnerabilities"][0]
                node_info = {
                    "id": node.get("id"),
                    "label": node.get("label"),
                    "type": node.get("type"),
                    "namespace": node.get("namespace")
                }
                break
        
        if not vulnerability:
            return {
                "status": "success",
                "message": "No vulnerabilities found in scan report"
            }
        
        # Pass to fix function with context
        result = fix_vulnerability(vulnerability, node_info)
        return result
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to process scan report: {str(e)}"
        }


@app.on_event("startup")
async def startup_event():
    """Startup event"""
    print("🚀 Operator API started on port 8000 🌟", flush=True)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)