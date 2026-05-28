# Test Results: NAV Sync v2 - navDate Preservation on Manual Save

**STATUS: PASS**

All 5 functional tests passed successfully. The change to `holding-dialog.tsx` correctly preserves `navDate` when manually saving holdings, rather than overwriting it with today's date.

## Test Breakdown

| Test # | Name | Result | Details |
|--------|------|--------|---------|
| 1 | navDate NOT changed when manually saving a holding with `holdingId` | PASS | Existing holding with `holdingId` and 10-day-old `navDate` was edited (shares changed from 100 to 150), and `navDate` was preserved at the original date |
| 2 | navDate NOT changed when manually saving a holding with `companyId` | PASS | Existing holding with `companyId` and 7-day-old `navDate` was edited (price changed from 160 to 165), and `navDate` was preserved at the original date |
| 3 | navDate NOT changed when manually saving a holding with neither ID | PASS | Existing holding without `holdingId` or `companyId`, with 3-day-old `navDate`, was edited (shares changed from 200 to 250), and `navDate` was preserved at the original date |
| 4 | navDate NOT set when saving a NEW holding with `holdingId` | PASS | New holding created with `holdingId` set was saved, and `navDate` was absent (undefined) in localStorage |
| 5 | Stale NAV highlighting still works | PASS | Existing Feature 2 functionality verified: holding with `holdingId` and 8-day-old `navDate` displays with `text-loss` CSS class on the NAV Date column in desktop table view |

## Change Validation

The change removed the following code from `holding-dialog.tsx` `handleSubmit` function:
```javascript
// OLD CODE (removed):
if ((holding?.holdingId || holding?.companyId)) {
  navDate: new Date().toISOString().slice(0, 10),
}
```

Result: `navDate` is now completely omitted from the `saved` object in `handleSubmit`, allowing it to be preserved from the existing holding data through the context's update logic.

## Key Findings

- The `handleSubmit` function in `holding-dialog.tsx` no longer sets `navDate` on the saved object
- `navDate` is correctly preserved from existing holdings through the edit flow
- New holdings created without a pre-existing `navDate` do not have one set
- The "Update NAV" button (which calls `/api/fetch-nav`) still sets `navDate` independently — this behavior is unchanged
- Stale NAV highlighting feature (Feature 2) remains unbroken with the change
- All three scenarios work correctly:
  1. Editing existing holding → `navDate` preserved
  2. Creating new holding → no `navDate` set
  3. Updating NAV via button → `navDate` set by API response

## Test Environment

- Browser: Chromium
- Viewport: 1200×800 (for desktop table visibility in Test 5)
- Storage: localStorage (local-only mode, no Supabase)
- App URL: http://localhost:3000
- Portfolio key: `investing-list-portfolios-v1`
- Holdings key: `investing-list-holdings-v2`

## Execution Details

- Test file: `/home/user/investing-list/tests/nav-sync-v2.spec.ts`
- Total tests: 5
- Passed: 5
- Failed: 0
- Execution time: 13.6 seconds

## Functional Requirements Met

✓ Manual saves to holdings do not overwrite `navDate`
✓ New holdings do not auto-set `navDate`
✓ Update NAV button still controls `navDate` independently
✓ Stale NAV highlighting continues to work correctly
✓ All three ID scenarios work as specified (holdingId, companyId, neither)
