import { test, expect } from "@playwright/test";

test.describe("Sync NAV Button on Home Page", () => {
  // Helper to inject test data into localStorage
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

  test("Test 1: Sync NAV button is visible when portfolios exist", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Set up test data: one portfolio with a mutual_fund holding that has holdingId
    const testPortfolio = {
      id: "p1",
      name: "Test Portfolio",
    };

    const testHolding = {
      id: "h1",
      portfolioId: "p1",
      name: "Test Fund",
      assetType: "mutual_fund",
      holdingType: "core",
      shares: 100,
      averageCost: 10,
      averageCostCurrency: "THB",
      currentPrice: 10,
      currentPriceCurrency: "THB",
      holdingId: "ABCD-A",
    };

    await injectTestData(page, {
      portfolios: [testPortfolio],
      holdings: [testHolding],
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Button should be visible with "Sync NAV" text
    const syncButton = page.locator('button:has-text("Sync NAV")').first();
    await expect(syncButton).toBeVisible();
    console.log("✓ Test 1 PASS: Sync NAV button is visible when portfolios exist");
  });

  test("Test 2: Sync NAV button is NOT shown when no portfolios exist", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Set up empty data
    await injectTestData(page, {
      portfolios: [],
      holdings: [],
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Empty state message should be visible
    const emptyState = page.locator("text=No Portfolios Yet");
    await expect(emptyState).toBeVisible();

    // Sync button should not be visible
    const syncButton = page.locator('button:has-text("Sync NAV")');
    await expect(syncButton).not.toBeVisible();
    console.log("✓ Test 2 PASS: Sync NAV button is NOT shown when no portfolios exist");
  });

  test("Test 3: Button transitions to loading state when clicked", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const testPortfolio = {
      id: "p1",
      name: "Test Portfolio",
    };

    const testHolding = {
      id: "h1",
      portfolioId: "p1",
      name: "Test Fund",
      assetType: "mutual_fund",
      holdingType: "core",
      shares: 100,
      averageCost: 10,
      averageCostCurrency: "THB",
      currentPrice: 10,
      currentPriceCurrency: "THB",
      holdingId: "ABCD-A",
    };

    await injectTestData(page, {
      portfolios: [testPortfolio],
      holdings: [testHolding],
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Mock the API route to prevent actual network calls
    await page.route("/api/fetch-nav", async (route) => {
      // Delay to ensure we can see the loading state
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.abort();
    });

    const syncButton = page.locator('button:has-text("Sync NAV")').first();

    // Click the button
    await syncButton.click();

    // Wait a moment for the loading state to take effect
    await page.waitForTimeout(100);

    // Button should now show "Syncing..." and be disabled
    const syncingButton = page.locator('button:has-text("Syncing...")').first();
    await expect(syncingButton).toBeVisible();
    await expect(syncingButton).toBeDisabled();
    console.log("✓ Test 3 PASS: Button transitions to loading state when clicked");
  });

  test("Test 4: Button shows success state after successful sync", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const testPortfolio = {
      id: "p1",
      name: "Test Portfolio",
    };

    const testHolding = {
      id: "h1",
      portfolioId: "p1",
      name: "Test Fund",
      assetType: "mutual_fund",
      holdingType: "core",
      shares: 100,
      averageCost: 10,
      averageCostCurrency: "THB",
      currentPrice: 10,
      currentPriceCurrency: "THB",
      holdingId: "ABCD-A",
    };

    await injectTestData(page, {
      portfolios: [testPortfolio],
      holdings: [testHolding],
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Mock the API route to return success
    await page.route("/api/fetch-nav", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ lastVal: 10.5, navDate: "2026-05-29" }),
      });
    });

    const syncButton = page.locator('button:has-text("Sync NAV")').first();
    await syncButton.click();

    // Wait for "Synced" text to appear
    const syncedButton = page.locator('button:has-text("Synced")').first();
    await expect(syncedButton).toBeVisible();

    // Verify the button has text-gain class (success color)
    const buttonClass = await syncedButton.getAttribute("class");
    expect(buttonClass).toContain("text-gain");

    console.log("✓ Test 4 PASS: Button shows success state after successful sync");
  });

  test("Test 5: Button shows success state even when one API call returns 500", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const testPortfolio = {
      id: "p1",
      name: "Test Portfolio",
    };

    // Two holdings: one will fail, one will succeed
    const holdings = [
      {
        id: "h1",
        portfolioId: "p1",
        name: "Fund 1",
        assetType: "mutual_fund",
        holdingType: "core",
        shares: 100,
        averageCost: 10,
        averageCostCurrency: "THB",
        currentPrice: 10,
        currentPriceCurrency: "THB",
        holdingId: "FUND-1",
      },
      {
        id: "h2",
        portfolioId: "p1",
        name: "Fund 2",
        assetType: "mutual_fund",
        holdingType: "core",
        shares: 100,
        averageCost: 20,
        averageCostCurrency: "THB",
        currentPrice: 20,
        currentPriceCurrency: "THB",
        holdingId: "FUND-2",
      },
    ];

    await injectTestData(page, {
      portfolios: [testPortfolio],
      holdings,
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Mock the API route with mixed success/failure
    await page.route("/api/fetch-nav", async (route) => {
      const postData = route.request().postData();
      const bodyObj = postData ? JSON.parse(postData) : {};

      if (bodyObj.holdingId === "FUND-1") {
        // First one succeeds
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ lastVal: 10.5, navDate: "2026-05-29" }),
        });
      } else {
        // Second one fails with 500
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal Server Error" }),
        });
      }
    });

    const syncButton = page.locator('button:has-text("Sync NAV")').first();
    await syncButton.click();

    // Per the requirements, partial failures still result in success state
    const syncedButton = page.locator('button:has-text("Synced")').first();
    await expect(syncedButton).toBeVisible();

    console.log(
      "✓ Test 5 PASS: Button shows success state even when one API call returns 500",
    );
  });

  test("Test 6: Only mutual_fund holdings with holdingId are synced", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const testPortfolio = {
      id: "p1",
      name: "Test Portfolio",
    };

    // Mix of holdings: only one should be synced
    const holdings = [
      {
        id: "h1",
        portfolioId: "p1",
        name: "Mutual Fund with ID",
        assetType: "mutual_fund",
        holdingType: "core",
        shares: 100,
        averageCost: 10,
        averageCostCurrency: "THB",
        currentPrice: 10,
        currentPriceCurrency: "THB",
        holdingId: "ELIGIBLE-1",
      },
      {
        id: "h2",
        portfolioId: "p1",
        name: "Stock without ID",
        assetType: "stock",
        holdingType: "core",
        shares: 50,
        averageCost: 100,
        averageCostCurrency: "THB",
        currentPrice: 100,
        currentPriceCurrency: "THB",
        // No holdingId
      },
      {
        id: "h3",
        portfolioId: "p1",
        name: "Mutual Fund without ID",
        assetType: "mutual_fund",
        holdingType: "satellite",
        shares: 200,
        averageCost: 20,
        averageCostCurrency: "THB",
        currentPrice: 20,
        currentPriceCurrency: "THB",
        // No holdingId
      },
    ];

    await injectTestData(page, {
      portfolios: [testPortfolio],
      holdings,
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    let syncApiCallCount = 0;

    // Mock the API route and count calls
    await page.route("/api/fetch-nav", async (route) => {
      syncApiCallCount++;
      const postData = route.request().postData();
      const bodyObj = postData ? JSON.parse(postData) : {};

      // Only eligible holding should have matching holdingId
      if (bodyObj.holdingId === "ELIGIBLE-1") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ lastVal: 10.5, navDate: "2026-05-29" }),
        });
      } else {
        await route.abort();
      }
    });

    const syncButton = page.locator('button:has-text("Sync NAV")').first();
    await syncButton.click();

    // Wait for sync to complete
    const syncedButton = page.locator('button:has-text("Synced")').first();
    await expect(syncedButton).toBeVisible();

    // Should have only 1 API call (for the eligible holding)
    expect(syncApiCallCount).toBe(1);
    console.log(
      "✓ Test 6 PASS: Only mutual_fund holdings with holdingId are synced",
    );
  });

  test("Test 7: Holdings are updated in localStorage after successful sync", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const testPortfolio = {
      id: "p1",
      name: "Test Portfolio",
    };

    const testHolding = {
      id: "h1",
      portfolioId: "p1",
      name: "Test Fund",
      assetType: "mutual_fund",
      holdingType: "core",
      shares: 100,
      averageCost: 10,
      averageCostCurrency: "THB",
      currentPrice: 10,
      currentPriceCurrency: "THB",
      holdingId: "ABCD-A",
    };

    await injectTestData(page, {
      portfolios: [testPortfolio],
      holdings: [testHolding],
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Mock the API route with a new price
    await page.route("/api/fetch-nav", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ lastVal: 15.5, navDate: "2026-05-29" }),
      });
    });

    const syncButton = page.locator('button:has-text("Sync NAV")').first();
    await syncButton.click();

    // Wait for sync to complete
    const syncedButton = page.locator('button:has-text("Synced")').first();
    await expect(syncedButton).toBeVisible();

    // Check localStorage to verify the holding was updated
    const holdingsData = await page.evaluate(() => {
      const data = localStorage.getItem("investing-list-holdings-v2");
      return JSON.parse(data || "[]");
    });

    const updatedHolding = holdingsData.find((h) => h.id === "h1");
    expect(updatedHolding.currentPrice).toBe(15.5);
    expect(updatedHolding.currentPriceCurrency).toBe("THB");
    expect(updatedHolding.navDate).toBe("2026-05-29");

    console.log(
      "✓ Test 7 PASS: Holdings are updated in localStorage after successful sync",
    );
  });

  test("Test 8: Sync with no eligible holdings completes successfully without API calls", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const testPortfolio = {
      id: "p1",
      name: "Test Portfolio",
    };

    // Holdings without holdingId or non-mutual_fund
    const holdings = [
      {
        id: "h1",
        portfolioId: "p1",
        name: "Stock",
        assetType: "stock",
        holdingType: "core",
        shares: 100,
        averageCost: 10,
        averageCostCurrency: "THB",
        currentPrice: 10,
        currentPriceCurrency: "THB",
      },
    ];

    await injectTestData(page, {
      portfolios: [testPortfolio],
      holdings,
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    let apiCalled = false;

    // Track if API is called (should not be)
    await page.route("/api/fetch-nav", async (route) => {
      apiCalled = true;
      await route.abort();
    });

    const syncButton = page.locator('button:has-text("Sync NAV")').first();
    await syncButton.click();

    // Button should transition directly back to idle, no "Synced" state shown
    // Wait a bit to ensure no API is called
    await page.waitForTimeout(200);

    // API should not have been called
    expect(apiCalled).toBe(false);

    console.log(
      "✓ Test 8 PASS: Sync with no eligible holdings completes without API calls",
    );
  });

  test("Test 9: Button reverts to idle state after success (after 2 seconds)", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const testPortfolio = {
      id: "p1",
      name: "Test Portfolio",
    };

    const testHolding = {
      id: "h1",
      portfolioId: "p1",
      name: "Test Fund",
      assetType: "mutual_fund",
      holdingType: "core",
      shares: 100,
      averageCost: 10,
      averageCostCurrency: "THB",
      currentPrice: 10,
      currentPriceCurrency: "THB",
      holdingId: "ABCD-A",
    };

    await injectTestData(page, {
      portfolios: [testPortfolio],
      holdings: [testHolding],
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Mock the API route
    await page.route("/api/fetch-nav", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ lastVal: 10.5, navDate: "2026-05-29" }),
      });
    });

    const syncButton = page.locator('button:has-text("Sync NAV")').first();
    await syncButton.click();

    // Wait for "Synced" state
    const syncedButton = page.locator('button:has-text("Synced")').first();
    await expect(syncedButton).toBeVisible();

    // Wait for the timeout (2 seconds + buffer)
    await page.waitForTimeout(2500);

    // Button should revert to "Sync NAV"
    const idleButton = page.locator('button:has-text("Sync NAV")').first();
    await expect(idleButton).toBeVisible();

    console.log(
      "✓ Test 9 PASS: Button reverts to idle state after success (after 2 seconds)",
    );
  });

  test("Test 10: Button is disabled while loading prevents user interaction", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const testPortfolio = {
      id: "p1",
      name: "Test Portfolio",
    };

    const testHolding = {
      id: "h1",
      portfolioId: "p1",
      name: "Test Fund",
      assetType: "mutual_fund",
      holdingType: "core",
      shares: 100,
      averageCost: 10,
      averageCostCurrency: "THB",
      currentPrice: 10,
      currentPriceCurrency: "THB",
      holdingId: "ABCD-A",
    };

    await injectTestData(page, {
      portfolios: [testPortfolio],
      holdings: [testHolding],
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Mock the API route with delay
    await page.route("/api/fetch-nav", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ lastVal: 10.5, navDate: "2026-05-29" }),
      });
    });

    const syncButton = page.locator('button:has-text("Sync NAV")').first();

    // Click button
    await syncButton.click();

    // Wait a moment for loading state
    await page.waitForTimeout(50);

    // Get the loading button
    const loadingButton = page.locator('button:has-text("Syncing...")').first();

    // Verify it's disabled
    const isDisabled = await loadingButton.isDisabled();
    expect(isDisabled).toBe(true);

    console.log(
      "✓ Test 10 PASS: Button is disabled while loading prevents user interaction",
    );
  });

  test("Test 11: Multiple holdings synced concurrently", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const testPortfolio = {
      id: "p1",
      name: "Test Portfolio",
    };

    // Three mutual fund holdings with holdingId
    const holdings = [
      {
        id: "h1",
        portfolioId: "p1",
        name: "Fund 1",
        assetType: "mutual_fund",
        holdingType: "core",
        shares: 100,
        averageCost: 10,
        averageCostCurrency: "THB",
        currentPrice: 10,
        currentPriceCurrency: "THB",
        holdingId: "FUND-1",
      },
      {
        id: "h2",
        portfolioId: "p1",
        name: "Fund 2",
        assetType: "mutual_fund",
        holdingType: "core",
        shares: 100,
        averageCost: 20,
        averageCostCurrency: "THB",
        currentPrice: 20,
        currentPriceCurrency: "THB",
        holdingId: "FUND-2",
      },
      {
        id: "h3",
        portfolioId: "p1",
        name: "Fund 3",
        assetType: "mutual_fund",
        holdingType: "core",
        shares: 100,
        averageCost: 30,
        averageCostCurrency: "THB",
        currentPrice: 30,
        currentPriceCurrency: "THB",
        holdingId: "FUND-3",
      },
    ];

    await injectTestData(page, {
      portfolios: [testPortfolio],
      holdings,
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    const apiCalls: string[] = [];

    // Mock the API route and track calls
    await page.route("/api/fetch-nav", async (route) => {
      const postData = route.request().postData();
      const bodyObj = postData ? JSON.parse(postData) : {};
      apiCalls.push(bodyObj.holdingId);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ lastVal: 25, navDate: "2026-05-29" }),
      });
    });

    const syncButton = page.locator('button:has-text("Sync NAV")').first();
    await syncButton.click();

    // Wait for sync to complete
    const syncedButton = page.locator('button:has-text("Synced")').first();
    await expect(syncedButton).toBeVisible();

    // All three holdings should have been synced
    expect(apiCalls.length).toBe(3);
    expect(apiCalls).toContain("FUND-1");
    expect(apiCalls).toContain("FUND-2");
    expect(apiCalls).toContain("FUND-3");

    // Verify all holdings were updated
    const holdingsData = await page.evaluate(() => {
      const data = localStorage.getItem("investing-list-holdings-v2");
      return JSON.parse(data || "[]");
    });

    holdingsData.forEach((h) => {
      if (["h1", "h2", "h3"].includes(h.id)) {
        expect(h.currentPrice).toBe(25);
        expect(h.navDate).toBe("2026-05-29");
      }
    });

    console.log("✓ Test 11 PASS: Multiple holdings synced concurrently");
  });

  test("Test 12: Sync with empty holdingId (whitespace only) is skipped", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const testPortfolio = {
      id: "p1",
      name: "Test Portfolio",
    };

    // One eligible, one with empty holdingId
    const holdings = [
      {
        id: "h1",
        portfolioId: "p1",
        name: "Fund 1",
        assetType: "mutual_fund",
        holdingType: "core",
        shares: 100,
        averageCost: 10,
        averageCostCurrency: "THB",
        currentPrice: 10,
        currentPriceCurrency: "THB",
        holdingId: "FUND-1",
      },
      {
        id: "h2",
        portfolioId: "p1",
        name: "Fund 2",
        assetType: "mutual_fund",
        holdingType: "core",
        shares: 100,
        averageCost: 20,
        averageCostCurrency: "THB",
        currentPrice: 20,
        currentPriceCurrency: "THB",
        holdingId: "   ", // whitespace only
      },
    ];

    await injectTestData(page, {
      portfolios: [testPortfolio],
      holdings,
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    let syncApiCallCount = 0;

    // Mock the API route and count calls
    await page.route("/api/fetch-nav", async (route) => {
      syncApiCallCount++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ lastVal: 25, navDate: "2026-05-29" }),
      });
    });

    const syncButton = page.locator('button:has-text("Sync NAV")').first();
    await syncButton.click();

    // Wait for sync to complete
    const syncedButton = page.locator('button:has-text("Synced")').first();
    await expect(syncedButton).toBeVisible();

    // Should only have 1 API call (whitespace-only holding skipped)
    expect(syncApiCallCount).toBe(1);
    console.log(
      "✓ Test 12 PASS: Sync with empty holdingId (whitespace only) is skipped",
    );
  });
});
