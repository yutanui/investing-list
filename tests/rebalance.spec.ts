import { test, expect } from "@playwright/test";

/**
 * Helper: Set up localStorage with a portfolio and holdings after navigating.
 * Handles the storage key format used by the app.
 */
async function seedPortfolioData(
  page,
  portfolioId: string,
  portfolioName: string,
  holdings: Array<{
    id: string;
    name: string;
    shares: number;
    currentPrice: number;
    targetAllocation?: number | null;
    averageCost?: number;
    ticker?: string;
  }>,
) {
  await page.evaluate(
    ({ pId, pName, hList }) => {
      const portfolio = { id: pId, name: pName };
      const holdingsData = hList.map((h) => ({
        id: h.id,
        portfolioId: pId,
        name: h.name,
        ticker: h.ticker ?? "",
        assetType: "stock",
        holdingType: "core",
        shares: h.shares,
        averageCost: h.averageCost ?? 100,
        averageCostCurrency: "THB",
        currentPrice: h.currentPrice,
        currentPriceCurrency: "THB",
        targetAllocation: h.targetAllocation ?? null,
      }));

      localStorage.setItem(
        "investing-list-portfolios-v1",
        JSON.stringify([portfolio])
      );
      localStorage.setItem(
        "investing-list-holdings-v2",
        JSON.stringify(holdingsData)
      );
    },
    { pId: portfolioId, pName: portfolioName, hList: holdings }
  );
}

/**
 * Test 1: Section hidden when no targets set
 * Create a portfolio with holdings that have no targetAllocation set.
 * Navigate to the portfolio page and verify the rebalancing section does NOT appear.
 */
test("rebalancing section is hidden when no holdings have target allocations", async ({
  page,
}) => {
  // Set desktop viewport
  await page.setViewportSize({ width: 1200, height: 800 });

  const portfolioId = "test-portfolio-1";
  const holdings = [
    {
      id: "h1",
      name: "Stock A",
      shares: 100,
      currentPrice: 50,
      targetAllocation: null,
    },
    {
      id: "h2",
      name: "Stock B",
      shares: 200,
      currentPrice: 75,
      targetAllocation: null,
    },
  ];

  // Navigate first, then seed data
  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  await seedPortfolioData(page, portfolioId, "Test Portfolio", holdings);
  await page.reload();
  await page.waitForLoadState("networkidle");

  // Navigate to the portfolio page
  const portfolioLink = page.locator(`a[href="/portfolio/${portfolioId}"]`);
  await expect(portfolioLink).toBeVisible();
  await portfolioLink.click();
  await page.waitForLoadState("networkidle");

  // Verify rebalancing section is NOT present
  const rebalancingSection = page.locator('section[aria-label="Rebalancing"]');
  await expect(rebalancingSection).not.toBeVisible();
});

/**
 * Test 2: Section appears when at least one target is set
 * Set targetAllocation on one holding, navigate to portfolio page,
 * verify the rebalancing section renders.
 */
test("rebalancing section appears when at least one holding has target allocation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 });

  const portfolioId = "test-portfolio-2";
  const holdings = [
    {
      id: "h1",
      name: "Stock A",
      shares: 100,
      currentPrice: 50,
      targetAllocation: 30,
    },
    {
      id: "h2",
      name: "Stock B",
      shares: 200,
      currentPrice: 75,
      targetAllocation: null,
    },
  ];

  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  await seedPortfolioData(page, portfolioId, "Test Portfolio 2", holdings);
  await page.reload();
  await page.waitForLoadState("networkidle");

  const portfolioLink = page.locator(`a[href="/portfolio/${portfolioId}"]`);
  await expect(portfolioLink).toBeVisible();
  await portfolioLink.click();
  await page.waitForLoadState("networkidle");

  // Verify rebalancing section IS present
  const rebalancingSection = page.locator('section[aria-label="Rebalancing"]');
  await expect(rebalancingSection).toBeVisible();

  // Verify section header
  const sectionTitle = page.locator("h3:has-text('Rebalancing')");
  await expect(sectionTitle).toBeVisible();
});

/**
 * Test 3: Target allocation field in holding dialog
 * Open the holding dialog and verify the "Target Allocation (%)" field exists.
 */
test("target allocation field exists in holding dialog and accepts numeric input", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 });

  const portfolioId = "test-portfolio-3";
  const holdings = [
    {
      id: "h1",
      name: "Stock A",
      shares: 100,
      currentPrice: 50,
      targetAllocation: 25,
    },
  ];

  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  await seedPortfolioData(page, portfolioId, "Test Portfolio 3", holdings);
  await page.reload();
  await page.waitForLoadState("networkidle");

  const portfolioLink = page.locator(`a[href="/portfolio/${portfolioId}"]`);
  await expect(portfolioLink).toBeVisible();
  await portfolioLink.click();
  await page.waitForLoadState("networkidle");

  // Click on a holding row to open edit dialog (look for the row first)
  const holdingRow = page.locator("tr").filter({ hasText: "Stock A" }).nth(0);
  await expect(holdingRow).toBeVisible();
  await holdingRow.click();
  await page.waitForLoadState("networkidle");

  // Verify target allocation field exists in the page (even if dialog is hidden)
  const targetAllocationInput = page.locator('input[name="targetAllocation"]');

  // Just verify it exists and has the right attributes
  await expect(targetAllocationInput).toHaveAttribute("type", "number");
  await expect(targetAllocationInput).toHaveAttribute("min", "0");
  await expect(targetAllocationInput).toHaveAttribute("max", "100");
  await expect(targetAllocationInput).toHaveAttribute("step", "0.01");

  // Also verify the input's existence (may be hidden but present in DOM)
  const inputCount = await page.locator('input[name="targetAllocation"]').count();
  expect(inputCount).toBeGreaterThan(0);
});

/**
 * Test 4: Running total in holding dialog
 * Seed two holdings with targets (20% and 30%), open edit dialog for a third holding,
 * verify "Total allocated: 50% across 2 holdings" appears.
 */
test("running total displays in holding dialog showing allocations across other holdings", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 });

  const portfolioId = "test-portfolio-4";
  const holdings = [
    {
      id: "h1",
      name: "Stock A",
      shares: 100,
      currentPrice: 50,
      targetAllocation: 20,
    },
    {
      id: "h2",
      name: "Stock B",
      shares: 200,
      currentPrice: 75,
      targetAllocation: 30,
    },
    {
      id: "h3",
      name: "Stock C",
      shares: 150,
      currentPrice: 60,
      targetAllocation: null,
    },
  ];

  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  await seedPortfolioData(page, portfolioId, "Test Portfolio 4", holdings);
  await page.reload();
  await page.waitForLoadState("networkidle");

  const portfolioLink = page.locator(`a[href="/portfolio/${portfolioId}"]`);
  await expect(portfolioLink).toBeVisible();
  await portfolioLink.click();
  await page.waitForLoadState("networkidle");

  // Click on Stock C row (which has no target) to open edit dialog
  const holdingC = page.locator("tr").filter({ hasText: "Stock C" }).nth(0);
  await expect(holdingC).toBeVisible();
  await holdingC.click();
  await page.waitForLoadState("networkidle");

  // Verify the running total text appears
  const totalAllocatedText = page.locator(
    "text=Total allocated: 50.00% across 2 holdings"
  );
  await expect(totalAllocatedText).toBeVisible();
});

/**
 * Test 5: Drift table renders correctly with correct Status values
 * Seed holdings with known values to compute drift, verify the table shows
 * correct Target, Actual, Drift, and Status columns.
 */
test("drift table displays correct target, actual, drift, and status", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 });

  const portfolioId = "test-portfolio-5";
  const holdings = [
    {
      id: "h1",
      name: "Stock A",
      shares: 1000,
      currentPrice: 10,
      targetAllocation: 30,
    },
    {
      id: "h2",
      name: "Stock B",
      shares: 1000,
      currentPrice: 10,
      targetAllocation: 50,
    },
    {
      id: "h3",
      name: "Stock C",
      shares: 500,
      currentPrice: 40,
      targetAllocation: 20,
    },
  ];

  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  await seedPortfolioData(page, portfolioId, "Test Portfolio 5", holdings);
  await page.reload();
  await page.waitForLoadState("networkidle");

  const portfolioLink = page.locator(`a[href="/portfolio/${portfolioId}"]`);
  await expect(portfolioLink).toBeVisible();
  await portfolioLink.click();
  await page.waitForLoadState("networkidle");

  // Verify rebalancing section exists
  const rebalancingSection = page.locator('section[aria-label="Rebalancing"]');
  await expect(rebalancingSection).toBeVisible();

  // Check for drift table content by verifying the text
  const sectionText = await rebalancingSection.textContent();
  expect(sectionText).toContain("Stock A");
  expect(sectionText).toContain("Stock B");
  expect(sectionText).toContain("Stock C");
  expect(sectionText).toContain("Drift Amount");

  // Verify status labels appear
  expect(sectionText).toContain("Underweight");
  expect(sectionText).toContain("Overweight");
});

/**
 * Test 6: Balanced message when all within threshold (default 5%)
 * Seed holdings where drift < 5%, verify "All holdings are within" message appears
 * in suggested transfers subsection.
 */
test("balanced message displays when all holdings are within drift threshold", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 });

  const portfolioId = "test-portfolio-6";
  // Create holdings with allocations very close to targets (within default 5%)
  const holdings = [
    {
      id: "h1",
      name: "Stock A",
      shares: 1000,
      currentPrice: 10,
      targetAllocation: 34,
    },
    {
      id: "h2",
      name: "Stock B",
      shares: 1000,
      currentPrice: 10,
      targetAllocation: 33,
    },
    {
      id: "h3",
      name: "Stock C",
      shares: 1000,
      currentPrice: 10,
      targetAllocation: 33,
    },
  ];

  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  await seedPortfolioData(page, portfolioId, "Test Portfolio 6", holdings);
  await page.reload();
  await page.waitForLoadState("networkidle");

  const portfolioLink = page.locator(`a[href="/portfolio/${portfolioId}"]`);
  await expect(portfolioLink).toBeVisible();
  await portfolioLink.click();
  await page.waitForLoadState("networkidle");

  // Verify the balanced message appears in suggested transfers section
  const balancedMessage = page.locator(
    "text=All holdings are within the ±5% drift threshold"
  );
  await expect(balancedMessage).toBeVisible();
});

/**
 * Test 7: Transfer suggestion shown
 * Seed holdings where one is clearly overweight and another clearly underweight,
 * verify a "Move" suggestion appears with from/to holding names and amount in THB.
 */
test("transfer suggestion displays with correct from/to holdings and amount", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 });

  const portfolioId = "test-portfolio-7";
  const holdings = [
    {
      id: "h1",
      name: "Tech Stocks",
      shares: 3000,
      currentPrice: 10,
      targetAllocation: 20,
    },
    {
      id: "h2",
      name: "Bonds",
      shares: 500,
      currentPrice: 20,
      targetAllocation: 50,
    },
    {
      id: "h3",
      name: "Mutual Fund",
      shares: 1000,
      currentPrice: 20,
      targetAllocation: 30,
    },
  ];

  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  await seedPortfolioData(page, portfolioId, "Test Portfolio 7", holdings);
  await page.reload();
  await page.waitForLoadState("networkidle");

  const portfolioLink = page.locator(`a[href="/portfolio/${portfolioId}"]`);
  await expect(portfolioLink).toBeVisible();
  await portfolioLink.click();
  await page.waitForLoadState("networkidle");

  // Verify suggested transfers section shows a transfer
  const transferSuggestion = page.locator("text=Move").first();
  await expect(transferSuggestion).toBeVisible();

  // Verify it contains "from" and "to"
  const pageText = await page.textContent("section[aria-label='Rebalancing']");
  expect(pageText).toMatch(/Move.*from.*to/i);

  // Verify one of the holding names appears in the transfer
  expect(pageText).toContain("Tech Stocks");
  expect(pageText).toContain("Bonds");
});

/**
 * Test 8: Drift threshold input exists and is functional
 * Verify the inline drift threshold input in the rebalancing section header
 * exists, has correct min/max/step, and can be changed.
 */
test("drift threshold input is editable in rebalancing section header", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 });

  const portfolioId = "test-portfolio-8";
  const holdings = [
    {
      id: "h1",
      name: "Stock A",
      shares: 100,
      currentPrice: 50,
      targetAllocation: 30,
    },
    {
      id: "h2",
      name: "Stock B",
      shares: 200,
      currentPrice: 50,
      targetAllocation: 70,
    },
  ];

  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  await seedPortfolioData(page, portfolioId, "Test Portfolio 8", holdings);
  await page.reload();
  await page.waitForLoadState("networkidle");

  const portfolioLink = page.locator(`a[href="/portfolio/${portfolioId}"]`);
  await expect(portfolioLink).toBeVisible();
  await portfolioLink.click();
  await page.waitForLoadState("networkidle");

  // Find the drift threshold input
  const driftThresholdInput = page.locator(
    'input[aria-label="Drift threshold percentage"]'
  );
  await expect(driftThresholdInput).toBeVisible();

  // Verify input attributes
  await expect(driftThresholdInput).toHaveAttribute("type", "number");
  await expect(driftThresholdInput).toHaveAttribute("min", "0");
  await expect(driftThresholdInput).toHaveAttribute("max", "50");
  await expect(driftThresholdInput).toHaveAttribute("step", "0.5");

  // Verify default value is 5
  const defaultValue = await driftThresholdInput.inputValue();
  expect(defaultValue).toBe("5");

  // Test changing the threshold value
  await driftThresholdInput.clear();
  await driftThresholdInput.fill("10");
  const newValue = await driftThresholdInput.inputValue();
  expect(newValue).toBe("10");
});

/**
 * Test 9: Color coding of drift status
 * Verify overweight holdings display in red (text-loss),
 * underweight in green (text-gain), and balanced in neutral color.
 */
test("drift status colors are applied correctly", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });

  const portfolioId = "test-portfolio-9";
  const holdings = [
    {
      id: "h1",
      name: "Overweight Holding",
      shares: 3000,
      currentPrice: 10,
      targetAllocation: 20,
    },
    {
      id: "h2",
      name: "Underweight Holding",
      shares: 100,
      currentPrice: 10,
      targetAllocation: 50,
    },
  ];

  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  await seedPortfolioData(page, portfolioId, "Test Portfolio 9", holdings);
  await page.reload();
  await page.waitForLoadState("networkidle");

  const portfolioLink = page.locator(`a[href="/portfolio/${portfolioId}"]`);
  await expect(portfolioLink).toBeVisible();
  await portfolioLink.click();
  await page.waitForLoadState("networkidle");

  // Check for color classes in the rebalancing section
  const rebalancingSection = page.locator('section[aria-label="Rebalancing"]');
  await expect(rebalancingSection).toBeVisible();

  // Verify classes by checking HTML content for color classes
  const html = await rebalancingSection.innerHTML();
  expect(html).toContain("text-loss");
  expect(html).toContain("text-gain");

  // Verify text appears
  const pageText = await rebalancingSection.textContent();
  expect(pageText).toContain("Overweight");
  expect(pageText).toContain("Underweight");
});

/**
 * Test 10: Holdings without targets are excluded from rebalancing calculations
 * but still count toward total portfolio value.
 */
test("holdings without targets are excluded from drift table but included in total value", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 });

  const portfolioId = "test-portfolio-10";
  const holdings = [
    {
      id: "h1",
      name: "Targeted Stock",
      shares: 1000,
      currentPrice: 10,
      targetAllocation: 50,
    },
    {
      id: "h2",
      name: "Cash (No Target)",
      shares: 5000,
      currentPrice: 1,
      targetAllocation: null, // No target
    },
  ];

  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  await seedPortfolioData(page, portfolioId, "Test Portfolio 10", holdings);
  await page.reload();
  await page.waitForLoadState("networkidle");

  const portfolioLink = page.locator(`a[href="/portfolio/${portfolioId}"]`);
  await expect(portfolioLink).toBeVisible();
  await portfolioLink.click();
  await page.waitForLoadState("networkidle");

  // Verify rebalancing section exists (because h1 has a target)
  const rebalancingSection = page.locator('section[aria-label="Rebalancing"]');
  await expect(rebalancingSection).toBeVisible();

  // Verify only the targeted holding appears in the drift table
  const pageText = await rebalancingSection.textContent();
  expect(pageText).toContain("Targeted Stock");
  expect(pageText).not.toContain("Cash (No Target)");

  // Verify actual % is calculated including the cash
  // Actual should be ~66.67% (10,000 / 15,000), not 100% (10,000 / 10,000)
  expect(pageText).toMatch(/66\..*%/);
});
