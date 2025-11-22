import { expect, test } from "@playwright/test";

interface ApiNode {
  id: string;
  label: string;
  type: string;
  status: string;
  vulnerabilities?: Array<{
    severity: string;
    title: string;
    description: string;
  }>;
}

interface ApiLink {
  source: string;
  target: string;
  type: string;
}

test.describe("API Integration Tests", () => {
  test("should successfully fetch graph data from API", async ({ request }) => {
    const response = await request.get("/api/graph");

    // Check response status
    expect(response.status()).toBe(200);

    // Parse JSON response
    const data = await response.json();

    // Validate response structure
    expect(data).toHaveProperty("status");
    expect(data.status).toBe("success");
    expect(data).toHaveProperty("data");
    expect(data.data).toHaveProperty("nodes");
    expect(data.data).toHaveProperty("links");
    expect(data.data).toHaveProperty("timestamp");
  });

  test("should return valid nodes structure", async ({ request }) => {
    const response = await request.get("/api/graph");
    const data = await response.json();

    const nodes = data.data.nodes;
    expect(Array.isArray(nodes)).toBe(true);

    // If there are nodes, validate their structure
    if (nodes.length > 0) {
      const node = nodes[0];
      expect(node).toHaveProperty("id");
      expect(node).toHaveProperty("label");
      expect(node).toHaveProperty("type");
      expect(node).toHaveProperty("status");

      // Validate node types
      const validTypes = ["namespace", "node", "pod", "service", "ingress"];
      expect(validTypes).toContain(node.type);
    }
  });

  test("should return valid links structure", async ({ request }) => {
    const response = await request.get("/api/graph");
    const data = await response.json();

    const links = data.data.links;
    expect(Array.isArray(links)).toBe(true);

    // If there are links, validate their structure
    if (links.length > 0) {
      const link = links[0];
      expect(link).toHaveProperty("source");
      expect(link).toHaveProperty("target");
      expect(link).toHaveProperty("type");

      // Validate link types
      const validTypes = ["contains", "runs-on", "exposes", "routes-to"];
      expect(validTypes).toContain(link.type);
    }
  });

  test("should return timestamp in ISO format", async ({ request }) => {
    const response = await request.get("/api/graph");
    const data = await response.json();

    const timestamp = data.data.timestamp;
    expect(timestamp).toBeDefined();

    // Validate ISO 8601 format
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    expect(timestamp).toMatch(isoRegex);
  });

  test("should include vulnerabilities in nodes when present", async ({ request }) => {
    const response = await request.get("/api/graph");
    const data = await response.json();

    const nodes = data.data.nodes;

    // Check if any node has vulnerabilities
    const nodesWithVulns = nodes.filter(
      (node: ApiNode) => node.vulnerabilities && node.vulnerabilities.length > 0
    );

    // If vulnerabilities exist, validate their structure
    if (nodesWithVulns.length > 0) {
      const vuln = nodesWithVulns[0].vulnerabilities[0];
      expect(vuln).toHaveProperty("severity");
      expect(vuln).toHaveProperty("title");
      expect(vuln).toHaveProperty("description");
    }
  });

  test("should handle namespace filtering (if implemented)", async ({ request }) => {
    // First get all nodes
    const allResponse = await request.get("/api/graph");
    const allData = await allResponse.json();
    const allNodes = allData.data.nodes;

    // Check if we have namespace nodes
    const namespaces = allNodes.filter((n: ApiNode) => n.type === "namespace");

    expect(namespaces.length).toBeGreaterThanOrEqual(0);
  });

  test("should return consistent data structure on multiple requests", async ({ request }) => {
    // Make two requests
    const response1 = await request.get("/api/graph");
    const data1 = await response1.json();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const response2 = await request.get("/api/graph");
    const data2 = await response2.json();

    // Both should have the same structure
    expect(data1).toHaveProperty("status");
    expect(data2).toHaveProperty("status");
    expect(data1.data).toHaveProperty("nodes");
    expect(data2.data).toHaveProperty("nodes");
    expect(data1.data).toHaveProperty("links");
    expect(data2.data).toHaveProperty("links");
  });

  test("should return data within reasonable time", async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get("/api/graph");
    const endTime = Date.now();

    expect(response.status()).toBe(200);

    // API should respond within 5 seconds
    const responseTime = endTime - startTime;
    expect(responseTime).toBeLessThan(5000);
  });

  test("should properly format node IDs", async ({ request }) => {
    const response = await request.get("/api/graph");
    const data = await response.json();

    const nodes = data.data.nodes;

    if (nodes.length > 0) {
      nodes.forEach((node: ApiNode) => {
        // Node IDs should follow the pattern: type-namespace-name or type-name
        expect(node.id).toMatch(/^[a-z]+-/);

        // ID should not have spaces
        expect(node.id).not.toContain(" ");
      });
    }
  });

  test("should link nodes correctly", async ({ request }) => {
    const response = await request.get("/api/graph");
    const data = await response.json();

    const nodes = data.data.nodes;
    const links = data.data.links;

    if (links.length > 0) {
      const nodeIds = new Set(nodes.map((n: ApiNode) => n.id));

      links.forEach((link: ApiLink) => {
        // Both source and target should exist in nodes
        expect(nodeIds.has(link.source)).toBe(true);
        expect(nodeIds.has(link.target)).toBe(true);
      });
    }
  });
});

test.describe("API Error Handling", () => {
  test("should handle missing data gracefully", async ({ page }) => {
    // Mock a scenario where API returns no data
    await page.route("/api/graph", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "no_data",
          message: "No graph data available yet",
        }),
      });
    });

    await page.goto("/demo");

    // Page should still load without crashing
    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 10000 });
  });

  test("should handle API errors gracefully on landing page", async ({ page }) => {
    // Mock API failure
    await page.route("/api/graph", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ status: "error", error: "Internal server error" }),
      });
    });

    await page.goto("/");

    // Page should still load, just without live data
    await expect(page.getByRole("heading", { name: /Secure Your Kubernetes/ })).toBeVisible();
  });
});
