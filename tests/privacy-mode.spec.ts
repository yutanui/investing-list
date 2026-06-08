import { test, expect } from "@playwright/test";

test.describe("Privacy Mode", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto("http://localhost:3000");
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
    await page.waitForLoadState("networkidle");
  });

  test("1. Toggle button exists with data-testid", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const privacyToggle = page.locator('[data-testid="privacy-toggle"]');
    await expect(privacyToggle).toBeVisible();
  });

  test("2. Initial state has aria-pressed set to false", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const privacyToggle = page.locator('[data-testid="privacy-toggle"]');
    const ariaPressed = await privacyToggle.getAttribute("aria-pressed");
    expect(ariaPressed).toBe("false");
  });

  test("3. Toggle button sets aria-pressed to true when clicked", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const privacyToggle = page.locator('[data-testid="privacy-toggle"]');

    // Initial state should be false
    let ariaPressed = await privacyToggle.getAttribute("aria-pressed");
    expect(ariaPressed).toBe("false");

    // Click to toggle on
    await privacyToggle.click();

    // State should now be true
    ariaPressed = await privacyToggle.getAttribute("aria-pressed");
    expect(ariaPressed).toBe("true");
  });

  test("4. Toggle button sets aria-pressed to false when clicked again", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const privacyToggle = page.locator('[data-testid="privacy-toggle"]');

    // Click to toggle on
    await privacyToggle.click();
    let ariaPressed = await privacyToggle.getAttribute("aria-pressed");
    expect(ariaPressed).toBe("true");

    // Click to toggle off
    await privacyToggle.click();
    ariaPressed = await privacyToggle.getAttribute("aria-pressed");
    expect(ariaPressed).toBe("false");
  });

  test("5. Home page shows masked THB amounts when privacy mode is ON", async ({ page }) => {
    // Inject test data with portfolio and holdings
    await page.evaluate(() => {
      const portfolio = {
        id: "test-portfolio-1",
        name: "Test Portfolio",
      };

      const holdings = [
        {
          id: "h1",
          portfolioId: "test-portfolio-1",
          name: "Test Stock",
          ticker: "TEST",
          assetType: "stock",
          holdingType: "core",
          shares: 100,
          averageCost: 1000,
          averageCostCurrency: "THB",
          currentPrice: 1200,
          currentPriceCurrency: "THB",
        },
      ];

      localStorage.setItem(
        "investing-list-portfolios-v1",
        JSON.stringify([portfolio])
      );
      localStorage.setItem(
        "investing-list-holdings-v2",
        JSON.stringify(holdings)
      );
    });

    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Toggle privacy mode ON
    const privacyToggle = page.locator('[data-testid="privacy-toggle"]');
    await privacyToggle.click();

    // Verify masked values appear
    const pageContent = await page.content();
    expect(pageContent).toContain("••••••");
  });

  test("6. Home page does NOT show masked values when privacy mode is OFF", async ({ page }) => {
    // Inject test data with portfolio and holdings
    await page.evaluate(() => {
      const portfolio = {
        id: "test-portfolio-1",
        name: "Test Portfolio",
      };

      const holdings = [
        {
          id: "h1",
          portfolioId: "test-portfolio-1",
          name: "Test Stock",
          ticker: "TEST",
          assetType: "stock",
          holdingType: "core",
          shares: 100,
          averageCost: 1000,
          averageCostCurrency: "THB",
          currentPrice: 1200,
          currentPriceCurrency: "THB",
        },
      ];

      localStorage.setItem(
        "investing-list-portfolios-v1",
        JSON.stringify([portfolio])
      );
      localStorage.setItem(
        "investing-list-holdings-v2",
        JSON.stringify(holdings)
      );
    });

    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Privacy mode should be OFF by default
    const privacyToggle = page.locator('[data-testid="privacy-toggle"]');
    const ariaPressed = await privacyToggle.getAttribute("aria-pressed");
    expect(ariaPressed).toBe("false");

    // Verify NO masked values appear
    const pageContent = await page.content();
    // Should contain formatted THB currency, not the mask
    // Check that bullet mask doesn't appear
    expect(pageContent).not.toContain("••••••");
  });

  test("7. Session reset: reloading page resets privacy mode to OFF", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const privacyToggle = page.locator('[data-testid="privacy-toggle"]');

    // Toggle privacy mode ON
    await privacyToggle.click();
    let ariaPressed = await privacyToggle.getAttribute("aria-pressed");
    expect(ariaPressed).toBe("true");

    // Reload the page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Privacy mode should be reset to OFF
    ariaPressed = await privacyToggle.getAttribute("aria-pressed");
    expect(ariaPressed).toBe("false");
  });

  test("8. Privacy button has correct visual styling when ON (blue background)", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const privacyToggle = page.locator('[data-testid="privacy-toggle"]');

    // Check initial styling (OFF state)
    let className = await privacyToggle.getAttribute("class");
    expect(className).toContain("border-foreground/20");

    // Click to toggle ON
    await privacyToggle.click();

    // Check styling (ON state)
    className = await privacyToggle.getAttribute("class");
    expect(className).toContain("bg-blue-100");
    expect(className).toContain("text-blue-700");
  });

  test("9. Privacy button has correct visual styling when OFF (neutral style)", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const privacyToggle = page.locator('[data-testid="privacy-toggle"]');

    // Verify initial OFF state styling
    const className = await privacyToggle.getAttribute("class");
    expect(className).toContain("border");
    expect(className).toContain("border-foreground/20");
  });

  test("10. Eye-off icon visible when privacy mode is ON", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const privacyToggle = page.locator('[data-testid="privacy-toggle"]');

    // Click to toggle ON
    await privacyToggle.click();

    // Check that eye-off SVG is present (contains the strikethrough line)
    const svg = privacyToggle.locator("svg");
    const svgHtml = await svg.innerHTML();
    // Eye-off has a diagonal strikethrough line with path containing specific coordinates
    expect(svgHtml).toContain("M3.98");
  });

  test("11. Eye icon visible when privacy mode is OFF", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const privacyToggle = page.locator('[data-testid="privacy-toggle"]');

    // Privacy mode should be OFF by default
    const svg = privacyToggle.locator("svg");
    const svgHtml = await svg.innerHTML();
    // Eye icon has specific path
    expect(svgHtml).toContain("M2.036");
  });

  test("12. Privacy mode affects portfolio page holdings values", async ({ page }) => {
    // Inject test data with portfolio and holdings
    await page.evaluate(() => {
      const portfolio = {
        id: "test-portfolio-1",
        name: "Test Portfolio",
      };

      const holdings = [
        {
          id: "h1",
          portfolioId: "test-portfolio-1",
          name: "Test Stock",
          ticker: "TEST",
          assetType: "stock",
          holdingType: "core",
          shares: 100,
          averageCost: 1000,
          averageCostCurrency: "THB",
          currentPrice: 1200,
          currentPriceCurrency: "THB",
        },
      ];

      localStorage.setItem(
        "investing-list-portfolios-v1",
        JSON.stringify([portfolio])
      );
      localStorage.setItem(
        "investing-list-holdings-v2",
        JSON.stringify(holdings)
      );
    });

    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Navigate to portfolio page
    const portfolioLink = page.locator('a[href*="/portfolio/"]').first();
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Toggle privacy mode ON
    const privacyToggle = page.locator('[data-testid="privacy-toggle"]');
    await privacyToggle.click();

    // Check that masked values appear on portfolio page
    const pageContent = await page.content();
    expect(pageContent).toContain("••••••");
  });

  test("13. Privacy mode toggle maintains state across navigation", async ({ page }) => {
    // Inject test data
    await page.evaluate(() => {
      const portfolio = {
        id: "test-portfolio-1",
        name: "Test Portfolio",
      };

      const holdings = [
        {
          id: "h1",
          portfolioId: "test-portfolio-1",
          name: "Test Stock",
          ticker: "TEST",
          assetType: "stock",
          holdingType: "core",
          shares: 100,
          averageCost: 1000,
          averageCostCurrency: "THB",
          currentPrice: 1200,
          currentPriceCurrency: "THB",
        },
      ];

      localStorage.setItem(
        "investing-list-portfolios-v1",
        JSON.stringify([portfolio])
      );
      localStorage.setItem(
        "investing-list-holdings-v2",
        JSON.stringify(holdings)
      );
    });

    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Toggle privacy mode ON on home page
    const privacyToggle = page.locator('[data-testid="privacy-toggle"]');
    await privacyToggle.click();
    let ariaPressed = await privacyToggle.getAttribute("aria-pressed");
    expect(ariaPressed).toBe("true");

    // Navigate to portfolio page
    const portfolioLink = page.locator('a[href*="/portfolio/"]').first();
    await portfolioLink.click();
    await page.waitForLoadState("networkidle");

    // Privacy mode should still be ON
    ariaPressed = await privacyToggle.getAttribute("aria-pressed");
    expect(ariaPressed).toBe("true");

    // Navigate back to home
    const homeLink = page.locator('a[href="/"]').first();
    await homeLink.click();
    await page.waitForLoadState("networkidle");

    // Privacy mode should still be ON
    ariaPressed = await privacyToggle.getAttribute("aria-pressed");
    expect(ariaPressed).toBe("true");
  });

  test("14. Accessibility: privacy toggle has aria-label", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const privacyToggle = page.locator('[data-testid="privacy-toggle"]');

    // Check initial aria-label (privacy mode OFF)
    let ariaLabel = await privacyToggle.getAttribute("aria-label");
    expect(ariaLabel).toBe("Enable privacy mode");

    // Toggle ON
    await privacyToggle.click();

    // Check aria-label (privacy mode ON)
    ariaLabel = await privacyToggle.getAttribute("aria-label");
    expect(ariaLabel).toBe("Disable privacy mode");
  });
});
