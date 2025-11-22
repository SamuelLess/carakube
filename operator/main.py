import json
from fastapi import FastAPI
import uvicorn
from pathlib import Path

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

@app.on_event("startup")
async def startup_event():
    """Startup event"""
    print("🚀 Operator API started on port 8000 🌟", flush=True)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)