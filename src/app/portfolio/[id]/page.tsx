"use client";

import { use, useState } from "react";
import Link from "next/link";
import { PortfolioProvider, usePortfolio } from "@/context/portfolio-context";
import { usePortfolioList } from "@/context/portfolio-list-context";
import { useAllHoldings } from "@/context/holdings-context";
import { Holding, ASSET_TYPE_LABELS, HOLDING_TYPE_LABELS } from "@/types/portfolio";
import { formatTHB, formatPercent, formatAllocation, formatDate, toTHB } from "@/lib/format";
import { HoldingDialog } from "@/components/holding-dialog";
import { PortfolioSummary } from "@/components/portfolio-summary";

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

    let updatedCount = 0;

    for (const holding of holdingsWithId) {
      try {
        const res = await fetch("/api/fetch-nav", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ holdingId: holding.holdingId, navDate: today }),
        });

        if (!res.ok) continue;

        const result = (await res.json()) as { lastVal: number | null; navDate: string | null; error?: string };

        if (result.lastVal !== null) {
          updateHolding(holding.id, {
            currentPrice: result.lastVal,
            currentPriceCurrency: "THB",
            navDate: result.navDate ?? undefined,
          });
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
        onSave={handleSave}
        onDelete={editingHolding ? handleDelete : undefined}
        onClose={handleClose}
        onNavUpdated={handleNavUpdated}
      />
    </>
  );
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
  // Calculate total market value for allocation % (all converted to THB)
  const totalMarketValue = holdings.reduce(
    (sum, h) => sum + h.shares * toTHB(h.currentPrice, h.currentPriceCurrency),
    0
  );

  const lastUpdatedAt = holdings.reduce<Date | undefined>((max, h) => {
    if (!h.updatedAt) return max;
    return max === undefined || h.updatedAt > max ? h.updatedAt : max;
  }, undefined);

  return (
    <section aria-label="Portfolio holdings">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {portfolioName}
          </h2>
          <p className="mt-1 text-sm text-foreground/60">
            {holdings.length} {holdings.length === 1 ? "holding" : "holdings"}
          </p>
          {lastUpdatedAt && (
            <p className="mt-0.5 text-xs text-foreground/40">
              Updated {formatDate(lastUpdatedAt)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onUpdateNav}
            disabled={navLoading}
            className="inline-flex items-center gap-1.5 rounded-md border border-foreground/20 px-3 py-2 text-sm font-medium text-foreground/80 hover:border-foreground/40 hover:bg-foreground/[0.04] focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Update NAV
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Holding
          </button>
        </div>
      </div>

      {navError && (
        <p className="mt-3 text-sm text-loss">{navError}</p>
      )}

      <div className="mt-6">
        <PortfolioSummary holdings={holdings} />
      </div>

      {/* Mobile: card layout */}
      <div className="mt-6 space-y-3 sm:hidden">
        {holdings.map((h) => (
          <HoldingCard key={h.id} holding={h} totalMarketValue={totalMarketValue} onEdit={onEdit} />
        ))}
      </div>

      {/* Desktop: table layout */}
      <div className="mt-6 hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-foreground/10 text-xs uppercase tracking-wide text-foreground/60">
              <th scope="col" className="pb-3 pr-4 font-medium">Name</th>
              <th scope="col" className="pb-3 pr-4 font-medium">Asset Type</th>
              <th scope="col" className="pb-3 pr-4 font-medium">Type</th>
              <th scope="col" className="pb-3 pr-4 text-right font-medium">Shares</th>
              <th scope="col" className="pb-3 pr-4 text-right font-medium">Avg Cost</th>
              <th scope="col" className="pb-3 pr-4 text-right font-medium">Price</th>
              <th scope="col" className="pb-3 pr-4 text-right font-medium">NAV Date</th>
              <th scope="col" className="pb-3 pr-4 text-right font-medium">Value</th>
              <th scope="col" className="pb-3 pr-4 text-right font-medium">Gain/Loss</th>
              <th scope="col" className="pb-3 pr-4 text-right font-medium">%</th>
              <th scope="col" className="pb-3 font-medium"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {holdings.map((h) => {
              // Convert to THB for consistent display
              const avgCostTHB = toTHB(h.averageCost, h.averageCostCurrency);
              const currentPriceTHB = toTHB(h.currentPrice, h.currentPriceCurrency);
              const marketValue = h.shares * currentPriceTHB;
              const totalCost = h.shares * avgCostTHB;
              const gainLoss = marketValue - totalCost;
              const gainLossPercent = totalCost > 0 ? gainLoss / totalCost : 0;
              const allocation = totalMarketValue > 0 ? marketValue / totalMarketValue : 0;
              const gainLossColor = gainLoss > 0 ? "text-gain" : gainLoss < 0 ? "text-loss" : "";

              return (
                <tr
                  key={h.id}
                  onClick={() => onEdit(h)}
                  className="cursor-pointer border-b border-foreground/5 transition-colors hover:bg-foreground/[0.04]"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onEdit(h);
                    }
                  }}
                >
                  <td className="py-3 pr-4">
                    <div className="font-medium">{h.name}</div>
                    {h.ticker && (
                      <div className="text-xs text-foreground/50">{h.ticker}</div>
                    )}
                    {h.updatedAt && (
                      <div className="text-xs text-foreground/35">{formatDate(h.updatedAt)}</div>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-foreground/65">
                    {ASSET_TYPE_LABELS[h.assetType]}
                  </td>
                  <td className="py-3 pr-4 text-foreground/65">
                    {HOLDING_TYPE_LABELS[h.holdingType ?? "core"]}
                  </td>
                  <td className="py-3 pr-4 text-right">{h.shares}</td>
                  <td className="py-3 pr-4 text-right">{formatTHB(avgCostTHB)}</td>
                  <td className="py-3 pr-4 text-right">{formatTHB(currentPriceTHB)}</td>
                  <td className="py-3 pr-4 text-right text-foreground/60">
                    {h.navDate ?? "—"}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <div className="font-medium">{formatTHB(marketValue)}</div>
                    <div className="text-xs text-foreground/65">{formatAllocation(allocation)}</div>
                  </td>
                  <td className={`py-3 pr-4 text-right ${gainLossColor}`}>
                    {formatTHB(gainLoss)}
                  </td>
                  <td className={`py-3 pr-4 text-right ${gainLossColor}`}>
                    {formatPercent(gainLossPercent)}
                  </td>
                  <td className="py-3">
                    <div className="rounded-md p-1.5 text-foreground/40">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
  // Convert to THB for consistent display
  const avgCostTHB = toTHB(holding.averageCost, holding.averageCostCurrency);
  const currentPriceTHB = toTHB(holding.currentPrice, holding.currentPriceCurrency);
  const marketValue = holding.shares * currentPriceTHB;
  const totalCost = holding.shares * avgCostTHB;
  const gainLoss = marketValue - totalCost;
  const gainLossPercent = totalCost > 0 ? gainLoss / totalCost : 0;
  const allocation = totalMarketValue > 0 ? marketValue / totalMarketValue : 0;
  const gainLossColor = gainLoss > 0 ? "text-gain" : gainLoss < 0 ? "text-loss" : "";

  return (
    <article
      onClick={() => onEdit(holding)}
      className="cursor-pointer rounded-lg border border-foreground/10 px-4 py-3 transition-colors hover:border-foreground/25 hover:bg-foreground/[0.04]"
      aria-label={`Edit ${holding.name} holding`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit(holding);
        }
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium">{holding.name}</div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-foreground/60">
            {holding.ticker && <span className="uppercase">{holding.ticker}</span>}
            <span>{ASSET_TYPE_LABELS[holding.assetType]}</span>
            <span>{HOLDING_TYPE_LABELS[holding.holdingType ?? "core"]}</span>
          </div>
        </div>
        <div className="rounded-md p-1.5 text-foreground/40">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-y-1.5 text-sm tabular-nums">
        <div className="text-foreground/60">Shares</div>
        <div className="text-right">{holding.shares}</div>

        <div className="text-foreground/60">Avg Cost</div>
        <div className="text-right">{formatTHB(avgCostTHB)}</div>

        <div className="text-foreground/60">Current Price</div>
        <div className="text-right">{formatTHB(currentPriceTHB)}</div>

        <div className="text-foreground/60 font-medium">Market Value</div>
        <div className="text-right font-medium">{formatTHB(marketValue)}</div>

        <div className="text-foreground/60">Allocation</div>
        <div className="text-right">{formatAllocation(allocation)}</div>

        <div className="text-foreground/60">Gain/Loss</div>
        <div className={`text-right ${gainLossColor}`}>
          {formatTHB(gainLoss)} ({formatPercent(gainLossPercent)})
        </div>

        {holding.navDate && (
          <>
            <div className="text-foreground/40">NAV Date</div>
            <div className="text-right text-foreground/40">{holding.navDate}</div>
          </>
        )}

        {holding.updatedAt && (
          <>
            <div className="text-foreground/40">Updated</div>
            <div className="text-right text-foreground/40">{formatDate(holding.updatedAt)}</div>
          </>
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
      <button
        type="button"
        onClick={onAdd}
        className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add Your First Holding
      </button>
    </section>
  );
}
