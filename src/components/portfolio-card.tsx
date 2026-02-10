"use client";

import Link from "next/link";
import { Portfolio } from "@/types/portfolio";
import { formatTHB, formatPercent } from "@/lib/format";

interface PortfolioCardProps {
  portfolio: Portfolio;
  holdingsCount: number;
  totalValue: number;
  totalCost: number;
  gainLoss: number;
  gainLossPercent: number;
  onEdit: () => void;
}

export function PortfolioCard({
  portfolio,
  holdingsCount,
  totalValue,
  totalCost,
  gainLoss,
  gainLossPercent,
  onEdit,
}: PortfolioCardProps) {
  const gainLossColor =
    gainLoss > 0
      ? "text-gain"
      : gainLoss < 0
        ? "text-loss"
        : "text-foreground/60";

  return (
    <article className="relative rounded-lg border border-foreground/10 bg-background p-4 hover:border-foreground/20">
      <Link
        href={`/portfolio/${portfolio.id}`}
        className="absolute inset-0 z-0"
        aria-label={`View ${portfolio.name}`}
      />

      <div className="relative z-10 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">{portfolio.name}</h3>
          <p className="mt-1 text-sm text-foreground/60">
            {holdingsCount} {holdingsCount === 1 ? "holding" : "holdings"}
          </p>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
          className="ml-3 rounded-md p-1.5 text-foreground/50 hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
          aria-label={`Edit ${portfolio.name}`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
        </button>
      </div>

      <div className="relative z-10 mt-3 text-right">
        <span className="text-lg font-semibold tabular-nums">{formatTHB(totalValue)}</span>
        {holdingsCount > 0 && (
          <div className="mt-1 text-xs text-foreground/50">
            <span>Cost {formatTHB(totalCost)}</span>
            <span className={`ml-2 font-medium ${gainLossColor}`}>
              {formatTHB(gainLoss)} ({formatPercent(gainLossPercent)})
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
