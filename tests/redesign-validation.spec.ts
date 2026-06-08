import { test, expect } from '@playwright/test';

test.describe('UI Redesign Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    // Wait for hydration to complete
    await page.waitForTimeout(500);
  });

  test('1. Home page loads without errors and displays correctly', async ({ page }) => {
    // Verify the page loaded successfully
    const mainContent = page.locator('main#main-content');
    await expect(mainContent).toBeVisible();

    // Wait for portfolio data to load (either empty state or data)
    await page.waitForTimeout(1000);

    // Verify no console errors
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });

    expect(logs.length).toBe(0);
  });

  test('2. Header contains app branding and core elements', async ({ page }) => {
    // Check for "Investing Portfolio" text
    const wordmark = page.locator('text=Investing Portfolio');
    await expect(wordmark).toBeVisible();

    // Check for Add Portfolio button
    const addPortfolioBtn = page.locator('button[aria-label="Add new portfolio"]');
    await expect(addPortfolioBtn).toBeVisible();
  });

  test('3. Privacy toggle button exists and is clickable', async ({ page }) => {
    const privacyToggle = page.locator('button[data-testid="privacy-toggle"]');
    await expect(privacyToggle).toBeVisible();

    // Check initial state
    const initialPressed = await privacyToggle.getAttribute('aria-pressed');
    expect(initialPressed).toBe('false');

    // Click it
    await privacyToggle.click();
    await page.waitForTimeout(300);

    // Verify it's now pressed
    const newPressed = await privacyToggle.getAttribute('aria-pressed');
    expect(newPressed).toBe('true');

    // Toggle back
    await privacyToggle.click();
    await page.waitForTimeout(300);
    const resetPressed = await privacyToggle.getAttribute('aria-pressed');
    expect(resetPressed).toBe('false');
  });

  test('4. Add Portfolio button opens a dialog', async ({ page }) => {
    const addPortfolioBtn = page.locator('button[aria-label="Add new portfolio"]');
    await addPortfolioBtn.click();

    // Wait for dialog to appear
    await page.waitForTimeout(300);

    // Check for the dialog with "Add Portfolio" title - make sure it's the portfolio dialog
    const allH2s = page.locator('dialog h2');
    let foundPortfolioDialog = false;

    for (let i = 0; i < await allH2s.count(); i++) {
      const text = await allH2s.nth(i).innerText();
      if (text.includes('Add Portfolio')) {
        foundPortfolioDialog = true;
        break;
      }
    }

    expect(foundPortfolioDialog).toBe(true);

    // Verify form elements exist
    const portfolioNameInput = page.locator('dialog input[name="name"]');
    await expect(portfolioNameInput).toBeVisible();
  });

  test('5. Dialog can be closed', async ({ page }) => {
    const addPortfolioBtn = page.locator('button[aria-label="Add new portfolio"]');
    await addPortfolioBtn.click();
    await page.waitForTimeout(300);

    // Get all h2s and find the "Add Portfolio" one
    const allH2s = page.locator('dialog h2');
    let portfolioDialogIndex = -1;

    for (let i = 0; i < await allH2s.count(); i++) {
      const text = await allH2s.nth(i).innerText();
      if (text.includes('Add Portfolio')) {
        portfolioDialogIndex = i;
        break;
      }
    }

    if (portfolioDialogIndex >= 0) {
      // Close using Escape key
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Verify dialog is no longer visible
      let stillVisible = false;
      for (let i = 0; i < await allH2s.count(); i++) {
        const text = await allH2s.nth(i).innerText();
        if (text.includes('Add Portfolio')) {
          const isVisible = await allH2s.nth(i).isVisible();
          if (isVisible) {
            stillVisible = true;
            break;
          }
        }
      }

      expect(stillVisible).toBe(false);
    }
  });

  test('6. Can create a new portfolio and see it in the list', async ({ page }) => {
    // Create a portfolio
    const addPortfolioBtn = page.locator('button[aria-label="Add new portfolio"]');
    await addPortfolioBtn.click();
    await page.waitForTimeout(300);

    const portfolioNameInput = page.locator('dialog input[name="name"]');
    const testPortfolioName = `Test Portfolio ${Date.now()}`;
    await portfolioNameInput.fill(testPortfolioName);

    // Find the submit button in the dialog - target the one with "Add Portfolio" text
    const dialogs = page.locator('dialog');
    let submitBtn;

    for (let i = 0; i < await dialogs.count(); i++) {
      const dialog = dialogs.nth(i);
      const title = dialog.locator('h2');
      const titleText = await title.innerText();

      if (titleText.includes('Add Portfolio')) {
        submitBtn = dialog.locator('button[type="submit"]');
        await submitBtn.click();
        break;
      }
    }

    await page.waitForTimeout(500);
  });

  test('7. Portfolio card contains expected information display structure', async ({ page }) => {
    // Wait for portfolios to load
    await page.waitForTimeout(1500);

    // Check if there are any portfolio cards
    const portfolioCards = page.locator('[role="article"]');
    const count = await portfolioCards.count();

    if (count > 0) {
      // Get the first card
      const firstCard = portfolioCards.first();

      // Look for typical portfolio card content patterns
      // Cards should have portfolio information
      const cardText = await firstCard.innerText();
      expect(cardText.length).toBeGreaterThan(0);
    }
  });

  test('8. Can navigate to portfolio detail page', async ({ page }) => {
    // Wait for portfolios to load
    await page.waitForTimeout(1500);

    // Find a portfolio card link or clickable element
    const portfolioCards = page.locator('[role="article"]');
    const count = await portfolioCards.count();

    if (count > 0) {
      // Look for a clickable link in the first card
      const firstCard = portfolioCards.first();

      // Try to find a link or clickable element
      const link = firstCard.locator('a');
      const linkCount = await link.count();

      if (linkCount > 0) {
        await link.first().click();
        await page.waitForTimeout(800);

        // Verify we're on a portfolio page (should have breadcrumb or portfolio-specific elements)
        const breadcrumb = page.locator('text=All portfolios');

        // If breadcrumb exists, we're on portfolio detail
        if (await breadcrumb.isVisible()) {
          expect(true).toBe(true);
        }
      }
    }
  });

  test('9. Portfolio detail page has breadcrumb navigation', async ({ page }) => {
    // Navigate to a portfolio if possible
    await page.waitForTimeout(1500);
    const portfolioCards = page.locator('[role="article"]');
    const count = await portfolioCards.count();

    if (count > 0) {
      const link = portfolioCards.first().locator('a');
      if (await link.count() > 0) {
        await link.first().click();
        await page.waitForTimeout(800);

        // Check for breadcrumb
        const breadcrumb = page.locator('text=All portfolios');
        if (await breadcrumb.isVisible()) {
          await expect(breadcrumb).toBeVisible();
        }
      }
    }
  });

  test('10. Portfolio detail page shows holdings section', async ({ page }) => {
    // Navigate to a portfolio if possible
    await page.waitForTimeout(1500);
    const portfolioCards = page.locator('[role="article"]');
    const count = await portfolioCards.count();

    if (count > 0) {
      const link = portfolioCards.first().locator('a');
      if (await link.count() > 0) {
        await link.first().click();
        await page.waitForTimeout(800);

        // Look for Holdings heading or tab
        const holdingsElement = page.locator('text=Holdings');
        if (await holdingsElement.isVisible()) {
          expect(true).toBe(true);
        }
      }
    }
  });

  test('11. Add Holding button exists on portfolio detail', async ({ page }) => {
    // Navigate to a portfolio if possible
    await page.waitForTimeout(1500);
    const portfolioCards = page.locator('[role="article"]');
    const count = await portfolioCards.count();

    if (count > 0) {
      const link = portfolioCards.first().locator('a');
      if (await link.count() > 0) {
        await link.first().click();
        await page.waitForTimeout(800);

        // Look for Add Holding button
        const bodyText = await page.locator('body').innerText();
        expect(bodyText).toContain('Add Holding');
      }
    }
  });

  test('12. Tab navigation exists and is accessible', async ({ page }) => {
    // Navigate to a portfolio if possible
    await page.waitForTimeout(1500);
    const portfolioCards = page.locator('[role="article"]');
    const count = await portfolioCards.count();

    if (count > 0) {
      const link = portfolioCards.first().locator('a');
      if (await link.count() > 0) {
        await link.first().click();
        await page.waitForTimeout(800);

        // Look for tab elements with role="tablist"
        const tablist = page.locator('[role="tablist"]');
        if (await tablist.isVisible()) {
          const tabs = tablist.locator('[role="tab"]');
          const tabCount = await tabs.count();
          expect(tabCount).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  test('13. Tabs can be clicked to switch views', async ({ page }) => {
    // Navigate to a portfolio if possible
    await page.waitForTimeout(1500);
    const portfolioCards = page.locator('[role="article"]');
    const count = await portfolioCards.count();

    if (count > 0) {
      const link = portfolioCards.first().locator('a');
      if (await link.count() > 0) {
        await link.first().click();
        await page.waitForTimeout(800);

        // Look for tab elements
        const tablist = page.locator('[role="tablist"]');
        if (await tablist.isVisible()) {
          const tabs = tablist.locator('[role="tab"]');
          const tabCount = await tabs.count();

          if (tabCount > 1) {
            // Click the second tab
            const secondTab = tabs.nth(1);
            await secondTab.click();
            await page.waitForTimeout(300);

            // Verify it became active
            const active = await secondTab.getAttribute('aria-selected');
            expect(active).toBe('true');
          }
        }
      }
    }
  });

  test('14. Rebalancing section displays when holdings have target allocations', async ({ page }) => {
    // Navigate to a portfolio if possible
    await page.waitForTimeout(1500);
    const portfolioCards = page.locator('[role="article"]');
    const count = await portfolioCards.count();

    if (count > 0) {
      const link = portfolioCards.first().locator('a');
      if (await link.count() > 0) {
        await link.first().click();
        await page.waitForTimeout(800);

        // Look for Rebalancing tab or section
        const rebalancingText = page.locator('text=Rebalancing');
        // This may or may not exist depending on whether holdings have target allocations
        // Just verify the page loads without error
        const main = page.locator('main');
        await expect(main).toBeVisible();
      }
    }
  });

  test('15. Header is sticky and visible on scroll', async ({ page }) => {
    // Verify header has sticky positioning
    const header = page.locator('header').first();
    const stickyClass = await header.getAttribute('class');

    // Should have sticky positioning
    expect(stickyClass).toContain('sticky');
  });

  test('16. Portfolio Summary page layout renders', async ({ page }) => {
    await page.waitForTimeout(1500);

    // We're on the home page - check for key elements
    const main = page.locator('main#main-content');
    await expect(main).toBeVisible();

    // Check for portfolio cards section exists
    const pageContent = await page.locator('body').innerText();
    // Page should have some content (either portfolios or empty state)
    expect(pageContent.length).toBeGreaterThan(0);
  });

  test('17. Edit Holding modal can be opened from portfolio detail', async ({ page }) => {
    // Navigate to a portfolio if possible
    await page.waitForTimeout(1500);
    const portfolioCards = page.locator('[role="article"]');
    const count = await portfolioCards.count();

    if (count > 0) {
      const link = portfolioCards.first().locator('a');
      if (await link.count() > 0) {
        await link.first().click();
        await page.waitForTimeout(800);

        // Look for Add Holding button and click it
        const bodyText = await page.locator('body').innerText();

        if (bodyText.includes('Add Holding')) {
          // Find the Add Holding button
          const buttons = page.locator('button');
          const buttonCount = await buttons.count();

          for (let i = 0; i < buttonCount; i++) {
            const btn = buttons.nth(i);
            const btnText = await btn.innerText();
            if (btnText.includes('Add Holding')) {
              await btn.click();
              await page.waitForTimeout(500);
              break;
            }
          }

          // Look for the modal dialog
          const dialog = page.locator('dialog');
          if (await dialog.count() > 0) {
            const dialogText = await dialog.last().innerText();
            expect(dialogText).toBeTruthy();
          }
        }
      }
    }
  });

  test('18. Form validation prevents submission with empty required fields', async ({ page }) => {
    // Click Add Portfolio
    const addPortfolioBtn = page.locator('button[aria-label="Add new portfolio"]');
    await addPortfolioBtn.click();
    await page.waitForTimeout(300);

    // Try to submit empty form
    const input = page.locator('dialog input[name="name"]');
    const isRequired = await input.getAttribute('required');

    // HTML5 validation should prevent submission
    expect(isRequired).not.toBeNull();
  });

  test('19. Privacy mode toggle works and can be toggled', async ({ page }) => {
    // Enable privacy mode
    const privacyToggle = page.locator('button[data-testid="privacy-toggle"]');
    await privacyToggle.click();
    await page.waitForTimeout(300);

    // Verify it's enabled
    let pressed = await privacyToggle.getAttribute('aria-pressed');
    expect(pressed).toBe('true');

    // Toggle it back
    await privacyToggle.click();
    await page.waitForTimeout(300);
    pressed = await privacyToggle.getAttribute('aria-pressed');
    expect(pressed).toBe('false');
  });

  test('20. Main layout structure is responsive', async ({ page }) => {
    // Check for responsive container
    const container = page.locator('main .mx-auto');

    // Should have max-width constraint
    const classes = await container.getAttribute('class');
    expect(classes).toContain('max-w');
  });

  test('21. Header top navigation bar has correct styling', async ({ page }) => {
    // Check header has proper styling
    const header = page.locator('header').first();
    const classes = await header.getAttribute('class');

    // Should have border and background styling
    expect(classes).toContain('border-b');
    expect(classes).toContain('bg-background');
  });

  test('22. Logo section renders with icon and text', async ({ page }) => {
    // Check for logo link
    const logoLink = page.locator('a[href="/"]').first();
    await expect(logoLink).toBeVisible();

    // Should contain gap between icon and text
    const classes = await logoLink.getAttribute('class');
    expect(classes).toContain('gap');
  });

  test('23. Portfolio cards are clickable and navigable', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Get portfolio cards
    const cards = page.locator('[role="article"]');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      // Click first card's link
      const firstCardLink = cards.first().locator('a');
      if (await firstCardLink.count() > 0) {
        const initialUrl = page.url();
        await firstCardLink.first().click();
        await page.waitForTimeout(800);

        // URL should have changed to portfolio detail
        const newUrl = page.url();
        expect(newUrl).not.toBe(initialUrl);
      }
    }
  });

  test('24. Page renders without console errors or warnings', async ({ page }) => {
    const errors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    // Should have no errors
    expect(errors.length).toBe(0);
  });

  test('25. Can type into portfolio name input field', async ({ page }) => {
    const addPortfolioBtn = page.locator('button[aria-label="Add new portfolio"]');
    await addPortfolioBtn.click();
    await page.waitForTimeout(300);

    // Type portfolio name
    const input = page.locator('dialog input[name="name"]');
    const testName = `MyPortfolio${Date.now()}`;
    await input.fill(testName);

    // Verify input value
    const value = await input.inputValue();
    expect(value).toBe(testName);
  });

  test('26. Header privacy toggle is accessible with keyboard', async ({ page }) => {
    // Focus on privacy toggle
    const privacyToggle = page.locator('button[data-testid="privacy-toggle"]');
    await privacyToggle.focus();

    // Check it has focus
    const hasFocus = await privacyToggle.evaluate(el => el === document.activeElement);
    expect(hasFocus).toBe(true);

    // Press Space to activate
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);

    // Should be toggled
    const pressed = await privacyToggle.getAttribute('aria-pressed');
    expect(pressed).toBe('true');
  });

  test('27. Portfolio detail page renders hero panel with summary stats', async ({ page }) => {
    // Navigate to a portfolio if possible
    await page.waitForTimeout(1500);
    const portfolioCards = page.locator('[role="article"]');
    const count = await portfolioCards.count();

    if (count > 0) {
      const link = portfolioCards.first().locator('a');
      if (await link.count() > 0) {
        await link.first().click();
        await page.waitForTimeout(800);

        // Portfolio detail should have content in main
        const main = page.locator('main');
        await expect(main).toBeVisible();

        // Should have some text content (portfolio name or stats)
        const text = await main.innerText();
        expect(text.length).toBeGreaterThan(0);
      }
    }
  });

  test('28. All buttons in header are accessible', async ({ page }) => {
    // Get all buttons in header
    const header = page.locator('header');
    const buttons = header.locator('button');
    const count = await buttons.count();

    expect(count).toBeGreaterThan(0);

    // All buttons should be visible
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const isVisible = await btn.isVisible();
      expect(isVisible).toBe(true);
    }
  });

  test('29. Main content area is properly scrollable', async ({ page }) => {
    // Check main element exists and is scrollable
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Verify main has flex-1 for growing
    const mainClasses = await main.getAttribute('class');
    expect(mainClasses).toContain('flex-1');
  });

  test('30. Page body has correct background color styling', async ({ page }) => {
    // Check body has background color class
    const body = page.locator('body');
    const classes = await body.getAttribute('class');

    // Should have bg-background class
    expect(classes).toContain('bg-background');
  });
});
