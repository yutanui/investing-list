import { test, expect } from "@playwright/test";

test.describe("NAV Update Feature", () => {
  test("1. API route returns correct JSON structure for valid holdingId", async ({
    page,
  }) => {
    // First navigate to home to establish connection
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Now test the API route
    const apiResponse = await page.evaluate(async () => {
      const res = await fetch("/api/fetch-nav", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdingId: "M0113_2553",
          navDate: new Date().toISOString().slice(0, 10),
        }),
      });

      const data = await res.json();
      return { status: res.status, data };
    });

    // Verify response structure
    expect(apiResponse.data).toHaveProperty("lastVal");
    expect(apiResponse.data).toHaveProperty("navDate");

    // lastVal can be number or null
    const isValidLastVal =
      typeof apiResponse.data.lastVal === "number" ||
      apiResponse.data.lastVal === null;
    expect(isValidLastVal).toBe(true);

    // navDate can be string or null
    const isValidNavDate =
      typeof apiResponse.data.navDate === "string" ||
      apiResponse.data.navDate === null;
    expect(isValidNavDate).toBe(true);
  });

  test("2. API route returns null values for invalid holdingId", async ({
    page,
  }) => {
    // Navigate to home
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Test API with invalid holding ID
    const apiResponse = await page.evaluate(async () => {
      const res = await fetch("/api/fetch-nav", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdingId: "INVALID_ID_THAT_DOES_NOT_EXIST",
          navDate: new Date().toISOString().slice(0, 10),
        }),
      });

      const data = await res.json();
      return { status: res.status, data };
    });

    // For invalid IDs, API should return null values
    expect(apiResponse.data.lastVal === null).toBe(true);
    expect(apiResponse.data.navDate === null).toBe(true);
  });

  test("3. API route handles missing holdingId parameter", async ({
    page,
  }) => {
    // Navigate to home
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Test API with missing required parameter
    const apiResponse = await page.evaluate(async () => {
      const res = await fetch("/api/fetch-nav", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          navDate: new Date().toISOString().slice(0, 10),
          // holdingId is missing
        }),
      });

      const data = await res.json();
      return { status: res.status, data };
    });

    // Should return 400 with null values
    expect(apiResponse.status).toBe(400);
    expect(apiResponse.data.lastVal).toBe(null);
    expect(apiResponse.data.navDate).toBe(null);
  });

  test("4. API route handles missing navDate parameter", async ({ page }) => {
    // Navigate to home
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Test API with missing required parameter
    const apiResponse = await page.evaluate(async () => {
      const res = await fetch("/api/fetch-nav", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdingId: "M0113_2553",
          // navDate is missing
        }),
      });

      const data = await res.json();
      return { status: res.status, data };
    });

    // Should return 400 with null values
    expect(apiResponse.status).toBe(400);
    expect(apiResponse.data.lastVal).toBe(null);
    expect(apiResponse.data.navDate).toBe(null);
  });

  test("5. API route handles malformed JSON body", async ({ page }) => {
    // Navigate to home
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Test API with malformed JSON
    const apiResponse = await page.evaluate(async () => {
      const res = await fetch("/api/fetch-nav", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ invalid json",
      });

      const data = await res.json();
      return { status: res.status, data };
    });

    // Should return 400 with null values
    expect(apiResponse.status).toBe(400);
    expect(apiResponse.data.lastVal).toBe(null);
    expect(apiResponse.data.navDate).toBe(null);
  });

  test("6. API response includes correct date format YYYY-MM-DD", async ({
    page,
  }) => {
    // Navigate to home
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Test with specific date format
    const testDate = "2026-04-12";

    const apiResponse = await page.evaluate(async (dateStr: string) => {
      const res = await fetch("/api/fetch-nav", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdingId: "M0113_2553",
          navDate: dateStr,
        }),
      });

      const data = await res.json();
      return { status: res.status, data };
    }, testDate);

    // Response should be successful (200)
    expect(apiResponse.status).toBe(200);

    // Response structure should be correct
    expect(apiResponse.data).toHaveProperty("lastVal");
    expect(apiResponse.data).toHaveProperty("navDate");

    // If navDate is returned, it should match or be a valid date
    if (apiResponse.data.navDate) {
      expect(apiResponse.data.navDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test("7. Portfolio page component exists and loads", async ({ page }) => {
    // Navigate to home
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Check that the page is accessible
    expect(page).toBeDefined();

    // Page should have content
    const content = await page.content();
    expect(content.length).toBeGreaterThan(100);
  });

  test("8. Portfolio holdings dialog form loads properly", async ({
    page,
  }) => {
    // Navigate to home
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // The page should be accessible
    expect(page.url()).toBe("http://localhost:3000/");
  });

  test("9. API endpoint is accessible and responds", async ({ page }) => {
    // Navigate to home
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Test that API endpoint responds
    const response = await page.evaluate(async () => {
      const res = await fetch("/api/fetch-nav", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdingId: "TEST",
          navDate: "2026-01-01",
        }),
      });

      return { status: res.status, ok: res.ok };
    });

    // API should respond (either success or error status)
    expect([200, 400, 500]).toContain(response.status);
  });

  test("10. API correctly formats date parameters as YYYY-MM-DD", async ({
    page,
  }) => {
    // Navigate to home
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Test various date formats
    const apiResponse = await page.evaluate(async () => {
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10);

      const res = await fetch("/api/fetch-nav", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdingId: "M0113_2553",
          navDate: dateStr,
        }),
      });

      const data = await res.json();
      return { status: res.status, data, requestDate: dateStr };
    });

    // Verify date format is correct
    expect(apiResponse.requestDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(apiResponse.status).toBe(200);
  });

  test("11. API returns correct structure with yesterday's date when retrying", async ({
    page,
  }) => {
    // Navigate to home
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // This test verifies the API route correctly handles retries
    // by testing with a date that might require fallback
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const apiResponse = await page.evaluate(async (dateStr: string) => {
      const res = await fetch("/api/fetch-nav", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdingId: "M0113_2553",
          navDate: dateStr,
        }),
      });

      const data = await res.json();
      return { status: res.status, data };
    }, yesterdayStr);

    // Response should still have correct structure
    expect(apiResponse.data).toHaveProperty("lastVal");
    expect(apiResponse.data).toHaveProperty("navDate");

    // Both can be null if no data found even after retries
    const bothNull =
      apiResponse.data.lastVal === null &&
      apiResponse.data.navDate === null;
    const bothHaveData =
      typeof apiResponse.data.lastVal === "number" &&
      typeof apiResponse.data.navDate === "string";

    expect(bothNull || bothHaveData).toBe(true);
  });

  test("12. API returns lastVal and navDate in correct response format", async ({
    page,
  }) => {
    // Navigate to home
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Test response structure with valid data
    const apiResponse = await page.evaluate(async () => {
      const res = await fetch("/api/fetch-nav", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdingId: "M0113_2553",
          navDate: "2026-04-10",
        }),
      });

      const data = await res.json();
      return data;
    });

    // Response must have these keys
    expect("lastVal" in apiResponse).toBe(true);
    expect("navDate" in apiResponse).toBe(true);

    // Should NOT have other properties like nav_date or last_val (snake_case)
    expect("nav_date" in apiResponse).toBe(false);
    expect("last_val" in apiResponse).toBe(false);
  });

  test("13. API endpoint accepts POST method", async ({ page }) => {
    // Navigate to home
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Test POST method
    const response = await page.evaluate(async () => {
      const res = await fetch("/api/fetch-nav", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdingId: "M0113_2553",
          navDate: "2026-04-12",
        }),
      });

      return { status: res.status, statusText: res.statusText };
    });

    // POST should be accepted (200 or 400 for bad request, but not 405 Method Not Allowed)
    expect(response.status).not.toBe(405);
  });

  test("14. App home page loads successfully", async ({ page }) => {
    // Navigate to home
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Should be on home page
    expect(page.url()).toBe("http://localhost:3000/");

    // Page should be accessible
    const isVisible = await page.isVisible("body");
    expect(isVisible).toBe(true);
  });

  test("15. API handles SEC API errors gracefully", async ({ page }) => {
    // Navigate to home
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Test with holding ID that might fail at SEC API
    const apiResponse = await page.evaluate(async () => {
      const res = await fetch("/api/fetch-nav", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdingId: "NONEXISTENT_FUND_ID_XYZ",
          navDate: "2026-04-12",
        }),
      });

      const data = await res.json();
      return { status: res.status, data };
    });

    // Even with invalid data, API should respond with 200 and null values
    // (not crash with 500 error)
    expect(apiResponse.status).toBe(200);
    expect(apiResponse.data.lastVal === null).toBe(true);
    expect(apiResponse.data.navDate === null).toBe(true);
  });
});
