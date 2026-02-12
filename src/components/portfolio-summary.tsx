import { Holding, HoldingType } from "@/types/portfolio";
import { formatTHB, formatPercent, toTHB } from "@/lib/format";

interface PortfolioSummaryProps {
  holdings: Holding[];
}

export function PortfolioSummary({ holdings }: PortfolioSummaryProps) {
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

  // Type breakdown
  const typeValues = (["core", "satellite"] as HoldingType[]).map((type) => {
    const value = holdings
      .filter((h) => (h.holdingType ?? "core") === type)
      .reduce((sum, h) => sum + h.shares * toTHB(h.currentPrice, h.currentPriceCurrency), 0);
    return { type, value, percent: totalMarketValue > 0 ? value / totalMarketValue : 0 };
  });

  const gainLossColor =
    gainLoss > 0
      ? "text-gain"
      : gainLoss < 0
        ? "text-loss"
        : "text-foreground";

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Market Value" value={formatTHB(totalMarketValue)} />
        <SummaryCard label="Total Cost" value={formatTHB(totalCost)} />
        <SummaryCard
          label="Gain / Loss"
          value={formatTHB(gainLoss)}
          valueClassName={gainLossColor}
        />
        <SummaryCard
          label="Return"
          value={formatPercent(returnPct)}
          valueClassName={gainLossColor}
        />
      </dl>

      {holdings.length > 0 && (
        <dl className="grid grid-cols-2 gap-3">
          {typeValues.map(({ type, value, percent }) => (
            <SummaryCard
              key={type}
              label={`${type === "core" ? "Core" : "Satellite"}`}
              value={`${formatTHB(value)} (${formatPercent(percent)})`}
            />
          ))}
        </dl>
      )}
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
    <div className="rounded-lg border border-foreground/10 px-4 py-3">
      <dt className="text-xs font-medium text-foreground/50" style={{ textWrap: "balance" }}>
        {label}
      </dt>
      <dd className={`mt-1 text-lg font-semibold tabular-nums ${valueClassName}`}>
        {value}
      </dd>
    </div>
  );
}
