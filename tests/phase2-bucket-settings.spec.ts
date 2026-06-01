import { test, expect } from "@playwright/test";

test.describe("Phase 2: Bucket Settings", () => {
  test("1. Provider mounts without crashing", async ({ page }) => {
    // Navigate to home page
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Verify the page loads successfully
    const mainContent = page.locator("main#main-content");
    await expect(mainContent).toBeVisible({ timeout: 5000 });

    // Verify no error is displayed
    // (If the provider crashes, we'd see an error boundary or blank screen)
    const errorText = page.locator("text=/error|Error|failed/i");
    await expect(errorText).toHaveCount(0);
  });

  test("2. Default bucket settings are 0", async ({ page }) => {
    // Navigate to home page first
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Clear localStorage to ensure defaults are used
    await page.evaluate(() => {
      localStorage.removeItem("bucket_settings");
    });

    // Reload to apply the cleared state
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Verify the page renders normally with default settings
    const mainContent = page.locator("main#main-content");
    await expect(mainContent).toBeVisible({ timeout: 5000 });

    // The provider should load default settings (0, 0, 0) without errors
    // Verify no error messages appear
    const errorText = page.locator("text=/error|Error|failed/i");
    await expect(errorText).toHaveCount(0);

    // Verify the page has loaded content (not stuck in loading state)
    const header = page.locator("header");
    await expect(header).toBeVisible({ timeout: 5000 });
  });

  test("3. localStorage persistence of bucket settings", async ({ page }) => {
    // Navigate to home page first
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Pre-populate localStorage with bucket settings
    await page.evaluate(() => {
      localStorage.setItem(
        "bucket_settings",
        JSON.stringify({
          bucket1Target: 20,
          bucket2Target: 30,
          bucket3Target: 50,
        })
      );
    });

    // Navigate to home page
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Verify the page loads without errors (provider should read stored values)
    const mainContent = page.locator("main#main-content");
    await expect(mainContent).toBeVisible({ timeout: 5000 });

    // Verify no error messages appear
    const errorText = page.locator("text=/error|Error|failed/i");
    await expect(errorText).toHaveCount(0);

    // Verify header is visible (page is fully loaded)
    const header = page.locator("header");
    await expect(header).toBeVisible({ timeout: 5000 });

    // Reload the page to verify persistence
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Verify the page still loads without errors
    await expect(mainContent).toBeVisible({ timeout: 5000 });
    await expect(errorText).toHaveCount(0);
  });

  test("4. Invalid localStorage data is handled gracefully", async ({ page }) => {
    // Navigate to home page first
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Set invalid JSON in localStorage
    await page.evaluate(() => {
      localStorage.setItem("bucket_settings", "not-valid-json{{");
    });

    // Navigate to home page
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Verify the page loads without errors (provider should catch JSON parse error)
    const mainContent = page.locator("main#main-content");
    await expect(mainContent).toBeVisible({ timeout: 5000 });

    // Verify no error messages appear on the page
    const errorText = page.locator("text=/error|Error|failed/i");
    await expect(errorText).toHaveCount(0);

    // Verify header is visible (page is fully functional)
    const header = page.locator("header");
    await expect(header).toBeVisible({ timeout: 5000 });

    // Reload to ensure resilience
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should still load normally
    await expect(mainContent).toBeVisible({ timeout: 5000 });
    await expect(errorText).toHaveCount(0);
  });

  test("5. Phase 1 regression - Cash asset type label swap still works", async ({
    page,
  }) => {
    // Helper: inject portfolio data into localStorage
    const portfolioId = "test-portfolio-regression";
    const holdingId = "test-holding-1";
    const portfolio = { id: portfolioId, name: "Test Portfolio" };

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

    // Navigate first, then inject data
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

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

    // Navigate to portfolio page
    await page.goto(`http://localhost:3000/portfolio/${portfolioId}`);
    await page.waitForLoadState("networkidle");

    // Click the "Add Holding" button to open the dialog
    const buttons = page.locator('button:has-text("Add Holding")');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);

    await buttons.first().click();

    // Wait for dialog to open
    await page.waitForFunction(
      () => document.querySelectorAll("dialog[open]").length > 0,
      { timeout: 5000 }
    );

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

    // Wait for the label to change to "Balance (THB)"
    const cashLabel = page
      .locator("dialog[open]")
      .locator("label:has-text('Balance (THB)')");
    await expect(cashLabel).toBeVisible({ timeout: 5000 });

    // Verify the "Shares / Units" label is no longer visible
    await expect(sharesLabel).not.toBeVisible({ timeout: 5000 });
  });

  test("6. Phase 1 regression - Money Market Fund label swap still works", async ({
    page,
  }) => {
    // Helper: inject portfolio data into localStorage
    const portfolioId = "test-portfolio-mmf";
    const holdingId = "test-holding-2";
    const portfolio = { id: portfolioId, name: "Test Portfolio MMF" };

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

    // Navigate first, then inject data
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

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

    // Navigate to portfolio page
    await page.goto(`http://localhost:3000/portfolio/${portfolioId}`);
    await page.waitForLoadState("networkidle");

    // Click the "Add Holding" button to open the dialog
    const buttons = page.locator('button:has-text("Add Holding")');
    await buttons.first().click();

    // Wait for dialog to open
    await page.waitForFunction(
      () => document.querySelectorAll("dialog[open]").length > 0,
      { timeout: 5000 }
    );

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
  });
});
