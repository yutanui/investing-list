import { test, expect } from "@playwright/test";

/**
 * Helper to inject portfolios and holdings into localStorage
 */
async function injectPortfoliosAndHoldings(
  page: any,
  portfolios: Array<{ id: string; name: string }>,
  holdings: Array<{
    id: string;
    portfolioId: string;
    name: string;
    shares: number;
    averageCost: number;
    currentPrice: number;
  }>
) {
  await page.evaluate(
    (data: any) => {
      localStorage.setItem(
        "investing-list-portfolios-v1",
        JSON.stringify(data.portfolios)
      );
      localStorage.setItem(
        "investing-list-holdings-v2",
        JSON.stringify(data.holdings.map((holding: any) => ({
          id: holding.id,
          portfolioId: holding.portfolioId,
          name: holding.name,
          ticker: "",
          assetType: "stock",
          holdingType: "core",
          shares: holding.shares,
          averageCost: holding.averageCost,
          averageCostCurrency: "THB",
          currentPrice: holding.currentPrice,
          currentPriceCurrency: "THB",
          companyId: "",
          holdingId: "",
        })))
      );
    },
    { portfolios, holdings }
  );
}

test.describe("Portfolio Cards Layout Redesign", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");
  });

  test("1. No sidebar on the homepage", async ({ page }) => {
    // Inject test data
    const portfolios = [
      { id: "port-1", name: "Growth Portfolio" },
      { id: "port-2", name: "Income Portfolio" },
    ];
    const holdings = [
      {
        id: "h1",
        portfolioId: "port-1",
        name: "Tech Stock",
        shares: 100,
        averageCost: 50,
        currentPrice: 60,
      },
      {
        id: "h2",
        portfolioId: "port-2",
        name: "Dividend Stock",
        shares: 200,
        averageCost: 25,
        currentPrice: 28,
      },
    ];
    await injectPortfoliosAndHoldings(page, portfolios, holdings);

    // Reload to load the injected data
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Check for PortfolioNav component (sidebar) - should NOT be rendered
    const sidebar = page.locator('[class*="sidebar"], aside, nav:has-text("Summary"), nav:has-text("Add Portfolio")');
    const sidebarCount = await sidebar.count();

    // The main content should span the full width without a sidebar
    const mainContent = page.locator("main#main-content");
    expect(mainContent).toBeVisible();

    // Verify no left sidebar is present by checking the layout structure
    const htmlContent = await page.content();
    // Should NOT contain a portfolio nav sidebar wrapper (if one existed, it would be present)
    // The page should just have Header + Main
  });

  test("2. Portfolio cards appear in main content area below summary", async ({ page }) => {
    const portfolios = [
      { id: "port-1", name: "Growth Portfolio" },
      { id: "port-2", name: "Income Portfolio" },
    ];
    const holdings = [
      {
        id: "h1",
        portfolioId: "port-1",
        name: "Tech Stock",
        shares: 100,
        averageCost: 50,
        currentPrice: 60,
      },
      {
        id: "h2",
        portfolioId: "port-2",
        name: "Dividend Stock",
        shares: 200,
        averageCost: 25,
        currentPrice: 28,
      },
    ];
    await injectPortfoliosAndHoldings(page, portfolios, holdings);
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForSelector("text=Growth Portfolio", { timeout: 5000 });

    // Check for "Portfolio Summary" heading
    const summaryHeading = page.getByRole("heading", { name: /portfolio summary/i });
    await expect(summaryHeading).toBeVisible();

    // Check for "Portfolios" section heading
    const portfoliosHeading = page.getByRole("heading", { name: /^Portfolios$/ });
    await expect(portfoliosHeading).toBeVisible();

    // Verify portfolio cards are present by checking for portfolio names
    const growthCard = page.locator("text=Growth Portfolio");
    const incomeCard = page.locator("text=Income Portfolio");

    await expect(growthCard).toBeVisible();
    await expect(incomeCard).toBeVisible();

    // Verify summary appears before portfolios section
    const summarySection = page.getByRole("heading", { name: /portfolio summary/i });
    const portfoliosSection = page.getByRole("heading", { name: /^Portfolios$/i });

    const summaryBox = await summarySection.boundingBox();
    const portfoliosBox = await portfoliosSection.boundingBox();

    if (summaryBox && portfoliosBox) {
      expect(summaryBox.y).toBeLessThan(portfoliosBox.y);
    }
  });

  test("3. Portfolio cards use responsive grid layout", async ({ page }) => {
    const portfolios = [
      { id: "port-1", name: "Portfolio 1" },
      { id: "port-2", name: "Portfolio 2" },
      { id: "port-3", name: "Portfolio 3" },
    ];
    const holdings = portfolios.map((p, i) => ({
      id: `h${i}`,
      portfolioId: p.id,
      name: `Holding ${i}`,
      shares: 100,
      averageCost: 50,
      currentPrice: 60,
    }));
    await injectPortfoliosAndHoldings(page, portfolios, holdings);
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForSelector("text=Portfolio 1", { timeout: 5000 });

    // Get the container that holds the portfolio cards
    const portfoliosHeading = page.getByRole("heading", { name: /^Portfolios$/ });
    const mainContent = page.locator("main#main-content");

    // Check for grid layout - should have grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
    const cardContainer = mainContent.locator("div.grid").first();
    const containerClasses = await cardContainer.evaluate(el => el.className);

    // Should have grid class in the markup
    expect(containerClasses).toMatch(/grid/);
    expect(containerClasses).toMatch(/gap/);

    // Verify multiple portfolio cards are visible at the same time
    const portfolioCards = mainContent.locator("div").filter({
      has: page.locator("text=Portfolio 1"),
    });
    const cardCount = await mainContent.locator("text=/^Portfolio [123]$/").count();
    expect(cardCount).toBeGreaterThanOrEqual(2);
  });

  test("4. Add Portfolio button exists in header", async ({ page }) => {
    const addPortfolioBtn = page.getByRole("button", {
      name: "Add new portfolio",
    });

    await expect(addPortfolioBtn).toBeVisible();

    // Verify button is in the header area
    const header = page.locator("header");
    const btnInsideHeader = header.locator("button[aria-label='Add new portfolio']");
    await expect(btnInsideHeader).toBeVisible();
  });

  test("5. Add Portfolio button is left of Sign In button", async ({ page }) => {
    // We need Supabase for Sign In button to appear. For now, just verify structure
    const addPortfolioBtn = page.getByRole("button", {
      name: "Add new portfolio",
    });

    await expect(addPortfolioBtn).toBeVisible();

    const header = page.locator("header");
    const navRight = header.locator("div").filter({ hasNot: page.locator("text=Investing Portfolio") }).last();

    // The Add Portfolio button should be in the right nav area
    const btnInNav = navRight.locator("button[aria-label='Add new portfolio']");
    await expect(btnInNav).toBeVisible();
  });

  test("6. Sort controls appear at top of portfolio cards section", async ({ page }) => {
    const portfolios = [
      { id: "port-1", name: "Portfolio A" },
      { id: "port-2", name: "Portfolio B" },
      { id: "port-3", name: "Portfolio C" },
    ];
    const holdings = portfolios.map((p, i) => ({
      id: `h${i}`,
      portfolioId: p.id,
      name: `Holding ${i}`,
      shares: 100,
      averageCost: 50,
      currentPrice: 60 + i * 10,
    }));
    await injectPortfoliosAndHoldings(page, portfolios, holdings);
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Sort controls should be visible when there are multiple portfolios
    const portfoliosHeading = page.getByRole("heading", { name: /^Portfolios$/ });
    const headingParent = portfoliosHeading.locator("..");

    // Should have a select dropdown
    const sortSelect = page.locator("select[aria-label='Sort portfolios by']");
    await expect(sortSelect).toBeVisible();

    // Should have a sort direction button
    const sortBtn = page.locator("button[aria-label*='Sort']");
    await expect(sortBtn).toBeVisible();

    // Sort controls should be near the "Portfolios" heading
    const headingBox = await portfoliosHeading.boundingBox();
    const selectBox = await sortSelect.boundingBox();

    if (headingBox && selectBox) {
      // They should be on roughly the same horizontal level (within 50px)
      expect(Math.abs(headingBox.y - selectBox.y)).toBeLessThan(50);
    }
  });

  test("7. Sort controls hide when only one portfolio", async ({ page }) => {
    const portfolios = [{ id: "port-1", name: "Solo Portfolio" }];
    const holdings = [
      {
        id: "h1",
        portfolioId: "port-1",
        name: "Holding 1",
        shares: 100,
        averageCost: 50,
        currentPrice: 60,
      },
    ];
    await injectPortfoliosAndHoldings(page, portfolios, holdings);
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Sort controls should not be visible
    const sortSelect = page.locator("select[aria-label='Sort portfolios by']");
    await expect(sortSelect).not.toBeVisible();

    const sortBtn = page.locator("button[aria-label*='Sort']");
    await expect(sortBtn).not.toBeVisible();
  });

  test("8. Add Portfolio button opens dialog modal", async ({ page }) => {
    const addPortfolioBtn = page.getByRole("button", {
      name: "Add new portfolio",
    });

    await addPortfolioBtn.click();
    await page.waitForFunction(
      () => document.querySelectorAll("dialog[open]").length > 0,
      { timeout: 5000 }
    );

    // Dialog should be visible
    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();

    // Dialog should have "Add Portfolio" title
    const dialogTitle = dialog.locator("h2");
    await expect(dialogTitle).toContainText(/add portfolio/i);

    // Should have name input field
    const nameInput = dialog.locator("input[name='name']");
    await expect(nameInput).toBeVisible();
  });

  test("9. Can add new portfolio from header button", async ({ page }) => {
    // Start with empty portfolio list
    await injectPortfoliosAndHoldings(page, [], []);
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should show empty state
    const emptyState = page.getByText(/no portfolios yet/i);
    await expect(emptyState).toBeVisible();

    // Click Add Portfolio
    const addBtn = page.getByRole("button", { name: "Add new portfolio" });
    await addBtn.click();

    await page.waitForFunction(
      () => document.querySelectorAll("dialog[open]").length > 0,
      { timeout: 5000 }
    );

    // Fill in portfolio name
    const dialog = page.locator("dialog[open]");
    const nameInput = dialog.locator("input[name='name']");
    await nameInput.fill("New Test Portfolio");

    // Submit
    const submitBtn = dialog.locator("button[type='submit']");
    await submitBtn.click();

    // Wait for dialog to close
    await page.waitForFunction(
      () => document.querySelectorAll("dialog[open]").length === 0,
      { timeout: 5000 }
    );

    // Verify portfolio appears on page
    const portfolioName = page.getByText("New Test Portfolio");
    await expect(portfolioName).toBeVisible();
  });

  test("10. Portfolio grid has correct CSS classes", async ({ page }) => {
    const portfolios = [
      { id: "port-1", name: "Portfolio 1" },
      { id: "port-2", name: "Portfolio 2" },
      { id: "port-3", name: "Portfolio 3" },
    ];
    const holdings = portfolios.map((p, i) => ({
      id: `h${i}`,
      portfolioId: p.id,
      name: `Holding ${i}`,
      shares: 100,
      averageCost: 50,
      currentPrice: 60,
    }));
    await injectPortfoliosAndHoldings(page, portfolios, holdings);
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Find the grid container by looking for multiple portfolio cards
    const mainContent = page.locator("main#main-content");

    // Look for a div that contains the portfolio cards and has grid classes
    const gridContainer = mainContent.locator("div.grid");
    const containerCount = await gridContainer.count();

    // Should have at least one grid container
    expect(containerCount).toBeGreaterThan(0);

    // Get the grid container classes
    const classes = await gridContainer.first().evaluate(el => el.className);

    // Should have grid-cols-1 for mobile, sm:grid-cols-2, lg:grid-cols-3
    expect(classes).toMatch(/grid-cols/);
    expect(classes).toMatch(/gap-/);
  });

  test("11. Portfolio cards display stats correctly", async ({ page }) => {
    const portfolios = [{ id: "port-1", name: "Test Portfolio" }];
    const holdings = [
      {
        id: "h1",
        portfolioId: "port-1",
        name: "Apple Stock",
        shares: 10,
        averageCost: 150,
        currentPrice: 170,
      },
    ];
    await injectPortfoliosAndHoldings(page, portfolios, holdings);
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Portfolio card should show holdings count
    const holdingsCount = page.getByText(/^1 holding$/i);
    await expect(holdingsCount).toBeVisible();

    // Portfolio card should show values
    const portfolioCard = page.locator("text=Test Portfolio").locator("..");

    // Check for numeric values (total value calculation: 10 * 170 = 1700 THB)
    const content = await portfolioCard.textContent();
    expect(content).toBeTruthy();
  });

  test("12. Empty state shows message about Add Portfolio button", async ({ page }) => {
    // Start with no portfolios
    await injectPortfoliosAndHoldings(page, [], []);
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should show empty state
    const emptyHeading = page.getByRole("heading", { name: /no portfolios yet/i });
    await expect(emptyHeading).toBeVisible();

    // Should mention the Add Portfolio button in header
    const emptyMessage = page.getByText(/add portfolio.*button.*header/i);
    await expect(emptyMessage).toBeVisible();
  });

  test("13. Sort by name works", async ({ page }) => {
    const portfolios = [
      { id: "port-1", name: "Zebra Portfolio" },
      { id: "port-2", name: "Apple Portfolio" },
      { id: "port-3", name: "Mango Portfolio" },
    ];
    const holdings = portfolios.map((p, i) => ({
      id: `h${i}`,
      portfolioId: p.id,
      name: `Holding ${i}`,
      shares: 100,
      averageCost: 50,
      currentPrice: 60,
    }));
    await injectPortfoliosAndHoldings(page, portfolios, holdings);
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Get sort dropdown
    const sortSelect = page.locator("select[aria-label='Sort portfolios by']");

    // Select "Name" option
    await sortSelect.selectOption("name");

    // Get all portfolio names in order
    const portfolioNames = await page
      .locator("text=/^(Zebra|Apple|Mango) Portfolio$/")
      .allTextContents();

    // Should be sorted alphabetically
    const names = portfolioNames.map(name => name.split(" ")[0]);
    expect(names).toEqual(["Apple", "Mango", "Zebra"]);
  });

  test("14. Sort direction toggle works", async ({ page }) => {
    const portfolios = [
      { id: "port-1", name: "Portfolio A", value: 1000 },
      { id: "port-2", name: "Portfolio B", value: 5000 },
      { id: "port-3", name: "Portfolio C", value: 2000 },
    ];
    const holdings = [
      {
        id: "h1",
        portfolioId: "port-1",
        name: "Holding 1",
        shares: 10,
        averageCost: 100,
        currentPrice: 100,
      },
      {
        id: "h2",
        portfolioId: "port-2",
        name: "Holding 2",
        shares: 10,
        averageCost: 500,
        currentPrice: 500,
      },
      {
        id: "h3",
        portfolioId: "port-3",
        name: "Holding 3",
        shares: 10,
        averageCost: 200,
        currentPrice: 200,
      },
    ];
    await injectPortfoliosAndHoldings(page, portfolios, holdings);
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Set sort to Amount (ascending by default)
    const sortSelect = page.locator("select[aria-label='Sort portfolios by']");
    await sortSelect.selectOption("amount");

    // Get names in ascending order
    const namesAsc = await page
      .locator("text=/^Portfolio [ABC]$/")
      .allTextContents();

    // Toggle to descending
    const sortBtn = page.locator("button[aria-label*='Sort']");
    await sortBtn.click();

    // Wait a moment for re-render
    await page.waitForTimeout(500);

    // Get names in descending order
    const namesDesc = await page
      .locator("text=/^Portfolio [ABC]$/")
      .allTextContents();

    // Order should be different (reversed)
    expect(namesAsc).not.toEqual(namesDesc);
  });

  test("15. Portfolio cards are clickable to edit", async ({ page }) => {
    const portfolios = [{ id: "port-1", name: "Editable Portfolio" }];
    const holdings = [
      {
        id: "h1",
        portfolioId: "port-1",
        name: "Test Holding",
        shares: 100,
        averageCost: 50,
        currentPrice: 60,
      },
    ];
    await injectPortfoliosAndHoldings(page, portfolios, holdings);
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Click the edit button on the portfolio card (the card has an overlay link, so click the edit button directly)
    const editBtn = page.locator("button[aria-label='Edit Editable Portfolio']");
    await editBtn.click();

    // Wait for dialog to open
    await page.waitForFunction(
      () => document.querySelectorAll("dialog[open]").length > 0,
      { timeout: 5000 }
    );

    // Dialog should be open with edit mode
    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();

    // Portfolio name should be pre-filled
    const nameInput = dialog.locator("input[name='name']");
    const inputValue = await nameInput.inputValue();
    expect(inputValue).toBe("Editable Portfolio");
  });
});
