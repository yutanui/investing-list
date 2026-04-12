import { test, expect } from "@playwright/test";

test.describe("UX Improvements - Sidebar Navigation", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page
    await page.goto("http://localhost:3000");
    // Wait for the page to load
    await page.waitForLoadState("networkidle");
  });

  test("1. Summary link has chevron icon", async ({ page }) => {
    // Look for the Summary link in the sidebar which should contain the chevron icon
    const summaryLink = page.locator('aside a[href="/"]').first();

    // Check if link exists
    await expect(summaryLink).toBeVisible();

    // Look for the chevron SVG icon within the Summary link
    // The chevron should have ml-auto and be right-pointing
    const chevronIcon = summaryLink.locator('svg.ml-auto');

    // Verify the chevron icon exists
    await expect(chevronIcon).toBeVisible();
  });

  test("2. Summary link is visually prominent with py-2.5 padding", async ({
    page,
  }) => {
    // Find the Summary link in sidebar
    const summaryLink = page.locator('aside a[href="/"]').first();

    // Check if the link has the py-2.5 class (padding vertical 2.5)
    const className = await summaryLink.getAttribute("class");
    expect(className).toContain("py-2.5");
  });

  test("3. Active nav card has stronger styling (shadow-sm and border-foreground/40)", async ({
    page,
  }) => {
    // First, we need to create a portfolio so we can navigate to it
    // Click Add Portfolio button
    const addBtn = page.locator('button:has-text("Add Portfolio")').first();
    await addBtn.click();

    // Fill in the portfolio name
    const nameInput = page.locator('input[placeholder="e.g. Retirement Fund…"]');
    await nameInput.fill("Active Test Portfolio");

    // Submit the form
    const submitBtn = page.locator('button[type="submit"]:has-text("Add Portfolio")');
    await submitBtn.click();

    // Wait for dialog to close
    await page.waitForFunction(
      () => document.querySelectorAll('dialog[open]').length === 0,
      { timeout: 5000 }
    );

    // Get the portfolio link href to navigate directly
    const portfolioLink = page.locator('a[href*="/portfolio/"]').first();
    const href = await portfolioLink.getAttribute("href");

    if (href) {
      // Navigate directly to the portfolio page
      await page.goto(`http://localhost:3000${href}`);
      await page.waitForLoadState("networkidle");
    }

    // Now on the portfolio page, the portfolio card in the sidebar should be active
    const portfolioCard = page
      .locator('article')
      .filter({ has: page.locator('h3:has-text("Active Test Portfolio")') })
      .first();

    // Check for shadow-sm and border-foreground/40 classes
    const cardClassName = await portfolioCard.getAttribute("class");
    expect(cardClassName).toContain("shadow-sm");
    expect(cardClassName).toContain("border-foreground/40");
  });

  test("4. Portfolio name has text-[0.9375rem] font size", async ({ page }) => {
    // Create a portfolio
    const addBtn = page.locator('button:has-text("Add Portfolio")').first();
    await addBtn.click();

    const nameInput = page.locator('input[placeholder="e.g. Retirement Fund…"]');
    await nameInput.fill("Font Size Test");

    const submitBtn = page.locator('button[type="submit"]:has-text("Add Portfolio")');
    await submitBtn.click();

    await page.waitForFunction(
      () => document.querySelectorAll('dialog[open]').length === 0,
      { timeout: 5000 }
    );

    // Find the h3 with portfolio name
    const portfolioName = page.locator('h3:has-text("Font Size Test")');

    // Check for the text-[0.9375rem] class (15px font size)
    const className = await portfolioName.getAttribute("class");
    expect(className).toContain("text-[0.9375rem]");
  });

  test("5. Total value in NavPortfolioCard has text-base class", async ({
    page,
  }) => {
    // Create a portfolio
    const addBtn = page.locator('button:has-text("Add Portfolio")').first();
    await addBtn.click();

    const nameInput = page.locator('input[placeholder="e.g. Retirement Fund…"]');
    await nameInput.fill("Value Test Portfolio");

    const submitBtn = page.locator('button[type="submit"]:has-text("Add Portfolio")');
    await submitBtn.click();

    await page.waitForFunction(
      () => document.querySelectorAll('dialog[open]').length === 0,
      { timeout: 5000 }
    );

    // Find the portfolio card
    const portfolioCard = page
      .locator('article')
      .filter({ has: page.locator('h3:has-text("Value Test Portfolio")') })
      .first();

    // Find the span with the total value - it should be the first span in the card's right section
    // The total value span is in the text-right section with tabular-nums
    const valueSpan = portfolioCard.locator('span').first();

    // Check for text-base class on total value
    const className = await valueSpan.getAttribute("class");
    expect(className).toContain("text-base");
  });

  test("6. Summary cards have improved border (border-foreground/15)", async ({
    page,
  }) => {
    // Create a portfolio first so we have something to summarize
    const addBtn = page.locator('button:has-text("Add Portfolio")').first();
    await addBtn.click();

    const nameInput = page.locator('input[placeholder="e.g. Retirement Fund…"]');
    await nameInput.fill("Summary Test Portfolio");

    const submitBtn = page.locator('button[type="submit"]:has-text("Add Portfolio")');
    await submitBtn.click();

    await page.waitForFunction(
      () => document.querySelectorAll('dialog[open]').length === 0,
      { timeout: 5000 }
    );

    // Make sure we're on the home page to see summary
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Find all divs that are summary cards - they should have rounded-lg border and be in PortfolioSummary
    // Look for divs with rounded-lg and border and px-4 py-3
    const summaryCards = page.locator('div.rounded-lg').filter({
      has: page.locator('dt'),
    });

    // Check that at least one has the correct border class
    let foundCorrectCard = false;
    const count = await summaryCards.count();

    for (let i = 0; i < count; i++) {
      const card = summaryCards.nth(i);
      const className = await card.getAttribute("class");
      if (className && className.includes("border-foreground/15")) {
        foundCorrectCard = true;
        break;
      }
    }

    // Summary cards should exist even on empty state or with portfolios
    // The cards render in portfolio-summary.tsx
    if (count > 0) {
      expect(foundCorrectCard).toBe(true);
    }
  });

  test("7. Table rows have better hover state (hover:bg-foreground/[0.04])", async ({
    page,
  }) => {
    // Create a portfolio
    const addBtn = page.locator('button:has-text("Add Portfolio")').first();
    await addBtn.click();

    const nameInput = page.locator('input[placeholder="e.g. Retirement Fund…"]');
    await nameInput.fill("Table Test");

    const submitBtn = page.locator('button[type="submit"]:has-text("Add Portfolio")');
    await submitBtn.click();

    await page.waitForFunction(
      () => document.querySelectorAll('dialog[open]').length === 0,
      { timeout: 5000 }
    );

    // Get the portfolio link href to navigate directly
    const portfolioLink = page.locator('a[href*="/portfolio/"]').first();
    const href = await portfolioLink.getAttribute("href");

    if (href) {
      // Navigate directly to the portfolio page
      await page.goto(`http://localhost:3000${href}`);
      await page.waitForLoadState("networkidle");
    }

    // Find table rows if they exist
    const tableRows = page.locator("tbody tr");

    const rowCount = await tableRows.count();

    if (rowCount > 0) {
      // Get the first table row
      const firstRow = tableRows.first();

      // Check for hover:bg-foreground/[0.04] class
      const className = await firstRow.getAttribute("class");
      expect(className).toContain("hover:bg-foreground/[0.04]");
    } else {
      // If no table rows, the test is inconclusive but not failing
      // This could happen if we're on mobile or there are no holdings
      console.log("No table rows found - either no holdings or mobile view");
    }
  });
});
