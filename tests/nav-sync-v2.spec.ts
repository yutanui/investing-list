import { test, expect } from "@playwright/test";

test.describe("NAV Sync v2 - navDate preserved on manual save", () => {
  // Helper function to inject test data into localStorage
  async function injectTestData(
    page,
    {
      portfolios = [],
      holdings = [],
    }: {
      portfolios?: Array<{ id: string; name: string }>;
      holdings?: Array<any>;
    } = {},
  ) {
    await page.evaluate(
      ({ portfolios, holdings }) => {
        localStorage.setItem(
          "investing-list-portfolios-v1",
          JSON.stringify(portfolios),
        );
        localStorage.setItem(
          "investing-list-holdings-v2",
          JSON.stringify(holdings),
        );
      },
      { portfolios, holdings },
    );
  }

  // Helper to calculate date X days ago in YYYY-MM-DD format
  function getDaysAgoString(daysAgo: number): string {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - daysAgo);
    return date.toISOString().slice(0, 10);
  }

  test("Test 1: navDate is NOT changed when manually saving a holding that has holdingId", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");
    await page.setViewportSize({ width: 1200, height: 800 });

    // Create test data: holding with holdingId and old navDate (10 days ago)
    const testPortfolio = {
      id: "holdingid-test-portfolio",
      name: "HoldingID Test",
    };

    const oldNavDate = getDaysAgoString(10); // 10 days ago

    const testHolding = {
      id: "holding-with-holdingid",
      portfolioId: "holdingid-test-portfolio",
      name: "Fund With HoldingID",
      holdingId: "FUND_PRESERVE_001",
      ticker: "PRES",
      assetType: "mutual_fund" as const,
      holdingType: "core" as const,
      shares: 100,
      averageCost: 100,
      averageCostCurrency: "THB" as const,
      currentPrice: 105,
      currentPriceCurrency: "THB" as const,
      navDate: oldNavDate,
    };

    await injectTestData(page, {
      portfolios: [testPortfolio],
      holdings: [testHolding],
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Navigate to portfolio
    const portfolioLink = page.locator(
      `a[href="/portfolio/holdingid-test-portfolio"]`,
    ).first();
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Click on the holding to open the dialog
    const tableRow = page.locator(`table tbody tr`);
    await tableRow.click();
    await page.waitForLoadState("networkidle");

    // Wait for the holding dialog to appear
    const holdingDialog = page.locator("dialog[open]");
    await holdingDialog.waitFor({ state: "visible" });

    // Verify we're editing the right holding
    const holdingIdInput = page.locator('input[name="holdingId"]');
    const currentHoldingId = await holdingIdInput.inputValue();
    expect(currentHoldingId).toBe("FUND_PRESERVE_001");

    // Change shares (without changing anything else)
    const sharesInput = page.locator('input[name="shares"]');
    await sharesInput.fill("150");

    // Save the holding
    const saveButton = page.locator('button:has-text("Save Changes")');
    await saveButton.click();
    await page.waitForLoadState("networkidle");

    // Check localStorage to verify navDate was NOT changed
    const holdingsData = await page.evaluate(() => {
      const data = localStorage.getItem("investing-list-holdings-v2");
      return JSON.parse(data || "[]");
    });

    const updatedHolding = holdingsData.find(
      (h) => h.id === "holding-with-holdingid",
    );

    expect(updatedHolding.navDate).toBe(oldNavDate);
    expect(updatedHolding.shares).toBe(150);
    console.log(
      `✓ Test 1 PASS: navDate preserved (${oldNavDate}) when manually saving holding with holdingId`,
    );
  });

  test("Test 2: navDate is NOT changed when manually saving a holding that has companyId", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");
    await page.setViewportSize({ width: 1200, height: 800 });

    // Create test data: holding with companyId (no holdingId) and old navDate
    const testPortfolio = {
      id: "companyid-test-portfolio",
      name: "CompanyID Test",
    };

    const oldNavDate = getDaysAgoString(7); // 7 days ago

    const testHolding = {
      id: "holding-with-companyid",
      portfolioId: "companyid-test-portfolio",
      name: "Stock With CompanyID",
      companyId: "COMP_PRESERVE_001",
      ticker: "COMP",
      assetType: "stock" as const,
      holdingType: "core" as const,
      shares: 50,
      averageCost: 150,
      averageCostCurrency: "THB" as const,
      currentPrice: 160,
      currentPriceCurrency: "THB" as const,
      navDate: oldNavDate,
    };

    await injectTestData(page, {
      portfolios: [testPortfolio],
      holdings: [testHolding],
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Navigate to portfolio
    const portfolioLink = page.locator(
      `a[href="/portfolio/companyid-test-portfolio"]`,
    ).first();
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Click on the holding to open the dialog
    const tableRow = page.locator(`table tbody tr`);
    await tableRow.click();
    await page.waitForLoadState("networkidle");

    // Wait for the holding dialog
    const holdingDialog = page.locator("dialog[open]");
    await holdingDialog.waitFor({ state: "visible" });

    // Verify we're editing the right holding
    const companyIdInput = page.locator('input[name="companyId"]');
    const currentCompanyId = await companyIdInput.inputValue();
    expect(currentCompanyId).toBe("COMP_PRESERVE_001");

    // Change current price
    const priceInput = page.locator('input[name="currentPrice"]');
    await priceInput.fill("165");

    // Save the holding
    const saveButton = page.locator('button:has-text("Save Changes")');
    await saveButton.click();
    await page.waitForLoadState("networkidle");

    // Check localStorage
    const holdingsData = await page.evaluate(() => {
      const data = localStorage.getItem("investing-list-holdings-v2");
      return JSON.parse(data || "[]");
    });

    const updatedHolding = holdingsData.find(
      (h) => h.id === "holding-with-companyid",
    );

    expect(updatedHolding.navDate).toBe(oldNavDate);
    expect(updatedHolding.currentPrice).toBe(165);
    console.log(
      `✓ Test 2 PASS: navDate preserved (${oldNavDate}) when manually saving holding with companyId`,
    );
  });

  test("Test 3: navDate is NOT changed when manually saving a holding with neither ID", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");
    await page.setViewportSize({ width: 1200, height: 800 });

    // Create test data: holding WITHOUT holdingId/companyId, but with navDate
    const testPortfolio = {
      id: "no-ids-test-portfolio",
      name: "No IDs Test",
    };

    const oldNavDate = getDaysAgoString(3); // 3 days ago

    const testHolding = {
      id: "holding-no-ids",
      portfolioId: "no-ids-test-portfolio",
      name: "Regular Stock",
      ticker: "REG",
      assetType: "stock" as const,
      holdingType: "satellite" as const,
      shares: 200,
      averageCost: 50,
      averageCostCurrency: "THB" as const,
      currentPrice: 55,
      currentPriceCurrency: "THB" as const,
      navDate: oldNavDate,
      // NO holdingId, NO companyId
    };

    await injectTestData(page, {
      portfolios: [testPortfolio],
      holdings: [testHolding],
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Navigate to portfolio
    const portfolioLink = page.locator(
      `a[href="/portfolio/no-ids-test-portfolio"]`,
    ).first();
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Click on the holding to open the dialog
    const tableRow = page.locator(`table tbody tr`);
    await tableRow.click();
    await page.waitForLoadState("networkidle");

    // Wait for the holding dialog
    const holdingDialog = page.locator("dialog[open]");
    await holdingDialog.waitFor({ state: "visible" });

    // Change shares
    const sharesInput = page.locator('input[name="shares"]');
    await sharesInput.fill("250");

    // Save the holding
    const saveButton = page.locator('button:has-text("Save Changes")');
    await saveButton.click();
    await page.waitForLoadState("networkidle");

    // Check localStorage
    const holdingsData = await page.evaluate(() => {
      const data = localStorage.getItem("investing-list-holdings-v2");
      return JSON.parse(data || "[]");
    });

    const updatedHolding = holdingsData.find((h) => h.id === "holding-no-ids");

    expect(updatedHolding.navDate).toBe(oldNavDate);
    expect(updatedHolding.shares).toBe(250);
    console.log(
      `✓ Test 3 PASS: navDate preserved (${oldNavDate}) when manually saving holding without holdingId or companyId`,
    );
  });

  test("Test 4: navDate is NOT set when saving a NEW holding that has holdingId", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");
    await page.setViewportSize({ width: 1200, height: 800 });

    // Create test data with a portfolio
    const testPortfolio = {
      id: "new-holding-portfolio",
      name: "New Holding Test",
    };

    await injectTestData(page, {
      portfolios: [testPortfolio],
      holdings: [],
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Navigate to portfolio
    const portfolioLink = page.locator(
      `a[href="/portfolio/new-holding-portfolio"]`,
    ).first();
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Click "Add Holding" button (or "Add Your First Holding" in empty state)
    // Use a more flexible selector that matches either button text
    const addButton = page.locator('button', { hasText: /Add.*Holding/ }).first();
    await addButton.click();
    await page.waitForLoadState("networkidle");

    // Wait for the holding dialog
    const holdingDialog = page.locator("dialog[open]");
    await holdingDialog.waitFor({ state: "visible" });

    // Fill in the form with holdingId - scope to the dialog to avoid conflicts
    const dialogLocator = holdingDialog;
    await dialogLocator.locator('input[name="name"]').fill("New Fund With ID");
    await dialogLocator.locator('input[name="holdingId"]').fill("NEW_FUND_ID_001");
    await dialogLocator.locator('select[name="assetType"]').selectOption("mutual_fund");
    await dialogLocator.locator('select[name="holdingType"]').selectOption("core");
    await dialogLocator.locator('input[name="shares"]').fill("100");
    await dialogLocator.locator('input[name="averageCost"]').fill("100");
    await dialogLocator.locator('input[name="currentPrice"]').fill("105");

    // Save the holding - in the dialog, the button is "Add Holding"
    const saveButton = dialogLocator.locator('button[type="submit"]').first();
    await saveButton.click();
    await page.waitForLoadState("networkidle");

    // Check localStorage
    const holdingsData = await page.evaluate(() => {
      const data = localStorage.getItem("investing-list-holdings-v2");
      return JSON.parse(data || "[]");
    });

    const newHolding = holdingsData.find(
      (h) => h.holdingId === "NEW_FUND_ID_001",
    );

    expect(newHolding).toBeDefined();
    expect(newHolding.navDate).toBeUndefined();
    console.log(
      `✓ Test 4 PASS: navDate NOT set when adding new holding with holdingId (navDate is undefined)`,
    );
  });

  test("Test 5: Stale NAV highlighting still works - holding with holdingId and navDate 8 days ago shows text-loss", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");
    await page.setViewportSize({ width: 1200, height: 800 });

    // Create test data: holding with holdingId and stale navDate (8 days ago)
    const testPortfolio = {
      id: "stale-nav-test-portfolio",
      name: "Stale NAV Test",
    };

    const staleNavDate = getDaysAgoString(8); // 8 days ago (past 7-day threshold)

    const testHolding = {
      id: "stale-holding",
      portfolioId: "stale-nav-test-portfolio",
      name: "Stale Fund",
      holdingId: "STALE_FUND_001",
      ticker: "STALE",
      assetType: "mutual_fund" as const,
      holdingType: "core" as const,
      shares: 50,
      averageCost: 100,
      averageCostCurrency: "THB" as const,
      currentPrice: 105,
      currentPriceCurrency: "THB" as const,
      navDate: staleNavDate,
    };

    await injectTestData(page, {
      portfolios: [testPortfolio],
      holdings: [testHolding],
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Navigate to portfolio
    const portfolioLink = page.locator(
      `a[href="/portfolio/stale-nav-test-portfolio"]`,
    ).first();
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Find the NAV Date column cell for the holding
    // The NAV Date column is the 7th column (index 6) in the table
    const tableRow = page.locator(`table tbody tr`);
    const navDateCell = tableRow.locator("td").nth(6);

    // Check if the cell has the text-loss class
    const navDateText = await navDateCell.textContent();
    const navDateClass = await navDateCell.getAttribute("class");

    expect(navDateText).toContain(staleNavDate);
    expect(navDateClass).toContain("text-loss");
    console.log(
      `✓ Test 5 PASS: Stale NAV (holdingId + 8 day old navDate) displays with text-loss class (Feature 2 unbroken)`,
    );
  });
});
