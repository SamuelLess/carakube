import { expect, test } from "@playwright/test";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should have correct title and heading", async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/carakube/);

    // Check main heading
    await expect(page.getByRole("heading", { name: /Secure Your Kubernetes/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Infrastructure at Scale/ })).toBeVisible();
  });

  test("should display hero section with CTA buttons", async ({ page }) => {
    // Check badge
    await expect(page.getByText("Kubernetes Security Platform")).toBeVisible();

    // Check subtitle
    await expect(
      page.getByText(/Real-time security scanning, topology visualization/)
    ).toBeVisible();

    // Check CTA buttons
    const demoButton = page.getByRole("link", { name: /View Live Demo/i });
    await expect(demoButton).toBeVisible();
    await expect(demoButton).toHaveAttribute("href", "/demo");

    const learnMoreButton = page.getByRole("link", { name: /Learn More/i });
    await expect(learnMoreButton).toBeVisible();
  });

  test("should display live cluster status when API is available", async ({ page }) => {
    // Wait for the status to load (up to 10 seconds)
    await page.waitForSelector('[class*="liveStatus"]', { timeout: 10000 });

    // Check for live indicator
    await expect(page.getByText("Live Cluster Data")).toBeVisible();

    // Check for metrics (nodes, pods, services, issues)
    const metricsContainer = page.locator('[class*="metrics"]');
    await expect(metricsContainer).toBeVisible();

    // Verify metric labels exist
    await expect(page.getByText("Nodes")).toBeVisible();
    await expect(page.getByText("Pods")).toBeVisible();
    await expect(page.getByText("Services")).toBeVisible();
    await expect(page.getByText("Issues")).toBeVisible();
  });

  test("should display code example", async ({ page }) => {
    // Check for code window
    const codeWindow = page.locator('[class*="codeWindow"]');
    await expect(codeWindow).toBeVisible();

    // Check for code content
    await expect(page.getByText("cluster-scan.yaml")).toBeVisible();
    await expect(page.getByText(/apiVersion: v1/)).toBeVisible();
    await expect(page.getByText(/kind: Pod/)).toBeVisible();
  });

  test("should display features section", async ({ page }) => {
    // Check section heading
    await expect(page.getByRole("heading", { name: "Built for Technical Teams" })).toBeVisible();

    // Check feature cards
    await expect(page.getByRole("heading", { name: "6 Security Scans" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Topology Visualization" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Real-Time Monitoring" })).toBeVisible();

    // Check for specific feature mentions
    await expect(page.getByText(/Base64 secret detection/)).toBeVisible();
    await expect(page.getByText(/RBAC privilege analysis/)).toBeVisible();
    await expect(page.getByText(/ReactFlow-powered graphs/)).toBeVisible();
  });

  test("should display architecture section", async ({ page }) => {
    // Check section heading
    await expect(page.getByRole("heading", { name: "Architecture" })).toBeVisible();

    // Check architecture steps
    await expect(page.getByText("Cluster Scanner")).toBeVisible();
    await expect(page.getByText("Graph Builder")).toBeVisible();
    await expect(page.getByText("FastAPI")).toBeVisible();
    await expect(page.getByText("Next.js UI")).toBeVisible();

    // Check tech stack
    await expect(page.getByText("Python 3.9+")).toBeVisible();
    await expect(page.getByText("Next.js 16")).toBeVisible();
    await expect(page.getByText("Docker Compose")).toBeVisible();
  });

  test("should display pricing section", async ({ page }) => {
    // Scroll to pricing
    await page.getByRole("heading", { name: "Simple Pricing" }).scrollIntoViewIfNeeded();

    // Check pricing cards
    await expect(page.getByRole("heading", { name: "Starter" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Professional" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Enterprise" })).toBeVisible();

    // Check pricing
    await expect(page.getByText("$99")).toBeVisible();
    await expect(page.getByText("$299")).toBeVisible();
    await expect(page.getByText("Custom")).toBeVisible();

    // Check for "Most Popular" badge
    await expect(page.getByText("Most Popular")).toBeVisible();
  });

  test("should display CTA section at bottom", async ({ page }) => {
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Check CTA heading
    await expect(
      page.getByRole("heading", { name: /Ready to secure your cluster?/i })
    ).toBeVisible();

    // Check CTA button
    const ctaButton = page.getByRole("link", { name: /Try Live Demo/i }).last();
    await expect(ctaButton).toBeVisible();
  });

  test("should navigate to demo page when clicking CTA", async ({ page }) => {
    // Click the demo button
    await page
      .getByRole("link", { name: /View Live Demo/i })
      .first()
      .click();

    // Should navigate to demo page
    await expect(page).toHaveURL("/demo");
  });

  test("should have smooth scrolling for anchor links", async ({ page }) => {
    // Click on "Learn More" which should scroll to features
    await page.getByRole("link", { name: /Learn More/i }).click();

    // Wait a bit for smooth scroll
    await page.waitForTimeout(500);

    // Check that we're still on the same page (no navigation)
    await expect(page).toHaveURL("/");

    // Features section should be visible
    await expect(page.getByRole("heading", { name: "Built for Technical Teams" })).toBeInViewport();
  });

  test("should be responsive on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that main elements are still visible
    await expect(page.getByRole("heading", { name: /Secure Your Kubernetes/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /View Live Demo/i })).toBeVisible();

    // Check that code window is visible
    await expect(page.locator('[class*="codeWindow"]')).toBeVisible();
  });
});
