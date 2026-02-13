"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePortfolioList } from "@/context/portfolio-list-context";
import { useAllHoldings } from "@/context/holdings-context";
import { Portfolio } from "@/types/portfolio";
import { formatTHB, formatPercent } from "@/lib/format";
import { TypeBreakdown } from "@/context/holdings-context";
import { PortfolioDialog } from "@/components/portfolio-dialog";

type SortKey = "name" | "amount" | "returns";
type SortDirection = "asc" | "desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "amount", label: "Amount" },
  { value: "returns", label: "% Returns" },
];

interface PortfolioNavProps {
  open: boolean;
  onClose: () => void;
}

export function PortfolioNav({ open, onClose }: PortfolioNavProps) {
  const pathname = usePathname();
  const { portfolios, addPortfolio, updatePortfolio, removePortfolio } = usePortfolioList();
  const { getPortfolioStats } = useAllHoldings();

  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [dialogKey, setDialogKey] = useState(0);

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

  function openAdd() {
    setEditingPortfolio(null);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

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

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 flex h-full w-80 flex-col border-r border-foreground/10 bg-background transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Portfolio navigation"
      >
        {/* Mobile close button */}
        <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-3 lg:hidden">
          <span className="text-sm font-semibold">Portfolios</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-foreground/50 hover:bg-foreground/5 hover:text-foreground"
            aria-label="Close menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Summary link */}
        <div className="px-3 pt-3">
          <Link
            href="/"
            onClick={onClose}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              pathname === "/"
                ? "bg-foreground/10 text-foreground"
                : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />
            </svg>
            Summary
          </Link>
        </div>

        {/* Sort controls */}
        {portfolios.length > 1 && (
          <div className="mt-2 flex items-center gap-2 px-3">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="flex-1 rounded-md border border-foreground/10 bg-background px-2 py-1.5 text-xs focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
              aria-label="Sort portfolios by"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSortDirection((d) => (d === "asc" ? "desc" : "asc"))}
              className="inline-flex items-center gap-1 rounded-md border border-foreground/10 px-2 py-1.5 text-xs text-foreground/70 hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
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

        {/* Portfolio cards list */}
        <nav className="mt-2 flex-1 overflow-y-auto px-3 pb-3" aria-label="Portfolios">
          {sortedPortfolios.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-foreground/40">
              No portfolios yet
            </p>
          ) : (
            <ul className="space-y-2">
              {sortedPortfolios.map((p) => {
                const stats = statsMap.get(p.id)!;
                const isActive = pathname === `/portfolio/${p.id}`;
                return (
                  <li key={p.id}>
                    <NavPortfolioCard
                      portfolio={p}
                      stats={stats}
                      isActive={isActive}
                      onEdit={() => openEdit(p)}
                      onNavigate={onClose}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        {/* Add Portfolio button */}
        <div className="border-t border-foreground/10 px-3 py-3">
          <button
            type="button"
            onClick={openAdd}
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Portfolio
          </button>
        </div>
      </aside>

      <PortfolioDialog
        key={dialogKey}
        open={dialogOpen}
        portfolio={editingPortfolio}
        onSave={handleSave}
        onDelete={editingPortfolio ? handleDelete : undefined}
        onClose={handleClose}
      />
    </>
  );
}

function NavPortfolioCard({
  portfolio,
  stats,
  isActive,
  onEdit,
  onNavigate,
}: {
  portfolio: Portfolio;
  stats: { holdingsCount: number; totalValue: number; totalCost: number; gainLoss: number; gainLossPercent: number; typeBreakdown: Record<string, TypeBreakdown> };
  isActive: boolean;
  onEdit: () => void;
  onNavigate: () => void;
}) {
  const gainLossColor =
    stats.gainLoss > 0
      ? "text-gain"
      : stats.gainLoss < 0
        ? "text-loss"
        : "text-foreground/60";

  return (
    <article
      className={`relative rounded-lg border p-3 transition-colors ${
        isActive
          ? "border-foreground/20 bg-foreground/5"
          : "border-foreground/10 hover:border-foreground/20"
      }`}
    >
      <Link
        href={`/portfolio/${portfolio.id}`}
        onClick={onNavigate}
        className="absolute inset-0 z-0"
        aria-label={`View ${portfolio.name}`}
      />

      <div className="relative z-10 flex items-start justify-between pointer-events-none">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{portfolio.name}</h3>
          <p className="mt-0.5 text-xs text-foreground/60">
            {stats.holdingsCount} {stats.holdingsCount === 1 ? "holding" : "holdings"}
          </p>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
          className="pointer-events-auto ml-2 rounded-md p-1 text-foreground/50 hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
          aria-label={`Edit ${portfolio.name}`}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
        </button>
      </div>

      <div className="relative z-10 mt-2 text-right pointer-events-none">
        <span className="text-sm font-semibold tabular-nums">{formatTHB(stats.totalValue)}</span>
        {stats.holdingsCount > 0 && (
          <>
            <div className="mt-0.5 text-xs text-foreground/50">
              <span className={`font-medium ${gainLossColor}`}>
                {formatTHB(stats.gainLoss)} ({formatPercent(stats.gainLossPercent)})
              </span>
            </div>
            <div className="mt-0.5 text-xs text-foreground/50">
              Core {formatPercent(stats.typeBreakdown.core.percent)} · Satellite {formatPercent(stats.typeBreakdown.satellite.percent)}
            </div>
          </>
        )}
      </div>
    </article>
  );
}
