"use client";

import { use, useState } from "react";
import Link from "next/link";
import { PortfolioProvider, usePortfolio } from "@/context/portfolio-context";
import { usePortfolioList } from "@/context/portfolio-list-context";
import { useAllHoldings } from "@/context/holdings-context";
import { Holding, ASSET_TYPE_LABELS, HOLDING_TYPE_LABELS } from "@/types/portfolio";
import { formatTHB, formatPercent, formatAllocation, formatDate, toTHB, maskTHB } from "@/lib/format";
import { usePrivacyMode } from "@/context/privacy-context";
import { HoldingDialog } from "@/components/holding-dialog";
import { PortfolioSummary } from "@/components/portfolio-summary";
import { RebalanceSection } from "@/components/rebalance-section";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PortfolioPage({ params }: PageProps) {
  const { id } = use(params);
  const { portfolios, loading: portfoliosLoading } = usePortfolioList();

  if (portfoliosLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-foreground/50">Loading…</p>
      </div>
    );
  }

  const portfolio = portfolios.find((p) => p.id === id);

  if (!portfolio) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h2 className="text-lg font-semibold">Portfolio Not Found</h2>
        <p className="mt-1 text-sm text-foreground/60">
          The portfolio you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          Back to Portfolios
        </Link>
      </div>
    );
  }

  return (
    <PortfolioProvider portfolioId={id}>
      <HoldingsView portfolioName={portfolio.name} />
    </PortfolioProvider>
  );
}

function HoldingsView({ portfolioName }: { portfolioName: string }) {
  const { holdings, loading, addHolding, updateHolding, removeHolding } = usePortfolio();
  const { reload: reloadAllHoldings } = useAllHoldings();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [navLoading, setNavLoading] = useState(false);
  const [navError, setNavError] = useState<string | null>(null);

  function openAdd() {
    setEditingHolding(null);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(holding: Holding) {
    setEditingHolding(holding);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function handleSave(holding: Omit<Holding, "portfolioId">) {
    if (editingHolding) {
      updateHolding(holding.id, holding);
    } else {
      addHolding(holding);
    }
    reloadAllHoldings();
    setDialogOpen(false);
    setEditingHolding(null);
  }

  function handleDelete(id: string) {
    removeHolding(id);
    reloadAllHoldings();
    setDialogOpen(false);
    setEditingHolding(null);
  }

  function handleClose() {
    setDialogOpen(false);
    setEditingHolding(null);
  }

  function handleNavUpdated(id: string, updates: { currentPrice: number; navDate: string }) {
    updateHolding(id, updates);
    reloadAllHoldings();
  }

  async function updateNavPrices() {
    setNavLoading(true);
    setNavError(null);

    const today = new Date().toISOString().slice(0, 10);
    const holdingsWithId = holdings.filter((h) => h.holdingId && h.holdingId.trim() !== "");

    if (holdingsWithId.length === 0) {
      setNavError("No holdings with a Holding ID set.");
      setNavLoading(false);
      return;
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (isSupabaseConfigured) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
    }

    let updatedCount = 0;

    for (const holding of holdingsWithId) {
      try {
        const res = await fetch("/api/fetch-nav", {
          method: "POST",
          headers,
          body: JSON.stringify({ holdingId: holding.holdingId, navDate: today }),
        });

        if (!res.ok) continue;

        const result = (await res.json()) as { lastVal: number | null; navDate: string | null; error?: string };

        if (result.lastVal !== null) {
          const updates: Partial<Omit<Holding, "id" | "portfolioId">> = {
            currentPrice: result.lastVal,
            currentPriceCurrency: "THB",
            navDate: result.navDate ?? undefined,
          };
          if (
            holding.highestNav === null ||
            holding.highestNav === undefined ||
            result.lastVal > holding.highestNav
          ) {
            updates.highestNav = result.lastVal;
          }
          updateHolding(holding.id, updates);
          updatedCount++;
        }
      } catch {
        // Skip this holding on network error
      }
    }

    reloadAllHoldings();
    setNavLoading(false);

    if (updatedCount === 0) {
      setNavError("No NAV prices could be fetched. Check Holding IDs or try again later.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-foreground/50">Loading holdings…</p>
      </div>
    );
  }

  return (
    <>
      {holdings.length === 0 ? (
        <EmptyState portfolioName={portfolioName} onAdd={openAdd} />
      ) : (
        <PortfolioHoldingsView
          portfolioName={portfolioName}
          holdings={holdings}
          onAdd={openAdd}
          onEdit={openEdit}
          onUpdateNav={updateNavPrices}
          navLoading={navLoading}
          navError={navError}
        />
      )}

      <HoldingDialog
        key={dialogKey}
        open={dialogOpen}
        holding={editingHolding}
        allHoldings={holdings}
        onSave={handleSave}
        onDelete={editingHolding ? handleDelete : undefined}
        onClose={handleClose}
        onNavUpdated={handleNavUpdated}
      />
    </>
  );
}

/**
 * Drawdown is shown only for holdings that have both a holdingId and companyId
 * (non-null, non-empty), and only once a highestNav has been recorded via NAV sync.
 */
function hasDrawdown(holding: Holding): boolean {
  return (
    holding.holdingId !== undefined &&
    holding.holdingId !== null &&
    holding.holdingId.trim() !== "" &&
    holding.companyId !== undefined &&
    holding.companyId !== null &&
    holding.companyId.trim() !== "" &&
    holding.highestNav !== undefined &&
    holding.highestNav !== null
  );
}

/** Drawdown percentage in 0–100 scale, e.g. -7.43. Assumes hasDrawdown() is true. */
function drawdownPercent(holding: Holding): number {
  const highest = holding.highestNav as number;
  if (highest <= 0) return 0;
  return ((holding.currentPrice - highest) / highest) * 100;
}

function formatDrawdown(pct: number): string {
  return `${pct.toFixed(2)}%`;
}

function drawdownColorClass(pct: number): string {
  if (pct <= -10) return "text-neg";
  if (pct <= -5) return "text-orange-500";
  return "text-ink";
}

function isNavStale(holding: Holding): boolean {
  if (!holding.navDate) return true;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  sevenDaysAgo.setUTCHours(0, 0, 0, 0);
  return new Date(holding.navDate) < sevenDaysAgo;
}

function PortfolioHoldingsView({
  portfolioName,
  holdings,
  onAdd,
  onEdit,
  onUpdateNav,
  navLoading,
  navError,
}: {
  portfolioName: string;
  holdings: Holding[];
  onAdd: () => void;
  onEdit: (holding: Holding) => void;
  onUpdateNav: () => Promise<void>;
  navLoading: boolean;
  navError: string | null;
}) {
  const { privacyMode } = usePrivacyMode();
  // Calculate total market value for allocation % (all converted to THB)
  const totalMarketValue = holdings.reduce(
    (sum, h) => sum + h.shares * toTHB(h.currentPrice, h.currentPriceCurrency),
    0
  );

  const lastUpdatedAt = holdings.reduce<Date | undefined>((max, h) => {
    if (!h.updatedAt) return max;
    return max === undefined || h.updatedAt > max ? h.updatedAt : max;
  }, undefined);

  const hasTargets = holdings.some(
    (h) => h.targetAllocation !== null && h.targetAllocation !== undefined,
  );

  const [activeTab, setActiveTab] = useState<"holdings" | "rebalancing">("holdings");

  // When no holding has a target, there is no rebalancing tab — always show holdings.
  const showHoldings = !hasTargets || activeTab === "holdings";
  const showRebalancing = hasTargets && activeTab === "rebalancing";

  return (
    <section aria-label="Portfolio holdings">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink transition-colors"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5m7-7-7 7 7 7"/>
        </svg>
        All portfolios
      </Link>

      {/* Page header */}
      <div className="mt-4 flex items-end justify-between gap-5">
        <div>
          <h1 className="text-[30px] font-extrabold tracking-[-0.02em] text-ink">{portfolioName}</h1>
          <p className="mt-1 text-sm font-medium text-muted">
            <span className="font-bold text-ink">{holdings.length} {holdings.length === 1 ? "holding" : "holdings"}</span>
            {lastUpdatedAt && <span> · Updated {formatDate(lastUpdatedAt)}</span>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            onClick={onUpdateNav}
            disabled={navLoading}
            className="inline-flex h-10 items-center gap-2 rounded-[11px] border border-line2 bg-panel px-4 text-[14px] font-semibold text-muted hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {navLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Updating…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                  <path d="M8 16H3v5"/>
                </svg>
                Update NAV
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex h-10 items-center gap-2 rounded-[11px] bg-accent px-4 text-[14px] font-semibold text-white hover:brightness-110 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5v14"/>
            </svg>
            Add Holding
          </button>
        </div>
      </div>

      {navError && (
        <p className="mt-3 text-sm text-loss">{navError}</p>
      )}

      {/* Hero panel */}
      <div className="mt-[22px]">
        <PortfolioSummary holdings={holdings} />
      </div>

      {/* Tabs (only when any holding has a target) */}
      {hasTargets && (
        <div
          role="tablist"
          aria-label="Portfolio view"
          className="mt-10 flex gap-7 border-b border-line"
        >
          <button
            type="button"
            role="tab"
            id="tab-holdings"
            aria-selected={activeTab === "holdings"}
            aria-controls="panel-holdings"
            tabIndex={activeTab === "holdings" ? 0 : -1}
            onClick={() => setActiveTab("holdings")}
            className={`relative pb-3.5 text-[15px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
              activeTab === "holdings" ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            Holdings
            {activeTab === "holdings" && (
              <span className="absolute bottom-[-1px] left-0 right-0 h-[2.5px] rounded-full bg-accent" />
            )}
          </button>
          <button
            type="button"
            role="tab"
            id="tab-rebalancing"
            aria-selected={activeTab === "rebalancing"}
            aria-controls="panel-rebalancing"
            tabIndex={activeTab === "rebalancing" ? 0 : -1}
            onClick={() => setActiveTab("rebalancing")}
            className={`relative pb-3.5 text-[15px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
              activeTab === "rebalancing" ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            Rebalancing
            {activeTab === "rebalancing" && (
              <span className="absolute bottom-[-1px] left-0 right-0 h-[2.5px] rounded-full bg-accent" />
            )}
          </button>
        </div>
      )}

      {showRebalancing && (
        <div role="tabpanel" id="panel-rebalancing" aria-labelledby="tab-rebalancing">
          <RebalanceSection holdings={holdings} totalMarketValue={totalMarketValue} />
        </div>
      )}

      {showHoldings && (
        <div
          role={hasTargets ? "tabpanel" : undefined}
          id={hasTargets ? "panel-holdings" : undefined}
          aria-labelledby={hasTargets ? "tab-holdings" : undefined}
        >
          {/* Mobile: card layout */}
          <div className="mt-6 space-y-3 sm:hidden">
            {holdings.map((h) => (
              <HoldingCard key={h.id} holding={h} totalMarketValue={totalMarketValue} onEdit={onEdit} />
            ))}
          </div>

          {/* Desktop: table in white card */}
          <div className="mt-6 hidden overflow-hidden rounded-[18px] border border-line bg-panel sm:block"
            style={{ boxShadow: "0 1px 2px rgba(20,20,30,.02)" }}
          >
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="py-[18px] pl-6 pr-3 text-left text-[11px] font-bold uppercase tracking-[0.05em] text-faint whitespace-nowrap">Name</th>
                    <th scope="col" className="py-[18px] px-3 text-left text-[11px] font-bold uppercase tracking-[0.05em] text-faint whitespace-nowrap">Asset Type</th>
                    <th scope="col" className="py-[18px] px-3 text-left text-[11px] font-bold uppercase tracking-[0.05em] text-faint whitespace-nowrap">Type</th>
                    <th scope="col" className="py-[18px] px-3 text-right text-[11px] font-bold uppercase tracking-[0.05em] text-faint whitespace-nowrap">Shares</th>
                    <th scope="col" className="py-[18px] px-3 text-right text-[11px] font-bold uppercase tracking-[0.05em] text-faint whitespace-nowrap">Avg Cost</th>
                    <th scope="col" className="py-[18px] px-3 text-right text-[11px] font-bold uppercase tracking-[0.05em] text-faint whitespace-nowrap">Price</th>
                    <th scope="col" className="py-[18px] px-3 text-right text-[11px] font-bold uppercase tracking-[0.05em] text-faint whitespace-nowrap">NAV Date</th>
                    <th scope="col" className="py-[18px] px-3 text-right text-[11px] font-bold uppercase tracking-[0.05em] text-faint whitespace-nowrap">Drawdown</th>
                    <th scope="col" className="py-[18px] px-3 text-right text-[11px] font-bold uppercase tracking-[0.05em] text-faint whitespace-nowrap">Value</th>
                    <th scope="col" className="py-[18px] px-3 text-right text-[11px] font-bold uppercase tracking-[0.05em] text-faint whitespace-nowrap">Gain / Loss</th>
                    <th scope="col" className="py-[18px] px-3 text-right text-[11px] font-bold uppercase tracking-[0.05em] text-faint whitespace-nowrap">%</th>
                    <th scope="col" className="py-[18px] pl-3 pr-[18px] text-[11px] font-bold uppercase tracking-[0.05em] text-faint"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {holdings.map((h) => {
                    const avgCostTHB = toTHB(h.averageCost, h.averageCostCurrency);
                    const currentPriceTHB = toTHB(h.currentPrice, h.currentPriceCurrency);
                    const marketValue = h.shares * currentPriceTHB;
                    const totalCost = h.shares * avgCostTHB;
                    const gainLoss = marketValue - totalCost;
                    const gainLossPercent = totalCost > 0 ? gainLoss / totalCost : 0;
                    const allocation = totalMarketValue > 0 ? marketValue / totalMarketValue : 0;
                    const isGainPos = gainLoss > 0;
                    const isGainNeg = gainLoss < 0;

                    return (
                      <tr
                        key={h.id}
                        className="border-b border-line last:border-0 transition-colors hover:bg-[#FAFAFB]"
                      >
                        <td className="py-4 pl-6 pr-3">
                          <div className="text-[15px] font-bold tracking-[-0.01em] text-ink">{h.name}</div>
                          {h.updatedAt && (
                            <div className="mt-0.5 text-[12px] font-medium text-faint">{formatDate(h.updatedAt)}</div>
                          )}
                        </td>
                        <td className="py-4 px-3 text-[14px] font-medium text-muted whitespace-nowrap">
                          {ASSET_TYPE_LABELS[h.assetType]}
                        </td>
                        <td className="py-4 px-3">
                          <span className="inline-block rounded-full bg-tag px-3 py-1 text-[12px] font-bold text-tag-ink whitespace-nowrap">
                            {HOLDING_TYPE_LABELS[h.holdingType ?? "core"]}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-right text-[14px] font-semibold text-ink">{h.shares}</td>
                        <td className="py-4 px-3 text-right text-[14px] font-semibold text-muted">{maskTHB(formatTHB(avgCostTHB), privacyMode)}</td>
                        <td className="py-4 px-3 text-right text-[14px] font-semibold text-ink">{maskTHB(formatTHB(currentPriceTHB), privacyMode)}</td>
                        <td className={`py-4 px-3 text-right text-[14px] font-semibold whitespace-nowrap ${h.holdingId && isNavStale(h) ? "text-loss" : "text-muted"}`}>
                          {h.navDate ?? "—"}
                        </td>
                        <td className="py-4 px-3 text-right text-[14px] font-bold tabular-nums whitespace-nowrap">
                          {hasDrawdown(h) ? (
                            <span className={drawdownColorClass(drawdownPercent(h))}>
                              {formatDrawdown(drawdownPercent(h))}
                            </span>
                          ) : (
                            <span className="text-faint">—</span>
                          )}
                        </td>
                        <td className="py-4 px-3 text-right">
                          <div className="text-[14px] font-bold text-ink">{maskTHB(formatTHB(marketValue), privacyMode)}</div>
                          <div className="mt-0.5 text-[12px] font-medium text-muted">{formatAllocation(allocation)}</div>
                        </td>
                        <td className={`py-4 px-3 text-right text-[14px] font-bold ${isGainPos ? "text-pos" : isGainNeg ? "text-neg" : "text-muted"}`}>
                          {gainLoss === 0 ? "—" : maskTHB(formatTHB(gainLoss), privacyMode)}
                        </td>
                        <td className="py-4 px-3 text-right">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12.5px] font-bold ${
                              isGainPos ? "bg-pos-soft text-pos" : isGainNeg ? "bg-neg-soft text-neg" : "bg-tag text-tag-ink"
                            }`}
                          >
                            {isGainPos && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
                              </svg>
                            )}
                            {isGainNeg && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>
                              </svg>
                            )}
                            {formatPercent(gainLossPercent)}
                          </span>
                        </td>
                        <td className="py-4 pl-3 pr-[18px]">
                          <button
                            onClick={() => onEdit(h)}
                            className="flex h-8 w-8 items-center justify-center rounded-[9px] text-faint hover:bg-[#F1F2F4] hover:text-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                            aria-label={`Edit ${h.name}`}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                              <path d="m15 5 4 4"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function HoldingCard({
  holding,
  totalMarketValue,
  onEdit,
}: {
  holding: Holding;
  totalMarketValue: number;
  onEdit: (holding: Holding) => void;
}) {
  const { privacyMode } = usePrivacyMode();
  const avgCostTHB = toTHB(holding.averageCost, holding.averageCostCurrency);
  const currentPriceTHB = toTHB(holding.currentPrice, holding.currentPriceCurrency);
  const marketValue = holding.shares * currentPriceTHB;
  const totalCost = holding.shares * avgCostTHB;
  const gainLoss = marketValue - totalCost;
  const gainLossPercent = totalCost > 0 ? gainLoss / totalCost : 0;
  const allocation = totalMarketValue > 0 ? marketValue / totalMarketValue : 0;
  const isGainPos = gainLoss > 0;
  const isGainNeg = gainLoss < 0;

  return (
    <article
      className="rounded-[16px] border border-line bg-panel px-[18px] py-4"
      style={{ boxShadow: "0 1px 2px rgba(20,20,30,.02)" }}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div>
          <div className="text-[16px] font-bold tracking-[-0.01em] text-ink">{holding.name}</div>
          <div className="mt-[7px] flex items-center gap-2">
            <span className="rounded-full bg-tag px-2.5 py-0.5 text-[11.5px] font-bold text-tag-ink">
              {HOLDING_TYPE_LABELS[holding.holdingType ?? "core"]}
            </span>
            <span className="text-[12px] font-medium text-muted">{ASSET_TYPE_LABELS[holding.assetType]}</span>
          </div>
        </div>
        <button
          onClick={() => onEdit(holding)}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[9px] border border-line bg-[#FBFBFC] text-faint hover:text-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          aria-label={`Edit ${holding.name} holding`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            <path d="m15 5 4 4"/>
          </svg>
        </button>
      </div>

      <div className="mt-3.5 flex items-end justify-between gap-2.5">
        <div>
          <div className="text-[22px] font-extrabold tabular-nums tracking-[-0.02em] text-ink">
            {maskTHB(formatTHB(marketValue), privacyMode)}
          </div>
          <div className="mt-0.5 text-[11.5px] font-medium text-muted tabular-nums">
            {formatAllocation(allocation)} of portfolio
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-bold tabular-nums ${
            isGainPos ? "bg-pos-soft text-pos" : isGainNeg ? "bg-neg-soft text-neg" : "bg-tag text-tag-ink"
          }`}
        >
          {isGainPos && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>}
          {isGainNeg && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>}
          {formatPercent(gainLossPercent)}
        </span>
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-3 border-t border-line pt-3.5">
        <div><div className="text-[11px] font-semibold text-muted">Shares</div><div className="mt-0.5 text-[13.5px] font-bold tabular-nums text-ink">{holding.shares}</div></div>
        <div><div className="text-[11px] font-semibold text-muted">NAV Date</div><div className="mt-0.5 text-[13.5px] font-bold tabular-nums text-muted">{holding.navDate ?? "—"}</div></div>
        <div><div className="text-[11px] font-semibold text-muted">Avg Cost</div><div className="mt-0.5 text-[13.5px] font-bold tabular-nums text-muted">{maskTHB(formatTHB(avgCostTHB), privacyMode)}</div></div>
        <div><div className="text-[11px] font-semibold text-muted">Price</div><div className="mt-0.5 text-[13.5px] font-bold tabular-nums text-ink">{maskTHB(formatTHB(currentPriceTHB), privacyMode)}</div></div>
        {hasDrawdown(holding) && (
          <div>
            <div className="text-[11px] font-semibold text-muted">Drawdown</div>
            <div className={`mt-0.5 text-[13.5px] font-bold tabular-nums ${drawdownColorClass(drawdownPercent(holding))}`}>
              {formatDrawdown(drawdownPercent(holding))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function EmptyState({ portfolioName, onAdd }: { portfolioName: string; onAdd: () => void }) {
  return (
    <section
      aria-label="Empty portfolio"
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
            d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      </div>
      <h2 className="mt-4 text-lg font-semibold">{portfolioName}</h2>
      <p className="mt-1 max-w-sm text-sm text-foreground/60">
        This portfolio is empty. Add your first investment holding.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-[11px] border border-line2 bg-panel px-4 py-2.5 text-[14px] font-semibold text-muted hover:text-ink transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5m7-7-7 7 7 7"/>
          </svg>
          All portfolios
        </Link>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Your First Holding
        </button>
      </div>
    </section>
  );
}
