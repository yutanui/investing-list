import { test, expect } from "@playwright/test";

// Helper to inject a portfolio with optional holdings into localStorage
async function injectPortfolioData(page: any) {
  const portfolioId = "test-portfolio-asset-types";
  const holdingId = "test-holding-1";
  const portfolio = { id: portfolioId, name: "Test Portfolio" };

  // Create one dummy holding so the portfolio is not empty (shows "Add Holding" button instead of "Add Your First Holding")
  const holdings = [
    {
      id: holdingId,
      portfolioId,
      name: "Dummy Holding",
      holdingId: "",
      companyId: "",
      ticker: "",
      assetType: "stock",
      holdingType: "core",
      shares: 100,
      averageCost: 10,
      averageCostCurrency: "THB",
      currentPrice: 32,
      currentPriceCurrency: "THB",
    },
  ];

  await page.evaluate(
    ({ portfolio, holdings }: { portfolio: any; holdings: any[] }) => {
      localStorage.setItem(
        "investing-list-portfolios-v1",
        JSON.stringify([portfolio])
      );
      localStorage.setItem("investing-list-holdings-v2", JSON.stringify(holdings));
    },
    { portfolio, holdings }
  );

  return portfolioId;
}

// Helper to open the Add Holding dialog from the portfolio page
async function openAddHoldingDialog(page: any) {
  // Navigate to portfolio page
  const portfolioId = await injectPortfolioData(page);
  await page.goto(`http://localhost:3000/portfolio/${portfolioId}`);
  await page.waitForLoadState("networkidle");

  // Wait for the page to render and find the primary "Add Holding" button (not the dialog button)
  // We click the button in the header area (after "Update NAV" button in the flex group)
  const buttons = page.locator('button:has-text("Add Holding")');
  const count = await buttons.count();

  if (count === 0) {
    throw new Error("No 'Add Holding' button found");
  }

  // Click the first visible "Add Holding" button (which is in the header, not in dialog)
  await buttons.first().click();

  // Wait for dialog to open
  await page.waitForFunction(
    () => document.querySelectorAll("dialog[open]").length > 0,
    { timeout: 5000 }
  );
}

test.describe("Phase 1: Asset Types", () => {
  test("1. New asset types appear in the Asset Type dropdown", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    await openAddHoldingDialog(page);

    // Get the Asset Type select dropdown
    const assetTypeSelect = page
      .locator("dialog[open]")
      .locator('select[name="assetType"]');

    // Get all options
    const options = await assetTypeSelect
      .locator("option")
      .allTextContents();

    // Verify new asset types are present
    expect(options).toContain("Cash");
    expect(options).toContain("Money Market Fund");
    expect(options).toContain("Dividend Mutual Fund");

    // Verify existing types are still present
    expect(options).toContain("Stock");
    expect(options).toContain("ETF");
    expect(options).toContain("Mutual Fund");
    expect(options).toContain("Bond / Fixed Income");
  });

  test("2. Cash label swap works - shares field becomes Balance (THB)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    await openAddHoldingDialog(page);

    // Initially, label should be "Shares / Units" for default asset type (stock)
    const sharesLabel = page
      .locator("dialog[open]")
      .locator("label:has-text('Shares / Units')");
    await expect(sharesLabel).toBeVisible({ timeout: 5000 });

    // Select "Cash" from the Asset Type dropdown
    const assetTypeSelect = page
      .locator("dialog[open]")
      .locator('select[name="assetType"]');
    await assetTypeSelect.selectOption("cash");

    // Wait for the label to change
    const cashLabel = page
      .locator("dialog[open]")
      .locator("label:has-text('Balance (THB)')");
    await expect(cashLabel).toBeVisible({ timeout: 5000 });

    // Verify helper text appears
    const helperText = page
      .locator("dialog[open]")
      .locator("p:has-text('Enter your total cash balance')");
    await expect(helperText).toBeVisible({ timeout: 5000 });
  });

  test("3. Average Cost and Current Price fields are hidden for Cash", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    await openAddHoldingDialog(page);

    // Select "Cash" from the Asset Type dropdown
    const assetTypeSelect = page
      .locator("dialog[open]")
      .locator('select[name="assetType"]');
    await assetTypeSelect.selectOption("cash");

    // Average Cost label should be hidden
    const avgCostLabel = page
      .locator("dialog[open]")
      .locator("label:has-text('Average Cost')");
    await expect(avgCostLabel).not.toBeVisible({ timeout: 5000 });

    // Current Price label should be hidden
    const priceLabel = page
      .locator("dialog[open]")
      .locator("label:has-text('Current Price')");
    await expect(priceLabel).not.toBeVisible({ timeout: 5000 });

    // Verify hidden inputs are submitted with value 1
    const avgCostHidden = page
      .locator("dialog[open]")
      .locator('input[name="averageCost"][type="hidden"]');
    await expect(avgCostHidden).toHaveValue("1");

    const priceHidden = page
      .locator("dialog[open]")
      .locator('input[name="currentPrice"][type="hidden"]');
    await expect(priceHidden).toHaveValue("1");
  });

  test("4. Money Market Fund label swap works", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    await openAddHoldingDialog(page);

    // Select "Money Market Fund" from the Asset Type dropdown
    const assetTypeSelect = page
      .locator("dialog[open]")
      .locator('select[name="assetType"]');
    await assetTypeSelect.selectOption("money_market_fund");

    // Verify the label changes to "Balance (THB)"
    const cashLabel = page
      .locator("dialog[open]")
      .locator("label:has-text('Balance (THB)')");
    await expect(cashLabel).toBeVisible({ timeout: 5000 });

    // Verify helper text appears
    const helperText = page
      .locator("dialog[open]")
      .locator("p:has-text('Enter your total cash balance')");
    await expect(helperText).toBeVisible({ timeout: 5000 });

    // Verify cost/price fields are hidden
    const avgCostLabel = page
      .locator("dialog[open]")
      .locator("label:has-text('Average Cost')");
    await expect(avgCostLabel).not.toBeVisible({ timeout: 5000 });

    const priceLabel = page
      .locator("dialog[open]")
      .locator("label:has-text('Current Price')");
    await expect(priceLabel).not.toBeVisible({ timeout: 5000 });
  });

  test("5. Label swap reverts when switching from Cash to Stock", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    await openAddHoldingDialog(page);

    // Select "Cash" first
    const assetTypeSelect = page
      .locator("dialog[open]")
      .locator('select[name="assetType"]');
    await assetTypeSelect.selectOption("cash");

    // Verify it shows "Balance (THB)"
    const cashLabel = page
      .locator("dialog[open]")
      .locator("label:has-text('Balance (THB)')");
    await expect(cashLabel).toBeVisible({ timeout: 5000 });

    // Switch to "Stock"
    await assetTypeSelect.selectOption("stock");

    // Verify "Shares / Units" label is restored
    const sharesLabel = page
      .locator("dialog[open]")
      .locator("label:has-text('Shares / Units')");
    await expect(sharesLabel).toBeVisible({ timeout: 5000 });

    // Verify Average Cost field is visible again
    const avgCostLabel = page
      .locator("dialog[open]")
      .locator("label:has-text('Average Cost')");
    await expect(avgCostLabel).toBeVisible({ timeout: 5000 });

    // Verify Current Price field is visible again
    const priceLabel = page
      .locator("dialog[open]")
      .locator("label:has-text('Current Price')");
    await expect(priceLabel).toBeVisible({ timeout: 5000 });

    // Verify helper text is no longer visible
    const helperText = page
      .locator("dialog[open]")
      .locator("p:has-text('Enter your total cash balance')");
    await expect(helperText).not.toBeVisible({ timeout: 5000 });
  });

  test("6. Dividend Mutual Fund asset type is selectable", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    await openAddHoldingDialog(page);

    // Select "Dividend Mutual Fund" from dropdown
    const assetTypeSelect = page
      .locator("dialog[open]")
      .locator('select[name="assetType"]');
    await assetTypeSelect.selectOption("dividend_mutual_fund");

    // Verify it's selected
    await expect(assetTypeSelect).toHaveValue("dividend_mutual_fund");

    // Dividend Mutual Fund is NOT a cash-like asset, so:
    // - "Shares / Units" label should be visible
    // - Cost/price fields should be visible
    const sharesLabel = page
      .locator("dialog[open]")
      .locator("label:has-text('Shares / Units')");
    await expect(sharesLabel).toBeVisible({ timeout: 5000 });

    const avgCostLabel = page
      .locator("dialog[open]")
      .locator("label:has-text('Average Cost')");
    await expect(avgCostLabel).toBeVisible({ timeout: 5000 });

    const priceLabel = page
      .locator("dialog[open]")
      .locator("label:has-text('Current Price')");
    await expect(priceLabel).toBeVisible({ timeout: 5000 });
  });

  test("7. Switching from Money Market Fund to ETF restores normal fields", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    await openAddHoldingDialog(page);

    // Select "Money Market Fund"
    const assetTypeSelect = page
      .locator("dialog[open]")
      .locator('select[name="assetType"]');
    await assetTypeSelect.selectOption("money_market_fund");

    // Verify "Balance (THB)" is shown
    const cashLabel = page
      .locator("dialog[open]")
      .locator("label:has-text('Balance (THB)')");
    await expect(cashLabel).toBeVisible({ timeout: 5000 });

    // Switch to "ETF"
    await assetTypeSelect.selectOption("etf");

    // Verify "Shares / Units" label is restored
    const sharesLabel = page
      .locator("dialog[open]")
      .locator("label:has-text('Shares / Units')");
    await expect(sharesLabel).toBeVisible({ timeout: 5000 });

    // Verify cost/price fields are visible
    const avgCostLabel = page
      .locator("dialog[open]")
      .locator("label:has-text('Average Cost')");
    await expect(avgCostLabel).toBeVisible({ timeout: 5000 });

    const priceLabel = page
      .locator("dialog[open]")
      .locator("label:has-text('Current Price')");
    await expect(priceLabel).toBeVisible({ timeout: 5000 });

    // Helper text should not be visible
    const helperText = page
      .locator("dialog[open]")
      .locator("p:has-text('Enter your total cash balance')");
    await expect(helperText).not.toBeVisible({ timeout: 5000 });
  });
});
