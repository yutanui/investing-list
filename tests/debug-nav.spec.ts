import { test, expect } from "@playwright/test";

test("Debug - check holdings load", async ({ page }) => {
  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");

  // Set a desktop viewport
  await page.setViewportSize({ width: 1200, height: 800 });

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
        name: "Fund A",
        holdingId: "M0113_2553",
        ticker: "",
        assetType: "mutual_fund",
        holdingType: "core",
        shares: 100,
        averageCost: 30,
        averageCostCurrency: "THB",
        currentPrice: 32,
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

    console.log("Injected portfolios:", JSON.parse(localStorage.getItem("investing-list-portfolios-v1") || "[]"));
    console.log("Injected holdings:", JSON.parse(localStorage.getItem("investing-list-holdings-v2") || "[]"));
  });

  await page.reload();
  await page.waitForLoadState("networkidle");

  // Check the page content for "Fund A"
  const content = await page.content();
  if (content.includes("Fund A")) {
    console.log("Fund A found in page");
  } else {
    console.log("Fund A NOT found in page");
  }

  // Check localStorage after reload
  const stored = await page.evaluate(() => {
    return {
      portfolios: JSON.parse(localStorage.getItem("investing-list-portfolios-v1") || "[]"),
      holdings: JSON.parse(localStorage.getItem("investing-list-holdings-v2") || "[]"),
    };
  });
  console.log("After reload - portfolios:", stored.portfolios);
  console.log("After reload - holdings:", stored.holdings);

  // Navigate to portfolio
  const links = page.locator('a[href*="/portfolio/"]');
  const count = await links.count();
  console.log("Portfolio links:", count);

  if (count > 0) {
    const href = await links.first().getAttribute("href");
    console.log("Navigating to:", href);
    await links.first().click();
    await page.waitForLoadState("networkidle");

    // Check page after navigation
    const navContent = await page.content();
    if (navContent.includes("Fund A")) {
      console.log("Fund A found after navigation");
    } else {
      console.log("Fund A NOT found after navigation");
    }

    // Check if main element has specific content
    const main = page.locator("main");
    const mainText = await main.textContent();
    console.log("Main content:", mainText?.substring(0, 200));
  }
});
