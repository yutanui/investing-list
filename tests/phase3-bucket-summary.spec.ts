import { test, expect } from "@playwright/test";

test.describe("Phase 3: Bucket Summary", () => {
  test("1. Core/satellite row is gone from home page", async ({ page }) => {
    const portfolioId = "test-portfolio-phase3";
    const portfolio = { id: portfolioId, name: "Phase 3 Test Portfolio" };

    const holdings = [
      {
        id: "holding-1",
        portfolioId,
        name: "Test Stock",
        ticker: "TEST",
        assetType: "stock",
        holdingType: "core",
        shares: 100,
        averageCost: 10,
        averageCostCurrency: "THB" as const,
        currentPrice: 15,
        currentPriceCurrency: "THB" as const,
      },
      {
        id: "holding-2",
        portfolioId,
        name: "Test Cash",
        assetType: "cash",
        holdingType: "core",
        shares: 1,
        averageCost: 10000,
        averageCostCurrency: "THB" as const,
        currentPrice: 10000,
        currentPriceCurrency: "THB" as const,
      },
    ];

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

    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Verify "Core" text is NOT visible in the portfolio summary
    const coreText = page.locator("text=/^Core$/i");
    const coreCount = await coreText.count();
    expect(coreCount).toBe(0);

    // Verify "Satellite" text is NOT visible in the portfolio summary
    const satelliteText = page.locator("text=/^Satellite$/i");
    const satelliteCount = await satelliteText.count();
    expect(satelliteCount).toBe(0);

    // Verify the 4 stat cards are visible instead
    const marketValueCard = page.locator("text=/Market Value/");
    await expect(marketValueCard).toBeVisible({ timeout: 5000 });
  });

  test("2. Bucket Strategy section renders with 3 bucket cards", async ({ page }) => {
    const portfolioId = "test-portfolio-buckets";
    const portfolio = { id: portfolioId, name: "Bucket Test Portfolio" };

    const holdings = [
      {
        id: "holding-b1",
        portfolioId,
        name: "Cash Holdings",
        assetType: "cash",
        holdingType: "core",
        shares: 1,
        averageCost: 5000,
        averageCostCurrency: "THB" as const,
        currentPrice: 5000,
        currentPriceCurrency: "THB" as const,
      },
      {
        id: "holding-b2",
        portfolioId,
        name: "Bond Holdings",
        assetType: "bond",
        holdingType: "core",
        shares: 100,
        averageCost: 100,
        averageCostCurrency: "THB" as const,
        currentPrice: 100,
        currentPriceCurrency: "THB" as const,
      },
      {
        id: "holding-b3",
        portfolioId,
        name: "Stock Holdings",
        assetType: "stock",
        holdingType: "core",
        shares: 50,
        averageCost: 200,
        averageCostCurrency: "THB" as const,
        currentPrice: 250,
        currentPriceCurrency: "THB" as const,
      },
    ];

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

    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Verify "Bucket Strategy" heading is visible
    const bucketHeading = page.locator("h3:has-text('Bucket Strategy')");
    await expect(bucketHeading).toBeVisible({ timeout: 5000 });

    // Verify the 3 bucket cards are visible
    const bucket1Label = page.locator("text=/Bucket 1.*Liquidity/i");
    const bucket2Label = page.locator("text=/Bucket 2.*Income/i");
    const bucket3Label = page.locator("text=/Bucket 3.*Growth/i");

    await expect(bucket1Label).toBeVisible({ timeout: 5000 });
    await expect(bucket2Label).toBeVisible({ timeout: 5000 });
    await expect(bucket3Label).toBeVisible({ timeout: 5000 });
  });

  test("3. Default state — no targets shown, Target and Delta not visible", async ({
    page,
  }) => {
    const portfolioId = "test-portfolio-defaults";
    const portfolio = { id: portfolioId, name: "Default Targets Portfolio" };

    const holdings = [
      {
        id: "holding-d1",
        portfolioId,
        name: "Cash",
        assetType: "cash",
        holdingType: "core",
        shares: 1,
        averageCost: 1000,
        averageCostCurrency: "THB" as const,
        currentPrice: 1000,
        currentPriceCurrency: "THB" as const,
      },
    ];

    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    await page.evaluate(() => {
      localStorage.removeItem("bucket_settings");
    });

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

    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // When all targets are 0, "Target" should NOT be visible in bucket cards
    const targetLabels = page.locator("text=/^Target$/");
    const targetCount = await targetLabels.count();
    expect(targetCount).toBe(0);

    // "Delta" should also NOT be visible
    const deltaLabels = page.locator("text=/Delta/");
    const deltaCount = await deltaLabels.count();
    expect(deltaCount).toBe(0);

    // But "Actual" should be visible
    const actualLabels = page.locator("text=/Actual/");
    const actualCount = await actualLabels.count();
    expect(actualCount).toBeGreaterThan(0);
  });

  test("4. Edit targets form opens and shows 3 number inputs", async ({
    page,
  }) => {
    const portfolioId = "test-portfolio-form";
    const portfolio = { id: portfolioId, name: "Form Test Portfolio" };

    const holdings = [
      {
        id: "holding-f1",
        portfolioId,
        name: "Cash",
        assetType: "cash",
        holdingType: "core",
        shares: 1,
        averageCost: 1000,
        averageCostCurrency: "THB" as const,
        currentPrice: 1000,
        currentPriceCurrency: "THB" as const,
      },
    ];

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

    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Click "Edit targets" button
    const editTargetsButton = page.locator("button:has-text('Edit targets')");
    await expect(editTargetsButton).toBeVisible({ timeout: 5000 });
    await editTargetsButton.click();

    // Verify form appears with 3 number inputs
    const targetForm = page.locator("form:has(> p:has-text('Set target allocations'))");
    await expect(targetForm).toBeVisible({ timeout: 5000 });

    const numberInputs = targetForm.locator('input[type="number"]');
    const inputCount = await numberInputs.count();
    expect(inputCount).toBe(3);

    // Verify "Total: 0%" hint text is visible
    const totalHint = page.locator("text=/Total: 0%/");
    await expect(totalHint).toBeVisible({ timeout: 5000 });

    // Verify Save and Cancel buttons
    const saveButton = targetForm.locator("button:has-text('Save')");
    const cancelButton = targetForm.locator("button:has-text('Cancel')");
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await expect(cancelButton).toBeVisible({ timeout: 5000 });
  });

  test("5. Set targets and form submission succeeds", async ({
    page,
  }) => {
    const portfolioId = "test-portfolio-save";
    const portfolio = { id: portfolioId, name: "Save Targets Portfolio" };

    const holdings = [
      {
        id: "holding-s1",
        portfolioId,
        name: "Cash",
        assetType: "cash",
        holdingType: "core",
        shares: 1,
        averageCost: 500,
        averageCostCurrency: "THB" as const,
        currentPrice: 500,
        currentPriceCurrency: "THB" as const,
      },
    ];

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

    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Click "Edit targets" button
    const editTargetsButton = page.locator("button:has-text('Edit targets')");
    await editTargetsButton.click();

    // Fill in the inputs: 20, 30, 50
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill("20");
    await inputs.nth(1).fill("30");
    await inputs.nth(2).fill("50");

    // Verify total shows 100%
    const totalHint = page.locator("text=/Total: 100%/");
    await expect(totalHint).toBeVisible({ timeout: 5000 });

    // Click Save
    const targetForm = page.locator("form:has(> p:has-text('Set target allocations'))");
    const saveButton = targetForm.locator("button:has-text('Save')");
    await saveButton.click();

    // Verify the form closes after saving
    await expect(targetForm).not.toBeVisible({ timeout: 5000 });

    // Verify "Edit targets" button reappears (form closed successfully)
    await expect(editTargetsButton).toBeVisible({ timeout: 5000 });
  });

  test("6. Total hint shows error color when not 100%", async ({ page }) => {
    const portfolioId = "test-portfolio-error";
    const portfolio = { id: portfolioId, name: "Error Total Portfolio" };

    const holdings = [
      {
        id: "holding-e1",
        portfolioId,
        name: "Cash",
        assetType: "cash",
        holdingType: "core",
        shares: 1,
        averageCost: 1000,
        averageCostCurrency: "THB" as const,
        currentPrice: 1000,
        currentPriceCurrency: "THB" as const,
      },
    ];

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

    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Click "Edit targets"
    const editTargetsButton = page.locator("button:has-text('Edit targets')");
    await editTargetsButton.click();

    // Set only Bucket 1 to 50, leave others at 0 (total = 50%)
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill("50");
    await inputs.nth(1).fill("0");
    await inputs.nth(2).fill("0");

    // Look for the total hint text that contains "50%"
    const totalHintText = page.locator("text=/Total: 50%/");
    await expect(totalHintText).toBeVisible({ timeout: 5000 });

    // Verify the text appears with error styling (text-loss)
    const totalWithError = page.locator("text=/should be 100%/");
    await expect(totalWithError).toBeVisible({ timeout: 5000 });
  });

  test("7. Cancel button closes form without saving", async ({ page }) => {
    const portfolioId = "test-portfolio-cancel";
    const portfolio = { id: portfolioId, name: "Cancel Portfolio" };

    const holdings = [
      {
        id: "holding-c1",
        portfolioId,
        name: "Cash",
        assetType: "cash",
        holdingType: "core",
        shares: 1,
        averageCost: 1000,
        averageCostCurrency: "THB" as const,
        currentPrice: 1000,
        currentPriceCurrency: "THB" as const,
      },
    ];

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

    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Open edit form
    let editTargetsButton = page.locator("button:has-text('Edit targets')");
    await editTargetsButton.click();

    // Change a value
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill("99");

    // Click Cancel
    const targetForm = page.locator("form:has(> p:has-text('Set target allocations'))");
    const cancelButton = targetForm.locator("button:has-text('Cancel')");
    await cancelButton.click();

    // Verify the form is closed
    await expect(targetForm).not.toBeVisible({ timeout: 5000 });

    // Verify "Edit targets" button reappears
    editTargetsButton = page.locator("button:has-text('Edit targets')");
    await expect(editTargetsButton).toBeVisible({ timeout: 5000 });
  });

  test("8. Regression — Core/satellite row IS still shown on portfolio detail page", async ({
    page,
  }) => {
    const portfolioId = "test-portfolio-detail";
    const portfolio = { id: portfolioId, name: "Detail Page Portfolio" };

    const holdings = [
      {
        id: "holding-detail-1",
        portfolioId,
        name: "Test Stock",
        ticker: "TEST",
        assetType: "stock",
        holdingType: "core",
        shares: 100,
        averageCost: 10,
        averageCostCurrency: "THB" as const,
        currentPrice: 15,
        currentPriceCurrency: "THB" as const,
      },
      {
        id: "holding-detail-2",
        portfolioId,
        name: "Test Satellite Stock",
        ticker: "SAT",
        assetType: "stock",
        holdingType: "satellite",
        shares: 50,
        averageCost: 20,
        averageCostCurrency: "THB" as const,
        currentPrice: 25,
        currentPriceCurrency: "THB" as const,
      },
    ];

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

    // Navigate to portfolio detail page
    await page.goto(`http://localhost:3000/portfolio/${portfolioId}`);
    await page.waitForLoadState("networkidle");

    // Verify the table headers include "Type" column
    const typeHeader = page.locator("thead >> th:nth-child(3)");
    const typeHeaderText = await typeHeader.textContent();
    expect(typeHeaderText).toMatch(/Type/);

    // Verify "Core" appears in the Type column
    const coreInTable = page.locator("tbody >> td").filter({ hasText: "Core" }).first();
    await expect(coreInTable).toBeVisible({ timeout: 5000 });

    // Verify "Satellite" appears in the Type column
    const satelliteInTable = page.locator("tbody >> td").filter({ hasText: "Satellite" }).first();
    await expect(satelliteInTable).toBeVisible({ timeout: 5000 });
  });

  test("9. Regression — Add Holding dialog shows Cash and Money Market Fund options", async ({
    page,
  }) => {
    const portfolioId = "test-portfolio-dialog";
    const portfolio = { id: portfolioId, name: "Dialog Test Portfolio" };

    const holdings = [
      {
        id: "holding-temp",
        portfolioId,
        name: "Temp Holding",
        assetType: "cash",
        holdingType: "core",
        shares: 1,
        averageCost: 1000,
        averageCostCurrency: "THB" as const,
        currentPrice: 1000,
        currentPriceCurrency: "THB" as const,
      },
    ];

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

    // Navigate to portfolio detail page
    await page.goto(`http://localhost:3000/portfolio/${portfolioId}`);
    await page.waitForLoadState("networkidle");

    // Click "Add Holding" button
    const addButtons = page.locator("button:has-text('Add Holding')");
    const count = await addButtons.count();
    expect(count).toBeGreaterThan(0);

    // Click the first button
    await addButtons.first().click();

    // Wait for dialog to open
    await page.waitForFunction(
      () => document.querySelectorAll("dialog[open]").length > 0,
      { timeout: 5000 }
    );

    // Get the asset type select dropdown
    const assetTypeSelect = page
      .locator("dialog[open]")
      .locator('select[name="assetType"]');

    // Verify select exists and has options
    await expect(assetTypeSelect).toBeVisible({ timeout: 5000 });

    // Get all options and verify they exist (not checking visibility as <option> elements are always hidden)
    const options = assetTypeSelect.locator("option");
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(0);

    // Get the text content of all options to verify Cash and Money Market Fund are present
    const optionTexts = await options.allTextContents();
    expect(optionTexts).toContain("Cash");
    expect(optionTexts.some((text) => text.includes("Money Market Fund"))).toBe(true);
  });
});
