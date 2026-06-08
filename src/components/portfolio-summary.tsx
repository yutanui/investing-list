"use client";

import { Holding } from "@/types/portfolio";
import { formatTHB, formatPercent, toTHB, maskTHB } from "@/lib/format";
import { usePrivacyMode } from "@/context/privacy-context";

interface PortfolioSummaryProps {
  holdings: Holding[];
}

export function PortfolioSummary({ holdings }: PortfolioSummaryProps) {
  const { privacyMode } = usePrivacyMode();
  // Derived state — calculated during render, no effects needed
  // All values converted to THB for consistent display
  const totalMarketValue = holdings.reduce(
    (sum, h) => sum + h.shares * toTHB(h.currentPrice, h.currentPriceCurrency),
    0,
  );
  const totalCost = holdings.reduce(
    (sum, h) => sum + h.shares * toTHB(h.averageCost, h.averageCostCurrency),
    0,
  );
  const gainLoss = totalMarketValue - totalCost;
  const returnPct = totalCost > 0 ? gainLoss / totalCost : 0;

  const gainLossColor =
    gainLoss > 0
      ? "text-gain"
      : gainLoss < 0
        ? "text-loss"
        : "text-foreground";

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Market Value" value={maskTHB(formatTHB(totalMarketValue), privacyMode)} />
        <SummaryCard label="Total Cost" value={maskTHB(formatTHB(totalCost), privacyMode)} />
        <SummaryCard
          label="Gain / Loss"
          value={maskTHB(formatTHB(gainLoss), privacyMode)}
          valueClassName={gainLossColor}
        />
        <SummaryCard
          label="Return"
          value={formatPercent(returnPct)}
          valueClassName={gainLossColor}
        />
      </dl>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  valueClassName = "text-foreground",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-foreground/15 px-4 py-3">
      <dt className="text-xs font-medium text-foreground/60" style={{ textWrap: "balance" }}>
        {label}
      </dt>
      <dd className={`mt-1 text-lg font-semibold tabular-nums ${valueClassName}`}>
        {value}
      </dd>
    </div>
  );
}
