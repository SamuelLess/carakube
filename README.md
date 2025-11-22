# Carakube - Kubernetes Security & Visualization Platform

A comprehensive Kubernetes security scanning and topology visualization platform built for DevSecOps and SRE teams. Created at a Siemens hackathon.

## 🎯 Features

- **Real-time Security Scanning** - 6 automated scan types:
  - Secrets detection (base64 decoding)
  - Misconfigurations (ConfigMaps)
  - Workload analysis (Deployments)
  - RBAC privilege checking
  - Service exposure validation
  - Container image cataloging

- **Interactive Topology Visualization**
  - ReactFlow-powered graph visualization
  - Real-time updates (5s polling)
  - Relationships between namespaces, pods, services, and nodes
  - Auto-layout algorithms with ELK.js

- **Live Monitoring**
  - Continuous scanning (2-minute intervals)
  - Vulnerability tracking
  - Incident reporting

## 🏗️ Architecture

```
Kubernetes Cluster → ClusterScanner → GraphBuilder → FastAPI → Next.js UI
                         ↓               ↓              ↓          ↓
                      scan()          build()      /api/graph   ReactFlow
```

### Tech Stack

**Backend:**
- Python 3.9+
- FastAPI
- Kubernetes Python Client
- Supervisord (multi-process management)

**Frontend:**
- Next.js 16
- React 19
- TypeScript
- ReactFlow (graph visualization)
- Zustand (state management)
- Radix UI (components)

**Infrastructure:**
- Docker & Docker Compose
- Traefik (reverse proxy)
- Kind (local Kubernetes)

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for frontend development)
- Python 3.9+ (for backend development)
- Kubernetes cluster (optional, kind included)

### Run with Docker Compose

```bash
# Clone and start services
git clone <repository>
cd carakube

# Start full stack
docker compose up -d

# Access the application
open http://localhost          # Landing page
open http://localhost/demo     # Live visualization
```

### Local Development

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm run test:e2e:ui

# Build for production
npm run build
```

#### Backend

```bash
cd operator

# Install dependencies (using uv)
uv sync

# Run locally
uv run main.py

# Run tests
pytest -v
```

## 📁 Project Structure

```
carakube/
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # Pages (/, /demo)
│   │   ├── components/    # React components
│   │   ├── lib/          # API client, utilities
│   │   ├── store/        # Zustand state management
│   │   └── types/        # TypeScript types
│   ├── e2e/              # Playwright E2E tests
│   └── playwright.config.ts
│
├── operator/              # Python backend
│   ├── scanner/          # Cluster scanning logic
│   │   ├── cluster_scanner.py  # 6 scan types
│   │   ├── graph_builder.py    # Topology builder
│   │   └── daemon.py          # Continuous scanning
│   ├── tests/            # pytest tests
│   ├── main.py           # FastAPI server
│   └── pyproject.toml
│
├── kubernetes/           # Local cluster setup
│   └── kind-config.yaml
│
├── traefik/             # Reverse proxy config
│   └── traefik.yml
│
├── docker-compose.yml   # Full stack orchestration
└── TESTING.md          # Complete testing guide
```

## 🧪 Testing

Comprehensive E2E testing with Playwright and pytest.

```bash
# Frontend E2E tests
cd frontend
npm run test:e2e:ui         # Interactive UI mode
npm run test:e2e            # Headless mode
npm run test:e2e:headed     # See browser

# Backend unit tests
cd operator
pytest -v                   # Run all tests
pytest --cov               # With coverage

# Quick integration test
./scripts/quick-test.sh     # Tests full stack
```

See [TESTING.md](./TESTING.md) for comprehensive testing documentation.

## 🔌 API Endpoints

### Backend API (Port 8000)

```bash
# Health check
GET /health
→ {"status": "healthy", "service": "carakube-operator"}

# Get cluster topology graph
GET /api/graph
→ {
    "status": "success",
    "data": {
      "nodes": [...],
      "links": [...],
      "timestamp": "2025-11-22T..."
    }
  }

# API documentation
GET /docs  # Swagger UI
```

### Graph Data Structure

**Nodes:**
```json
{
  "id": "pod-default-nginx-123",
  "label": "nginx-123",
  "type": "pod",  // namespace|node|pod|service
  "status": "running",
  "namespace": "default",
  "vulnerabilities": [...]
}
```

**Links:**
```json
{
  "source": "ns-default",
  "target": "pod-default-nginx-123",
  "type": "contains"  // contains|runs-on|exposes
}
```

## 🎨 Features in Detail

### Landing Page (/)

Modern, technical landing page featuring:
- Hero section with live cluster metrics
- Interactive code examples
- Feature showcase
- Architecture diagram
- Pricing tiers
- Clean, 21st.dev-inspired design

### Demo Visualization (/demo)

- Real-time graph visualization
- Node types: Namespaces, Nodes, Pods, Services
- Relationship visualization
- Vulnerability indicators
- Sidebar with incident reports
- Auto-layout with pan/zoom controls

## 🔒 Security Scans

1. **Secrets** - Detects exposed secrets, base64 decodes data
2. **Misconfigs** - Analyzes ConfigMaps for sensitive data
3. **Workloads** - Checks Deployment configurations and env vars
4. **Privileges** - Identifies wildcard RBAC permissions
5. **Exposure** - Validates Ingress TLS and exposure risks
6. **Images** - Catalogs container images across all pods

## 📊 Monitoring

- Scanner runs every 2 minutes
- Results stored in `/app/scanner_output/cluster_graph.json`
- Frontend polls every 5 seconds
- Real-time incident tracking
- Live cluster statistics

## 🛠️ Configuration

### Environment Variables

**Operator:**
```bash
KUBECONFIG=/path/to/kubeconfig  # Kubernetes config location
```

**Frontend:**
```bash
BASE_URL=http://localhost:3000  # Base URL for testing
```

### Docker Compose Services

```yaml
services:
  traefik:    # Reverse proxy (ports 80, 443)
  frontend:   # Next.js app (port 3000)
  cluster:    # Kind Kubernetes cluster
  operator:   # Python scanner + API
```

## 🐛 Troubleshooting

### Backend not connecting to cluster

```bash
# Check kubeconfig
docker compose exec operator cat $KUBECONFIG

# View operator logs
docker compose logs -f operator

# Restart operator
docker compose restart operator
```

### Frontend not showing data

```bash
# Check API is responding
curl http://localhost:8000/api/graph

# Check browser console for errors
# Verify polling is working (Network tab)

# Clear cache and reload
```

### Tests failing

```bash
# Ensure services are running
docker compose ps

# Check frontend is built
cd frontend && npm run build

# Install Playwright browsers
cd frontend && npx playwright install

# Run in debug mode
cd frontend && npm run test:e2e:debug
```

## 📝 Development

### Adding New Scan Types

1. Add scan method to `operator/scanner/cluster_scanner.py`
2. Update `scan()` method to include new scan
3. Add to graph builder if visualization needed
4. Write tests in `operator/tests/`

### Adding New UI Components

1. Create component in `frontend/src/components/`
2. Add CSS module for styling
3. Export from `index.ts`
4. Import in page/component
5. Write E2E tests

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Run linting: `npm run lint` / `pytest`
6. Submit a pull request

## 📄 License

[Your License Here]

## 👥 Team

Created at Siemens Hackathon

## 🙏 Acknowledgments

- Kubernetes Python Client
- ReactFlow
- Next.js Team
- Radix UI
- Playwright

## 📚 Documentation

- [Testing Guide](./TESTING.md) - Comprehensive testing documentation
- [Frontend README](./frontend/README.md) - Frontend-specific setup
- [Operator README](./operator/README.md) - Backend-specific setup
- [API Docs](http://localhost:8000/docs) - Interactive API documentation

---

**Built with ❤️ for DevSecOps teams**

