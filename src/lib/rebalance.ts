/**
 * Rebalancing calculations.
 *
 * Keeps the portfolio page component clean by housing all drift and
 * transfer-suggestion logic here. All monetary values are in THB
 * (callers must convert via toTHB before passing totals/values).
 */

import type { Holding } from "@/types/portfolio";
import { toTHB } from "@/lib/format";

export interface DriftRow {
  holding: Holding;
  targetPct: number; // 0–100
  actualPct: number; // 0–100
  driftPct: number; // actualPct - targetPct
  driftAmountTHB: number; // driftPct / 100 * totalValueTHB
  status: "overweight" | "underweight" | "balanced";
}

export interface TransferSuggestion {
  fromHolding: Holding;
  toHolding: Holding;
  amountTHB: number;
}

/**
 * Market value of a single holding in THB.
 */
export function holdingValueTHB(holding: Holding): number {
  return holding.shares * toTHB(holding.currentPrice, holding.currentPriceCurrency);
}

/**
 * Compute drift for each holding that has a non-null targetAllocation.
 *
 * Holdings without a target are excluded from the result, but the caller
 * is expected to compute totalValueTHB across ALL holdings so actual
 * percentages reflect the full portfolio.
 *
 * Note: `status` here is a coarse sign indicator (over/under/balanced at
 * exactly on-target). The drift-threshold-aware "balanced" classification
 * is applied where the threshold is known — see computeTransfers and the
 * page UI which compare |driftPct| against driftThreshold.
 */
export function computeDrift(holdings: Holding[], totalValueTHB: number): DriftRow[] {
  const rows: DriftRow[] = [];

  for (const holding of holdings) {
    if (holding.targetAllocation === null || holding.targetAllocation === undefined) {
      continue;
    }

    const targetPct = holding.targetAllocation;
    const valueTHB = holdingValueTHB(holding);
    const actualPct = totalValueTHB > 0 ? (valueTHB / totalValueTHB) * 100 : 0;
    const driftPct = actualPct - targetPct;
    const driftAmountTHB = (driftPct / 100) * totalValueTHB;

    const status: DriftRow["status"] =
      driftPct > 0 ? "overweight" : driftPct < 0 ? "underweight" : "balanced";

    rows.push({ holding, targetPct, actualPct, driftPct, driftAmountTHB, status });
  }

  return rows;
}

/**
 * Generate greedy transfer suggestions from drift rows and a threshold.
 *
 * 1. Filter to rows where |driftPct| >= driftThreshold (outside tolerance).
 * 2. sources = overweight (driftAmountTHB > 0), sorted descending by amount.
 *    destinations = underweight (driftAmountTHB < 0), sorted ascending
 *    (most negative / most underweight first).
 * 3. Two-pointer greedy match: each transfer moves
 *    min(remainingSource, remainingDestinationDeficit).
 */
export function computeTransfers(
  driftRows: DriftRow[],
  driftThreshold: number,
): TransferSuggestion[] {
  const outOfBalance = driftRows.filter((r) => Math.abs(r.driftPct) >= driftThreshold);

  const sources = outOfBalance
    .filter((r) => r.driftAmountTHB > 0)
    .sort((a, b) => b.driftAmountTHB - a.driftAmountTHB)
    .map((r) => ({ holding: r.holding, remaining: r.driftAmountTHB }));

  const destinations = outOfBalance
    .filter((r) => r.driftAmountTHB < 0)
    .sort((a, b) => a.driftAmountTHB - b.driftAmountTHB)
    .map((r) => ({ holding: r.holding, remaining: -r.driftAmountTHB }));

  const suggestions: TransferSuggestion[] = [];

  let i = 0;
  let j = 0;
  while (i < sources.length && j < destinations.length) {
    const source = sources[i];
    const destination = destinations[j];

    const amountTHB = Math.min(source.remaining, destination.remaining);

    if (amountTHB > 0) {
      suggestions.push({
        fromHolding: source.holding,
        toHolding: destination.holding,
        amountTHB,
      });
    }

    source.remaining -= amountTHB;
    destination.remaining -= amountTHB;

    // Advance whichever side is exhausted (use a small epsilon for float safety).
    if (source.remaining <= 1e-6) i++;
    if (destination.remaining <= 1e-6) j++;
  }

  return suggestions;
}
