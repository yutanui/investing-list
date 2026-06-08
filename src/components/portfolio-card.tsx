"use client";

import Link from "next/link";
import { Portfolio } from "@/types/portfolio";
import { formatTHB, formatPercent, maskTHB } from "@/lib/format";
import { usePrivacyMode } from "@/context/privacy-context";

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
  gainLossPercent,
  onEdit,
}: PortfolioCardProps) {
  const { privacyMode } = usePrivacyMode();
  const isPos = gainLossPercent > 0;
  const isNeg = gainLossPercent < 0;

  return (
    <article
      className="group relative flex min-h-[168px] cursor-pointer flex-col rounded-[18px] border border-line bg-panel p-[22px] transition-all duration-150 hover:-translate-y-0.5 hover:border-faint"
      style={{ boxShadow: "0 1px 2px rgba(20,20,30,.02)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 14px 30px -20px rgba(20,20,30,.2)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 2px rgba(20,20,30,.02)";
      }}
    >
      {/* Clickable overlay for navigation */}
      <Link
        href={`/portfolio/${portfolio.id}`}
        className="absolute inset-0 z-0 rounded-[18px]"
        aria-label={`View ${portfolio.name}`}
      />

      <div className="relative z-10 flex items-start justify-between gap-2.5 pointer-events-none">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[17px] font-bold tracking-[-0.01em] text-ink leading-[1.25]">
            {portfolio.name}
          </h3>
          <div className="mt-[7px] flex items-center gap-1.5 text-[13px] font-medium text-muted">
            {/* Layers icon */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/>
              <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/>
              <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>
            </svg>
            {holdingsCount} {holdingsCount === 1 ? "holding" : "holdings"}
          </div>
        </div>
        {/* Edit button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
          className="pointer-events-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[9px] text-faint hover:bg-[#F2F1EC] hover:text-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          aria-label={`Edit ${portfolio.name}`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            <path d="m15 5 4 4"/>
          </svg>
        </button>
      </div>

      <div className="relative z-10 mt-auto flex items-end justify-between gap-2.5 pt-[18px] pointer-events-none">
        <div>
          <div
            className="tabular-nums text-ink"
            style={{ fontSize: "23px", fontWeight: 800, letterSpacing: "-0.02em" }}
          >
            {maskTHB(formatTHB(totalValue), privacyMode)}
          </div>
          {holdingsCount > 0 && (
            <div className="mt-1 text-[12.5px] font-medium text-muted tabular-nums">
              Cost {maskTHB(formatTHB(totalCost), privacyMode)}
            </div>
          )}
        </div>
        {holdingsCount > 0 && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold tabular-nums ${
              isPos
                ? "bg-pos-soft text-pos"
                : isNeg
                ? "bg-neg-soft text-neg"
                : "bg-tag text-tag-ink"
            }`}
          >
            {isPos && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
              </svg>
            )}
            {isNeg && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>
              </svg>
            )}
            {formatPercent(gainLossPercent)}
          </span>
        )}
      </div>
    </article>
  );
}
