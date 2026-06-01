import { BucketId, BUCKET_LABELS } from "@/types/portfolio";
import { formatTHB, formatAllocation } from "@/lib/format";

interface BucketData {
  bucketId: BucketId;
  actualValue: number;
  actualPercent: number; // 0–1
  targetPercent: number; // 0–1
  delta: number; // actualPercent - targetPercent, as fraction
}

interface BucketSummaryProps {
  buckets: BucketData[];
  showTargets: boolean; // false when all targets are 0
}

export function BucketSummary({ buckets, showTargets }: BucketSummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {buckets.map(({ bucketId, actualValue, actualPercent, targetPercent, delta }) => (
        <div
          key={bucketId}
          className="rounded-lg border border-foreground/15 px-4 py-3"
        >
          <p className="text-xs font-medium text-foreground/60">
            {BUCKET_LABELS[bucketId]}
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {formatTHB(actualValue)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xs text-foreground/60">
              <span className="font-medium text-foreground/80">
                {formatAllocation(actualPercent)}
              </span>{" "}
              Actual
            </span>
            {showTargets && (
              <>
                <span className="text-xs text-foreground/60">
                  <span className="font-medium text-foreground/80">
                    {formatAllocation(targetPercent)}
                  </span>{" "}
                  Target
                </span>
                <span
                  className={`text-xs font-medium ${delta >= 0 ? "text-gain" : "text-loss"}`}
                >
                  {"Δ"} {delta >= 0 ? "+" : ""}
                  {formatAllocation(Math.abs(delta))} Delta
                </span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
