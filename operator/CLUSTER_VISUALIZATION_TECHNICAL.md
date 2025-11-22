# Technical Design: Cluster Visualization - Backend Only

## 1. Simplified Data Flow

```
K8s Cluster
    ↓
ClusterScanner.scan_topology()
    ↓
ClusterGraphBuilder.build_graph()
    ↓
cluster_graph.json
    ↓
FastAPI Endpoint (/api/graph)
```

---

## 2. Node Object Schema (Simplified)

```typescript
interface GraphNode {
  id: string;              // "ns-default", "node-1", "pod-nginx-123"
  label: string;           // Display name
  type: string;            // "namespace" | "node" | "pod" | "service"
  namespace?: string;      // For pod/service
  status?: string;         // For pods/nodes
}
```

---

## 3. Link Object Schema (Simplified)

```typescript
interface GraphLink {
  source: string;          // Source node ID
  target: string;          // Target node ID
  type: string;            // "contains" | "runs-on" | "exposes"
}
```

---

## 4. Graph Builder Implementation Details

### 4.1 Namespace Nodes
```python
def add_namespace_nodes(self):
    namespaces = self.scanner.v1_api.list_namespace()
    
    for ns in namespaces.items:
        self.nodes.append({
            "id": f"ns-{ns.metadata.name}",
            "label": ns.metadata.name,
            "type": "namespace",
            "color": "#0066cc",
            "status": ns.status.phase,  # Active, Terminating
            "labels": ns.metadata.labels or {}
        })
```

### 4.2 Node Nodes
```python
def add_node_nodes(self):
    nodes = self.scanner.v1_api.list_node()
    
    for node in nodes.items:
        status = "ready" if self._is_ready(node) else "not-ready"
        
        self.nodes.append({
            "id": f"node-{node.metadata.name}",
            "label": node.metadata.name,
            "type": "node",
            "color": "#009900" if status == "ready" else "#ff6600",
            "status": status,
            "capacity": node.status.capacity,  # CPU, Memory
            "labels": node.metadata.labels or {}
        })
```

### 4.3 Pod Nodes
```python
def add_pod_nodes(self):
    pods = self.scanner.v1_api.list_pod_for_all_namespaces()
    
    for pod in pods.items:
        pod_status = pod.status.phase.lower()  # Running, Pending, Failed
        
        self.nodes.append({
            "id": f"pod-{pod.metadata.namespace}-{pod.metadata.name}",
            "label": pod.metadata.name,
            "type": "pod",
            "namespace": pod.metadata.namespace,
            "color": self._get_pod_color(pod_status),
            "status": pod_status,
            "image": pod.spec.containers[0].image if pod.spec.containers else "",
            "node": pod.spec.node_name,  # Which node it runs on
        })
```

### 4.4 Service Nodes
```python
def add_service_nodes(self):
    services = self.scanner.v1_api.list_service_for_all_namespaces()
    
    for svc in services.items:
        self.nodes.append({
            "id": f"svc-{svc.metadata.namespace}-{svc.metadata.name}",
            "label": svc.metadata.name,
            "type": "service",
            "namespace": svc.metadata.namespace,
            "color": "#ffcc00",
            "service_type": svc.spec.type,  # ClusterIP, NodePort, LoadBalancer
            "cluster_ip": svc.spec.cluster_ip,
            "selector": svc.spec.selector or {},
        })
```

### 4.5 Ingress Nodes
```python
def add_ingress_nodes(self):
    ingresses = self.scanner.networking_api.list_ingress_for_all_namespaces()
    
    for ing in ingresses.items:
        self.nodes.append({
            "id": f"ingress-{ing.metadata.namespace}-{ing.metadata.name}",
            "label": ing.metadata.name,
            "type": "ingress",
            "namespace": ing.metadata.namespace,
            "color": "#cc0000",
            "hosts": [rule.host for rule in ing.spec.rules] if ing.spec.rules else [],
            "tls": bool(ing.spec.tls),
        })
```

---

## 5. Link Creation

### 5.1 Namespace Contains Links
```python
def add_namespace_contains_links(self):
    pods = self.scanner.v1_api.list_pod_for_all_namespaces()
    for pod in pods.items:
        ns = pod.metadata.namespace
        self.links.append({
            "source": f"ns-{ns}",
            "target": f"pod-{ns}-{pod.metadata.name}",
            "type": "contains",
            "color": "#0066cc44",  # Transparent blue
        })
    
    services = self.scanner.v1_api.list_service_for_all_namespaces()
    for svc in services.items:
        ns = svc.metadata.namespace
        self.links.append({
            "source": f"ns-{ns}",
            "target": f"svc-{ns}-{svc.metadata.name}",
            "type": "contains",
            "color": "#0066cc44",
        })
```

### 5.2 Pod Runs On Node Links
```python
def add_pod_to_node_links(self):
    pods = self.scanner.v1_api.list_pod_for_all_namespaces()
    for pod in pods.items:
        if pod.spec.node_name:
            ns = pod.metadata.namespace
            self.links.append({
                "source": f"pod-{ns}-{pod.metadata.name}",
                "target": f"node-{pod.spec.node_name}",
                "type": "runs-on",
                "color": "#00990088",  # Semi-transparent green
            })
```

### 5.3 Service Exposes Pod Links
```python
def add_service_to_pod_links(self):
    services = self.scanner.v1_api.list_service_for_all_namespaces()
    
    for svc in services.items:
        if not svc.spec.selector:
            continue
            
        ns = svc.metadata.namespace
        
        # Find pods matching this service's selector
        pods = self.scanner.v1_api.list_namespaced_pod(ns)
        for pod in pods.items:
            if self._matches_selector(pod.metadata.labels, svc.spec.selector):
                self.links.append({
                    "source": f"svc-{ns}-{svc.metadata.name}",
                    "target": f"pod-{ns}-{pod.metadata.name}",
                    "type": "exposes",
                    "color": "#ffcc0088",  # Semi-transparent yellow
                })
```

### 5.4 Ingress Routes To Service Links
```python
def add_ingress_to_service_links(self):
    ingresses = self.scanner.networking_api.list_ingress_for_all_namespaces()
    
    for ing in ingresses.items:
        if not ing.spec.rules:
            continue
            
        ns = ing.metadata.namespace
        
        for rule in ing.spec.rules:
            if not rule.http or not rule.http.paths:
                continue
                
            for path in rule.http.paths:
                if path.backend.service:
                    svc_name = path.backend.service.name
                    self.links.append({
                        "source": f"ingress-{ns}-{ing.metadata.name}",
                        "target": f"svc-{ns}-{svc_name}",
                        "type": "routes-to",
                        "path": path.path,
                        "color": "#cc000088",  # Semi-transparent red
                    })
```

---

## 6. Frontend Cytoscape.js Integration

### 6.1 Hook: useGraphVisualization

```typescript
export const useGraphVisualization = () => {
  const cy = useRef<cytoscape.Core | null>(null);

  const renderGraph = (graphData: GraphData) => {
    if (!cy.current) {
      cy.current = cytoscape({
        container: document.getElementById('graph-container'),
        elements: [
          ...graphData.nodes.map(node => ({ data: node, classes: node.type })),
          ...graphData.links.map(link => ({ data: link }))
        ],
        style: [
          {
            selector: 'node',
            css: {
              'background-color': 'data(color)',
              'label': 'data(label)',
              'width': '40px',
              'height': '40px',
            }
          },
          {
            selector: 'edge',
            css: {
              'line-color': 'data(color)',
              'target-arrow-color': 'data(color)',
              'target-arrow-shape': 'triangle',
            }
          }
        ],
        layout: {
          name: 'cose-bilkent',
          animate: true,
          animationDuration: 500,
        }
      });
    }
  };

  const zoomIn = () => cy.current?.zoom(cy.current.zoom() * 1.2);
  const zoomOut = () => cy.current?.zoom(cy.current.zoom() / 1.2);
  const reset = () => cy.current?.fit();

  return { renderGraph, zoomIn, zoomOut, reset };
};
```

### 6.2 Cytoscape Styling

```javascript
const cytoscape_style = [
  {
    selector: 'node',
    css: {
      'content': 'data(label)',
      'background-color': 'data(color)',
      'border-width': '2px',
      'border-color': '#333',
      'width': '50px',
      'height': '50px',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': '10px',
    }
  },
  {
    selector: 'node[type="namespace"]',
    css: { 'shape': 'rectangle', 'width': '80px', 'height': '60px' }
  },
  {
    selector: 'node[type="node"]',
    css: { 'shape': 'diamond' }
  },
  {
    selector: 'node[type="pod"]',
    css: { 'shape': 'circle' }
  },
  {
    selector: 'node[type="service"]',
    css: { 'shape': 'hexagon' }
  },
  {
    selector: 'node[type="ingress"]',
    css: { 'shape': 'pentagon' }
  },
  {
    selector: 'edge',
    css: {
      'line-color': 'data(color)',
      'target-arrow-color': 'data(color)',
      'target-arrow-shape': 'triangle',
      'width': '2px',
      'arrow-scale': '1.5',
    }
  },
  {
    selector: 'node:hover',
    css: { 'box-shadow': '0 0 15px rgba(0,0,0,0.5)' }
  }
];
```

---

## 7. API Response Example

```json
{
  "timestamp": "2025-11-22T15:30:45.123456Z",
  "nodes": [
    {
      "id": "ns-default",
      "label": "default",
      "type": "namespace",
      "color": "#0066cc",
      "status": "Active",
      "labels": {"app": "demo"}
    },
    {
      "id": "node-worker-1",
      "label": "worker-1",
      "type": "node",
      "color": "#009900",
      "status": "ready",
      "capacity": {
        "cpu": "4",
        "memory": "8Gi"
      }
    },
    {
      "id": "pod-default-nginx-xyz",
      "label": "nginx-xyz",
      "type": "pod",
      "namespace": "default",
      "color": "#ff6600",
      "status": "running",
      "image": "nginx:1.25",
      "node": "worker-1"
    },
    {
      "id": "svc-default-nginx",
      "label": "nginx",
      "type": "service",
      "namespace": "default",
      "color": "#ffcc00",
      "service_type": "ClusterIP",
      "cluster_ip": "10.96.0.1"
    }
  ],
  "links": [
    {
      "source": "ns-default",
      "target": "pod-default-nginx-xyz",
      "type": "contains",
      "color": "#0066cc44"
    },
    {
      "source": "pod-default-nginx-xyz",
      "target": "node-worker-1",
      "type": "runs-on",
      "color": "#00990088"
    },
    {
      "source": "svc-default-nginx",
      "target": "pod-default-nginx-xyz",
      "type": "exposes",
      "color": "#ffcc0088"
    }
  ]
}
```

---

## 8. Performance Considerations

### Large Cluster Optimization
```python
# Limit query results
MAX_PODS_PER_GRAPH = 500
MAX_NODES_PER_GRAPH = 100

# Pagination support
class GraphParams:
    namespace: Optional[str] = None  # Filter by namespace
    node_type: Optional[str] = None  # Filter by type
    limit: int = 1000
    offset: int = 0
```

### Frontend Caching
```typescript
const useClusterGraphCache = (cacheTime = 5 * 60 * 1000) => {
  const [cache, setCache] = useState<GraphData | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const getGraph = async (): Promise<GraphData> => {
    const now = Date.now();
    if (cache && now - lastFetch < cacheTime) {
      return cache;
    }
    
    const response = await fetch('/api/cluster/graph');
    const data = await response.json();
    setCache(data);
    setLastFetch(now);
    return data;
  };

  return { getGraph, cache };
};
```

---

## 9. Testing Strategy

```python
# test_graph_builder.py
def test_namespace_nodes_creation():
    builder = ClusterGraphBuilder(mock_scanner)
    builder.add_namespace_nodes()
    assert len(builder.nodes) == 3  # default, kube-system, flux-system
    assert builder.nodes[0]["type"] == "namespace"

def test_pod_to_node_links():
    builder = ClusterGraphBuilder(mock_scanner)
    builder.add_pod_nodes()
    builder.add_node_nodes()
    builder.add_pod_to_node_links()
    assert len(builder.links) > 0
    assert builder.links[0]["type"] == "runs-on"

def test_graph_building():
    builder = ClusterGraphBuilder(mock_scanner)
    graph = builder.build_graph()
    assert "nodes" in graph
    assert "links" in graph
    assert len(graph["nodes"]) > 0
    assert len(graph["links"]) > 0
```

---

## 10. Deployment Checklist

- [ ] `graph_builder.py` geschrieben und getestet
- [ ] Scanner integriert mit `scan_topology()`
- [ ] API Endpoints implementiert
- [ ] Frontend Dependencies installiert (`cytoscape`, `cose-bilkent`)
- [ ] ClusterGraph Komponente erstellt
- [ ] useGraphVisualization Hook implementiert
- [ ] Styling und Animationen
- [ ] Performance Tests durchgeführt
- [ ] Responsive Design validiert
- [ ] Docker Image rebuilt
- [ ] Production Deploy
