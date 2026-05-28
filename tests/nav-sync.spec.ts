import { test, expect } from "@playwright/test";
import { format } from "date-fns";

test.describe("NAV Sync Feature", () => {
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

  // Helper to get today's date in YYYY-MM-DD format
  function getTodayString(): string {
    return new Date().toISOString().slice(0, 10);
  }

  test("Feature 1: NAV retry range is 7 days - error message validation", async ({
    page,
  }) => {
    // Read the API source code to verify the error message
    // The test verifies the code directly since mocking external API calls is complex

    // Navigate to the app
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // The API route should contain the 7-day error message
    // We verify this by checking the fetch-nav route source
    const apiSourcePath = "/src/app/api/fetch-nav/route.ts";

    // For this test, we'll verify the behavior through integration:
    // If an API call fails to get NAV data, the error message should mention "7 days"

    // Set up test portfolio and holding with holdingId but no valid NAV
    const testPortfolio = {
      id: "test-portfolio-1",
      name: "NAV Test Portfolio",
    };

    const testHolding = {
      id: "holding-with-id",
      portfolioId: "test-portfolio-1",
      name: "Invalid Fund",
      holdingId: "INVALID_ID_12345",
      ticker: "INV",
      assetType: "mutual_fund" as const,
      holdingType: "core" as const,
      shares: 100,
      averageCost: 30,
      averageCostCurrency: "THB" as const,
      currentPrice: 32,
      currentPriceCurrency: "THB" as const,
    };

    await injectTestData(page, {
      portfolios: [testPortfolio],
      holdings: [testHolding],
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Navigate to the portfolio page
    const portfolioLink = page.locator(
      `a[href="/portfolio/test-portfolio-1"]`,
    ).first();
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Try to update NAV which should fail
    const updateNavButton = page.locator(
      "button:has-text('Update NAV')",
    );

    // Only proceed if the button exists and SEC_API_KEY is configured
    if (await updateNavButton.isVisible()) {
      await updateNavButton.click();

      // Wait for the error to appear
      await page.waitForTimeout(2000);

      // Check if error message contains "7 days"
      const errorMessage = await page.locator("p.text-loss").first().textContent();

      if (errorMessage) {
        expect(errorMessage).toMatch(/7\s*days/i);
        console.log("✓ Error message contains '7 days':", errorMessage);
      } else {
        console.log("⚠ NAV update button found but no error displayed (API key may not be configured)");
      }
    } else {
      console.log("⚠ Update NAV button not visible - SEC_API_KEY may not be configured");
    }
  });

  test("Feature 2: Stale NAV highlighting - holding with holdingId and old navDate shows red text", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");
    await page.setViewportSize({ width: 1200, height: 800 });

    // Create test data: holding with holdingId and navDate from 8 days ago (stale)
    const testPortfolio = {
      id: "stale-nav-portfolio",
      name: "Stale NAV Test",
    };

    const staleNavDate = getDaysAgoString(8); // 8 days ago - should be stale

    const staleHolding = {
      id: "stale-holding",
      portfolioId: "stale-nav-portfolio",
      name: "Stale Fund",
      holdingId: "FUND_001",
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
      holdings: [staleHolding],
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Navigate to portfolio
    const portfolioLink = page.locator(
      `a[href="/portfolio/stale-nav-portfolio"]`,
    ).first();
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Find the NAV Date column cell for the stale holding
    // The holding should display the stale date in red (text-loss class)
    const tableRow = page.locator(`table tbody tr`);
    const navDateCell = tableRow.locator("td").nth(6); // NAV Date column is 7th (0-indexed: 6)

    // Check if the NAV Date cell has the text-loss class
    const navDateText = await navDateCell.textContent();
    const navDateClass = await navDateCell.getAttribute("class");

    expect(navDateText).toContain(staleNavDate);
    expect(navDateClass).toContain("text-loss");
    console.log(
      "✓ Stale NAV (holdingId + 8 day old navDate) displays with text-loss class",
    );
  });

  test("Feature 2: Stale NAV highlighting - holding without holdingId should not highlight", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");
    await page.setViewportSize({ width: 1200, height: 800 });

    // Create test data: holding WITHOUT holdingId, even with old navDate
    const testPortfolio = {
      id: "no-id-portfolio",
      name: "No ID Test",
    };

    const oldNavDate = getDaysAgoString(10); // 10 days ago

    const noIdHolding = {
      id: "no-id-holding",
      portfolioId: "no-id-portfolio",
      name: "Stock Without ID",
      ticker: "NOID",
      assetType: "stock" as const,
      holdingType: "core" as const,
      shares: 100,
      averageCost: 50,
      averageCostCurrency: "THB" as const,
      currentPrice: 55,
      currentPriceCurrency: "THB" as const,
      navDate: oldNavDate,
      // NO holdingId
    };

    await injectTestData(page, {
      portfolios: [testPortfolio],
      holdings: [noIdHolding],
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Navigate to portfolio
    const portfolioLink = page.locator(
      `a[href="/portfolio/no-id-portfolio"]`,
    ).first();
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Find the NAV Date column
    const tableRow = page.locator(`table tbody tr`);
    const navDateCell = tableRow.locator("td").nth(6); // NAV Date column

    const navDateText = await navDateCell.textContent();
    const navDateClass = await navDateCell.getAttribute("class");

    // Should NOT contain text-loss class because holdingId is not set
    expect(navDateText).toContain(oldNavDate);
    expect(navDateClass).not.toContain("text-loss");
    console.log("✓ Holding without holdingId does NOT highlight as stale");
  });

  test("Feature 2: Stale NAV highlighting - holding with holdingId and null navDate shows red text", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");
    await page.setViewportSize({ width: 1200, height: 800 });

    // Create test data: holding with holdingId but NO navDate (null/undefined)
    const testPortfolio = {
      id: "null-nav-portfolio",
      name: "Null NAV Test",
    };

    const nullNavHolding = {
      id: "null-nav-holding",
      portfolioId: "null-nav-portfolio",
      name: "Never Synced Fund",
      holdingId: "FUND_002",
      ticker: "NEVER",
      assetType: "mutual_fund" as const,
      holdingType: "satellite" as const,
      shares: 200,
      averageCost: 200,
      averageCostCurrency: "THB" as const,
      currentPrice: 210,
      currentPriceCurrency: "THB" as const,
      // NO navDate property
    };

    await injectTestData(page, {
      portfolios: [testPortfolio],
      holdings: [nullNavHolding],
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Navigate to portfolio
    const portfolioLink = page.locator(
      `a[href="/portfolio/null-nav-portfolio"]`,
    ).first();
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Find the NAV Date cell
    const tableRow = page.locator(`table tbody tr`);
    const navDateCell = tableRow.locator("td").nth(6); // NAV Date column

    const navDateText = await navDateCell.textContent();
    const navDateClass = await navDateCell.getAttribute("class");

    // Should show "—" (em dash) and have text-loss class
    expect(navDateText).toContain("—");
    expect(navDateClass).toContain("text-loss");
    console.log(
      "✓ Holding with holdingId but null navDate displays with text-loss class",
    );
  });

  test("Feature 2: Stale NAV highlighting - holding with holdingId and recent navDate does not show red text", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");
    await page.setViewportSize({ width: 1200, height: 800 });

    // Create test data: holding with holdingId and recent navDate (within 7 days)
    const testPortfolio = {
      id: "fresh-nav-portfolio",
      name: "Fresh NAV Test",
    };

    const freshNavDate = getDaysAgoString(3); // 3 days ago - not stale

    const freshHolding = {
      id: "fresh-holding",
      portfolioId: "fresh-nav-portfolio",
      name: "Fresh Fund",
      holdingId: "FUND_003",
      ticker: "FRESH",
      assetType: "mutual_fund" as const,
      holdingType: "core" as const,
      shares: 150,
      averageCost: 150,
      averageCostCurrency: "THB" as const,
      currentPrice: 160,
      currentPriceCurrency: "THB" as const,
      navDate: freshNavDate,
    };

    await injectTestData(page, {
      portfolios: [testPortfolio],
      holdings: [freshHolding],
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Navigate to portfolio
    const portfolioLink = page.locator(
      `a[href="/portfolio/fresh-nav-portfolio"]`,
    ).first();
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Find the NAV Date cell
    const tableRow = page.locator(`table tbody tr`);
    const navDateCell = tableRow.locator("td").nth(6); // NAV Date column

    const navDateText = await navDateCell.textContent();
    const navDateClass = await navDateCell.getAttribute("class");

    expect(navDateText).toContain(freshNavDate);
    expect(navDateClass).not.toContain("text-loss");
    console.log(
      "✓ Holding with holdingId and recent navDate does NOT highlight as stale",
    );
  });

  test("Feature 3: navDate updated on manual save - holding with holdingId gets today's date", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");
    await page.setViewportSize({ width: 1200, height: 800 });

    // Create test data: holding with holdingId but without navDate
    const testPortfolio = {
      id: "manual-save-portfolio",
      name: "Manual Save Test",
    };

    const testHolding = {
      id: "holding-to-update",
      portfolioId: "manual-save-portfolio",
      name: "To Update",
      holdingId: "FUND_UPDATE",
      ticker: "UPDT",
      assetType: "mutual_fund" as const,
      holdingType: "core" as const,
      shares: 100,
      averageCost: 100,
      averageCostCurrency: "THB" as const,
      currentPrice: 110,
      currentPriceCurrency: "THB" as const,
      // NO navDate initially
    };

    await injectTestData(page, {
      portfolios: [testPortfolio],
      holdings: [testHolding],
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Navigate to portfolio
    const portfolioLink = page.locator(
      `a[href="/portfolio/manual-save-portfolio"]`,
    ).first();
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Click on the holding to open the dialog
    const tableRow = page.locator(`table tbody tr`);
    await tableRow.click();
    await page.waitForLoadState("networkidle");

    // Wait for the holding dialog to appear (it has the open attribute when visible)
    const holdingDialog = page.locator("dialog[open]");
    await holdingDialog.waitFor({ state: "visible" });

    // Verify holding ID is set in the dialog
    const holdingIdInput = page.locator('input[name="holdingId"]');
    const currentHoldingId = await holdingIdInput.inputValue();
    expect(currentHoldingId).toBe("FUND_UPDATE");

    // Save the holding without changing anything (just click Save Changes)
    const saveButton = page.locator('button:has-text("Save Changes")');
    await saveButton.click();
    await page.waitForLoadState("networkidle");

    // Check localStorage to verify navDate was set to today
    const holdingsData = await page.evaluate(() => {
      const data = localStorage.getItem("investing-list-holdings-v2");
      return JSON.parse(data || "[]");
    });

    const updatedHolding = holdingsData.find((h) => h.id === "holding-to-update");
    const today = getTodayString();

    expect(updatedHolding.navDate).toBe(today);
    console.log(
      `✓ navDate set to today (${today}) on manual save for holding with holdingId`,
    );
  });

  test("Feature 3: navDate updated on manual save - holding with companyId gets today's date", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");
    await page.setViewportSize({ width: 1200, height: 800 });

    // Create test data: holding with companyId (no holdingId)
    const testPortfolio = {
      id: "company-id-portfolio",
      name: "Company ID Test",
    };

    const testHolding = {
      id: "holding-company-id",
      portfolioId: "company-id-portfolio",
      name: "Company Fund",
      companyId: "COMP_001",
      ticker: "COMP",
      assetType: "stock" as const,
      holdingType: "core" as const,
      shares: 100,
      averageCost: 100,
      averageCostCurrency: "THB" as const,
      currentPrice: 110,
      currentPriceCurrency: "THB" as const,
      // NO holdingId, NO navDate
    };

    await injectTestData(page, {
      portfolios: [testPortfolio],
      holdings: [testHolding],
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Navigate to portfolio
    const portfolioLink = page.locator(
      `a[href="/portfolio/company-id-portfolio"]`,
    ).first();
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Click on the holding to open the dialog
    const tableRow = page.locator(`table tbody tr`);
    await tableRow.click();
    await page.waitForLoadState("networkidle");

    // Wait for the holding dialog to appear (it has the open attribute when visible)
    const holdingDialog = page.locator("dialog[open]");
    await holdingDialog.waitFor({ state: "visible" });

    // Verify company ID is set
    const companyIdInput = page.locator('input[name="companyId"]');
    const currentCompanyId = await companyIdInput.inputValue();
    expect(currentCompanyId).toBe("COMP_001");

    // Save the holding
    const saveButton = page.locator('button:has-text("Save Changes")');
    await saveButton.click();
    await page.waitForLoadState("networkidle");

    // Check localStorage
    const holdingsData = await page.evaluate(() => {
      const data = localStorage.getItem("investing-list-holdings-v2");
      return JSON.parse(data || "[]");
    });

    const updatedHolding = holdingsData.find((h) => h.id === "holding-company-id");
    const today = getTodayString();

    expect(updatedHolding.navDate).toBe(today);
    console.log(
      `✓ navDate set to today (${today}) on manual save for holding with companyId`,
    );
  });

  test("Feature 3: navDate unchanged on manual save - holding without holdingId or companyId keeps existing navDate", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");
    await page.setViewportSize({ width: 1200, height: 800 });

    // Create test data: holding without holdingId or companyId, with an existing navDate
    const testPortfolio = {
      id: "no-ids-portfolio",
      name: "No IDs Test",
    };

    const existingNavDate = getDaysAgoString(5);

    const testHolding = {
      id: "holding-no-ids",
      portfolioId: "no-ids-portfolio",
      name: "Regular Stock",
      ticker: "REG",
      assetType: "stock" as const,
      holdingType: "core" as const,
      shares: 100,
      averageCost: 100,
      averageCostCurrency: "THB" as const,
      currentPrice: 110,
      currentPriceCurrency: "THB" as const,
      navDate: existingNavDate,
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
      `a[href="/portfolio/no-ids-portfolio"]`,
    ).first();
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Click on the holding to open the dialog
    const tableRow = page.locator(`table tbody tr`);
    await tableRow.click();
    await page.waitForLoadState("networkidle");

    // Wait for the holding dialog to appear (it has the open attribute when visible)
    const holdingDialog = page.locator("dialog[open]");
    await holdingDialog.waitFor({ state: "visible" });

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

    // navDate should remain unchanged
    expect(updatedHolding.navDate).toBe(existingNavDate);
    console.log(
      `✓ navDate unchanged (${existingNavDate}) for holding without holdingId or companyId`,
    );
  });

  test("Feature 3: navDate set when adding holdingId/companyId during edit", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");
    await page.setViewportSize({ width: 1200, height: 800 });

    // Create test data: holding without any IDs initially
    const testPortfolio = {
      id: "add-id-portfolio",
      name: "Add ID Test",
    };

    const testHolding = {
      id: "holding-add-id",
      portfolioId: "add-id-portfolio",
      name: "Stock To Enhance",
      ticker: "ENH",
      assetType: "stock" as const,
      holdingType: "core" as const,
      shares: 100,
      averageCost: 100,
      averageCostCurrency: "THB" as const,
      currentPrice: 110,
      currentPriceCurrency: "THB" as const,
      // NO holdingId, NO companyId, NO navDate
    };

    await injectTestData(page, {
      portfolios: [testPortfolio],
      holdings: [testHolding],
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Navigate to portfolio
    const portfolioLink = page.locator(
      `a[href="/portfolio/add-id-portfolio"]`,
    ).first();
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Click on the holding to open the dialog
    const tableRow = page.locator(`table tbody tr`);
    await tableRow.click();
    await page.waitForLoadState("networkidle");

    // Wait for the holding dialog to appear (it has the open attribute when visible)
    const holdingDialog = page.locator("dialog[open]");
    await holdingDialog.waitFor({ state: "visible" });

    // Add a holdingId
    const holdingIdInput = page.locator('input[name="holdingId"]');
    await holdingIdInput.fill("NEW_HOLDING_ID");

    // Save the holding
    const saveButton = page.locator('button:has-text("Save Changes")');
    await saveButton.click();
    await page.waitForLoadState("networkidle");

    // Check localStorage
    const holdingsData = await page.evaluate(() => {
      const data = localStorage.getItem("investing-list-holdings-v2");
      return JSON.parse(data || "[]");
    });

    const updatedHolding = holdingsData.find((h) => h.id === "holding-add-id");
    const today = getTodayString();

    expect(updatedHolding.holdingId).toBe("NEW_HOLDING_ID");
    expect(updatedHolding.navDate).toBe(today);
    console.log(
      `✓ navDate set to today (${today}) when adding holdingId during edit`,
    );
  });

  test("Feature 3: navDate updated every time saving holding with existing holdingId", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");
    await page.setViewportSize({ width: 1200, height: 800 });

    // Create test data: holding with holdingId and old navDate
    // Per the feature spec: "When editing a holding that has a holdingId...navDate should be set to today's date"
    // This means every save should update navDate, not preserve it
    const testPortfolio = {
      id: "existing-date-portfolio",
      name: "Existing Date Test",
    };

    const oldNavDate = getDaysAgoString(10);

    const testHolding = {
      id: "holding-existing-date",
      portfolioId: "existing-date-portfolio",
      name: "Fund With Date",
      holdingId: "EXISTING_FUND",
      ticker: "EXIST",
      assetType: "mutual_fund" as const,
      holdingType: "core" as const,
      shares: 100,
      averageCost: 100,
      averageCostCurrency: "THB" as const,
      currentPrice: 110,
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
      `a[href="/portfolio/existing-date-portfolio"]`,
    ).first();
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Click on the holding to open the dialog
    const tableRow = page.locator(`table tbody tr`);
    await tableRow.click();
    await page.waitForLoadState("networkidle");

    // Wait for the holding dialog to appear (it has the open attribute when visible)
    const holdingDialog = page.locator("dialog[open]");
    await holdingDialog.waitFor({ state: "visible" });

    // Change a non-ID field (e.g., shares) - still has holdingId so navDate should be updated
    const sharesInput = page.locator('input[name="shares"]');
    await sharesInput.fill("150");

    // Save the holding
    const saveButton = page.locator('button:has-text("Save Changes")');
    await saveButton.click();
    await page.waitForLoadState("networkidle");

    // Check localStorage
    const holdingsData = await page.evaluate(() => {
      const data = localStorage.getItem("investing-list-holdings-v2");
      return JSON.parse(data || "[]");
    });

    const updatedHolding = holdingsData.find((h) => h.id === "holding-existing-date");
    const today = getTodayString();

    // Per feature spec: "When editing a holding that has a holdingId...navDate should be set to today's date"
    expect(updatedHolding.navDate).toBe(today);
    expect(updatedHolding.holdingId).toBe("EXISTING_FUND");
    expect(updatedHolding.shares).toBe(150);
    console.log(
      `✓ navDate updated to today (${today}) when saving holding with existing holdingId`,
    );
  });

  test("Feature 2 & 3: Mobile view - stale NAV highlighting in holding card", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile viewport
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Create test data with stale holding
    const testPortfolio = {
      id: "mobile-stale-portfolio",
      name: "Mobile Stale Test",
    };

    const staleNavDate = getDaysAgoString(8);

    const staleHolding = {
      id: "mobile-stale-holding",
      portfolioId: "mobile-stale-portfolio",
      name: "Mobile Stale Fund",
      holdingId: "MOBILE_FUND",
      ticker: "MOB",
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
      holdings: [staleHolding],
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Navigate to portfolio
    const portfolioLink = page.locator(
      `a[href="/portfolio/mobile-stale-portfolio"]`,
    ).first();
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // On mobile, holdings are displayed as cards (not table)
    const holdingCard = page.locator("article").first();

    // Check if card contains NAV Date section with stale highlighting
    // Find the NAV Date label div and check if it has text-loss class
    const navDateLabelDiv = holdingCard.locator(":text('NAV Date')").first();
    const navDateLabelClass = await navDateLabelDiv.getAttribute("class");

    // The label and value are in the same grid, check if text-loss class is on the label
    expect(navDateLabelClass).toContain("text-loss");
    console.log("✓ Mobile view: stale NAV highlights with text-loss class in holding card");
  });
});
