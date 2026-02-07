"use client";

import { use, useState } from "react";
import Link from "next/link";
import { PortfolioProvider, usePortfolio } from "@/context/portfolio-context";
import { usePortfolioList } from "@/context/portfolio-list-context";
import { Holding, ASSET_TYPE_LABELS } from "@/types/portfolio";
import { formatTHB } from "@/lib/format";
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [dialogKey, setDialogKey] = useState(0);

  function openAdd() {
    setEditingHolding(null);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(holding: Holding) {
    setEditingHolding(holding);
    setDialogOpen(true);
  }

  function handleSave(holding: Omit<Holding, "portfolioId">) {
    if (editingHolding) {
      updateHolding(holding.id, holding);
    } else {
      addHolding(holding);
    }
    setDialogOpen(false);
    setEditingHolding(null);
  }

  function handleDelete(id: string) {
    removeHolding(id);
    setDialogOpen(false);
    setEditingHolding(null);
  }

  function handleClose() {
    setDialogOpen(false);
    setEditingHolding(null);
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
      {/* Back link */}
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-foreground/60 hover:text-foreground"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          All Portfolios
        </Link>
      </div>

      {holdings.length === 0 ? (
        <EmptyState portfolioName={portfolioName} onAdd={openAdd} />
      ) : (
        <PortfolioHoldingsView
          portfolioName={portfolioName}
          holdings={holdings}
          onAdd={openAdd}
          onEdit={openEdit}
        />
      )}

      <HoldingDialog
        key={dialogKey}
        open={dialogOpen}
        holding={editingHolding}
        onSave={handleSave}
        onDelete={editingHolding ? handleDelete : undefined}
        onClose={handleClose}
      />
    </>
  );
}

function PortfolioHoldingsView({
  portfolioName,
  holdings,
  onAdd,
  onEdit,
}: {
  portfolioName: string;
  holdings: Holding[];
  onAdd: () => void;
  onEdit: (holding: Holding) => void;
}) {
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
        </div>
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

      <div className="mt-6">
        <PortfolioSummary holdings={holdings} />
      </div>

      {/* Mobile: card layout */}
      <div className="mt-6 space-y-3 sm:hidden">
        {holdings.map((h) => (
          <HoldingCard key={h.id} holding={h} onEdit={onEdit} />
        ))}
      </div>

      {/* Desktop: table layout */}
      <div className="mt-6 hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-foreground/10 text-xs uppercase tracking-wide text-foreground/50">
              <th scope="col" className="pb-3 pr-4 font-medium">Name</th>
              <th scope="col" className="pb-3 pr-4 font-medium">Type</th>
              <th scope="col" className="pb-3 pr-4 text-right font-medium">Shares</th>
              <th scope="col" className="pb-3 pr-4 text-right font-medium">Avg Cost</th>
              <th scope="col" className="pb-3 pr-4 text-right font-medium">Current Price</th>
              <th scope="col" className="pb-3 pr-4 text-right font-medium">Market Value</th>
              <th scope="col" className="pb-3 font-medium"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {holdings.map((h) => (
              <tr key={h.id} className="border-b border-foreground/5">
                <td className="py-3 pr-4">
                  <div className="font-medium">{h.name}</div>
                  {h.ticker && (
                    <div className="text-xs text-foreground/50">{h.ticker}</div>
                  )}
                </td>
                <td className="py-3 pr-4 text-foreground/60">
                  {ASSET_TYPE_LABELS[h.assetType]}
                </td>
                <td className="py-3 pr-4 text-right">{h.shares}</td>
                <td className="py-3 pr-4 text-right">{formatTHB(h.averageCost)}</td>
                <td className="py-3 pr-4 text-right">{formatTHB(h.currentPrice)}</td>
                <td className="py-3 pr-4 text-right font-medium">
                  {formatTHB(h.shares * h.currentPrice)}
                </td>
                <td className="py-3">
                  <button
                    type="button"
                    onClick={() => onEdit(h)}
                    className="rounded-md p-1.5 text-foreground/40 hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
                    aria-label={`Edit ${h.name}`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HoldingCard({
  holding,
  onEdit,
}: {
  holding: Holding;
  onEdit: (holding: Holding) => void;
}) {
  const marketValue = holding.shares * holding.currentPrice;

  return (
    <article
      className="rounded-lg border border-foreground/10 px-4 py-3"
      aria-label={`${holding.name} holding`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium">{holding.name}</div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-foreground/50">
            {holding.ticker && <span className="uppercase">{holding.ticker}</span>}
            <span>{ASSET_TYPE_LABELS[holding.assetType]}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onEdit(holding)}
          className="rounded-md p-1.5 text-foreground/40 hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
          aria-label={`Edit ${holding.name}`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-y-1.5 text-sm tabular-nums">
        <div className="text-foreground/50">Shares</div>
        <div className="text-right">{holding.shares}</div>

        <div className="text-foreground/50">Avg Cost</div>
        <div className="text-right">{formatTHB(holding.averageCost)}</div>

        <div className="text-foreground/50">Current Price</div>
        <div className="text-right">{formatTHB(holding.currentPrice)}</div>

        <div className="text-foreground/50 font-medium">Market Value</div>
        <div className="text-right font-medium">{formatTHB(marketValue)}</div>
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
