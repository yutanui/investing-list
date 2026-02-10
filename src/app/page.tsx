"use client";

import { useState, useEffect } from "react";
import { usePortfolioList } from "@/context/portfolio-list-context";
import { useAuth } from "@/context/auth-context";
import { Holding, Portfolio, Currency } from "@/types/portfolio";
import { loadHoldings } from "@/lib/storage";
import { toTHB } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { PortfolioCard } from "@/components/portfolio-card";
import { PortfolioDialog } from "@/components/portfolio-dialog";
import { PortfolioSummary } from "@/components/portfolio-summary";

export default function HomePage() {
  const { user } = useAuth();
  const { portfolios, loading, addPortfolio, updatePortfolio, removePortfolio } = usePortfolioList();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [allHoldings, setAllHoldings] = useState<Holding[]>([]);

  // Load holdings for portfolio stats
  useEffect(() => {
    if (loading) return;

    if (user) {
      // Load from Supabase
      supabase
        .from("holdings")
        .select("id, portfolio_id, shares, current_price, current_price_currency, average_cost, average_cost_currency")
        .then(({ data, error }) => {
          if (error) {
            console.error("Failed to load holdings:", error.message);
            return;
          }
          const holdings = (data ?? []).map((row) => ({
            id: row.id,
            portfolioId: row.portfolio_id,
            shares: Number(row.shares),
            currentPrice: Number(row.current_price),
            currentPriceCurrency: (row.current_price_currency ?? "THB") as Currency,
            averageCost: Number(row.average_cost),
            averageCostCurrency: (row.average_cost_currency ?? "THB") as Currency,
          })) as Holding[];
          setAllHoldings(holdings);
        });
    } else {
      // Load from localStorage
      setAllHoldings(loadHoldings());
    }
  }, [user, loading]);

  function getPortfolioStats(portfolioId: string) {
    const portfolioHoldings = allHoldings.filter((h) => h.portfolioId === portfolioId);
    const holdingsCount = portfolioHoldings.length;
    // Convert to THB for consistent display
    const totalValue = portfolioHoldings.reduce(
      (sum, h) => sum + h.shares * toTHB(h.currentPrice, h.currentPriceCurrency),
      0
    );
    const totalCost = portfolioHoldings.reduce(
      (sum, h) => sum + h.shares * toTHB(h.averageCost, h.averageCostCurrency),
      0
    );
    const gainLoss = totalValue - totalCost;
    const gainLossPercent = totalCost > 0 ? gainLoss / totalCost : 0;
    return { holdingsCount, totalValue, totalCost, gainLoss, gainLossPercent };
  }

  function openAdd() {
    setEditingPortfolio(null);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(portfolio: Portfolio) {
    setEditingPortfolio(portfolio);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-foreground/50">Loading portfolios…</p>
      </div>
    );
  }

  return (
    <>
      {portfolios.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <PortfolioListView
          portfolios={portfolios}
          allHoldings={allHoldings}
          getPortfolioStats={getPortfolioStats}
          onAdd={openAdd}
          onEdit={openEdit}
        />
      )}

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

function PortfolioListView({
  portfolios,
  allHoldings,
  getPortfolioStats,
  onAdd,
  onEdit,
}: {
  portfolios: Portfolio[];
  allHoldings: Holding[];
  getPortfolioStats: (id: string) => { holdingsCount: number; totalValue: number; totalCost: number; gainLoss: number; gainLossPercent: number };
  onAdd: () => void;
  onEdit: (portfolio: Portfolio) => void;
}) {
  return (
    <section aria-label="Portfolio list">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Your Portfolios
          </h2>
          <p className="mt-1 text-sm text-foreground/60">
            {portfolios.length} {portfolios.length === 1 ? "portfolio" : "portfolios"}
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Portfolio
        </button>
      </div>

      {allHoldings.length > 0 && (
        <div className="mt-6">
          <PortfolioSummary holdings={allHoldings} />
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {portfolios.map((p) => {
          const { holdingsCount, totalValue, totalCost, gainLoss, gainLossPercent } = getPortfolioStats(p.id);
          return (
            <PortfolioCard
              key={p.id}
              portfolio={p}
              holdingsCount={holdingsCount}
              totalValue={totalValue}
              totalCost={totalCost}
              gainLoss={gainLoss}
              gainLossPercent={gainLossPercent}
              onEdit={() => onEdit(p)}
            />
          );
        })}
      </div>
    </section>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
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
        Create your first portfolio to start tracking your investments.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add Your First Portfolio
      </button>
    </section>
  );
}
