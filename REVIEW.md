# Code Review: React Best Practices & Composition Patterns

Review of the investing-list project against Vercel's [React Best Practices](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md) and [Composition Patterns](https://github.com/vercel-labs/agent-skills/blob/main/skills/composition-patterns/SKILL.md) skills.

---

## React Best Practices

### 1. Eliminating Waterfalls (CRITICAL)

**Issue: Sequential data loading on the home page** (`src/app/page.tsx:22-51`)

The home page loads holdings *after* portfolios finish loading due to the `if (loading) return;` guard in the effect. This creates a waterfall: first portfolios load, then holdings start loading. These two fetches are independent and could be parallelized.

```tsx
// Current: sequential — holdings wait for portfolios
useEffect(() => {
  if (loading) return;          // waits for portfolios
  supabase.from("holdings")...  // then loads holdings
}, [user, loading]);
```

**Recommendation:** Load holdings in the `PortfolioListProvider` alongside portfolios, or use a parallel fetch pattern so both requests fire simultaneously.

**Issue: No Suspense boundaries** (entire app)

The app uses manual `loading` state checks everywhere instead of React Suspense boundaries. This means the entire page is blocked until all data loads, rather than showing partial UI progressively.

---

### 2. Bundle Size Optimization (CRITICAL)

**Good:** No barrel file imports detected. Imports are direct and specific.

**Issue: All pages are client components** (`src/app/page.tsx:1`, `src/app/portfolio/[id]/page.tsx:1`)

Both pages use `"use client"` at the top level, which means the entire page tree (including static parts like headings, empty states, layout chrome) is sent as client JavaScript. This prevents the Next.js App Router from leveraging server components to reduce bundle size.

**Recommendation:** Extract data-fetching and interactive logic into smaller client components, and keep the page-level components as server components where possible.

**Issue: Dialog components always mounted** (`src/app/page.tsx:124-131`)

`PortfolioDialog` and `HoldingDialog` are always in the DOM even when closed. These could use `React.lazy()` + dynamic import to avoid loading dialog code until needed.

---

### 3. Server-Side Performance (HIGH)

**Issue: No server-side data fetching at all**

The entire app runs client-side. With Next.js App Router, the portfolio list page could fetch initial data on the server, eliminating the loading spinner on first paint.

**Issue: Layout renders client providers at the root** (`src/app/layout.tsx:30-36`)

`AuthProvider` and `PortfolioListProvider` wrap the entire app in the root layout, forcing the entire component tree to become a client boundary.

---

### 4. Client-Side Data Fetching (MEDIUM-HIGH)

**Issue: Direct Supabase calls scattered across components** (`src/app/page.tsx:28-46`)

The home page directly calls `supabase.from("holdings")` outside of the context system. This creates a parallel data-fetching path that bypasses the `PortfolioContext`.

**Recommendation:** Centralize all data fetching inside context providers.

**Good:** The stale flag pattern in `portfolio-context.tsx:77` and `portfolio-list-context.tsx:56` correctly prevents race conditions.

---

### 5. Re-render Optimization (MEDIUM)

**Issue: `useCallback` with `portfolios` dependency** (`src/context/portfolio-list-context.tsx:100-106`)

`addPortfolio`, `updatePortfolio`, and `removePortfolio` have `portfolios` in their dependency arrays. These callbacks are recreated every time the portfolio list changes, causing re-renders of all consumers.

**Fix:** Use the functional updater form of `setPortfolios` to remove the `portfolios` dependency:

```tsx
const addPortfolio = useCallback(
  async (portfolio: Portfolio) => {
    // ...
    setPortfolios(prev => {
      const next = [...prev, portfolio];
      savePortfolios(next);
      return next;
    });
  },
  [user], // no portfolios dependency
);
```

**Issue: Context value not memoized** (`src/context/portfolio-list-context.tsx:161`)

The object `{ portfolios, loading, addPortfolio, updatePortfolio, removePortfolio }` is created on every render, causing all consumers to re-render even when nothing changed. Wrap it in `useMemo`.

**Good:** `PortfolioSummary` computes derived values during render without `useEffect` — correct pattern.

---

### 6. Rendering Performance (MEDIUM)

**Good:** `tabular-nums` CSS is used for numeric columns.

**Good:** Responsive layouts use CSS (`hidden sm:block`, `sm:hidden`) rather than JavaScript conditionals.

---

### 7. JavaScript Performance (LOW-MEDIUM)

**Issue: Recalculating stats on every render** (`src/app/page.tsx:53-68`)

`getPortfolioStats` rebuilds the stats map on each render. Memoize with `useMemo` keyed on `portfolios` and `allHoldings`.

**Good:** `Intl.NumberFormat` instances are created once at module level (`src/lib/format.ts:14-32`).

---

## Composition Patterns

### 1. Component Architecture (HIGH)

**Good: No boolean prop proliferation detected.**

Dialog components use clear prop interfaces (`open`, `portfolio`, `onSave`, `onDelete`, `onClose`) rather than boolean flags. The `isEditing` derivation (`!!portfolio`) is kept internal.

**Opportunity:** `PortfolioDialog` and `HoldingDialog` share identical patterns (~150 lines of duplicated dialog boilerplate). Consider a compound `Dialog` component:

```tsx
<Dialog open={open} onClose={onClose}>
  <Dialog.Header title="Edit Holding" />
  <Dialog.Body>...</Dialog.Body>
  <Dialog.Footer>...</Dialog.Footer>
</Dialog>
```

---

### 2. State Management (MEDIUM)

**Good: Context interfaces are well-structured** — follows the recommended `State + Actions` separation.

**Good: State management is decoupled from UI** — providers handle Supabase/localStorage transparently.

**Good: Provider scope is well-managed** — `PortfolioProvider` is scoped to the detail page, not global.

---

### 3. Implementation Patterns (MEDIUM)

**Good: Children composition used over render props.**

**Good: Explicit component variants** — `PortfolioHoldingsView`, `HoldingCard`, and `EmptyState` are separate functions.

---

### 4. React 19 APIs (MEDIUM)

**Good: `use()` used instead of `useContext()`** — all three context hooks follow the React 19 pattern.

**Good: `use()` used for async params** (`src/app/portfolio/[id]/page.tsx:17`)

**Good: React 19 context shorthand** — `<AuthContext value={...}>` instead of `<AuthContext.Provider>`.

---

## Summary

| Category | Priority | Status |
|---|---|---|
| Eliminating Waterfalls | CRITICAL | Needs improvement |
| Bundle Size | CRITICAL | Needs improvement |
| Server-Side Performance | HIGH | Needs improvement |
| Client-Side Data Fetching | MEDIUM-HIGH | Partial |
| Re-render Optimization | MEDIUM | Needs improvement |
| Rendering Performance | MEDIUM | Good |
| JavaScript Performance | LOW-MEDIUM | Minor |
| Component Architecture | HIGH | Good |
| State Management | MEDIUM | Good |
| React 19 APIs | MEDIUM | Good |

### Top 5 Action Items (by impact)

1. **Move data fetching to server components** — Convert page-level components to server components, push `"use client"` down to interactive parts only
2. **Parallelize portfolio + holdings fetches** — Eliminate the waterfall on the home page
3. **Fix `useCallback` dependencies in `portfolio-list-context`** — Use functional updaters to remove `portfolios` from dependency arrays
4. **Memoize context values** — Wrap provider value objects in `useMemo` to prevent consumer re-renders
5. **Centralize data fetching** — Move the direct Supabase call in `page.tsx` into the context/provider layer
