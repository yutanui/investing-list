# Plan: Portfolio Navigation Menu

## Goal
Add a sidebar navigation menu that contains all portfolio cards with sorting. The home page (`/`) becomes a summary/dashboard. Clicking a portfolio card in the nav navigates to its detail view.

## Current State
- `/` — Shows portfolio cards in a grid with sorting + overall summary
- `/portfolio/[id]` — Shows holdings for a single portfolio
- No sidebar or persistent portfolio navigation

## Proposed Layout

```
┌─────────────────────────────────────────────────────┐
│  Header (app title + auth)                          │
├──────────────────┬──────────────────────────────────┤
│  Sidebar Nav     │  Main Content                    │
│                  │                                  │
│  [Sort controls] │  / → Portfolio Summary Dashboard │
│                  │      (total market value, cost,  │
│  ┌────────────┐  │       gain/loss, return %)       │
│  │ Portfolio 1 │  │                                  │
│  │ card       │  │  /portfolio/[id] → Holdings      │
│  └────────────┘  │      (existing detail view)      │
│  ┌────────────┐  │                                  │
│  │ Portfolio 2 │  │                                  │
│  │ card       │  │                                  │
│  └────────────┘  │                                  │
│                  │                                  │
│  [+ Add Portfolio│                                  │
│    button]       │                                  │
│                  │                                  │
└──────────────────┴──────────────────────────────────┘
```

**Mobile:** Sidebar collapses into a hamburger menu / slide-out drawer.

## Implementation Steps

### Step 1: Create `PortfolioNav` sidebar component
**New file:** `src/components/portfolio-nav.tsx`

- A client component that renders a vertical sidebar
- Contains:
  - "Summary" link at the top (navigates to `/`, highlighted when on home page)
  - Sort controls (sort key dropdown + asc/desc toggle) — moved from `page.tsx`
  - Scrollable list of `PortfolioCard` components (the existing cards, reused as-is)
  - "Add Portfolio" button at the bottom
  - `PortfolioDialog` for add/edit (moved from `page.tsx`)
- Needs access to: `PortfolioListContext` (portfolios), holdings data (for card stats), current route (for active highlight)
- On mobile: hidden by default, toggled via a hamburger button

### Step 2: Move holdings-loading logic to a shared location
**New file:** `src/context/holdings-context.tsx`

- Currently, the home page (`page.tsx`) loads all holdings in a `useEffect` to compute portfolio stats for the cards
- The sidebar needs this same data, but it lives in `layout.tsx` (persistent across routes)
- Create a `HoldingsProvider` / `useAllHoldings()` context that:
  - Loads all holdings once (from Supabase or localStorage)
  - Provides `allHoldings` array and `getPortfolioStats(id)` helper
  - Wraps the app in `layout.tsx` alongside the existing providers

### Step 3: Update root layout
**Modify:** `src/app/layout.tsx`

- Wrap children with `HoldingsProvider`
- Change the main content area to a flex layout: `[PortfolioNav sidebar | main content]`
- The sidebar is always rendered (handled by `PortfolioNav`)
- Adjust `max-w-5xl` container to accommodate sidebar + content

### Step 4: Update Header for mobile menu toggle
**Modify:** `src/components/header.tsx`

- Add a hamburger/menu button (visible on mobile only) that toggles the sidebar
- Pass toggle state down or use a simple context/callback

### Step 5: Simplify the home page to a summary dashboard
**Modify:** `src/app/page.tsx`

- Remove: portfolio cards grid, sorting controls, `PortfolioDialog`, holdings loading, `PortfolioListView`, `EmptyState` — all of this moves to the sidebar
- Keep: `PortfolioSummary` component as the main content
- Add: a heading like "Portfolio Summary" and show the summary cards (market value, cost, gain/loss, return %)
- When no portfolios exist, show a simple message pointing to the sidebar to add one
- Consume holdings from the new `HoldingsProvider` context instead of loading them locally

### Step 6: Clean up portfolio detail page
**Modify:** `src/app/portfolio/[id]/page.tsx`

- Remove the "All Portfolios" back link (sidebar provides navigation now)
- Everything else stays the same

## Files Summary

| File | Action | What Changes |
|------|--------|--------------|
| `src/context/holdings-context.tsx` | **Create** | Shared holdings data provider |
| `src/components/portfolio-nav.tsx` | **Create** | Sidebar nav with cards, sorting, add button |
| `src/app/layout.tsx` | **Modify** | Add HoldingsProvider + sidebar layout |
| `src/components/header.tsx` | **Modify** | Add mobile hamburger toggle |
| `src/app/page.tsx` | **Modify** | Simplify to summary dashboard |
| `src/app/portfolio/[id]/page.tsx` | **Modify** | Remove back link |

## No Changes To
- `src/components/portfolio-card.tsx` — reused as-is in the sidebar
- `src/components/portfolio-summary.tsx` — reused as-is on the dashboard
- `src/components/portfolio-dialog.tsx` — reused as-is (moved to sidebar)
- `src/types/portfolio.ts` — no type changes
- `src/lib/*` — no utility changes
- Routes — no new routes needed
