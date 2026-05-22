"use client";

import { useState } from "react";
import { usePortfolioList } from "@/context/portfolio-list-context";
import { useAllHoldings } from "@/context/holdings-context";
import { PortfolioSummary } from "@/components/portfolio-summary";
import { PortfolioCard } from "@/components/portfolio-card";
import { PortfolioDialog } from "@/components/portfolio-dialog";
import { Portfolio } from "@/types/portfolio";

type SortKey = "name" | "amount" | "returns";
type SortDirection = "asc" | "desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "amount", label: "Amount" },
  { value: "returns", label: "% Returns" },
];

export default function HomePage() {
  const { portfolios, loading: portfoliosLoading, addPortfolio, updatePortfolio, removePortfolio } = usePortfolioList();
  const { allHoldings, loading: holdingsLoading, getPortfolioStats } = useAllHoldings();

  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [dialogKey, setDialogKey] = useState(0);

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
      </div>

      {/* Portfolio cards section */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight">Portfolios</h3>

          {/* Sort controls — shown when there are multiple portfolios */}
          {portfolios.length > 1 && (
            <div className="flex items-center gap-2">
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
            </div>
          )}
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
