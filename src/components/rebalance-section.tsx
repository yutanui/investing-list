"use client";

import { Holding } from "@/types/portfolio";
import { formatTHB, formatPercent, maskTHB } from "@/lib/format";
import { computeDrift, computeTransfers, holdingValueTHB, DriftRow } from "@/lib/rebalance";
import { useRebalanceSettings } from "@/context/rebalance-settings-context";
import { usePrivacyMode } from "@/context/privacy-context";

interface RebalanceSectionProps {
  holdings: Holding[];
  totalMarketValue: number;
}

function getStatus(row: DriftRow, driftThreshold: number): "balanced" | "trim" | "buy" {
  if (Math.abs(row.driftPct) < driftThreshold) return "balanced";
  return row.driftPct > 0 ? "trim" : "buy";
}

const STATUS_LABELS = { balanced: "Balanced", trim: "Trim", buy: "Buy" };

function StatusPill({ status }: { status: "balanced" | "trim" | "buy" }) {
  const styles = {
    balanced: "bg-pos-soft text-pos",
    trim: "bg-neg-soft text-neg",
    buy: "bg-accent-soft text-accent",
  };
  const dotColors = {
    balanced: "bg-pos",
    trim: "bg-neg",
    buy: "bg-accent",
  };
  return (
    <span className={`inline-flex items-center gap-[7px] rounded-full px-3 py-[6px] text-[12.5px] font-bold whitespace-nowrap ${styles[status]}`}>
      <span className={`h-[7px] w-[7px] rounded-full ${dotColors[status]}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}

function DriftBar({ driftPct, threshold }: { driftPct: number; threshold: number }) {
  const mag = Math.min(Math.abs(driftPct) / threshold, 1) * 50;
  const isPos = driftPct >= 0;
  return (
    <div className="relative h-[7px] w-24 rounded-full bg-track">
      {/* Center line */}
      <div className="absolute left-1/2 top-[-2px] h-[11px] w-[1.5px] -translate-x-1/2 rounded-sm bg-faint" />
      {/* Colored segment */}
      <div
        className={`absolute top-0 h-full rounded-full ${isPos ? "bg-pos" : "bg-neg"}`}
        style={
          isPos
            ? { left: "50%", width: `${mag}%` }
            : { right: "50%", width: `${mag}%` }
        }
      />
    </div>
  );
}

export function RebalanceSection({ holdings, totalMarketValue }: RebalanceSectionProps) {
  const { rebalanceSettings, updateRebalanceSettings } = useRebalanceSettings();
  const { driftThreshold } = rebalanceSettings;
  const { privacyMode } = usePrivacyMode();

  const hasTargets = holdings.some(
    (h) => h.targetAllocation !== null && h.targetAllocation !== undefined,
  );

  if (!hasTargets) return null;

  const driftRows = computeDrift(holdings, totalMarketValue);
  const sortedRows = driftRows.slice().sort((a, b) => b.targetPct - a.targetPct);
  const transfers = computeTransfers(driftRows, driftThreshold);
  const outOfBalance = driftRows.filter((r) => Math.abs(r.driftPct) >= driftThreshold);
  const hasOverweight = outOfBalance.some((r) => r.driftAmountTHB > 0);
  const hasUnderweight = outOfBalance.some((r) => r.driftAmountTHB < 0);

  return (
    <section aria-label="Rebalancing" className="mt-6">
      {/* Sub-header + threshold stepper */}
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-bold text-ink">Drift vs target allocation</h3>
        <label className="flex items-center gap-2.5 text-[13px] font-semibold text-muted">
          Drift threshold ±
          <div className="inline-flex h-[38px] items-center gap-2 rounded-[10px] border border-line2 bg-panel pl-3.5 pr-1.5 tabular-nums text-ink">
            <span className="min-w-[24px] text-center font-bold">{driftThreshold}</span>
            <div className="flex flex-col gap-px">
              <button
                type="button"
                onClick={() => updateRebalanceSettings({ driftThreshold: Math.min(50, driftThreshold + 0.5) })}
                aria-label="Increase threshold"
                className="flex h-[17px] w-6 items-center justify-center rounded-[5px] bg-[#F1F2F4] text-[8px] text-muted hover:bg-[#E7E9EE] hover:text-ink transition-colors"
              >▲</button>
              <button
                type="button"
                onClick={() => updateRebalanceSettings({ driftThreshold: Math.max(0, driftThreshold - 0.5) })}
                aria-label="Decrease threshold"
                className="flex h-[17px] w-6 items-center justify-center rounded-[5px] bg-[#F1F2F4] text-[8px] text-muted hover:bg-[#E7E9EE] hover:text-ink transition-colors"
              >▼</button>
            </div>
          </div>
          %
        </label>
      </div>

      {/* Mobile: card list */}
      <div className="mt-4 space-y-3 sm:hidden">
        {sortedRows.map((row) => {
          const status = getStatus(row, driftThreshold);
          const isPos = row.driftPct > 0;
          const isNeg = row.driftPct < 0;
          return (
            <div
              key={row.holding.id}
              className="rounded-[16px] border border-line bg-panel px-[18px] py-4"
              style={{ boxShadow: "0 1px 2px rgba(20,20,30,.02)" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-[16px] font-bold text-ink">{row.holding.name}</div>
                <StatusPill status={status} />
              </div>
              <div className="mt-3.5 grid grid-cols-2 gap-3">
                <div><div className="text-[11px] font-semibold text-muted">Target</div><div className="mt-0.5 text-[13.5px] font-bold tabular-nums text-muted">{row.targetPct.toFixed(2)}%</div></div>
                <div><div className="text-[11px] font-semibold text-muted">Actual</div><div className="mt-0.5 text-[13.5px] font-bold tabular-nums text-ink">{row.actualPct.toFixed(2)}%</div></div>
              </div>
              <div className="mt-3.5 flex items-center gap-3">
                <DriftBar driftPct={row.driftPct} threshold={driftThreshold} />
                <span className={`text-[13.5px] font-bold tabular-nums ${isPos ? "text-pos" : isNeg ? "text-neg" : "text-muted"}`}>
                  {formatPercent(row.driftPct / 100)}
                </span>
              </div>
              <div className="mt-3.5 grid grid-cols-2 gap-3 border-t border-line pt-3.5">
                <div><div className="text-[11px] font-semibold text-muted">Current Value</div><div className="mt-0.5 text-[13.5px] font-bold tabular-nums text-ink">{maskTHB(formatTHB(holdingValueTHB(row.holding)), privacyMode)}</div></div>
                <div><div className="text-[11px] font-semibold text-muted">Target Amount</div><div className="mt-0.5 text-[13.5px] font-bold tabular-nums text-muted">{maskTHB(formatTHB((row.targetPct / 100) * totalMarketValue), privacyMode)}</div></div>
                <div><div className="text-[11px] font-semibold text-muted">Drift Amount</div><div className={`mt-0.5 text-[13.5px] font-bold tabular-nums ${isPos ? "text-pos" : isNeg ? "text-neg" : "text-muted"}`}>{row.driftAmountTHB === 0 ? "—" : maskTHB(formatTHB(row.driftAmountTHB), privacyMode)}</div></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: table in white card */}
      <div
        className="mt-4 hidden overflow-hidden rounded-[18px] border border-line bg-panel sm:block"
        style={{ boxShadow: "0 1px 2px rgba(20,20,30,.02)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse tabular-nums">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="py-[18px] pl-6 pr-3 text-left text-[11px] font-bold uppercase tracking-[0.05em] text-faint whitespace-nowrap">Holding</th>
                <th scope="col" className="py-[18px] px-3 text-right text-[11px] font-bold uppercase tracking-[0.05em] text-faint whitespace-nowrap">Target</th>
                <th scope="col" className="py-[18px] px-3 text-right text-[11px] font-bold uppercase tracking-[0.05em] text-faint whitespace-nowrap">Actual</th>
                <th scope="col" className="py-[18px] px-3 text-right text-[11px] font-bold uppercase tracking-[0.05em] text-faint whitespace-nowrap">Current Value</th>
                <th scope="col" className="py-[18px] px-3 text-right text-[11px] font-bold uppercase tracking-[0.05em] text-faint whitespace-nowrap">Target Amount</th>
                <th scope="col" className="py-[18px] px-3 text-right text-[11px] font-bold uppercase tracking-[0.05em] text-faint whitespace-nowrap">Drift</th>
                <th scope="col" className="py-[18px] px-3 text-right text-[11px] font-bold uppercase tracking-[0.05em] text-faint whitespace-nowrap">Drift Amount</th>
                <th scope="col" className="py-[18px] pl-3 pr-6 text-left text-[11px] font-bold uppercase tracking-[0.05em] text-faint whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => {
                const status = getStatus(row, driftThreshold);
                const isPos = row.driftPct > 0;
                const isNeg = row.driftPct < 0;
                return (
                  <tr key={row.holding.id} className="border-b border-line last:border-0 hover:bg-[#FAFAFB] transition-colors">
                    <td className="py-4 pl-6 pr-3">
                      <div className="text-[15px] font-bold text-ink">{row.holding.name}</div>
                    </td>
                    <td className="py-4 px-3 text-right text-[14px] font-semibold text-muted">{row.targetPct.toFixed(2)}%</td>
                    <td className="py-4 px-3 text-right text-[14px] font-semibold text-ink">{row.actualPct.toFixed(2)}%</td>
                    <td className="py-4 px-3 text-right text-[14px] font-semibold text-ink">{maskTHB(formatTHB(holdingValueTHB(row.holding)), privacyMode)}</td>
                    <td className="py-4 px-3 text-right text-[14px] font-semibold text-muted">{maskTHB(formatTHB((row.targetPct / 100) * totalMarketValue), privacyMode)}</td>
                    <td className="py-4 px-3">
                      <div className="flex items-center justify-end gap-2.5">
                        <DriftBar driftPct={row.driftPct} threshold={driftThreshold} />
                        <span className={`min-w-[58px] text-right text-[14px] font-bold tabular-nums ${isPos ? "text-pos" : isNeg ? "text-neg" : "text-muted"}`}>
                          {formatPercent(row.driftPct / 100)}
                        </span>
                      </div>
                    </td>
                    <td className={`py-4 px-3 text-right text-[14px] font-bold ${isPos ? "text-pos" : isNeg ? "text-neg" : "text-muted"}`}>
                      {row.driftAmountTHB === 0 ? "—" : maskTHB(formatTHB(row.driftAmountTHB), privacyMode)}
                    </td>
                    <td className="py-4 pl-3 pr-6">
                      <StatusPill status={status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suggested transfers */}
      <div className="mt-6">
        <h4 className="text-[13px] font-bold uppercase tracking-[0.05em] text-faint">
          Suggested Transfers
        </h4>
        {outOfBalance.length === 0 ? (
          <p className="mt-2 text-[14px] font-medium text-muted">
            All holdings are within the ±{driftThreshold}% drift threshold.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {transfers.map((t, i) => (
              <p key={i} className="text-[14px] text-ink">
                Move <span className="font-bold">{maskTHB(formatTHB(t.amountTHB), privacyMode)}</span> from{" "}
                <span className="font-bold">{t.fromHolding.name}</span> to{" "}
                <span className="font-bold">{t.toHolding.name}</span>
              </p>
            ))}
            {!hasUnderweight && hasOverweight && (
              <p className="text-[14px] text-muted">No underweight holdings — overweight amounts could be moved to cash or a new position.</p>
            )}
            {!hasOverweight && hasUnderweight && (
              <p className="text-[14px] text-muted">No overweight holdings — underweight amounts need to be funded from new contributions.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
