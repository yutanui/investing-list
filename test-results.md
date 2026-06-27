# Holding Drawdown Feature - Test Results

## STATUS: PASS

All 14 test cases passed successfully.

## CYCLES_REMAINING: 3

## Test Execution Summary

**Date:** 2026-06-26  
**Test Suite:** `tests/holding-drawdown.spec.ts`  
**Total Tests:** 14  
**Passed:** 14  
**Failed:** 0

### Test Results

1. **Drawdown column visible on desktop holding table** - PASS
   - Verified the "Drawdown" column header appears on the portfolio detail page holding table (desktop view)

2. **Drawdown shown for eligible holding with -6.67% value** - PASS
   - Confirmed drawdown displays correctly for holdings with both `holdingId` and `companyId` set
   - Value formatted as "-6.67%" with 2 decimal places

3. **Drawdown shown for high drawdown holding with -12% value** - PASS
   - Verified drawdown calculation: ((currentPrice - highestNav) / highestNav) * 100
   - Drawdown of -12% shows correctly for eligible holdings

4. **Drawdown shows 0.00% with neutral color** - PASS
   - When drawdown is exactly 0%, displayed as "0.00%"
   - Uses `text-ink` (neutral/dark) color class

5. **Drawdown hidden for holding without holdingId** - PASS
   - Holdings missing `holdingId` do not display drawdown value
   - Shows "—" (dash) in drawdown column instead

6. **Drawdown hidden for holding without companyId** - PASS
   - Holdings missing `companyId` do not display drawdown value
   - Shows "—" (dash) in drawdown column instead

7. **Drawdown hidden for holding without highestNav** - PASS
   - Holdings where `highestNav` is null/undefined do not display drawdown
   - Shows "—" (dash) in drawdown column instead

8. **Drawdown hidden for holding with empty string holdingId** - PASS
   - Holdings with empty string "" for `holdingId` are treated as ineligible
   - Shows "—" (dash) in drawdown column instead

9. **Mobile card shows drawdown for eligible holding** - PASS
   - On mobile viewport (375px), holding cards display drawdown field
   - Value "-6.67%" appears for eligible holdings on mobile

10. **Mobile card shows drawdown 0.00% with neutral color** - PASS
    - Mobile cards show "0.00%" drawdown when applicable
    - Neutral color styling applied

11. **Mobile card hides drawdown for ineligible holding** - PASS
    - Mobile cards do not show drawdown label for ineligible holdings
    - Drawdown field is completely absent from card UI

12. **Color coding: -7.25% shows orange** - PASS
    - Drawdown between -5% and -10% displays in orange (`text-orange-500`)
    - Color threshold: -5.00% to -9.99%

13. **Color coding: -10% shows red** - PASS
    - Drawdown at -10% or worse displays in red (`text-neg`)
    - Color threshold: -10.00% and below

14. **Color coding: -4.99% shows neutral (ink)** - PASS
    - Drawdown better than -5% displays in neutral dark color (`text-ink`)
    - Color threshold: 0.00% to -4.99%

## Feature Validation

### Requirements Met

- [x] Drawdown column visible on desktop table
- [x] Drawdown displayed for holdings with both `holdingId` and `companyId` set
- [x] Drawdown hidden for holdings missing either `holdingId` or `companyId`
- [x] Drawdown hidden when `highestNav` is null/undefined
- [x] Drawdown formatted as "X.XX%" with 2 decimal places
- [x] Color coding applied correctly:
  - Neutral (`text-ink`) for 0.00% to -4.99%
  - Orange (`text-orange-500`) for -5.00% to -9.99%
  - Red (`text-neg`) for -10.00% and below
- [x] Mobile cards display drawdown for eligible holdings
- [x] Mobile cards hide drawdown for ineligible holdings
- [x] Calculation correct: ((currentPrice - highestNav) / highestNav) * 100

## Test Coverage

- Desktop table rendering: 8 tests
- Mobile card rendering: 3 tests
- Color coding thresholds: 3 tests

All functional requirements verified. Feature is working as specified.
