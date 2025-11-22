import { expect, test } from "@playwright/test";

test.describe("Demo/Visualization Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo");
  });

  test("should load the demo page", async ({ page }) => {
    // Check that we're on the demo page
    await expect(page).toHaveURL("/demo");

    // Banner should show "Back to Home" link
    await expect(page.getByText("Back to Home")).toBeVisible();
  });

  test("should display the graph visualization", async ({ page }) => {
    // Wait for ReactFlow container to load
    const reactFlowContainer = page.locator(".react-flow");
    await expect(reactFlowContainer).toBeVisible({ timeout: 10000 });

    // Check for ReactFlow elements
    await expect(page.locator(".react-flow__viewport")).toBeVisible();
  });

  test("should fetch and display cluster data", async ({ page }) => {
    // Wait for API call to complete
    const apiResponse = page.waitForResponse(
      (response) => response.url().includes("/api/graph") && response.status() === 200,
      { timeout: 15000 }
    );

    await apiResponse;

    // Give some time for the graph to render
    await page.waitForTimeout(2000);

    // Check that graph nodes are rendered
    const nodes = page.locator('[class*="graphNode"]');
    await expect(nodes.first()).toBeVisible({ timeout: 5000 });
  });

  test("should display sidebar with incidents", async ({ page }) => {
    // Wait for sidebar to load
    const sidebar = page.locator('[class*="sidebar"]');
    await expect(sidebar).toBeVisible({ timeout: 10000 });
  });

  test("should poll for updates every 5 seconds", async ({ page }) => {
    // Track API calls
    const apiCalls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/graph")) {
        apiCalls.push(new Date().toISOString());
      }
    });

    // Wait for initial load
    await page.waitForTimeout(1000);
    const initialCalls = apiCalls.length;

    // Wait for 6 seconds (should trigger at least one more call)
    await page.waitForTimeout(6000);

    // Should have made at least one more call
    expect(apiCalls.length).toBeGreaterThan(initialCalls);
  });

  test("should handle graph interactions", async ({ page }) => {
    // Wait for graph to load
    await page.waitForTimeout(3000);

    const reactFlowViewport = page.locator(".react-flow__viewport");
    await expect(reactFlowViewport).toBeVisible();

    // Try to zoom using mouse wheel (if possible)
    // Note: This is a basic test, more complex interactions might need special handling
    const boundingBox = await reactFlowViewport.boundingBox();
    if (boundingBox) {
      await page.mouse.move(
        boundingBox.x + boundingBox.width / 2,
        boundingBox.y + boundingBox.height / 2
      );
    }
  });

  test("should navigate back to home page", async ({ page }) => {
    // Click back to home link
    await page.getByText("Back to Home").click();

    // Should be back on home page
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: /Secure Your Kubernetes/ })).toBeVisible();
  });

  test("should display different node types", async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(3000);

    // Check for different node types in the DOM
    // These will depend on what's actually in your cluster
    const graphContainer = page.locator(".react-flow");
    await expect(graphContainer).toBeVisible();

    // Verify that nodes are being rendered
    const nodes = page.locator("[data-id]");
    const nodeCount = await nodes.count();
    expect(nodeCount).toBeGreaterThan(0);
  });

  test("should be responsive on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Graph should still be visible
    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 10000 });

    // Back button should be visible
    await expect(page.getByText("Back to Home")).toBeVisible();
  });
});
