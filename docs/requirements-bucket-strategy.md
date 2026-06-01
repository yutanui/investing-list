# Requirements: Bucket Strategy Feature

**Date:** 2026-06-01  
**Status:** Ready for implementation  
**Scope:** v1

---

## Background

The app currently categorises holdings as "core" or "satellite". This feature replaces the home-page core/satellite display with a three-bucket strategy view (Bucket 1 = liquidity, Bucket 2 = income/stability, Bucket 3 = growth), adds three new asset types, and lets the user set global target allocations per bucket so they can track actual vs target across all portfolios at a glance.

---

## 1. New Asset Types

### 1.1 Types to Add

Extend `AssetType` in `src/types/portfolio.ts` with three new values:

| Value | Display label | Bucket |
|---|---|---|
| `cash` | Cash | 1 |
| `money_market_fund` | Money Market Fund | 1 |
| `dividend_mutual_fund` | Dividend Mutual Fund | 2 |

Full updated `AssetType` union:

```ts
export type AssetType =
  | "stock"
  | "etf"
  | "mutual_fund"
  | "bond"
  | "cash"
  | "money_market_fund"
  | "dividend_mutual_fund";
```

Update `ASSET_TYPE_LABELS` to include display names for each new type.

### 1.2 Asset Type → Bucket Mapping

Add a pure function (no user override in v1) in `src/types/portfolio.ts` or `src/lib/buckets.ts`:

```ts
export type BucketId = 1 | 2 | 3;

export const BUCKET_LABELS: Record<BucketId, string> = {
  1: "Bucket 1 — Liquidity",
  2: "Bucket 2 — Income & Stability",
  3: "Bucket 3 — Growth",
};

export const ASSET_TYPE_BUCKET: Record<AssetType, BucketId> = {
  cash:                  1,
  money_market_fund:     1,
  dividend_mutual_fund:  2,
  bond:                  2,
  stock:                 3,
  etf:                   3,
  mutual_fund:           3,
};
```

This is the single source of truth. All bucket-derived calculations consume it.

### 1.3 Cash UX — Balance vs Shares/Price Model

The existing holding model uses `shares × currentPrice` to compute market value. Cash does not have a meaningful "price per unit" — the balance _is_ the value.

**Decision for v1:** Keep the same data model. For `cash` holdings, guide the user with label text:

- "Shares / Units" → shown as **"Balance (THB)"** when `assetType === "cash"` or `"money_market_fund"`
- "Average Cost (per unit)" → shown as **"Purchase Amount"** and auto-set to `1` (hidden or read-only)
- "Current Price (per unit)" → shown as **"Current Value per Unit"** and auto-set to `1` (hidden or read-only)

This keeps `shares × 1 × 1 = balance` as market value with zero implementation cost in the data layer. The `HoldingDialog` conditionally changes labels based on selected `assetType`.

**Rationale:** Introducing a separate `balance` field would require a new DB column, storage migration, and formula branches throughout the codebase. For v1, the label-swap approach is sufficient and reversible.

---

## 2. Bucket Target Allocations

### 2.1 Storage Design

Bucket targets are **global per user** — one set of three targets that applies across all portfolios. This follows the app's dual-storage pattern:

| State | Storage |
|---|---|
| Logged out | `localStorage` key `bucket_settings` |
| Logged in | Supabase `bucket_settings` table (one row per `user_id`) |

**Why global, not per-portfolio:** A single strategy view on the home page aggregates all holdings. Per-portfolio targets would require a weighted-average aggregation step and additional UI in `PortfolioDialog` — adding complexity for minimal v1 value.

### 2.2 Supabase Schema

New table (see migration `008` in §5):

```sql
CREATE TABLE bucket_settings (
  user_id   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket1_target  NUMERIC(5, 2) NOT NULL DEFAULT 0,
  bucket2_target  NUMERIC(5, 2) NOT NULL DEFAULT 0,
  bucket3_target  NUMERIC(5, 2) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- One row per authenticated user (`user_id` is both PK and FK).
- Values stored as whole-number percentages (e.g. `20.00` = 20%). The three need not sum to 100.
- RLS: user can only read/write their own row.

### 2.3 localStorage Schema

Key: `bucket_settings`  
Value: JSON object

```json
{
  "bucket1Target": 20,
  "bucket2Target": 30,
  "bucket3Target": 50
}
```

Absent or unparseable → default all three to `0`.

### 2.4 TypeScript Model

```ts
export interface BucketSettings {
  bucket1Target: number;  // 0–100
  bucket2Target: number;
  bucket3Target: number;
}

export const DEFAULT_BUCKET_SETTINGS: BucketSettings = {
  bucket1Target: 0,
  bucket2Target: 0,
  bucket3Target: 0,
};
```

### 2.5 BucketSettingsProvider

Create `src/context/bucket-settings-context.tsx`. Mount it inside `AuthProvider` (alongside or inside `PortfolioListProvider`) in `AppShell`.

**Context value:**

```ts
interface BucketSettingsContextValue {
  settings: BucketSettings;
  loading: boolean;
  updateSettings: (settings: BucketSettings) => Promise<void>;
}
```

**Behaviour:**

- On mount: if logged in, load from Supabase (upsert row on first save); if logged out, load from `localStorage`.
- `updateSettings`: saves to whichever backend is active; optimistic local state update.
- On auth state change (login/logout): reload from the appropriate backend.
- Supabase path uses `upsert` on `bucket_settings` (conflict on `user_id`).

### 2.6 Where Users Edit Targets

Add a settings UI to the home page — a compact inline form (not a modal) rendered above or below the bucket summary cards. A small "Edit targets" button reveals three number inputs and a save button. On save, call `updateSettings`. Show the same "Total: X%" hint as before, styled `text-loss` when sum ≠ 100.

`PortfolioDialog` does **not** include bucket target inputs.

---

## 3. Home Page Summary Changes

### 3.1 Remove Core/Satellite from Home Page Only

Remove the second `<dl>` row in `PortfolioSummary` (the core/satellite breakdown grid). The top four stat cards (Market Value, Total Cost, Gain/Loss, Return) are kept unchanged.

The `typeValues` calculation and any `typeBreakdown` field in `PortfolioStats` / `HoldingsProvider` can be removed once no home-page call site references them. **Leave core/satellite logic intact on the portfolio detail page** (`/portfolio/[id]`) — that is out of scope for v1.

### 3.2 Add Bucket Summary Section

Below the four stat cards on the home page, render a new `BucketSummary` component. It aggregates **all holdings across all portfolios** using data already available from `HoldingsProvider`.

**Each of the three bucket cards shows:**

| Row | Content |
|---|---|
| Label | `BUCKET_LABELS[bucketId]` |
| Actual amount | `formatTHB(actualValue)` |
| Actual % | `formatAllocation(actualPercent)` |
| Target % | `X%` from `BucketSettings` |
| Delta | `Δ +2.5%` / `Δ -4.0%` styled `text-gain` / `text-loss` |

Layout: `grid grid-cols-1 gap-3 sm:grid-cols-3` — same pattern used elsewhere.

**Target/delta rows:** If all three targets are `0` (user has not configured them), hide the target and delta rows entirely. Show only actual amounts to avoid a confusing "0% target" display on first use.

### 3.3 Data Flow

`page.tsx` already has access to `allHoldings` via `HoldingsProvider` and `settings` via `BucketSettingsContext`. Compute bucket totals inline in `page.tsx` (or in a small helper in `src/lib/buckets.ts`) and pass the result down as props to `BucketSummary`.

**Computation sketch:**

```ts
// For each bucket 1..3:
const actualValue = allHoldings
  .filter(h => ASSET_TYPE_BUCKET[h.assetType] === bucketId)
  .reduce((sum, h) => sum + toTHB(h.shares * h.currentPrice, h.currentPriceCurrency), 0);

const totalValue = /* sum of all holdings */;
const actualPercent = totalValue > 0 ? actualValue / totalValue : 0;
const targetPercent = settings[`bucket${bucketId}Target`] / 100;
const delta = actualPercent - targetPercent;
```

### 3.4 Rendering Location

Create `src/components/bucket-summary.tsx` as a new component. Render it in `src/app/page.tsx` immediately after `<PortfolioSummary>`. Keep `PortfolioSummary` changes minimal (remove the core/satellite row only).

---

## 4. Portfolio Detail Page (Unchanged for v1)

Core/satellite display on `/portfolio/[id]` is kept as-is. The bucket breakdown is not shown on the detail page in v1.

---

## 5. Supabase Migrations

Run migrations in order via the Supabase SQL Editor.

### Migration `008_add_bucket_settings.sql`

```sql
-- Create per-user bucket target settings table.
-- One row per authenticated user; bucket targets stored as percentages (0–100).

CREATE TABLE IF NOT EXISTS bucket_settings (
  user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket1_target NUMERIC(5, 2) NOT NULL DEFAULT 0,
  bucket2_target NUMERIC(5, 2) NOT NULL DEFAULT 0,
  bucket3_target NUMERIC(5, 2) NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Row Level Security: users can only access their own row.
ALTER TABLE bucket_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own bucket settings"
  ON bucket_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at on row change.
CREATE OR REPLACE FUNCTION update_bucket_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bucket_settings_updated_at
  BEFORE UPDATE ON bucket_settings
  FOR EACH ROW EXECUTE FUNCTION update_bucket_settings_updated_at();
```

### Migration `009_add_asset_types.sql`

`asset_type` is a `TEXT` column with a `CHECK` constraint (confirmed in `001_create_holdings.sql`). The constraint must be dropped and recreated to allow the new values:

```sql
-- Extend the asset_type CHECK constraint to include new types.
-- Find the exact constraint name with:
--   SELECT conname FROM pg_constraint WHERE conrelid = 'holdings'::regclass AND contype = 'c';
-- Replace the name below if different.

ALTER TABLE holdings DROP CONSTRAINT IF EXISTS holdings_asset_type_check;

ALTER TABLE holdings
  ADD CONSTRAINT holdings_asset_type_check
  CHECK (asset_type IN (
    'stock', 'etf', 'mutual_fund', 'bond',
    'cash', 'money_market_fund', 'dividend_mutual_fund'
  ));
```

---

## 6. Implementation Checklist (Ordered)

Complete steps in this order to avoid broken intermediate states.

1. **`src/types/portfolio.ts`** — add three asset types, update `ASSET_TYPE_LABELS`, add `BucketId` type, `BUCKET_LABELS`, `ASSET_TYPE_BUCKET` map, and `BucketSettings` interface + `DEFAULT_BUCKET_SETTINGS`.
2. **`supabase/008_add_bucket_settings.sql`** — create `bucket_settings` table with RLS.
3. **`supabase/009_add_asset_types.sql`** — extend `asset_type` CHECK constraint.
4. **`src/context/bucket-settings-context.tsx`** (new) — `BucketSettingsProvider` with dual-storage load/save logic; mount in `AppShell`.
5. **`src/lib/storage.ts`** — add `loadBucketSettings` / `saveBucketSettings` helpers for the `localStorage` path.
6. **`src/components/holding-dialog.tsx`** — conditional label swap for `cash` / `money_market_fund` asset types.
7. **`src/context/holdings-context.tsx`** — remove `typeBreakdown` / `typeValues` from `PortfolioStats` once confirmed unused on home page.
8. **`src/components/portfolio-summary.tsx`** — remove core/satellite breakdown row.
9. **`src/components/bucket-summary.tsx`** (new) — three-card bucket breakdown component; accepts computed bucket data as props.
10. **`src/app/page.tsx`** — consume `BucketSettingsContext`, compute per-bucket actual/target/delta, render `BucketSummary` below `PortfolioSummary`; add inline "Edit targets" form wired to `updateSettings`.

---

## 7. Out of Scope for v1

- Manual bucket override per holding (bucket is always derived from asset type).
- Bucket breakdown on the portfolio detail page (`/portfolio/[id]`).
- Removing or replacing core/satellite on the portfolio detail page.
- Per-portfolio bucket targets.
- Rebalancing suggestions or auto-allocation recommendations.
- NAV sync for `money_market_fund` or `dividend_mutual_fund` types (can be added later by extending the sync filter from `asset_type === "mutual_fund"` to include these).
- Currency conversion for cash balances held in USD (treated same as other holdings — use existing `toTHB` helper).
- Charts or visualisations of bucket allocations.
- Per-bucket gain/loss tracking (bucket cards show market value and target %, not cost basis).
