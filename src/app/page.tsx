"use client";

import { usePortfolioList } from "@/context/portfolio-list-context";
import { useAllHoldings } from "@/context/holdings-context";
import { PortfolioSummary } from "@/components/portfolio-summary";

export default function HomePage() {
  const { portfolios, loading: portfoliosLoading } = usePortfolioList();
  const { allHoldings, loading: holdingsLoading } = useAllHoldings();

  if (portfoliosLoading || holdingsLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-foreground/50">Loading portfolios…</p>
      </div>
    );
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
          Create your first portfolio using the sidebar to start tracking your investments.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Portfolio summary">
      <h2 className="text-2xl font-semibold tracking-tight">
        Portfolio Summary
      </h2>
      <p className="mt-1 text-sm text-foreground/60">
        {portfolios.length} {portfolios.length === 1 ? "portfolio" : "portfolios"} · {allHoldings.length} {allHoldings.length === 1 ? "holding" : "holdings"}
      </p>

      <div className="mt-6">
        <PortfolioSummary holdings={allHoldings} />
      </div>
    </section>
  );
}
