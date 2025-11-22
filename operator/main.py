import time
import subprocess
import os
import asyncio
from fastapi import FastAPI
import uvicorn

app = FastAPI(title="Carakube Operator")

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "carakube-operator"}

@app.get("/test")
async def test_endpoint():
    """Test endpoint for quick verification"""
    return {
        "message": "Test endpoint working!",
        "timestamp": time.time(),
        "operator": "carakube-operator"
    }

@app.get("/cluster/status")
async def cluster_status():
    """Get cluster status"""
    try:
        result = subprocess.run(
            ["kubectl", "get", "nodes"],
            capture_output=True,
            text=True,
            check=True
        )
        return {
            "status": "connected",
            "nodes": result.stdout
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

async def monitor_cluster():
    """Background task to monitor cluster"""
    kubeconfig_path = os.environ.get("KUBECONFIG", "/kubeconfig/config")
    
    print(f"Waiting for kubeconfig at {kubeconfig_path}...", flush=True)
    while not os.path.exists(kubeconfig_path):
        await asyncio.sleep(2)
        print("Waiting for kubeconfig...", flush=True)

    print("Kubeconfig found!", flush=True)

    while True:
        try:
            print("\n--- Cluster Nodes ---", flush=True)
            subprocess.run(["kubectl", "get", "nodes"], check=True)

            print("\n--- Flux System Pods ---", flush=True)
            subprocess.run(["kubectl", "get", "pods", "-n", "flux-system"], check=False)

            print("\n--- Default Namespace Pods ---", flush=True)
            subprocess.run(["kubectl", "get", "pods", "-n", "default"], check=False)

        except subprocess.CalledProcessError as e:
            print(f"Error communicating with cluster: {e}", flush=True)
        except Exception as e:
            print(f"Unexpected error: {e}", flush=True)

        await asyncio.sleep(5)

@app.on_event("startup")
async def startup_event():
    """Start background monitoring task on startup"""
    asyncio.create_task(monitor_cluster())
    print("Operator started...", flush=True)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
