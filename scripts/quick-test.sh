#!/bin/bash

# Quick Test Runner for Carakube
# This script helps you test the application locally

set -e

echo "🚀 Carakube Quick Test Script"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_status "Docker is running"

# Start the stack
echo ""
echo "📦 Starting Carakube stack..."
docker compose up -d

# Wait for services
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check backend health
echo ""
echo "🔍 Checking backend health..."
for i in {1..10}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        print_status "Backend is healthy"
        break
    fi
    if [ $i -eq 10 ]; then
        print_error "Backend health check failed"
        exit 1
    fi
    sleep 2
done

# Check frontend (if running)
echo ""
echo "🔍 Checking if frontend is running..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    print_status "Frontend is running"
    FRONTEND_RUNNING=true
else
    print_warning "Frontend is not running. Start it with: cd frontend && npm run dev"
    FRONTEND_RUNNING=false
fi

# Test API endpoint
echo ""
echo "🧪 Testing API endpoints..."

# Test health endpoint
HEALTH_RESPONSE=$(curl -s http://localhost:8000/health)
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    print_status "Health endpoint OK"
else
    print_error "Health endpoint failed"
fi

# Test graph endpoint
GRAPH_RESPONSE=$(curl -s http://localhost:8000/api/graph)
if echo "$GRAPH_RESPONSE" | grep -q "status"; then
    print_status "Graph endpoint OK"
    
    # Parse and display stats
    echo ""
    echo "📊 Cluster Stats:"
    echo "$GRAPH_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('status') == 'success' and 'data' in data:
    nodes = data['data'].get('nodes', [])
    links = data['data'].get('links', [])
    node_types = {}
    for node in nodes:
        ntype = node.get('type', 'unknown')
        node_types[ntype] = node_types.get(ntype, 0) + 1
    
    print('   Nodes:', len(nodes))
    for ntype, count in node_types.items():
        print(f'     - {ntype}: {count}')
    print('   Links:', len(links))
else:
    print('   No data available yet')
"
else
    print_error "Graph endpoint failed"
fi

# Run frontend tests if frontend is running
if [ "$FRONTEND_RUNNING" = true ]; then
    echo ""
    echo "🧪 Running frontend E2E tests..."
    cd frontend
    
    # Check if playwright is installed
    if ! npm list @playwright/test > /dev/null 2>&1; then
        print_warning "Playwright not installed. Installing..."
        npm install --save-dev @playwright/test
    fi
    
    # Run a quick smoke test
    print_status "Running smoke tests..."
    npx playwright test e2e/landing-page.spec.ts --project=chromium --grep "should have correct title" || true
    cd ..
fi

echo ""
echo "=============================="
print_status "Quick test complete!"
echo ""
echo "📝 Next steps:"
echo "   1. View frontend: http://localhost:3000"
echo "   2. View API docs: http://localhost:8000/docs"
echo "   3. Run full E2E tests: cd frontend && npm run test:e2e:ui"
echo "   4. View logs: docker compose logs -f"
echo "   5. Stop services: docker compose down"
echo ""

