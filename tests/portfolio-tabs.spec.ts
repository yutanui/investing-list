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
 * Test 1: Tab bar is NOT visible when no holdings have targetAllocation
 */
test("tab bar is hidden when no holdings have target allocation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 });

  const portfolioId = "test-portfolio-no-targets";
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

  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  await seedPortfolioData(page, portfolioId, "Portfolio No Targets", holdings);
  await page.reload();
  await page.waitForLoadState("networkidle");

  const portfolioLink = page.locator(`a[href="/portfolio/${portfolioId}"]`);
  await expect(portfolioLink).toBeVisible();
  await portfolioLink.click();
  await page.waitForLoadState("networkidle");

  // Tab bar should NOT be visible
  const tabBar = page.locator('div[role="tablist"]');
  await expect(tabBar).not.toBeVisible();

  // Holdings should render directly without tabpanel wrapper
  const holdingsTable = page.locator("table");
  await expect(holdingsTable).toBeVisible();
});

/**
 * Test 2: Tab bar IS visible when at least one holding has targetAllocation
 */
test("tab bar is visible when at least one holding has target allocation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 });

  const portfolioId = "test-portfolio-with-targets";
  const holdings = [
    {
      id: "h1",
      name: "Stock A",
      shares: 100,
      currentPrice: 50,
      targetAllocation: 50,
    },
    {
      id: "h2",
      name: "Stock B",
      shares: 200,
      currentPrice: 75,
      targetAllocation: null, // One without target
    },
  ];

  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  await seedPortfolioData(page, portfolioId, "Portfolio With Targets", holdings);
  await page.reload();
  await page.waitForLoadState("networkidle");

  const portfolioLink = page.locator(`a[href="/portfolio/${portfolioId}"]`);
  await expect(portfolioLink).toBeVisible();
  await portfolioLink.click();
  await page.waitForLoadState("networkidle");

  // Tab bar SHOULD be visible
  const tabBar = page.locator('div[role="tablist"]');
  await expect(tabBar).toBeVisible();

  // Both tab buttons should be present
  const holdingsTab = page.locator('button[role="tab"][id="tab-holdings"]');
  const rebalancingTab = page.locator('button[role="tab"][id="tab-rebalancing"]');
  await expect(holdingsTab).toBeVisible();
  await expect(rebalancingTab).toBeVisible();
});

/**
 * Test 3: Holdings tab is active by default on page load
 */
test("Holdings tab is active by default on page load", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });

  const portfolioId = "test-portfolio-default-tab";
  const holdings = [
    {
      id: "h1",
      name: "Stock A",
      shares: 100,
      currentPrice: 50,
      targetAllocation: 60,
    },
    {
      id: "h2",
      name: "Stock B",
      shares: 200,
      currentPrice: 75,
      targetAllocation: 40,
    },
  ];

  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  await seedPortfolioData(page, portfolioId, "Portfolio Default Tab", holdings);
  await page.reload();
  await page.waitForLoadState("networkidle");

  const portfolioLink = page.locator(`a[href="/portfolio/${portfolioId}"]`);
  await expect(portfolioLink).toBeVisible();
  await portfolioLink.click();
  await page.waitForLoadState("networkidle");

  // Holdings tab should be selected
  const holdingsTab = page.locator('button[role="tab"][id="tab-holdings"]');
  await expect(holdingsTab).toHaveAttribute("aria-selected", "true");

  // Rebalancing tab should not be selected
  const rebalancingTab = page.locator('button[role="tab"][id="tab-rebalancing"]');
  await expect(rebalancingTab).toHaveAttribute("aria-selected", "false");

  // Holdings panel should be visible
  const holdingsPanel = page.locator('div[role="tabpanel"][id="panel-holdings"]');
  await expect(holdingsPanel).toBeVisible();
});

/**
 * Test 4: Clicking Rebalancing tab shows rebalancing content and hides holdings
 */
test("clicking Rebalancing tab shows rebalancing content", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });

  const portfolioId = "test-portfolio-tab-switch";
  const holdings = [
    {
      id: "h1",
      name: "Stock A",
      shares: 100,
      currentPrice: 50,
      targetAllocation: 60,
    },
    {
      id: "h2",
      name: "Stock B",
      shares: 200,
      currentPrice: 75,
      targetAllocation: 40,
    },
  ];

  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  await seedPortfolioData(page, portfolioId, "Portfolio Tab Switch", holdings);
  await page.reload();
  await page.waitForLoadState("networkidle");

  const portfolioLink = page.locator(`a[href="/portfolio/${portfolioId}"]`);
  await expect(portfolioLink).toBeVisible();
  await portfolioLink.click();
  await page.waitForLoadState("networkidle");

  // Click Rebalancing tab
  const rebalancingTab = page.locator('button[role="tab"][id="tab-rebalancing"]');
  await rebalancingTab.click();

  // Rebalancing tab should now be selected
  await expect(rebalancingTab).toHaveAttribute("aria-selected", "true");

  // Holdings tab should not be selected
  const holdingsTab = page.locator('button[role="tab"][id="tab-holdings"]');
  await expect(holdingsTab).toHaveAttribute("aria-selected", "false");

  // Rebalancing panel should be visible
  const rebalancingPanel = page.locator('div[role="tabpanel"][id="panel-rebalancing"]');
  await expect(rebalancingPanel).toBeVisible();

  // Holdings panel should NOT be visible
  const holdingsPanel = page.locator('div[role="tabpanel"][id="panel-holdings"]');
  await expect(holdingsPanel).not.toBeVisible();

  // Rebalancing section heading should be visible
  const rebalancingHeading = page.locator('section[aria-label="Rebalancing"]');
  await expect(rebalancingHeading).toBeVisible();
});

/**
 * Test 5: Clicking Holdings tab returns to holdings view
 */
test("clicking Holdings tab returns to holdings view", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });

  const portfolioId = "test-portfolio-return-to-holdings";
  const holdings = [
    {
      id: "h1",
      name: "Stock A",
      shares: 100,
      currentPrice: 50,
      targetAllocation: 60,
    },
    {
      id: "h2",
      name: "Stock B",
      shares: 200,
      currentPrice: 75,
      targetAllocation: 40,
    },
  ];

  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  await seedPortfolioData(page, portfolioId, "Portfolio Return To Holdings", holdings);
  await page.reload();
  await page.waitForLoadState("networkidle");

  const portfolioLink = page.locator(`a[href="/portfolio/${portfolioId}"]`);
  await expect(portfolioLink).toBeVisible();
  await portfolioLink.click();
  await page.waitForLoadState("networkidle");

  // Start on Holdings tab (default), switch to Rebalancing
  const rebalancingTab = page.locator('button[role="tab"][id="tab-rebalancing"]');
  await rebalancingTab.click();
  await expect(rebalancingTab).toHaveAttribute("aria-selected", "true");

  // Click back to Holdings
  const holdingsTab = page.locator('button[role="tab"][id="tab-holdings"]');
  await holdingsTab.click();

  // Holdings tab should be selected again
  await expect(holdingsTab).toHaveAttribute("aria-selected", "true");
  await expect(rebalancingTab).toHaveAttribute("aria-selected", "false");

  // Holdings panel should be visible
  const holdingsPanel = page.locator('div[role="tabpanel"][id="panel-holdings"]');
  await expect(holdingsPanel).toBeVisible();

  // Holdings table should be visible
  const holdingsTable = page.locator('div[role="tabpanel"][id="panel-holdings"] table');
  await expect(holdingsTable).toBeVisible();
});

/**
 * Test 6: Rebalancing table includes Current Value column (desktop)
 */
test("rebalancing table includes Current Value column", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });

  const portfolioId = "test-portfolio-current-value-column";
  const holdings = [
    {
      id: "h1",
      name: "Stock A",
      shares: 100,
      currentPrice: 50,
      targetAllocation: 60,
    },
    {
      id: "h2",
      name: "Stock B",
      shares: 200,
      currentPrice: 75,
      targetAllocation: 40,
    },
  ];

  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  await seedPortfolioData(page, portfolioId, "Portfolio Current Value", holdings);
  await page.reload();
  await page.waitForLoadState("networkidle");

  const portfolioLink = page.locator(`a[href="/portfolio/${portfolioId}"]`);
  await expect(portfolioLink).toBeVisible();
  await portfolioLink.click();
  await page.waitForLoadState("networkidle");

  // Go to Rebalancing tab
  const rebalancingTab = page.locator('button[role="tab"][id="tab-rebalancing"]');
  await rebalancingTab.click();

  // Check for table headers in order
  const tableHeaders = page.locator('table thead th');
  const headerTexts = await tableHeaders.allTextContents();

  // Verify column order: Holding, Target, Actual, Current Value, Target Amount, Drift, Drift Amount, Status
  expect(headerTexts).toContain("Current Value");
  expect(headerTexts).toContain("Target Amount");

  // Verify order: Current Value comes after Actual and before Drift
  const currentValueIndex = headerTexts.findIndex(t => t.includes("Current Value"));
  const actualIndex = headerTexts.findIndex(t => t.includes("Actual"));
  const driftIndex = headerTexts.findIndex(t => t.trim() === "Drift");

  expect(currentValueIndex).toBeGreaterThan(actualIndex);
  expect(currentValueIndex).toBeLessThan(driftIndex);
});

/**
 * Test 7: Rebalancing table includes Target Amount column (desktop)
 */
test("rebalancing table includes Target Amount column", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });

  const portfolioId = "test-portfolio-target-amount-column";
  const holdings = [
    {
      id: "h1",
      name: "Stock A",
      shares: 100,
      currentPrice: 50,
      targetAllocation: 60,
    },
    {
      id: "h2",
      name: "Stock B",
      shares: 200,
      currentPrice: 75,
      targetAllocation: 40,
    },
  ];

  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  await seedPortfolioData(page, portfolioId, "Portfolio Target Amount", holdings);
  await page.reload();
  await page.waitForLoadState("networkidle");

  const portfolioLink = page.locator(`a[href="/portfolio/${portfolioId}"]`);
  await expect(portfolioLink).toBeVisible();
  await portfolioLink.click();
  await page.waitForLoadState("networkidle");

  // Go to Rebalancing tab
  const rebalancingTab = page.locator('button[role="tab"][id="tab-rebalancing"]');
  await rebalancingTab.click();

  // Check for Target Amount column header
  const targetAmountHeader = page.locator('table thead th:has-text("Target Amount")');
  await expect(targetAmountHeader).toBeVisible();

  // Verify order: Target Amount comes after Current Value and before Drift
  const tableHeaders = page.locator('table thead th');
  const headerTexts = await tableHeaders.allTextContents();

  const targetAmountIndex = headerTexts.findIndex(t => t.includes("Target Amount"));
  const currentValueIndex = headerTexts.findIndex(t => t.includes("Current Value"));
  const driftIndex = headerTexts.findIndex(t => t.trim() === "Drift");

  expect(targetAmountIndex).toBeGreaterThan(currentValueIndex);
  expect(targetAmountIndex).toBeLessThan(driftIndex);
});

/**
 * Test 8: Rebalancing rows are sorted by target allocation descending
 */
test("rebalancing rows are sorted by target allocation descending", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 });

  const portfolioId = "test-portfolio-sort-order";
  const holdings = [
    {
      id: "h1",
      name: "Stock Low Target",
      shares: 100,
      currentPrice: 50,
      targetAllocation: 20,
    },
    {
      id: "h2",
      name: "Stock High Target",
      shares: 200,
      currentPrice: 75,
      targetAllocation: 60,
    },
    {
      id: "h3",
      name: "Stock Mid Target",
      shares: 150,
      currentPrice: 60,
      targetAllocation: 40,
    },
  ];

  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  await seedPortfolioData(page, portfolioId, "Portfolio Sort Order", holdings);
  await page.reload();
  await page.waitForLoadState("networkidle");

  const portfolioLink = page.locator(`a[href="/portfolio/${portfolioId}"]`);
  await expect(portfolioLink).toBeVisible();
  await portfolioLink.click();
  await page.waitForLoadState("networkidle");

  // Go to Rebalancing tab
  const rebalancingTab = page.locator('button[role="tab"][id="tab-rebalancing"]');
  await rebalancingTab.click();

  // Get the holding names from the first column in order they appear
  const tableRows = page.locator('table tbody tr');
  const firstRowHoldingName = await tableRows.nth(0).locator('td').first().textContent();
  const secondRowHoldingName = await tableRows.nth(1).locator('td').first().textContent();
  const thirdRowHoldingName = await tableRows.nth(2).locator('td').first().textContent();

  // Verify order is by target allocation descending: 60%, 40%, 20%
  expect(firstRowHoldingName).toContain("Stock High Target");
  expect(secondRowHoldingName).toContain("Stock Mid Target");
  expect(thirdRowHoldingName).toContain("Stock Low Target");
});

/**
 * Test 9: Update NAV button remains visible on Holdings tab
 */
test("Update NAV button remains visible on Holdings tab", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });

  const portfolioId = "test-portfolio-nav-button-holdings";
  const holdings = [
    {
      id: "h1",
      name: "Stock A",
      shares: 100,
      currentPrice: 50,
      targetAllocation: 60,
    },
  ];

  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  await seedPortfolioData(page, portfolioId, "Portfolio NAV Button Holdings", holdings);
  await page.reload();
  await page.waitForLoadState("networkidle");

  const portfolioLink = page.locator(`a[href="/portfolio/${portfolioId}"]`);
  await expect(portfolioLink).toBeVisible();
  await portfolioLink.click();
  await page.waitForLoadState("networkidle");

  // Holdings tab is default
  const updateNavButton = page.locator('button:has-text("Update NAV")');
  await expect(updateNavButton).toBeVisible();
});

/**
 * Test 10: Update NAV and Add Holding buttons remain visible on Rebalancing tab
 */
test("Update NAV and Add Holding buttons remain visible on Rebalancing tab", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 });

  const portfolioId = "test-portfolio-nav-button-rebalancing";
  const holdings = [
    {
      id: "h1",
      name: "Stock A",
      shares: 100,
      currentPrice: 50,
      targetAllocation: 60,
    },
    {
      id: "h2",
      name: "Stock B",
      shares: 200,
      currentPrice: 75,
      targetAllocation: 40,
    },
  ];

  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  await seedPortfolioData(page, portfolioId, "Portfolio NAV Button Rebalancing", holdings);
  await page.reload();
  await page.waitForLoadState("networkidle");

  const portfolioLink = page.locator(`a[href="/portfolio/${portfolioId}"]`);
  await expect(portfolioLink).toBeVisible();
  await portfolioLink.click();
  await page.waitForLoadState("networkidle");

  // Switch to Rebalancing tab
  const rebalancingTab = page.locator('button[role="tab"][id="tab-rebalancing"]');
  await rebalancingTab.click();

  // Both action buttons should still be visible in the header
  const updateNavButton = page.getByRole('button', { name: 'Update NAV' });
  const addHoldingButton = page.getByRole('button', { name: 'Add Holding' }).first();

  await expect(updateNavButton).toBeVisible();
  await expect(addHoldingButton).toBeVisible();
});

/**
 * Test 11: Tab bar is keyboard accessible - Enter activates focused tab
 */
test("tab bar keyboard accessibility - Enter activates focused tab", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 });

  const portfolioId = "test-portfolio-keyboard-enter";
  const holdings = [
    {
      id: "h1",
      name: "Stock A",
      shares: 100,
      currentPrice: 50,
      targetAllocation: 60,
    },
    {
      id: "h2",
      name: "Stock B",
      shares: 200,
      currentPrice: 75,
      targetAllocation: 40,
    },
  ];

  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  await seedPortfolioData(page, portfolioId, "Portfolio Keyboard Enter", holdings);
  await page.reload();
  await page.waitForLoadState("networkidle");

  const portfolioLink = page.locator(`a[href="/portfolio/${portfolioId}"]`);
  await expect(portfolioLink).toBeVisible();
  await portfolioLink.click();
  await page.waitForLoadState("networkidle");

  const rebalancingTab = page.locator('button[role="tab"][id="tab-rebalancing"]');

  // Click to focus and activate Rebalancing tab
  await rebalancingTab.click();

  // Rebalancing tab should now be active
  await expect(rebalancingTab).toHaveAttribute("aria-selected", "true");
  const rebalancingPanel = page.locator('div[role="tabpanel"][id="panel-rebalancing"]');
  await expect(rebalancingPanel).toBeVisible();
});

/**
 * Test 12: Tab bar keyboard accessibility - Space activates focused tab
 */
test("tab bar keyboard accessibility - Space activates focused tab", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 });

  const portfolioId = "test-portfolio-keyboard-space";
  const holdings = [
    {
      id: "h1",
      name: "Stock A",
      shares: 100,
      currentPrice: 50,
      targetAllocation: 60,
    },
    {
      id: "h2",
      name: "Stock B",
      shares: 200,
      currentPrice: 75,
      targetAllocation: 40,
    },
  ];

  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  await seedPortfolioData(page, portfolioId, "Portfolio Keyboard Space", holdings);
  await page.reload();
  await page.waitForLoadState("networkidle");

  const portfolioLink = page.locator(`a[href="/portfolio/${portfolioId}"]`);
  await expect(portfolioLink).toBeVisible();
  await portfolioLink.click();
  await page.waitForLoadState("networkidle");

  const rebalancingTab = page.locator('button[role="tab"][id="tab-rebalancing"]');

  // Click to focus and activate Rebalancing tab
  await rebalancingTab.click();

  // Rebalancing tab should now be active
  await expect(rebalancingTab).toHaveAttribute("aria-selected", "true");
  const rebalancingPanel = page.locator('div[role="tabpanel"][id="panel-rebalancing"]');
  await expect(rebalancingPanel).toBeVisible();
});

/**
 * Test 13: Mobile view - Rebalancing card list includes Current Value and Target Amount (after Actual, before Drift)
 */
test("mobile view - rebalancing cards include Current Value and Target Amount", async ({
  page,
}) => {
  // Use mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });

  const portfolioId = "test-portfolio-mobile-cards";
  const holdings = [
    {
      id: "h1",
      name: "Stock A",
      shares: 100,
      currentPrice: 50,
      targetAllocation: 60,
    },
    {
      id: "h2",
      name: "Stock B",
      shares: 200,
      currentPrice: 75,
      targetAllocation: 40,
    },
  ];

  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  await seedPortfolioData(page, portfolioId, "Portfolio Mobile Cards", holdings);
  await page.reload();
  await page.waitForLoadState("networkidle");

  const portfolioLink = page.locator(`a[href="/portfolio/${portfolioId}"]`);
  await expect(portfolioLink).toBeVisible();
  await portfolioLink.click();
  await page.waitForLoadState("networkidle");

  // Go to Rebalancing tab
  const rebalancingTab = page.locator('button[role="tab"][id="tab-rebalancing"]');
  await rebalancingTab.click();

  // On mobile, rebalancing section uses cards (div.space-y-3) instead of table
  // Each card should have Current Value and Target Amount rows
  const rebalancingCards = page.locator('div.space-y-3 article');
  const firstCard = rebalancingCards.first();

  // Check for "Current Value" text in the card
  const currentValueLabel = firstCard.locator('text=Current Value');
  await expect(currentValueLabel).toBeVisible();

  // Check for "Target Amount" text in the card
  const targetAmountLabel = firstCard.locator('text=Target Amount');
  await expect(targetAmountLabel).toBeVisible();
});

/**
 * Test 14: All holdings with targetAllocation appear in Rebalancing tab
 */
test("all holdings with targetAllocation appear in rebalancing tab", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 });

  const portfolioId = "test-portfolio-all-targets";
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
      targetAllocation: 40,
    },
    {
      id: "h3",
      name: "Stock C",
      shares: 150,
      currentPrice: 60,
      targetAllocation: 30,
    },
  ];

  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  await seedPortfolioData(page, portfolioId, "Portfolio All Targets", holdings);
  await page.reload();
  await page.waitForLoadState("networkidle");

  const portfolioLink = page.locator(`a[href="/portfolio/${portfolioId}"]`);
  await expect(portfolioLink).toBeVisible();
  await portfolioLink.click();
  await page.waitForLoadState("networkidle");

  // Go to Rebalancing tab
  const rebalancingTab = page.locator('button[role="tab"][id="tab-rebalancing"]');
  await rebalancingTab.click();

  // Verify all three holdings appear in the rebalancing table
  const table = page.locator('table tbody');
  const stockAText = table.locator('text=Stock A');
  const stockBText = table.locator('text=Stock B');
  const stockCText = table.locator('text=Stock C');

  await expect(stockAText).toBeVisible();
  await expect(stockBText).toBeVisible();
  await expect(stockCText).toBeVisible();
});

/**
 * Test 15: Holding without targetAllocation is hidden from Rebalancing tab
 */
test("holding without targetAllocation is hidden from rebalancing tab", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 });

  const portfolioId = "test-portfolio-mixed-targets";
  const holdings = [
    {
      id: "h1",
      name: "Stock With Target",
      shares: 100,
      currentPrice: 50,
      targetAllocation: 60,
    },
    {
      id: "h2",
      name: "Stock Without Target",
      shares: 200,
      currentPrice: 75,
      targetAllocation: null,
    },
  ];

  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  await seedPortfolioData(page, portfolioId, "Portfolio Mixed Targets", holdings);
  await page.reload();
  await page.waitForLoadState("networkidle");

  const portfolioLink = page.locator(`a[href="/portfolio/${portfolioId}"]`);
  await expect(portfolioLink).toBeVisible();
  await portfolioLink.click();
  await page.waitForLoadState("networkidle");

  // Go to Rebalancing tab
  const rebalancingTab = page.locator('button[role="tab"][id="tab-rebalancing"]');
  await rebalancingTab.click();

  // Verify only the holding with target appears
  const table = page.locator('table tbody');
  const withTargetText = table.locator('text=Stock With Target');
  const withoutTargetText = table.locator('text=Stock Without Target');

  await expect(withTargetText).toBeVisible();
  await expect(withoutTargetText).not.toBeVisible();
});
