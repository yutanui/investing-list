"use client";

import { Holding } from "@/types/portfolio";
import { formatTHB, formatPercent, formatAllocation } from "@/lib/format";
import { computeDrift, computeTransfers, holdingValueTHB, DriftRow } from "@/lib/rebalance";
import { useRebalanceSettings } from "@/context/rebalance-settings-context";

interface RebalanceSectionProps {
  holdings: Holding[];
  totalMarketValue: number;
}

/**
 * Classify a row against the configured drift threshold.
 * Within the threshold (inclusive of strictly less than) is "balanced".
 */
function statusFor(
  row: DriftRow,
  driftThreshold: number,
): "overweight" | "underweight" | "balanced" {
  if (Math.abs(row.driftPct) < driftThreshold) return "balanced";
  return row.driftPct > 0 ? "overweight" : "underweight";
}

const STATUS_LABELS: Record<string, string> = {
  overweight: "Overweight",
  underweight: "Underweight",
  balanced: "Balanced",
};

function driftColor(status: string): string {
  if (status === "overweight") return "text-loss";
  if (status === "underweight") return "text-gain";
  return "text-foreground";
}

export function RebalanceSection({ holdings, totalMarketValue }: RebalanceSectionProps) {
  const { rebalanceSettings } = useRebalanceSettings();
  const { driftThreshold } = rebalanceSettings;

  const hasTargets = holdings.some(
    (h) => h.targetAllocation !== null && h.targetAllocation !== undefined,
  );

  // Only render the section if at least one holding has a target.
  if (!hasTargets) return null;

  const driftRows = computeDrift(holdings, totalMarketValue);

  // Default sort for presentation: highest target allocation first.
  // Stable sort preserves original order as a tiebreaker for equal targets.
  const sortedRows = driftRows.slice().sort((a, b) => b.targetPct - a.targetPct);

  const transfers = computeTransfers(driftRows, driftThreshold);

  const outOfBalance = driftRows.filter(
    (r) => Math.abs(r.driftPct) >= driftThreshold,
  );
  const hasOverweight = outOfBalance.some((r) => r.driftAmountTHB > 0);
  const hasUnderweight = outOfBalance.some((r) => r.driftAmountTHB < 0);

  return (
    <section aria-label="Rebalancing" className="mt-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold tracking-tight">Rebalancing</h3>
        <DriftThresholdInput />
      </div>

      {/* Mobile: card list */}
      <div className="mt-4 space-y-3 sm:hidden">
        {sortedRows.map((row) => {
          const status = statusFor(row, driftThreshold);
          return (
            <article
              key={row.holding.id}
              className="rounded-lg border border-foreground/10 px-4 py-3"
            >
              <div className="flex items-start justify-between">
                <div className="font-medium">{row.holding.name}</div>
                <span className={`text-xs font-medium ${driftColor(status)}`}>
                  {STATUS_LABELS[status]}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-y-1.5 text-sm tabular-nums">
                <div className="text-foreground/60">Target</div>
                <div className="text-right">{formatAllocation(row.targetPct / 100)}</div>

                <div className="text-foreground/60">Actual</div>
                <div className="text-right">{formatAllocation(row.actualPct / 100)}</div>

                <div className="text-foreground/60">Current Value</div>
                <div className="text-right">{formatTHB(holdingValueTHB(row.holding))}</div>

                <div className="text-foreground/60">Target Amount</div>
                <div className="text-right">
                  {formatTHB((row.targetPct / 100) * totalMarketValue)}
                </div>

                <div className="text-foreground/60">Drift</div>
                <div className={`text-right ${driftColor(status)}`}>
                  {formatPercent(row.driftPct / 100)}
                </div>

                <div className="text-foreground/60">Drift Amount</div>
                <div className={`text-right ${driftColor(status)}`}>
                  {formatTHB(row.driftAmountTHB)}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="mt-4 hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-foreground/10 text-xs uppercase tracking-wide text-foreground/60">
              <th scope="col" className="pb-3 pr-4 font-medium">Holding</th>
              <th scope="col" className="pb-3 pr-4 text-right font-medium">Target</th>
              <th scope="col" className="pb-3 pr-4 text-right font-medium">Actual</th>
              <th scope="col" className="pb-3 pr-4 text-right font-medium">Current Value</th>
              <th scope="col" className="pb-3 pr-4 text-right font-medium">Target Amount</th>
              <th scope="col" className="pb-3 pr-4 text-right font-medium">Drift</th>
              <th scope="col" className="pb-3 pr-4 text-right font-medium">Drift Amount</th>
              <th scope="col" className="pb-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {sortedRows.map((row) => {
              const status = statusFor(row, driftThreshold);
              const color = driftColor(status);
              return (
                <tr key={row.holding.id} className="border-b border-foreground/5">
                  <td className="py-3 pr-4">
                    <div className="font-medium">{row.holding.name}</div>
                    {row.holding.ticker && (
                      <div className="text-xs text-foreground/50">{row.holding.ticker}</div>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {formatAllocation(row.targetPct / 100)}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {formatAllocation(row.actualPct / 100)}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {formatTHB(holdingValueTHB(row.holding))}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {formatTHB((row.targetPct / 100) * totalMarketValue)}
                  </td>
                  <td className={`py-3 pr-4 text-right ${color}`}>
                    {formatPercent(row.driftPct / 100)}
                  </td>
                  <td className={`py-3 pr-4 text-right ${color}`}>
                    {formatTHB(row.driftAmountTHB)}
                  </td>
                  <td className={`py-3 font-medium ${color}`}>{STATUS_LABELS[status]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Suggested transfers */}
      <div className="mt-6">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
          Suggested Transfers
        </h4>
        {outOfBalance.length === 0 ? (
          <p className="mt-2 text-sm text-foreground/60">
            All holdings are within the ±{driftThreshold}% drift threshold.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {transfers.map((t, i) => (
              <p key={i} className="text-sm">
                Move <span className="font-medium">{formatTHB(t.amountTHB)}</span> from{" "}
                <span className="font-medium">{t.fromHolding.name}</span> to{" "}
                <span className="font-medium">{t.toHolding.name}</span>
              </p>
            ))}

            {/* Unpaired excess / deficit when one side has no counterpart. */}
            {!hasUnderweight && hasOverweight && (
              <p className="text-sm text-foreground/60">
                No underweight holdings with targets — no paired transfer is possible. The
                overweight amounts above could be moved to cash or a new position.
              </p>
            )}
            {!hasOverweight && hasUnderweight && (
              <p className="text-sm text-foreground/60">
                No overweight holdings with targets — no paired transfer is possible. The
                underweight amounts above need to be funded from new contributions.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function DriftThresholdInput() {
  const { rebalanceSettings, updateRebalanceSettings } = useRebalanceSettings();

  return (
    <label className="flex items-center gap-2 text-sm text-foreground/70">
      <span>Drift threshold: ±</span>
      <input
        type="number"
        min="0"
        max="50"
        step="0.5"
        value={rebalanceSettings.driftThreshold}
        onChange={(e) => {
          const value = Number(e.target.value);
          if (Number.isFinite(value)) {
            updateRebalanceSettings({ driftThreshold: value });
          }
        }}
        aria-label="Drift threshold percentage"
        className="w-20 rounded-md border border-foreground/20 bg-transparent px-2 py-1.5 text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
      />
      <span>%</span>
    </label>
  );
}
