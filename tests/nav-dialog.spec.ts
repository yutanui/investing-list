import { test, expect } from "@playwright/test";

// Helper to inject a portfolio with an optional holding into localStorage
async function injectPortfolioWithHolding(
  page: any,
  holding?: {
    id?: string;
    name: string;
    holdingId?: string;
    currentPrice?: number;
  }
) {
  const portfolioId = "test-portfolio-nav-1";
  const portfolio = { id: portfolioId, name: "Test Portfolio" };

  const holdings = holding
    ? [
        {
          id: holding.id ?? "test-holding-1",
          portfolioId,
          name: holding.name,
          holdingId: holding.holdingId ?? "",
          companyId: "",
          ticker: "",
          assetType: "stock",
          holdingType: "core",
          shares: 100,
          averageCost: 10,
          averageCostCurrency: "THB",
          currentPrice: holding.currentPrice ?? 32,
          currentPriceCurrency: "THB",
        },
      ]
    : [];

  await page.evaluate(
    ({ portfolio, holdings }: { portfolio: any; holdings: any[] }) => {
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

  return portfolioId;
}

// Helper to open the edit dialog for a holding by clicking its table row
async function openEditDialog(page: any, holdingName: string) {
  const holdingRow = page.getByRole("row", { name: new RegExp(holdingName) });
  await holdingRow.click();
  await page.waitForFunction(
    () => document.querySelectorAll("dialog[open]").length > 0,
    { timeout: 5000 }
  );
}

test.describe("NAV Dialog - Update NAV Button", () => {
  test("1. Update NAV button visible when holdingId is set", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const portfolioId = await injectPortfolioWithHolding(page, {
      name: "Fund A",
      holdingId: "M0113_2553",
    });

    await page.goto(`http://localhost:3000/portfolio/${portfolioId}`);
    await page.waitForLoadState("networkidle");

    await openEditDialog(page, "Fund A");

    // Look for Update NAV button inside the open dialog
    const navButtons = page
      .locator("dialog[open]")
      .locator('button:has-text("Update NAV")');
    const count = await navButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test("2. Button calls /api/fetch-nav with correct body", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const portfolioId = await injectPortfolioWithHolding(page, {
      name: "Fund A",
      holdingId: "M0113_2553",
    });

    await page.goto(`http://localhost:3000/portfolio/${portfolioId}`);
    await page.waitForLoadState("networkidle");

    // Intercept the request — no real network call, deterministic body capture
    let capturedBody: { holdingId: string; navDate: string } | null = null;
    await page.route("**/api/fetch-nav", async (route) => {
      capturedBody = await route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ lastVal: 42.5, navDate: "2026-04-12" }),
      });
    });

    await openEditDialog(page, "Fund A");

    await page
      .locator("dialog[open]")
      .locator('button:has-text("Update NAV")')
      .click();

    // Wait for the price to update — confirms route was hit and handled
    await expect(
      page.locator("dialog[open]").locator('input[name="currentPrice"]')
    ).toHaveValue("42.5", { timeout: 5000 });

    // Verify the request body
    expect(capturedBody).not.toBeNull();
    expect(capturedBody!.holdingId).toBe("M0113_2553");
    expect(capturedBody!.navDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("3. Current Price input updates on success", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const portfolioId = await injectPortfolioWithHolding(page, {
      name: "Fund A",
      holdingId: "M0113_2553",
      currentPrice: 32,
    });

    await page.goto(`http://localhost:3000/portfolio/${portfolioId}`);
    await page.waitForLoadState("networkidle");

    // Mock the API to return a new price
    await page.evaluate(() => {
      const originalFetch = window.fetch;
      (window as any).fetch = async (url: string, options?: RequestInit) => {
        if (url.includes("/api/fetch-nav")) {
          return new Response(
            JSON.stringify({ lastVal: 42.5, navDate: "2026-04-12" }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return originalFetch(url, options);
      };
    });

    await openEditDialog(page, "Fund A");

    // Get current price value before
    const priceInputInDialog = page
      .locator("dialog[open]")
      .locator('input[name="currentPrice"]');
    const originalValue = await priceInputInDialog.inputValue();
    expect(originalValue).toBe("32");

    // Click Update NAV button inside the dialog
    const navButton = page
      .locator("dialog[open]")
      .locator('button:has-text("Update NAV")');
    await navButton.click();

    // Wait for the price to update
    await expect(priceInputInDialog).toHaveValue("42.5", { timeout: 10000 });
  });

  test("4. Error message appears on failure", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const portfolioId = await injectPortfolioWithHolding(page, {
      name: "Fund A",
      holdingId: "M0113_2553",
    });

    await page.goto(`http://localhost:3000/portfolio/${portfolioId}`);
    await page.waitForLoadState("networkidle");

    // Mock the API to return null (failure)
    await page.evaluate(() => {
      const originalFetch = window.fetch;
      (window as any).fetch = async (url: string, options?: RequestInit) => {
        if (url.includes("/api/fetch-nav")) {
          return new Response(
            JSON.stringify({ lastVal: null, navDate: null }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return originalFetch(url, options);
      };
    });

    await openEditDialog(page, "Fund A");

    // Click Update NAV button inside the dialog
    const navButton = page
      .locator("dialog[open]")
      .locator('button:has-text("Update NAV")');
    await navButton.click();

    // Wait for error message inside the dialog
    const errorMessage = page
      .locator("dialog[open]")
      .locator("p:has-text('Could not fetch NAV')");
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Verify styling
    const className = await errorMessage.getAttribute("class");
    expect(className).toContain("text-xs");
    expect(className).toContain("text-loss");
  });

  test("5. Button shows loading state while fetching", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const portfolioId = await injectPortfolioWithHolding(page, {
      name: "Fund A",
      holdingId: "M0113_2553",
    });

    await page.goto(`http://localhost:3000/portfolio/${portfolioId}`);
    await page.waitForLoadState("networkidle");

    // Deferred route — holds the response until we assert the loading state
    let releaseRoute!: () => void;
    const routeReady = new Promise<void>((resolve) => { releaseRoute = resolve; });

    await page.route("**/api/fetch-nav", async (route) => {
      await routeReady;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ lastVal: 42.5, navDate: "2026-04-12" }),
      });
    });

    await openEditDialog(page, "Fund A");

    await page
      .locator("dialog[open]")
      .locator('button:has-text("Update NAV")')
      .click();

    // Assert loading state before releasing the route (deterministic — no timing dependency)
    const loadingBtn = page
      .locator("dialog[open]")
      .locator("button")
      .filter({ hasText: /Fetching/ });
    await expect(loadingBtn).toBeVisible({ timeout: 2000 });
    await expect(loadingBtn).toBeDisabled();

    // Release the route — response now completes
    releaseRoute();

    // Button returns to normal state
    const doneBtn = page
      .locator("dialog[open]")
      .locator('button:has-text("Update NAV")');
    await expect(doneBtn).toBeVisible({ timeout: 5000 });
  });

  test("6. Update NAV button absent when no holdingId", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const portfolioId = await injectPortfolioWithHolding(page, {
      name: "Stock B",
      // no holdingId
    });

    await page.goto(`http://localhost:3000/portfolio/${portfolioId}`);
    await page.waitForLoadState("networkidle");

    await openEditDialog(page, "Stock B");

    // Verify Update NAV button is NOT present in the dialog
    const navButtons = page
      .locator("dialog[open]")
      .locator('button:has-text("Update NAV")');
    const count = await navButtons.count();
    expect(count).toBe(0);
  });

  test("7. Dialog displays title 'Edit Holding' when editing existing", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const portfolioId = await injectPortfolioWithHolding(page, {
      name: "Fund A",
    });

    await page.goto(`http://localhost:3000/portfolio/${portfolioId}`);
    await page.waitForLoadState("networkidle");

    await openEditDialog(page, "Fund A");

    // Check for Edit Holding title
    const title = page
      .locator("dialog[open]")
      .locator('h2:has-text("Edit Holding")');
    await expect(title).toBeVisible({ timeout: 5000 });
  });

  test("8. Delete button visible when editing", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const portfolioId = await injectPortfolioWithHolding(page, {
      name: "Fund A",
    });

    await page.goto(`http://localhost:3000/portfolio/${portfolioId}`);
    await page.waitForLoadState("networkidle");

    await openEditDialog(page, "Fund A");

    // Look for Delete button in dialog
    const deleteButton = page
      .locator("dialog[open]")
      .locator('button:has-text("Delete")');
    await expect(deleteButton).toBeVisible({ timeout: 5000 });
  });

  test("9. Holding ID field is populated correctly when editing", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const portfolioId = await injectPortfolioWithHolding(page, {
      name: "Fund A",
      holdingId: "M0113_2553",
    });

    await page.goto(`http://localhost:3000/portfolio/${portfolioId}`);
    await page.waitForLoadState("networkidle");

    await openEditDialog(page, "Fund A");

    // Verify holding ID field inside the dialog
    const holdingIdField = page
      .locator("dialog[open]")
      .locator('input[name="holdingId"]');
    await expect(holdingIdField).toHaveValue("M0113_2553", { timeout: 5000 });
  });
});
