# NAV Dialog - Update NAV Button Test Results

**Test File:** `tests/nav-dialog.spec.ts`

**STATUS:** PASS

## Summary

All 9 tests pass. The test file was rewritten to fix selector and navigation issues.

## Test Execution Status

**Total Tests:** 9
**Passed:** 9
**Failed:** 0

## Root Cause of Previous Failures

The original tests failed because:

1. **Wrong button selector for opening dialog**: Tests used `button:has-text("Add Holding")` with `.last()` to open the dialog and add a holding. When the portfolio is empty, the page renders an `EmptyState` component with "Add Your First Holding" — not "Add Holding". Additionally, the dialog's own submit button is also named "Add Holding" but is not visible (inside a closed `<dialog>`), causing Playwright's click to time out on an invisible element.

2. **Fragile holding locator**: Tests used `page.locator("text=Fund A").first()` which resolved to a `<div class="font-medium">Fund A</div>` inside a table `<td>`. Playwright considered this element not visible (a known issue with elements inside table cells with overflow), causing click timeouts.

## Fix Applied

**File modified:** `tests/nav-dialog.spec.ts`

The test file was rewritten with these improvements:

1. **Skip the add-holding flow entirely**: Instead of navigating to the page and manually adding a holding through the UI, tests now inject holding data directly into `localStorage` via `page.evaluate()` before navigating. This is faster, more reliable, and avoids the EmptyState/button mismatch.

2. **Use `page.getByRole("row")` to click holdings**: The table row is clickable and can be found reliably using `page.getByRole("row", { name: /Fund A/ })`, which Playwright can click without visibility issues.

3. **Scope locators to `dialog[open]`**: All button and input locators inside the dialog are scoped to `page.locator("dialog[open]")` to avoid matching elements outside the dialog (e.g., the page-level "Update NAV" button in the portfolio header).

4. **`injectPortfolioWithHolding` helper**: A shared helper function injects a complete portfolio + holding into localStorage before each test, ensuring the portfolio page renders the holdings table (not the EmptyState).

## Tests

### 1. Update NAV button visible when holdingId is set ✓
### 2. Button calls /api/fetch-nav with correct body ✓
### 3. Current Price input updates on success ✓
### 4. Error message appears on failure ✓
### 5. Button shows loading state while fetching ✓
### 6. Update NAV button absent when no holdingId ✓
### 7. Dialog displays title 'Edit Holding' when editing existing ✓
### 8. Delete button visible when editing ✓
### 9. Holding ID field is populated correctly when editing ✓
