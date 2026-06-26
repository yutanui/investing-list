"use client";

import { Holding } from "@/types/portfolio";
import { formatTHB, formatPercent, toTHB, maskTHB } from "@/lib/format";
import { usePrivacyMode } from "@/context/privacy-context";

interface PortfolioSummaryProps {
  holdings: Holding[];
}

export function PortfolioSummary({ holdings }: PortfolioSummaryProps) {
  const { privacyMode } = usePrivacyMode();
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

  const isPos = gainLoss >= 0;

  return (
    <div
      className="overflow-hidden rounded-[22px] border border-line bg-panel sm:grid"
      style={{
        gridTemplateColumns: "1fr 1.35fr",
        boxShadow: "0 1px 2px rgba(20,20,30,.03), 0 12px 30px -18px rgba(20,20,30,.12)",
      }}
    >
      {/* Left: main stat */}
      <div className="border-b border-line p-6 sm:border-b-0 sm:border-r sm:p-8">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-muted">
          {/* Wallet icon */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
          </svg>
          Market Value
        </div>
        <div
          className="mt-3 tabular-nums text-ink"
          style={{ fontSize: "clamp(30px, 7vw, 46px)", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1 }}
        >
          {maskTHB(formatTHB(totalMarketValue), privacyMode)}
        </div>
        <div className="mt-4">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold tabular-nums ${isPos ? "bg-pos-soft text-pos" : "bg-neg-soft text-neg"}`}
          >
            {isPos ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>
              </svg>
            )}
            {formatPercent(returnPct)} all time
          </span>
        </div>
      </div>

      {/* Right: 2×2 stat grid */}
      <div className="grid grid-cols-2">
        <div className="border-b border-r border-line px-5 py-5 sm:px-7 sm:py-6">
          <div className="text-[12.5px] font-semibold text-muted">Total Cost</div>
          <div className="mt-2 text-[18px] font-bold tabular-nums text-ink sm:text-[24px]" style={{ letterSpacing: "-0.02em" }}>
            {maskTHB(formatTHB(totalCost), privacyMode)}
          </div>
        </div>
        <div className="border-b border-line px-5 py-5 sm:px-7 sm:py-6">
          <div className="text-[12.5px] font-semibold text-muted">Gain / Loss</div>
          <div
            className={`mt-2 text-[18px] font-bold tabular-nums sm:text-[24px] ${isPos ? "text-pos" : "text-neg"}`}
            style={{ letterSpacing: "-0.02em" }}
          >
            {maskTHB(formatTHB(gainLoss), privacyMode)}
          </div>
        </div>
        <div className="col-span-2 px-5 py-5 sm:px-7 sm:py-6">
          <div className="text-[12.5px] font-semibold text-muted">Return</div>
          <div
            className={`mt-2 text-[18px] font-bold tabular-nums sm:text-[24px] ${isPos ? "text-pos" : "text-neg"}`}
            style={{ letterSpacing: "-0.02em" }}
          >
            {formatPercent(returnPct)}
          </div>
        </div>
      </div>
    </div>
  );
}
