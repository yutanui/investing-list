# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
AuthProvider               ← Supabase auth state + recovery mode
  PortfolioListProvider    ← list of portfolios (CRUD)
    HoldingsProvider       ← all holdings aggregated for sidebar stats
      <page content>
        PortfolioProvider  ← per-portfolio holdings (CRUD), mounted per route
```

`HoldingsProvider` (`src/context/holdings-context.tsx`) loads a lightweight subset of all holdings to compute `PortfolioStats` shown in sidebar cards. `PortfolioProvider` (`src/context/portfolio-context.tsx`) loads full holding details for a single portfolio page. After mutations, pages call `reload()` from `HoldingsProvider` to refresh sidebar stats.

### Auth context (`src/context/auth-context.tsx`)

Exposes `user`, `loading`, `isRecoveryMode`, and these actions:
- `signIn(email, password)` / `signOut()` / `signUp(email, password)`
- `resetPassword(email)` — sends a reset link via Supabase; redirects back to origin
- `updatePassword(password)` — updates password when in recovery mode
- `clearRecoveryMode()` — clears the `isRecoveryMode` flag after the reset flow completes

`isRecoveryMode` is set to `true` when Supabase fires the `PASSWORD_RECOVERY` auth event (triggered by clicking the reset link in email). `Header` watches this and auto-opens `AuthDialog` in `reset_new_password` mode.

### Components

All components are in `src/components/` — hand-written with inline Tailwind, no UI library.

| Component | Purpose |
|---|---|
| `app-shell.tsx` | Root layout wrapper — mounts providers and renders `Header` + `<main>` around `{children}`; no sidebar |
| `header.tsx` | Top nav bar with app title, "Add Portfolio" button (opens `PortfolioDialog`), and auth controls (Sign In / Sign Out); auto-opens `AuthDialog` in recovery mode |
| `auth-dialog.tsx` | Modal for all auth flows — four modes: `sign_in`, `sign_up`, `reset_request` (sends email link), `reset_new_password` (set new password after recovery) |
| `portfolio-nav.tsx` | Collapsible left sidebar with sortable portfolio list (retained but not rendered — was replaced by in-page cards grid on homepage) |
| `portfolio-card.tsx` | Card used on the home page in the portfolios grid; shows portfolio name, holdings count, total value, cost, and gain/loss |
| `portfolio-dialog.tsx` | Modal (`<dialog>`) for creating / editing / deleting a portfolio |
| `holding-dialog.tsx` | Modal (`<dialog>`) for creating / editing / deleting a holding; includes all fields: name, ticker, asset type, holding type, shares, average cost + currency, current price + currency, company ID, holding ID |
| `portfolio-summary.tsx` | Stat cards grid: Market Value, Total Cost, Gain/Loss, Return %; plus a core/satellite breakdown row |

Dialog pattern: all dialogs use the native `<dialog>` element (`showModal()` / `close()`), auto-focus the first input, close on Escape or backdrop click.

Responsive layout: mobile shows card-based views; desktop (`sm:` breakpoint) shows table layout for holdings. There is no sidebar — portfolio cards appear in a responsive grid (1 col mobile, 2 cols sm, 3 cols lg) on the home page below the summary section.

### Design tokens

Custom Tailwind color aliases used throughout (defined in the global CSS / Tailwind config):
- `text-gain` / `bg-gain` — green, positive returns
- `text-loss` / `bg-loss` — red, negative returns
- `text-foreground` / `bg-background` — theme-aware base colors

### Pages

| Route | File | Description |
|---|---|---|
| `/` | `src/app/page.tsx` | Aggregated summary + sortable portfolio cards grid; editing uses `PortfolioDialog` inline; "Add Portfolio" button in `Header` also opens the dialog; includes "Sync NAV" button (syncs all mutual_fund holdings with a holdingId across all portfolios concurrently) |
| `/portfolio/[id]` | `src/app/portfolio/[id]/page.tsx` | Per-portfolio holdings view; desktop table + mobile card list; mounts `PortfolioProvider`; includes "Update NAV" button |

### API Routes

| Route | File | Description |
|---|---|---|
| `POST /api/fetch-nav` | `src/app/api/fetch-nav/route.ts` | Server-side proxy to Thailand SEC API; requires `SEC_API_KEY` env var; validates Bearer token against Supabase when configured; accepts `{ holdingId, navDate }`, retries up to 3 days back on 204/empty, returns `{ lastVal, navDate }` or `{ lastVal: null, navDate: null, error }` |

### Data model (`src/types/portfolio.ts`)

- `Portfolio`: `{ id, name }`
- `Holding`: belongs to one portfolio; has `assetType` (stock/etf/mutual_fund/bond/cash/money_market_fund/dividend_mutual_fund), `holdingType` (core/satellite), `shares`, `averageCost`/`currentPrice` each with a `Currency` (THB/USD), plus optional `ticker`, `companyId`, `holdingId`, `navDate` (last fetched NAV date string), and `updatedAt` (set by DB trigger)
- `BucketId`: `1 | 2 | 3` — bucket strategy identifiers; `ASSET_TYPE_BUCKET` maps every `AssetType` to a `BucketId`; `BucketSettings` / `DEFAULT_BUCKET_SETTINGS` hold per-user target allocations (Phase 2 will add a provider/persistence layer)
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

DB column naming is snake_case; TypeScript field naming is camelCase. Context files contain mapper functions (`rowToHolding`, `rowToPortfolio`) for conversion.

Row Level Security is enabled — each user can only access their own rows via `auth.uid() = user_id`.

### Deployment

Deployed to **Netlify** via `@netlify/plugin-nextjs`. Config in `netlify.toml`.
