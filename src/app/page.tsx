"use client";

import { useState } from "react";
import { usePortfolioList } from "@/context/portfolio-list-context";
import { useAllHoldings } from "@/context/holdings-context";
import { useBucketSettings } from "@/context/bucket-settings-context";
import { PortfolioSummary } from "@/components/portfolio-summary";
import { BucketSummary } from "@/components/bucket-summary";
import { PortfolioCard } from "@/components/portfolio-card";
import { PortfolioDialog } from "@/components/portfolio-dialog";
import { Portfolio, ASSET_TYPE_BUCKET, BucketId, BucketSettings, DEFAULT_BUCKET_SETTINGS } from "@/types/portfolio";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { loadHoldings, saveHoldings } from "@/lib/storage";
import { toTHB } from "@/lib/format";

type SortKey = "name" | "amount" | "returns";
type SortDirection = "asc" | "desc";
type SyncState = "idle" | "loading" | "success" | "error";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "amount", label: "Amount" },
  { value: "returns", label: "% Returns" },
];

export default function HomePage() {
  const { portfolios, loading: portfoliosLoading, addPortfolio, updatePortfolio, removePortfolio } = usePortfolioList();
  const { allHoldings, loading: holdingsLoading, getPortfolioStats, reload: reloadAllHoldings } = useAllHoldings();

  const { settings, updateSettings } = useBucketSettings();

  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncingPortfolioName, setSyncingPortfolioName] = useState<string | null>(null);
  const [editingTargets, setEditingTargets] = useState(false);
  const [targetInputs, setTargetInputs] = useState<BucketSettings>(DEFAULT_BUCKET_SETTINGS);

  async function syncNavPrices() {
    setSyncState("loading");

    try {
      const today = new Date().toISOString().slice(0, 10);

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (isSupabaseConfigured) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }
      }

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("holdings")
          .select("id, holding_id, asset_type, nav_date, portfolio_id");

        if (error) throw new Error(error.message);

        const targets = (data ?? []).filter(
          (row) => row.asset_type === "mutual_fund" && row.holding_id && row.holding_id.trim() !== ""
        );

        if (targets.length === 0) {
          setSyncingPortfolioName(null);
          setSyncState("success");
          setTimeout(() => setSyncState("idle"), 2000);
          return;
        }

        // Group by portfolio
        const portfolioMap = new Map<string, { name: string; rows: typeof targets }>();
        for (const row of targets) {
          const pid = row.portfolio_id as string;
          const name = portfolios.find((p) => p.id === pid)?.name ?? pid;
          if (!portfolioMap.has(pid)) portfolioMap.set(pid, { name, rows: [] });
          portfolioMap.get(pid)!.rows.push(row);
        }

        // Process each portfolio sequentially
        for (const [, group] of portfolioMap) {
          setSyncingPortfolioName(group.name);
          for (const row of group.rows) {
            try {
              const res = await fetch("/api/fetch-nav", {
                method: "POST",
                headers,
                body: JSON.stringify({ holdingId: row.holding_id, navDate: today }),
              });

              if (!res.ok) continue;

              const result = (await res.json()) as { lastVal: number | null; navDate: string | null };

              if (result.lastVal !== null) {
                await supabase
                  .from("holdings")
                  .update({
                    current_price: result.lastVal,
                    current_price_currency: "THB",
                    nav_date: result.navDate,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", row.id);
              }
            } catch {
              // Skip this holding on network error
            }
          }
        }
      } else {
        // localStorage path
        const targets = loadHoldings().filter(
          (h) => h.assetType === "mutual_fund" && h.holdingId && h.holdingId.trim() !== ""
        );

        if (targets.length === 0) {
          setSyncingPortfolioName(null);
          setSyncState("success");
          setTimeout(() => setSyncState("idle"), 2000);
          return;
        }

        // Group by portfolio
        const portfolioMapLS = new Map<string, { name: string; holdings: typeof targets }>();
        for (const h of targets) {
          const name = portfolios.find((p) => p.id === h.portfolioId)?.name ?? h.portfolioId;
          if (!portfolioMapLS.has(h.portfolioId)) portfolioMapLS.set(h.portfolioId, { name, holdings: [] });
          portfolioMapLS.get(h.portfolioId)!.holdings.push(h);
        }

        const allStoredHoldings = loadHoldings();

        for (const [, group] of portfolioMapLS) {
          setSyncingPortfolioName(group.name);
          for (const holding of group.holdings) {
            try {
              const res = await fetch("/api/fetch-nav", {
                method: "POST",
                headers,
                body: JSON.stringify({ holdingId: holding.holdingId, navDate: today }),
              });

              if (!res.ok) continue;

              const result = (await res.json()) as { lastVal: number | null; navDate: string | null };

              if (result.lastVal !== null) {
                const idx = allStoredHoldings.findIndex((s) => s.id === holding.id);
                if (idx !== -1) {
                  allStoredHoldings[idx] = {
                    ...allStoredHoldings[idx],
                    currentPrice: result.lastVal,
                    currentPriceCurrency: "THB" as const,
                    navDate: result.navDate ?? undefined,
                    updatedAt: new Date(),
                  };
                }
              }
            } catch {
              // Skip this holding on network error
            }
          }
        }

        saveHoldings(allStoredHoldings);
      }

      setSyncingPortfolioName(null);
      reloadAllHoldings();
      setSyncState("success");
      setTimeout(() => setSyncState("idle"), 2000);
    } catch {
      setSyncingPortfolioName(null);
      setSyncState("error");
      setTimeout(() => setSyncState("idle"), 3000);
    }
  }

  if (portfoliosLoading || holdingsLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-foreground/50">Loading portfolios…</p>
      </div>
    );
  }

  const statsMap = new Map(
    portfolios.map((p) => [p.id, getPortfolioStats(p.id)]),
  );

  const totalAllValue = allHoldings.reduce(
    (sum, h) => sum + h.shares * toTHB(h.currentPrice, h.currentPriceCurrency),
    0,
  );

  const bucketData = ([1, 2, 3] as BucketId[]).map((bucketId) => {
    const actualValue = allHoldings
      .filter((h) => ASSET_TYPE_BUCKET[h.assetType] === bucketId)
      .reduce((sum, h) => sum + h.shares * toTHB(h.currentPrice, h.currentPriceCurrency), 0);
    const actualPercent = totalAllValue > 0 ? actualValue / totalAllValue : 0;
    const targetPercent = settings[`bucket${bucketId}Target` as keyof BucketSettings] / 100;
    const delta = actualPercent - targetPercent;
    return { bucketId, actualValue, actualPercent, targetPercent, delta };
  });

  const showTargets =
    settings.bucket1Target > 0 || settings.bucket2Target > 0 || settings.bucket3Target > 0;

  const sortedPortfolios = [...portfolios].sort((a, b) => {
    const statsA = statsMap.get(a.id)!;
    const statsB = statsMap.get(b.id)!;
    let cmp = 0;
    switch (sortKey) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "amount":
        cmp = statsA.totalValue - statsB.totalValue;
        break;
      case "returns":
        cmp = statsA.gainLossPercent - statsB.gainLossPercent;
        break;
    }
    return sortDirection === "asc" ? cmp : -cmp;
  });

  function openEdit(portfolio: Portfolio) {
    setEditingPortfolio(portfolio);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function handleSave(portfolio: Portfolio) {
    if (editingPortfolio) {
      updatePortfolio(portfolio.id, portfolio);
    } else {
      addPortfolio(portfolio);
    }
    setDialogOpen(false);
    setEditingPortfolio(null);
  }

  function handleDelete(id: string) {
    removePortfolio(id);
    setDialogOpen(false);
    setEditingPortfolio(null);
  }

  function handleClose() {
    setDialogOpen(false);
    setEditingPortfolio(null);
  }

  if (portfolios.length === 0) {
    return (
      <section
        aria-label="Empty portfolio list"
        className="flex flex-col items-center justify-center py-24 text-center"
      >
        <div className="rounded-full bg-foreground/5 p-4">
          <svg
            className="h-8 w-8 text-foreground/30"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
            />
          </svg>
        </div>
        <h2 className="mt-4 text-lg font-semibold">No Portfolios Yet</h2>
        <p className="mt-1 max-w-sm text-sm text-foreground/60">
          Create your first portfolio using the &ldquo;Add Portfolio&rdquo; button in the header.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Portfolio overview">
      {/* Summary section */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Portfolio Summary
        </h2>
        <p className="mt-1 text-sm text-foreground/60">
          {portfolios.length} {portfolios.length === 1 ? "portfolio" : "portfolios"} · {allHoldings.length} {allHoldings.length === 1 ? "holding" : "holdings"}
        </p>

        <div className="mt-6">
          <PortfolioSummary holdings={allHoldings} />
        </div>

        {/* Bucket Strategy Summary */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-foreground/70">Bucket Strategy</h3>
            {!editingTargets && (
              <button
                type="button"
                onClick={() => {
                  setTargetInputs(settings);
                  setEditingTargets(true);
                }}
                className="text-xs text-foreground/50 hover:text-foreground/80 underline underline-offset-2"
              >
                Edit targets
              </button>
            )}
          </div>

          {editingTargets && (
            <form
              className="mb-4 rounded-lg border border-foreground/15 px-4 py-3 space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                await updateSettings(targetInputs);
                setEditingTargets(false);
              }}
            >
              <p className="text-xs font-medium text-foreground/60">Set target allocations (%)</p>
              <div className="grid grid-cols-3 gap-3">
                {([1, 2, 3] as BucketId[]).map((id) => (
                  <div key={id}>
                    <label className="text-xs text-foreground/50 mb-1 block">Bucket {id}</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={targetInputs[`bucket${id}Target` as keyof BucketSettings]}
                      onChange={(e) =>
                        setTargetInputs((prev) => ({
                          ...prev,
                          [`bucket${id}Target`]: Number(e.target.value),
                        }))
                      }
                      className="w-full rounded-md border border-foreground/20 bg-background px-2 py-1.5 text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs ${
                    targetInputs.bucket1Target + targetInputs.bucket2Target + targetInputs.bucket3Target === 100
                      ? "text-foreground/50"
                      : "text-loss"
                  }`}
                >
                  Total: {targetInputs.bucket1Target + targetInputs.bucket2Target + targetInputs.bucket3Target}%
                  {targetInputs.bucket1Target + targetInputs.bucket2Target + targetInputs.bucket3Target !== 100 &&
                    " (should be 100%)"}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTargets(false)}
                    className="text-xs text-foreground/50 hover:text-foreground/80"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:bg-foreground/90"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          )}

          <BucketSummary buckets={bucketData} showTargets={showTargets} />
        </div>
      </div>

      {/* Portfolio cards section */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight">Portfolios</h3>

          <div className="flex items-center gap-2">
            {/* Sync NAV button */}
            <button
              type="button"
              onClick={syncNavPrices}
              disabled={syncState === "loading"}
              className={[
                "inline-flex items-center gap-1.5 rounded-md border border-foreground/20 px-3 py-2 text-sm font-medium text-foreground/80 hover:border-foreground/40 hover:bg-foreground/[0.04] focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                syncState === "success" ? "text-gain" : "",
                syncState === "error" ? "text-loss" : "",
              ].join(" ").trim()}
            >
              {syncState === "loading" ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {syncingPortfolioName ? (
                    <span className="max-w-[120px] truncate">{syncingPortfolioName}</span>
                  ) : (
                    "Syncing..."
                  )}
                </>
              ) : syncState === "success" ? (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Synced
                </>
              ) : syncState === "error" ? (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  Sync failed
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Sync NAV
                </>
              )}
            </button>

            {/* Sort controls — shown when there are multiple portfolios */}
            {portfolios.length > 1 && (
              <>
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="rounded-md border border-foreground/20 bg-background px-2 py-1.5 text-xs text-foreground focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
                  aria-label="Sort portfolios by"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setSortDirection((d) => (d === "asc" ? "desc" : "asc"))}
                  className="inline-flex items-center gap-1 rounded-md border border-foreground/20 px-2 py-1.5 text-xs text-foreground/80 hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
                  aria-label={`Sort ${sortDirection === "asc" ? "ascending" : "descending"}`}
                >
                  {sortDirection === "asc" ? (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m6-6v12m0 0-3.75-3.75M14.25 19.5l3.75-3.75" />
                    </svg>
                  ) : (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0-3.75-3.75M17.25 19.5l3.75-3.75" />
                    </svg>
                  )}
                  {sortDirection === "asc" ? "Asc" : "Desc"}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedPortfolios.map((p) => {
            const stats = statsMap.get(p.id)!;
            return (
              <PortfolioCard
                key={p.id}
                portfolio={p}
                holdingsCount={stats.holdingsCount}
                totalValue={stats.totalValue}
                totalCost={stats.totalCost}
                gainLoss={stats.gainLoss}
                gainLossPercent={stats.gainLossPercent}
                onEdit={() => openEdit(p)}
              />
            );
          })}
        </div>
      </div>

      <PortfolioDialog
        key={dialogKey}
        open={dialogOpen}
        portfolio={editingPortfolio}
        onSave={handleSave}
        onDelete={editingPortfolio ? handleDelete : undefined}
        onClose={handleClose}
      />
    </section>
  );
}
