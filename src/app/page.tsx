"use client";

import { usePortfolio } from "@/context/portfolio-context";
import { ASSET_TYPE_LABELS } from "@/types/portfolio";
import { formatTHB } from "@/lib/format";

export default function HomePage() {
  const { holdings } = usePortfolio();

  if (holdings.length === 0) {
    return <EmptyState />;
  }

  return (
    <section aria-label="Portfolio overview">
      <h2 className="text-2xl font-semibold tracking-tight">Your Portfolio</h2>
      <p className="mt-1 text-sm text-foreground/60">
        {holdings.length} {holdings.length === 1 ? "holding" : "holdings"}
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-foreground/10 text-xs uppercase tracking-wide text-foreground/50">
              <th scope="col" className="pb-3 pr-4 font-medium">Name</th>
              <th scope="col" className="pb-3 pr-4 font-medium">Type</th>
              <th scope="col" className="pb-3 pr-4 text-right font-medium">Shares</th>
              <th scope="col" className="pb-3 pr-4 text-right font-medium">Avg Cost</th>
              <th scope="col" className="pb-3 pr-4 text-right font-medium">Current Price</th>
              <th scope="col" className="pb-3 text-right font-medium">Market Value</th>
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
                <td className="py-3 text-right font-medium">
                  {formatTHB(h.shares * h.currentPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EmptyState() {
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
      <h2 className="mt-4 text-lg font-semibold">No Holdings Yet</h2>
      <p className="mt-1 max-w-sm text-sm text-foreground/60">
        Start building your portfolio by adding your first investment holding.
      </p>
    </section>
  );
}
