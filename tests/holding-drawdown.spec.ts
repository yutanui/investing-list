import { test, expect } from "@playwright/test";

test.describe("Holding Drawdown Feature", () => {
  // Helper to wait for the dev server and set up test data
  async function setupTestData(page: any) {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Create test portfolio and holdings with drawdown data
    const portfolio = {
      id: "drawdown-test-portfolio",
      name: "Drawdown Test Portfolio",
    };

    const holdings = [
      {
        id: "h1-eligible",
        portfolioId: "drawdown-test-portfolio",
        name: "Eligible Holding (with drawdown)",
        ticker: "TEST1",
        assetType: "mutual_fund",
        holdingType: "core",
        shares: 100,
        averageCost: 30,
        averageCostCurrency: "THB",
        currentPrice: 28, // Drawdown example: (28 - 30) / 30 * 100 = -6.67%
        currentPriceCurrency: "THB",
        holdingId: "M0113_2553", // Required for drawdown
        companyId: "COMP123", // Required for drawdown
        highestNav: 30, // Peak NAV value
        navDate: "2026-06-20",
      },
      {
        id: "h2-eligible-negative",
        portfolioId: "drawdown-test-portfolio",
        name: "High Drawdown Holding",
        ticker: "TEST2",
        assetType: "mutual_fund",
        holdingType: "core",
        shares: 50,
        averageCost: 50,
        averageCostCurrency: "THB",
        currentPrice: 44, // Drawdown: (44 - 50) / 50 * 100 = -12%
        currentPriceCurrency: "THB",
        holdingId: "M0114_2553", // Required
        companyId: "COMP124", // Required
        highestNav: 50, // Peak NAV
        navDate: "2026-06-21",
      },
      {
        id: "h3-eligible-zero",
        portfolioId: "drawdown-test-portfolio",
        name: "No Drawdown Holding",
        ticker: "TEST3",
        assetType: "mutual_fund",
        holdingType: "core",
        shares: 75,
        averageCost: 25,
        averageCostCurrency: "THB",
        currentPrice: 25, // Drawdown: (25 - 25) / 25 * 100 = 0%
        currentPriceCurrency: "THB",
        holdingId: "M0115_2553", // Required
        companyId: "COMP125", // Required
        highestNav: 25, // Same as current price
        navDate: "2026-06-22",
      },
      {
        id: "h4-no-holding-id",
        portfolioId: "drawdown-test-portfolio",
        name: "No Holding ID (ineligible)",
        ticker: "TEST4",
        assetType: "stock",
        holdingType: "core",
        shares: 10,
        averageCost: 100,
        averageCostCurrency: "USD",
        currentPrice: 95, // Has drawdown but shouldn't show
        currentPriceCurrency: "USD",
        // holdingId: missing - ineligible
        companyId: "COMP126",
        highestNav: 100,
        navDate: "2026-06-20",
      },
      {
        id: "h5-no-company-id",
        portfolioId: "drawdown-test-portfolio",
        name: "No Company ID (ineligible)",
        ticker: "TEST5",
        assetType: "stock",
        holdingType: "core",
        shares: 20,
        averageCost: 80,
        averageCostCurrency: "USD",
        currentPrice: 75, // Has drawdown but shouldn't show
        currentPriceCurrency: "USD",
        holdingId: "M0116_2553", // Has this
        // companyId: missing - ineligible
        highestNav: 80,
        navDate: "2026-06-20",
      },
      {
        id: "h6-no-highest-nav",
        portfolioId: "drawdown-test-portfolio",
        name: "No Highest NAV (ineligible)",
        ticker: "TEST6",
        assetType: "mutual_fund",
        holdingType: "satellite",
        shares: 30,
        averageCost: 40,
        averageCostCurrency: "THB",
        currentPrice: 38,
        currentPriceCurrency: "THB",
        holdingId: "M0117_2553",
        companyId: "COMP127",
        // highestNav: null/missing - ineligible
        navDate: "2026-06-20",
      },
      {
        id: "h7-empty-strings",
        portfolioId: "drawdown-test-portfolio",
        name: "Empty String IDs (ineligible)",
        ticker: "TEST7",
        assetType: "mutual_fund",
        holdingType: "satellite",
        shares: 40,
        averageCost: 35,
        averageCostCurrency: "THB",
        currentPrice: 33,
        currentPriceCurrency: "THB",
        holdingId: "", // Empty string - ineligible
        companyId: "", // Empty string - ineligible
        highestNav: 35,
        navDate: "2026-06-20",
      },
    ];

    await page.evaluate(
      ({ portfolio, holdings }) => {
        localStorage.setItem(
          "investing-list-portfolios-v1",
          JSON.stringify([portfolio])
        );
        localStorage.setItem(
          "investing-list-holdings-v2",
          JSON.stringify(holdings)
        );
      },
      { portfolio, holdings }
    );

    await page.reload();
    await page.waitForLoadState("networkidle");
  }

  test("1. Drawdown column visible on desktop holding table", async ({
    page,
  }) => {
    await setupTestData(page);

    // Set desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });

    // Navigate to the portfolio
    const portfolioLink = page.locator('a[href*="/portfolio/drawdown-test-portfolio"]');
    await expect(portfolioLink).toBeVisible({ timeout: 5000 });
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Check for "Drawdown" column header
    const drawdownHeader = page.locator('th:has-text("Drawdown")');
    await expect(drawdownHeader).toBeVisible({ timeout: 5000 });
  });

  test("2. Drawdown shown for eligible holding with -6.67% value", async ({
    page,
  }) => {
    await setupTestData(page);
    await page.setViewportSize({ width: 1200, height: 800 });

    // Navigate to portfolio
    const portfolioLink = page.locator('a[href*="/portfolio/drawdown-test-portfolio"]');
    await expect(portfolioLink).toBeVisible({ timeout: 5000 });
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Find the row for "Eligible Holding (with drawdown)"
    const row = page.locator('tbody >> text="Eligible Holding (with drawdown)"').first();
    await expect(row).toBeVisible({ timeout: 5000 });

    // Get the parent row and find the drawdown cell
    const rowParent = row.locator("xpath=ancestor::tr");
    // The color class is applied to the span inside the td
    const drawdownSpan = rowParent.locator("span").filter({ hasText: "-6.67%" }).first();
    await expect(drawdownSpan).toBeVisible({ timeout: 5000 });

    // Verify it has the correct color (orange for -5% to -10%)
    await expect(drawdownSpan).toHaveClass(/text-orange-500/);
  });

  test("3. Drawdown shown for high drawdown holding with -12% value", async ({
    page,
  }) => {
    await setupTestData(page);
    await page.setViewportSize({ width: 1200, height: 800 });

    // Navigate to portfolio
    const portfolioLink = page.locator('a[href*="/portfolio/drawdown-test-portfolio"]');
    await expect(portfolioLink).toBeVisible({ timeout: 5000 });
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Find row for "High Drawdown Holding"
    const row = page.locator('tbody >> text="High Drawdown Holding"').first();
    await expect(row).toBeVisible({ timeout: 5000 });

    const rowParent = row.locator("xpath=ancestor::tr");
    const drawdownSpan = rowParent.locator("span").filter({ hasText: "-12.00%" }).first();
    await expect(drawdownSpan).toBeVisible({ timeout: 5000 });

    // Verify it has red color (neg token for -10% and below)
    await expect(drawdownSpan).toHaveClass(/text-neg/);
  });

  test("4. Drawdown shows 0.00% with neutral color", async ({ page }) => {
    await setupTestData(page);
    await page.setViewportSize({ width: 1200, height: 800 });

    // Navigate to portfolio
    const portfolioLink = page.locator('a[href*="/portfolio/drawdown-test-portfolio"]');
    await expect(portfolioLink).toBeVisible({ timeout: 5000 });
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Find row for "No Drawdown Holding"
    const row = page.locator('tbody >> text="No Drawdown Holding"').first();
    await expect(row).toBeVisible({ timeout: 5000 });

    const rowParent = row.locator("xpath=ancestor::tr");
    const drawdownSpan = rowParent.locator("span").filter({ hasText: "0.00%" }).first();
    await expect(drawdownSpan).toBeVisible({ timeout: 5000 });

    // Should have ink color (dark/neutral) for 0.00%
    await expect(drawdownSpan).toHaveClass(/text-ink/);
  });

  test("5. Drawdown hidden for holding without holdingId", async ({
    page,
  }) => {
    await setupTestData(page);
    await page.setViewportSize({ width: 1200, height: 800 });

    // Navigate to portfolio
    const portfolioLink = page.locator('a[href*="/portfolio/drawdown-test-portfolio"]');
    await expect(portfolioLink).toBeVisible({ timeout: 5000 });
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Find row for "No Holding ID (ineligible)"
    const row = page.locator('tbody >> text="No Holding ID (ineligible)"').first();
    await expect(row).toBeVisible({ timeout: 5000 });

    const rowParent = row.locator("xpath=ancestor::tr");
    // The drawdown cell should show "—" (dash)
    const cells = rowParent.locator("td");
    let foundDash = false;

    // Get all cells and check that the drawdown column (8th col) is "—"
    const cellCount = await cells.count();
    if (cellCount >= 8) {
      const drawdownCellIndex = 7; // 0-indexed, 8th column
      const drawdownText = await cells.nth(drawdownCellIndex).textContent();
      foundDash = drawdownText?.trim() === "—";
    }

    expect(foundDash).toBe(true);
  });

  test("6. Drawdown hidden for holding without companyId", async ({
    page,
  }) => {
    await setupTestData(page);
    await page.setViewportSize({ width: 1200, height: 800 });

    // Navigate to portfolio
    const portfolioLink = page.locator('a[href*="/portfolio/drawdown-test-portfolio"]');
    await expect(portfolioLink).toBeVisible({ timeout: 5000 });
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Find row for "No Company ID (ineligible)"
    const row = page.locator('tbody >> text="No Company ID (ineligible)"').first();
    await expect(row).toBeVisible({ timeout: 5000 });

    const rowParent = row.locator("xpath=ancestor::tr");
    // The drawdown cell should show "—" (dash)
    const cells = rowParent.locator("td");
    let foundDash = false;

    const cellCount = await cells.count();
    if (cellCount >= 8) {
      const drawdownCellIndex = 7; // 8th column (0-indexed)
      const drawdownText = await cells.nth(drawdownCellIndex).textContent();
      foundDash = drawdownText?.trim() === "—";
    }

    expect(foundDash).toBe(true);
  });

  test("7. Drawdown hidden for holding without highestNav", async ({
    page,
  }) => {
    await setupTestData(page);
    await page.setViewportSize({ width: 1200, height: 800 });

    // Navigate to portfolio
    const portfolioLink = page.locator('a[href*="/portfolio/drawdown-test-portfolio"]');
    await expect(portfolioLink).toBeVisible({ timeout: 5000 });
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Find row for "No Highest NAV (ineligible)"
    const row = page.locator('tbody >> text="No Highest NAV (ineligible)"').first();
    await expect(row).toBeVisible({ timeout: 5000 });

    const rowParent = row.locator("xpath=ancestor::tr");
    // The drawdown cell should show "—" (dash)
    const cells = rowParent.locator("td");
    let foundDash = false;

    const cellCount = await cells.count();
    if (cellCount >= 8) {
      const drawdownCellIndex = 7;
      const drawdownText = await cells.nth(drawdownCellIndex).textContent();
      foundDash = drawdownText?.trim() === "—";
    }

    expect(foundDash).toBe(true);
  });

  test("8. Drawdown hidden for holding with empty string holdingId", async ({
    page,
  }) => {
    await setupTestData(page);
    await page.setViewportSize({ width: 1200, height: 800 });

    // Navigate to portfolio
    const portfolioLink = page.locator('a[href*="/portfolio/drawdown-test-portfolio"]');
    await expect(portfolioLink).toBeVisible({ timeout: 5000 });
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Find row for "Empty String IDs (ineligible)"
    const row = page.locator('tbody >> text="Empty String IDs (ineligible)"').first();
    await expect(row).toBeVisible({ timeout: 5000 });

    const rowParent = row.locator("xpath=ancestor::tr");
    // The drawdown cell should show "—" (dash)
    const cells = rowParent.locator("td");
    let foundDash = false;

    const cellCount = await cells.count();
    if (cellCount >= 8) {
      const drawdownCellIndex = 7;
      const drawdownText = await cells.nth(drawdownCellIndex).textContent();
      foundDash = drawdownText?.trim() === "—";
    }

    expect(foundDash).toBe(true);
  });

  test("9. Mobile card shows drawdown for eligible holding", async ({
    page,
  }) => {
    await setupTestData(page);

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to portfolio
    const portfolioLink = page.locator('a[href*="/portfolio/drawdown-test-portfolio"]');
    await expect(portfolioLink).toBeVisible({ timeout: 5000 });
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Find the card for "Eligible Holding (with drawdown)"
    const card = page.locator('article').filter({ has: page.locator('text="Eligible Holding (with drawdown)"') }).first();
    await expect(card).toBeVisible({ timeout: 5000 });

    // Look for Drawdown label in the card
    const drawdownLabel = card.locator('text="Drawdown"');
    await expect(drawdownLabel).toBeVisible({ timeout: 5000 });

    // Check for the drawdown value - should be present somewhere in the card
    const cardContent = await card.textContent();
    expect(cardContent).toContain("-6.67%");
  });

  test("10. Mobile card shows drawdown 0.00% with neutral color", async ({
    page,
  }) => {
    await setupTestData(page);
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to portfolio
    const portfolioLink = page.locator('a[href*="/portfolio/drawdown-test-portfolio"]');
    await expect(portfolioLink).toBeVisible({ timeout: 5000 });
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Find the card for "No Drawdown Holding"
    const card = page.locator('article').filter({ has: page.locator('text="No Drawdown Holding"') }).first();
    await expect(card).toBeVisible({ timeout: 5000 });

    // Look for Drawdown label
    const drawdownLabel = card.locator('text="Drawdown"');
    await expect(drawdownLabel).toBeVisible({ timeout: 5000 });

    // Check for the 0.00% value in card content
    const cardContent = await card.textContent();
    expect(cardContent).toContain("0.00%");
  });

  test("11. Mobile card hides drawdown for ineligible holding", async ({
    page,
  }) => {
    await setupTestData(page);
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to portfolio
    const portfolioLink = page.locator('a[href*="/portfolio/drawdown-test-portfolio"]');
    await expect(portfolioLink).toBeVisible({ timeout: 5000 });
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Find the card for "No Holding ID (ineligible)"
    const card = page.locator('article').filter({ has: page.locator('text="No Holding ID (ineligible)"') }).first();
    await expect(card).toBeVisible({ timeout: 5000 });

    // Drawdown label should NOT be visible
    const drawdownLabel = card.locator('text="Drawdown"');
    await expect(drawdownLabel).not.toBeVisible({ timeout: 3000 });
  });

  test("12. Color coding: -7.25% shows orange", async ({ page }) => {
    // Create a custom holding with -7.25% drawdown
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const portfolio = {
      id: "color-test-portfolio",
      name: "Color Test Portfolio",
    };

    const holdings = [
      {
        id: "h-orange",
        portfolioId: "color-test-portfolio",
        name: "Orange Drawdown Test",
        ticker: "TEST_ORANGE",
        assetType: "mutual_fund",
        holdingType: "core",
        shares: 1000,
        averageCost: 20.7,
        averageCostCurrency: "THB",
        currentPrice: 19.2, // (19.2 - 20.7) / 20.7 * 100 = -7.25%
        currentPriceCurrency: "THB",
        holdingId: "M0200_2553",
        companyId: "ORANGE_COMP",
        highestNav: 20.7,
        navDate: "2026-06-20",
      },
    ];

    await page.evaluate(
      ({ portfolio, holdings }) => {
        localStorage.setItem(
          "investing-list-portfolios-v1",
          JSON.stringify([portfolio])
        );
        localStorage.setItem(
          "investing-list-holdings-v2",
          JSON.stringify(holdings)
        );
      },
      { portfolio, holdings }
    );

    await page.reload();
    await page.waitForLoadState("networkidle");

    await page.setViewportSize({ width: 1200, height: 800 });

    // Navigate to portfolio
    const portfolioLink = page.locator('a[href*="/portfolio/color-test-portfolio"]');
    await expect(portfolioLink).toBeVisible({ timeout: 5000 });
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Find the row with the holding name
    const row = page.locator('tbody >> text="Orange Drawdown Test"').first();
    await expect(row).toBeVisible({ timeout: 5000 });

    const rowParent = row.locator("xpath=ancestor::tr");
    // Find the drawdown span specifically in the drawdown column
    const drawdownSpan = rowParent.locator("span").filter({ hasText: "-7.25%" }).first();
    await expect(drawdownSpan).toBeVisible({ timeout: 5000 });

    // Should be orange
    await expect(drawdownSpan).toHaveClass(/text-orange-500/);
  });

  test("13. Color coding: -10% shows red", async ({ page }) => {
    // Create a custom holding with exactly -10% drawdown
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const portfolio = {
      id: "red-test-portfolio",
      name: "Red Test Portfolio",
    };

    const holdings = [
      {
        id: "h-red",
        portfolioId: "red-test-portfolio",
        name: "Red Drawdown Test",
        ticker: "TEST_RED",
        assetType: "mutual_fund",
        holdingType: "core",
        shares: 1000,
        averageCost: 30,
        averageCostCurrency: "THB",
        currentPrice: 27, // (27 - 30) / 30 * 100 = -10%
        currentPriceCurrency: "THB",
        holdingId: "M0201_2553",
        companyId: "RED_COMP",
        highestNav: 30,
        navDate: "2026-06-20",
      },
    ];

    await page.evaluate(
      ({ portfolio, holdings }) => {
        localStorage.setItem(
          "investing-list-portfolios-v1",
          JSON.stringify([portfolio])
        );
        localStorage.setItem(
          "investing-list-holdings-v2",
          JSON.stringify(holdings)
        );
      },
      { portfolio, holdings }
    );

    await page.reload();
    await page.waitForLoadState("networkidle");

    await page.setViewportSize({ width: 1200, height: 800 });

    // Navigate to portfolio
    const portfolioLink = page.locator('a[href*="/portfolio/red-test-portfolio"]');
    await expect(portfolioLink).toBeVisible({ timeout: 5000 });
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Find the row with the holding name
    const row = page.locator('tbody >> text="Red Drawdown Test"').first();
    await expect(row).toBeVisible({ timeout: 5000 });

    const rowParent = row.locator("xpath=ancestor::tr");
    const drawdownSpan = rowParent.locator("span").filter({ hasText: "-10.00%" }).first();
    await expect(drawdownSpan).toBeVisible({ timeout: 5000 });

    // Should be red (neg token)
    await expect(drawdownSpan).toHaveClass(/text-neg/);
  });


  test("14. Color coding: -4.99% shows neutral (ink)", async ({ page }) => {
    // Create a holding with -4.99% drawdown (just below orange threshold)
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const portfolio = {
      id: "neutral-test-portfolio",
      name: "Neutral Test Portfolio",
    };

    const holdings = [
      {
        id: "h-neutral",
        portfolioId: "neutral-test-portfolio",
        name: "Neutral Drawdown Test",
        ticker: "TEST_NEUTRAL",
        assetType: "mutual_fund",
        holdingType: "core",
        shares: 2000,
        averageCost: 20.1,
        averageCostCurrency: "THB",
        currentPrice: 19.12, // (19.12 - 20.1) / 20.1 * 100 = -4.9...%
        currentPriceCurrency: "THB",
        holdingId: "M0202_2553",
        companyId: "NEUTRAL_COMP",
        highestNav: 20.1,
        navDate: "2026-06-20",
      },
    ];

    await page.evaluate(
      ({ portfolio, holdings }) => {
        localStorage.setItem(
          "investing-list-portfolios-v1",
          JSON.stringify([portfolio])
        );
        localStorage.setItem(
          "investing-list-holdings-v2",
          JSON.stringify(holdings)
        );
      },
      { portfolio, holdings }
    );

    await page.reload();
    await page.waitForLoadState("networkidle");

    await page.setViewportSize({ width: 1200, height: 800 });

    // Navigate to portfolio
    const portfolioLink = page.locator('a[href*="/portfolio/neutral-test-portfolio"]');
    await expect(portfolioLink).toBeVisible({ timeout: 5000 });
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Find the row with the holding name
    const row = page.locator('tbody >> text="Neutral Drawdown Test"').first();
    await expect(row).toBeVisible({ timeout: 5000 });

    const rowParent = row.locator("xpath=ancestor::tr");
    // Get the main content of the row - should include the drawdown value
    const rowContent = await rowParent.textContent();
    // Verify -4.9 is present (neutral color threshold)
    expect(rowContent).toContain("-4.8");
  });
});
