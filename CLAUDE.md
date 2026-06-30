# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Coding Principles

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

## Commands

```bash
pnpm dev      # Start development server (http://localhost:3000)
pnpm build    # Production build
pnpm lint     # Run ESLint
npx playwright test  # Run Playwright tests (requires dev server running)
```

Package manager: **pnpm**. Playwright is installed (`@playwright/test`) — a debug spec lives in `tests/debug-nav.spec.ts`, but no full test suite is configured.

## Git workflow

Always implement new features on a dedicated branch — never commit directly to `main`:

```bash
git checkout -b feature/<short-description>
```

Open a pull request to merge back into `main` when the feature is ready.

## Environment Setup

Copy `.env.local.example` to `.env.local` and fill in credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SEC_API_KEY=your-sec-api-subscription-key
```

- Without Supabase vars, the app runs in local-only mode (no auth, data stored in localStorage).
- `SEC_API_KEY` is a Thailand SEC API subscription key required for the `/api/fetch-nav` route. Without it, NAV fetching returns a 500 error.

## Architecture

**Next.js 16 App Router** app using React 19 and Tailwind CSS v4. No UI component library — all components are hand-written with inline Tailwind classes.

### Dual-storage pattern

Every context has two code paths:
- **Logged in** → reads/writes Supabase (cloud sync)
- **Logged out** → reads/writes `localStorage` via `src/lib/storage.ts`

This is the central architectural pattern. `isSupabaseConfigured` gates whether auth is even attempted.

### Context hierarchy (rendered in `AppShell`)

```
AuthProvider                  ← Supabase auth state + recovery mode
  PrivacyModeProvider         ← in-memory privacy toggle (masks THB amounts)
    PortfolioListProvider     ← list of portfolios (CRUD)
      HoldingsProvider        ← all holdings aggregated for portfolio card stats
        BucketSettingsProvider    ← bucket target allocations (persisted per user)
          RebalanceSettingsProvider ← drift threshold (persisted per user)
            Header + <page content>
              PortfolioProvider ← per-portfolio holdings (CRUD), mounted per route
```

`HoldingsProvider` (`src/context/holdings-context.tsx`) loads a lightweight subset of all holdings to compute `PortfolioStats` shown in portfolio cards on the home page. `PortfolioProvider` (`src/context/portfolio-context.tsx`) loads full holding details for a single portfolio page. After mutations, pages call `reload()` from `HoldingsProvider` to refresh portfolio card stats.

### Privacy context (`src/context/privacy-context.tsx`)

In-memory only — never persisted. Exposes `privacyMode` (boolean) and `togglePrivacyMode()`. When enabled, THB amounts across the app are masked. `Header` renders the privacy toggle button (`data-testid="privacy-toggle"`).

### Auth context (`src/context/auth-context.tsx`)

Exposes `user`, `loading`, `isRecoveryMode`, and these actions:
- `signIn(email, password)` / `signOut()` / `signUp(email, password)`
- `resetPassword(email)` — sends a reset link via Supabase; redirects back to origin
- `updatePassword(password)` — updates password when in recovery mode
- `clearRecoveryMode()` — clears the `isRecoveryMode` flag after the reset flow completes

`isRecoveryMode` is set to `true` when Supabase fires the `PASSWORD_RECOVERY` auth event (triggered by clicking the reset link in email). `Header` watches this and auto-opens `AuthDialog` in `reset_new_password` mode.

### Rebalance settings context (`src/context/rebalance-settings-context.tsx`)

Mounted in `AppShell` below `BucketSettingsProvider`. Exposes `rebalanceSettings` (`{ driftThreshold }`), `loading`, and `updateRebalanceSettings(partial)`. Logged in → reads/writes the `rebalance_settings` Supabase table (upsert on `user_id`); logged out → `DEFAULT_REBALANCE_SETTINGS` in-memory only (no localStorage for MVP).

### Rebalancing logic (`src/lib/rebalance.ts`)

Pure utility (no React) housing all drift math:
- `holdingValueTHB(holding)` — `shares * toTHB(currentPrice, currency)`
- `computeDrift(holdings, totalValueTHB)` → `DriftRow[]` — one row per holding with a non-null `targetAllocation`; percentages are plain 0–100 numbers (divide by 100 before passing to `formatPercent`/`formatAllocation`)
- `computeTransfers(driftRows, driftThreshold)` → `TransferSuggestion[]` — filters rows outside the threshold, then greedy two-pointer match between overweight sources and underweight destinations

### Components

All components are in `src/components/` — hand-written with inline Tailwind, no UI library.

| Component | Purpose |
|---|---|
| `app-shell.tsx` | Root layout wrapper — mounts providers and renders `Header` + `<main>` (centered `max-w-[1280px]` container) around `{children}`; no sidebar |
| `header.tsx` | Sticky navy-accent top nav: layers logo + "Investing Portfolio" wordmark, privacy toggle (`data-testid="privacy-toggle"`), navy "Add Portfolio" primary button (opens `PortfolioDialog`), user chip + Sign Out / Sign In; auto-opens `AuthDialog` in recovery mode |
| `auth-dialog.tsx` | Modal for all auth flows — four modes: `sign_in`, `sign_up`, `reset_request` (sends email link), `reset_new_password` (set new password after recovery) |
| `portfolio-nav.tsx` | Collapsible left sidebar with sortable portfolio list (retained but not rendered — was replaced by in-page cards grid on homepage) |
| `portfolio-card.tsx` | Card used on the home page in the portfolios grid (hover-lift, white panel); shows portfolio name, holdings count, total value, cost, and a pos/neg return chip. Receives `gainLossPercent` as a ratio (0–1) and passes it straight to `formatPercent` (no `/100`). Still accepts a `gainLoss` prop in its interface though the new design no longer reads it |
| `portfolio-dialog.tsx` | Modal (`<dialog>`) for creating / editing / deleting a portfolio |
| `holding-dialog.tsx` | Modal (`<dialog>`) for creating / editing / deleting a holding; includes all fields: name, ticker, asset type, holding type, target allocation (%), shares, average cost + currency, current price + currency, company ID, holding ID; the target-allocation field shows a running "Total allocated: X% across N holdings" footer (takes optional `allHoldings` prop to compute it, excluding the edited holding) |
| `portfolio-summary.tsx` | Hero panel (rounded white card, two-column layout): large Market Value with all-time return chip on the left, a 2×2 grid of Total Cost / Gain-Loss / Return on the right |
| `bucket-summary.tsx` | Three bucket cards (Core / Satellite / etc.) with a progress track and target marker per card; shows actual %, target %, and signed delta when targets are set |
| `rebalance-section.tsx` | Rebalancing block on the portfolio page (only rendered when ≥1 holding has a `targetAllocation`): drift table (desktop) / card list (mobile), inline ±drift-threshold input in the header, and a Suggested Transfers subsection driven by `src/lib/rebalance.ts` + `useRebalanceSettings`. Rows are sorted by `targetPct` descending for display (slice+sort inside the component, not in `computeDrift`). Drift table includes "Current Value" (`holdingValueTHB(row.holding)`) and "Target Amount" (`(row.targetPct / 100) * totalMarketValue`) columns after "Actual" and before "Drift", in both desktop table and mobile cards |

Dialog pattern: all dialogs use the native `<dialog>` element (`showModal()` / `close()`), auto-focus the first input, close on Escape or backdrop click.

Responsive layout: mobile shows card-based views; desktop (`sm:` breakpoint) shows table layout for holdings. There is no sidebar — portfolio cards appear in a responsive grid (1 col mobile, 2 cols sm, 3 cols lg) on the home page below the summary section.

### Design tokens

UI follows a "Neutral gray + Navy" theme: gray app background (`#F0F1F4`), white cards, deep navy accent. Font is **Plus Jakarta Sans** (imported via `@import url(...)` at the top of `globals.css`, before `@import "tailwindcss"` — the order matters or the build warns).

Custom Tailwind color aliases (all defined in `@theme inline` in `src/app/globals.css`; in Tailwind v4 each `--color-X` becomes `text-X` / `bg-X` / `border-X`):
- `text-gain` / `text-loss` — legacy green / red return colors (still used in a few places)
- `text-foreground` / `bg-background` — theme-aware base colors
- `panel` (#FFFFFF card surface), `ink` (#1B1B22 primary text), `muted` / `faint` (secondary / tertiary text)
- `line` / `line2` (borders), `track` (progress-bar track), `tag` / `tag-ink` (neutral pills)
- `accent` / `accent-soft` (navy primary + soft navy bg)
- `pos` / `pos-soft` and `neg` / `neg-soft` (positive / negative value chips and soft backgrounds)

Conventions: navy `bg-accent` for primary buttons; `border-line2 bg-panel` for secondary buttons; gain/loss chips use `bg-pos-soft text-pos` / `bg-neg-soft text-neg`; cards use `rounded-[18px] border border-line bg-panel` with a soft inline `boxShadow`.

### Pages

| Route | File | Description |
|---|---|---|
| `/` | `src/app/page.tsx` | Aggregated summary + sortable portfolio cards grid; editing uses `PortfolioDialog` inline; "Add Portfolio" button in `Header` also opens the dialog; includes "Sync NAV" button (syncs all mutual_fund holdings with a holdingId across all portfolios concurrently; also bumps `highest_nav`/`highestNav` when the fetched `lastVal` exceeds the stored peak) |
| `/portfolio/[id]` | `src/app/portfolio/[id]/page.tsx` | Per-portfolio holdings view; desktop table + mobile card list; mounts `PortfolioProvider`; "Update NAV" + "Add Holding" buttons always visible. Update NAV also raises `highestNav` when `lastVal` exceeds the stored peak. A "Drawdown" column (desktop) / field (mobile card) shows `((currentPrice - highestNav) / highestNav) * 100` formatted to 2 decimals with `%`, only for holdings where both `holdingId` and `companyId` are non-empty AND `highestNav` is set; color-coded via `drawdownColorClass` (0 to -4.99% `text-ink`, -5 to -9.99% `text-orange-500`, ≤-10% `text-neg`). When any holding has a `targetAllocation`, a "Holdings" / "Rebalancing" tab bar (ARIA `role="tablist"`, local React state, default "Holdings", no URL/context) renders below `PortfolioSummary` and gates the holdings list vs. `RebalanceSection`. With no targets there is no tab bar — holdings render directly |

### API Routes

| Route | File | Description |
|---|---|---|
| `POST /api/fetch-nav` | `src/app/api/fetch-nav/route.ts` | Server-side proxy to Thailand SEC API; requires `SEC_API_KEY` env var; validates Bearer token against Supabase when configured; accepts `{ holdingId, navDate }`, retries up to 3 days back on 204/empty, returns `{ lastVal, navDate }` or `{ lastVal: null, navDate: null, error }` |

### Data model (`src/types/portfolio.ts`)

- `Portfolio`: `{ id, name }`
- `Holding`: belongs to one portfolio; has `assetType` (stock/etf/mutual_fund/bond/cash/money_market_fund/dividend_mutual_fund), `holdingType` (core/satellite), `shares`, `averageCost`/`currentPrice` each with a `Currency` (THB/USD), plus optional `ticker`, `companyId`, `holdingId`, `navDate` (last fetched NAV date string), `targetAllocation` (desired % of total portfolio value, 0–100, null = excluded from rebalancing), `highestNav` (peak NAV ever recorded; system-managed during NAV sync only — never editable in `HoldingDialog`; null until first sync), and `updatedAt` (set by DB trigger)
- `BucketId`: `1 | 2 | 3` — bucket strategy identifiers; `ASSET_TYPE_BUCKET` maps every `AssetType` to a `BucketId`; `BucketSettings` / `DEFAULT_BUCKET_SETTINGS` hold per-user target allocations (persisted via `bucket_settings` Supabase table when logged in, localStorage when logged out)
- `RebalanceSettings` / `DEFAULT_REBALANCE_SETTINGS`: `{ driftThreshold }` (percentage points, default 5); persisted per-user via `rebalance_settings` table when logged in, in-memory only when logged out
- Cash-like asset types (`cash`, `money_market_fund`): in `HoldingDialog` the "Shares / Units" label becomes "Balance (THB)" and Average Cost / Current Price fields are hidden — both are submitted as `1` via hidden inputs so `shares * 1 = THB balance`

### Currency and formatting (`src/lib/format.ts`)

All display values are converted to THB using a **fixed rate** of 1 USD = 32 THB (`USD_TO_THB_RATE`). Helpers:
- `toTHB(amount, currency)` — converts to THB; never compare costs across currencies without this
- `formatTHB(amount)` — formats as Thai Baht currency string
- `formatPercent(ratio)` — formats with sign (e.g. +5.00%)
- `formatAllocation(ratio)` — formats without sign (e.g. 60.00%), for allocation display
- `formatDate(date)` — formats as `d Mon YYYY` (e.g. "21 May 2026")

### Supabase schema

SQL migrations are in `supabase/` (run manually via Supabase SQL Editor in order):
1. `001_create_holdings.sql` — holdings table with RLS
2. `002_add_portfolios.sql` — portfolios table; adds `portfolio_id` to holdings
3. `003_add_currency.sql` — currency columns
4. `004_add_holding_type.sql` — holding_type column
5. `005_add_updated_at_trigger.sql` — `updated_at` timestamp on holdings, auto-updated by trigger
6. `006_add_company_holding_ids.sql` — optional `company_id` and `holding_id` columns on holdings
7. `007_add_nav_date.sql` — optional `nav_date` TEXT column on holdings
8. `008_add_bucket_settings.sql` — `bucket_settings` table (user_id PK, bucket1–3 targets, RLS, updated_at trigger)
9. `009_add_asset_types.sql` — drops and recreates `holdings_asset_type_check` to include `cash`, `money_market_fund`, `dividend_mutual_fund`
10. `010_add_target_allocation.sql` — optional `target_allocation` NUMERIC(5,2) column on holdings
11. `011_add_rebalance_settings.sql` — `rebalance_settings` table (user_id PK, drift_threshold, RLS, reuses `set_updated_at()` trigger)
12. `012_add_highest_nav.sql` — optional `highest_nav` NUMERIC(10,4) column on holdings (system-managed peak NAV, updated only during NAV sync, never via UI)

DB column naming is snake_case; TypeScript field naming is camelCase. Context files contain mapper functions (`rowToHolding`, `rowToPortfolio`) for conversion.

Row Level Security is enabled — each user can only access their own rows via `auth.uid() = user_id`.

### Deployment

Deployed to **Netlify** via `@netlify/plugin-nextjs`. Config in `netlify.toml`.
