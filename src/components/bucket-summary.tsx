"use client";

import { BucketId, BUCKET_LABELS } from "@/types/portfolio";
import { formatTHB, maskTHB } from "@/lib/format";
import { usePrivacyMode } from "@/context/privacy-context";

interface BucketData {
  bucketId: BucketId;
  actualValue: number;
  actualPercent: number; // 0–1
  targetPercent: number; // 0–1
  delta: number; // actualPercent - targetPercent, as fraction
}

interface BucketSummaryProps {
  buckets: BucketData[];
  showTargets: boolean;
}

export function BucketSummary({ buckets, showTargets }: BucketSummaryProps) {
  const { privacyMode } = usePrivacyMode();
  return (
    <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-3">
      {buckets.map(({ bucketId, actualValue, actualPercent, targetPercent, delta }) => {
        const actualPct = actualPercent * 100;
        const targetPct = targetPercent * 100;
        const isPos = delta >= 0;
        return (
          <div
            key={bucketId}
            className="rounded-[18px] border border-line bg-panel px-6 py-[22px]"
            style={{ boxShadow: "0 1px 2px rgba(20,20,30,.02)" }}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[15px] font-bold text-ink">{BUCKET_LABELS[bucketId]}</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-faint">
                Bucket {bucketId}
              </span>
            </div>
            <div
              className="mt-3 tabular-nums text-ink"
              style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.02em" }}
            >
              {maskTHB(formatTHB(actualValue), privacyMode)}
            </div>
            {showTargets && (
              <>
                {/* Progress track */}
                <div
                  className="relative mt-4 mb-3.5 h-2 rounded-full bg-track"
                >
                  <div
                    className={`absolute left-0 top-0 h-full rounded-full ${isPos ? "bg-pos" : "bg-accent"}`}
                    style={{ width: `${Math.min(actualPct, 100)}%` }}
                  />
                  {/* Target marker */}
                  <div
                    className="absolute top-[-3px] h-3.5 w-0.5 rounded-sm bg-ink"
                    style={{ left: `${Math.min(targetPct, 100)}%` }}
                    title={`Target: ${targetPct.toFixed(2)}%`}
                  />
                </div>
                <div className="flex items-center gap-3.5 text-[12.5px] font-semibold">
                  <span className="text-muted">
                    Actual <span className="font-bold text-ink">{actualPct.toFixed(2)}%</span>
                  </span>
                  <span className="text-muted">
                    Target <span className="font-bold text-ink">{targetPct.toFixed(2)}%</span>
                  </span>
                  <span className={`ml-auto font-bold ${isPos ? "text-pos" : "text-neg"}`}>
                    {isPos ? "+" : ""}{(delta * 100).toFixed(2)}%
                  </span>
                </div>
              </>
            )}
            {!showTargets && (
              <div className="mt-2 text-[12.5px] font-semibold text-muted">
                {actualPct.toFixed(2)}% of portfolio
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
