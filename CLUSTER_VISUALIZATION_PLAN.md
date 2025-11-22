# Plan: Kubernetes Cluster Visualisierung - Backend Only

## 🎯 Ziel (Simplified)
Backend-Service der K8s Cluster-Topologie als Graph liefert:
- Nodes (Worker/Master)
- Pods
- Services
- Namespaces

**Scope:** Nur Operator-Backend. Frontend Integration: Later™

---

## 📋 Architektur (Simplified)

```
┌─────────────────────────────────────┐
│  Kubernetes Cluster                 │
│  - Nodes, Pods, Services, NS        │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  ClusterScanner                     │
│  - scan_topology() method           │
│  - Reads K8s objects               │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  ClusterGraphBuilder                │
│  - Build graph structure            │
│  - Simple nodes & links             │
└──────────┬──────────────────────────┘
           │
           ▼
    cluster_graph.json
           │
           ▼
┌─────────────────────────────────────┐
│  FastAPI Endpoints                  │
│  GET /api/graph                     │
│  GET /api/graph/stats               │
└─────────────────────────────────────┘
```

---

## 🔧 Implementierungs-Schritte

### Phase 1: Graph Builder (Python) - ONLY

**Datei:** `operator/scanner/graph_builder.py`

```python
class ClusterGraphBuilder:
    """Konvertiert Kubernetes Objekte zu Graph-Format"""
    
    def __init__(self, k8s_scanner):
        self.scanner = k8s_scanner
        self.nodes = []
        self.links = []
    
    def add_namespace_nodes(self):
        """Namespaces als Root-Knoten"""
    
    def add_node_nodes(self):
        """Cluster Nodes (Master/Worker)"""
    
    def add_pod_nodes(self):
        """Pods pro Namespace"""
    
    def add_service_nodes(self):
        """Services pro Namespace"""
    
    def add_namespace_links(self):
        """Namespaces enthalten Pods/Services"""
    
    def add_pod_to_node_links(self):
        """Pods laufen auf Nodes"""
    
    def add_service_to_pod_links(self):
        """Services exponieren Pods"""
    
    def build_graph(self):
        """Kompletter Graph"""
        return {
            "nodes": self.nodes,
            "links": self.links,
            "timestamp": datetime.utcnow().isoformat()
        }
```

**Output-Format:**
```json
{
  "timestamp": "2025-11-22T...",
  "nodes": [
    {"id": "ns-default", "label": "default", "type": "namespace"},
    {"id": "node-1", "label": "worker-1", "type": "node"},
    {"id": "pod-nginx-1", "label": "nginx-xyz", "type": "pod", "namespace": "default"}
  ],
  "links": [
    {"source": "ns-default", "target": "pod-nginx-1", "type": "contains"},
    {"source": "pod-nginx-1", "target": "node-1", "type": "runs-on"}
  ]
}
```

---

### Phase 2: Scanner Integration

**Datei:** `operator/scanner/cluster_scanner.py`

Neue Methode:
```python
def scan_topology(self) -> dict:
    """Scan cluster topology for graph"""
    graph_builder = ClusterGraphBuilder(self)
    return graph_builder.build_graph()
```

Integriert in `scan()`:
```python
def scan(self) -> dict:
    """Perform complete security scan + topology"""
    scan_result = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "scans": {
            "secrets": self.scan_secrets(),
            "misconfigs": self.scan_misconfigs(),
            "workloads": self.scan_workloads(),
            "privileges": self.scan_privileges(),
            "exposure": self.scan_exposure(),
            "images": self.scan_images(),
            "topology": self.scan_topology()  # NEW!
        }
    }
    return scan_result
```

---

### Phase 3: Simple API Endpoints

**Datei:** `operator/main.py` - Neue Endpoints

```python
@app.get("/api/graph")
async def get_graph():
    """Get cluster topology graph"""
    try:
        graph_file = Path("/app/scanner_output/cluster_graph.json")
        if graph_file.exists():
            with open(graph_file, "r") as f:
                return json.load(f)
        return {"error": "No graph data available"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/graph/stats")
async def graph_stats():
    """Get cluster statistics"""
    try:
        graph_file = Path("/app/scanner_output/cluster_graph.json")
        if not graph_file.exists():
            return {}
        
        with open(graph_file, "r") as f:
            graph = json.load(f)
        
        nodes = graph.get("nodes", [])
        return {
            "total_nodes": len([n for n in nodes if n["type"] == "node"]),
            "total_pods": len([n for n in nodes if n["type"] == "pod"]),
            "total_services": len([n for n in nodes if n["type"] == "service"]),
            "namespaces": len(set(n.get("namespace") for n in nodes if n.get("namespace")))
        }
    except Exception as e:
        return {"error": str(e)}
```
