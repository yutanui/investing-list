"use client";

import { useRef, useEffect, useState } from "react";
import { Holding, AssetType, HoldingType, Currency, ASSET_TYPE_LABELS, HOLDING_TYPE_LABELS, CURRENCY_LABELS } from "@/types/portfolio";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// Holding data without portfolioId - the context adds it
type HoldingFormData = Omit<Holding, "portfolioId">;

interface HoldingDialogProps {
  open: boolean;
  holding?: Holding | null;
  allHoldings?: Holding[];
  onSave: (holding: HoldingFormData) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
  onNavUpdated?: (id: string, updates: { currentPrice: number; navDate: string }) => void;
}

const ASSET_TYPES = Object.entries(ASSET_TYPE_LABELS) as [AssetType, string][];
const HOLDING_TYPES = Object.entries(HOLDING_TYPE_LABELS) as [HoldingType, string][];
const CURRENCIES = Object.entries(CURRENCY_LABELS) as [Currency, string][];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function HoldingDialog({
  open,
  holding,
  allHoldings = [],
  onSave,
  onDelete,
  onClose,
  onNavUpdated,
}: HoldingDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!holding;

  const [navLoading, setNavLoading] = useState(false);
  const [navError, setNavError] = useState<string | null>(null);
  const [priceValue, setPriceValue] = useState<string>("");
  const [assetType, setAssetType] = useState<AssetType>(holding?.assetType ?? "stock");
  const [targetAllocationValue, setTargetAllocationValue] = useState<string>("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
      setPriceValue(holding?.currentPrice?.toString() ?? "");
      setAssetType(holding?.assetType ?? "stock");
      setTargetAllocationValue(
        holding?.targetAllocation === null || holding?.targetAllocation === undefined
          ? ""
          : String(holding.targetAllocation),
      );
      requestAnimationFrame(() => firstInputRef.current?.focus());
    } else {
      dialog.close();
      setPriceValue("");
      setNavError(null);
      setNavLoading(false);
    }
  }, [open, holding?.currentPrice, holding?.assetType, holding?.targetAllocation]);

  // Handle native dialog close (Escape key)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    function handleClose() {
      onClose();
    }

    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  // Click backdrop to close
  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) {
      onClose();
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const saved: HoldingFormData = {
      id: holding?.id ?? generateId(),
      name: (formData.get("name") as string).trim(),
      ticker: (formData.get("ticker") as string).trim() || undefined,
      assetType: formData.get("assetType") as AssetType,
      holdingType: formData.get("holdingType") as HoldingType,
      shares: Number(formData.get("shares")),
      averageCost: Number(formData.get("averageCost")),
      averageCostCurrency: formData.get("averageCostCurrency") as Currency,
      currentPrice: Number(formData.get("currentPrice")),
      currentPriceCurrency: formData.get("currentPriceCurrency") as Currency,
      companyId: (formData.get("companyId") as string).trim() || undefined,
      holdingId: (formData.get("holdingId") as string).trim() || undefined,
      targetAllocation:
        (formData.get("targetAllocation") as string).trim() === ""
          ? null
          : Number(formData.get("targetAllocation")),
    };

    onSave(saved);
  }

  function handleDelete() {
    if (!holding || !onDelete) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${holding.name}"? This action cannot be undone.`,
    );
    if (confirmed) {
      onDelete(holding.id);
    }
  }

  async function handleUpdateNav() {
    if (!holding?.holdingId) return;

    setNavLoading(true);
    setNavError(null);

    const navDate = new Date().toISOString().slice(0, 10);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (isSupabaseConfigured) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }
      }

      const res = await fetch("/api/fetch-nav", {
        method: "POST",
        headers,
        body: JSON.stringify({ holdingId: holding.holdingId, navDate }),
      });

      const result = (await res.json()) as { lastVal: number | null; navDate: string | null; error?: string };

      if (result.lastVal !== null) {
        setPriceValue(result.lastVal.toString());
        onNavUpdated?.(holding.id, {
          currentPrice: result.lastVal,
          navDate: result.navDate ?? navDate,
        });
      } else {
        setNavError(result.error ?? "Could not fetch NAV");
      }
    } catch {
      setNavError("Network error — could not reach the NAV service");
    } finally {
      setNavLoading(false);
    }
  }

  const isCashLike = assetType === "cash" || assetType === "money_market_fund";

  // Running total of target allocation across all holdings in the portfolio,
  // excluding the currently-edited holding (its live value is added instead).
  const otherHoldings = allHoldings.filter((h) => h.id !== holding?.id);
  const otherAllocations = otherHoldings.filter(
    (h) => h.targetAllocation !== null && h.targetAllocation !== undefined,
  );
  const otherTotal = otherAllocations.reduce(
    (sum, h) => sum + (h.targetAllocation ?? 0),
    0,
  );
  const currentTarget =
    targetAllocationValue.trim() === "" ? null : Number(targetAllocationValue);
  const totalAllocated = otherTotal + (currentTarget ?? 0);
  const allocatedCount = otherAllocations.length + (currentTarget !== null ? 1 : 0);

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 m-0 h-full w-full bg-transparent p-0 backdrop:bg-black/50 sm:m-auto sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-lg sm:rounded-xl"
    >
      <div className="flex h-full flex-col bg-background text-foreground sm:rounded-xl sm:border sm:border-foreground/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-3 sm:px-6">
          <h2 className="text-lg font-semibold">
            {isEditing ? "Edit Holding" : "Add Holding"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-foreground/50 hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
            aria-label="Close dialog"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 space-y-4 px-4 py-4 sm:px-6" style={{ touchAction: "manipulation" }}>
            {/* Name */}
            <div>
              <label htmlFor="holding-name" className="block text-sm font-medium">
                Name
              </label>
              <input
                ref={firstInputRef}
                id="holding-name"
                name="name"
                type="text"
                required
                defaultValue={holding?.name ?? ""}
                placeholder="e.g. Bangkok Bank…"
                autoComplete="off"
                className="mt-1 block w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2.5 text-sm placeholder:text-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
              />
            </div>

            {/* Ticker */}
            <div>
              <label htmlFor="holding-ticker" className="block text-sm font-medium">
                Ticker <span className="font-normal text-foreground/50">(optional)</span>
              </label>
              <input
                id="holding-ticker"
                name="ticker"
                type="text"
                defaultValue={holding?.ticker ?? ""}
                placeholder="e.g. BBL…"
                autoComplete="off"
                className="mt-1 block w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2.5 text-sm uppercase placeholder:normal-case placeholder:text-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
              />
            </div>

            {/* Asset Type */}
            <div>
              <label htmlFor="holding-asset-type" className="block text-sm font-medium">
                Asset Type
              </label>
              <select
                id="holding-asset-type"
                name="assetType"
                required
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as AssetType)}
                className="mt-1 block w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
              >
                {ASSET_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Holding Type */}
            <div>
              <label htmlFor="holding-type" className="block text-sm font-medium">
                Type
              </label>
              <select
                id="holding-type"
                name="holdingType"
                required
                defaultValue={holding?.holdingType ?? "core"}
                className="mt-1 block w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
              >
                {HOLDING_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Allocation */}
            <div>
              <label htmlFor="holding-target-allocation" className="block text-sm font-medium">
                Target Allocation (%){" "}
                <span className="font-normal text-foreground/50">(optional)</span>
              </label>
              <input
                id="holding-target-allocation"
                name="targetAllocation"
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="0.01"
                value={targetAllocationValue}
                onChange={(e) => setTargetAllocationValue(e.target.value)}
                placeholder="e.g. 25"
                autoComplete="off"
                className="mt-1 block w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2.5 text-sm tabular-nums placeholder:text-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
              />
              <p
                className={`mt-1 text-xs ${totalAllocated > 100 ? "text-loss" : "text-foreground/50"}`}
              >
                Total allocated: {totalAllocated.toFixed(2)}% across {allocatedCount}{" "}
                {allocatedCount === 1 ? "holding" : "holdings"}
                {totalAllocated > 100 ? " — exceeds 100%" : ""}
              </p>
              <p className="mt-1 text-xs text-foreground/40">
                Leave blank to exclude this holding from rebalancing.
              </p>
            </div>

            {/* Shares / Units — or Balance for cash-like assets */}
            <div>
              <label htmlFor="holding-shares" className="block text-sm font-medium">
                {isCashLike ? "Balance (THB)" : "Shares / Units"}
              </label>
              <input
                id="holding-shares"
                name="shares"
                type="number"
                inputMode="decimal"
                required
                min="0"
                step="any"
                defaultValue={holding?.shares ?? ""}
                placeholder={isCashLike ? "e.g. 50000…" : "e.g. 100…"}
                autoComplete="off"
                className="mt-1 block w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2.5 text-sm tabular-nums placeholder:text-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
              />
              {isCashLike && (
                <p className="mt-1 text-xs text-foreground/50">Enter your total cash balance</p>
              )}
            </div>

            {/* Average Cost — hidden for cash-like assets (submitted as 1 via hidden input) */}
            {isCashLike ? (
              <>
                <input type="hidden" name="averageCost" value="1" />
                <input type="hidden" name="averageCostCurrency" value="THB" />
              </>
            ) : (
              <div>
                <label htmlFor="holding-avg-cost" className="block text-sm font-medium">
                  Average Cost <span className="font-normal text-foreground/50">(per unit)</span>
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    id="holding-avg-cost"
                    name="averageCost"
                    type="number"
                    inputMode="decimal"
                    required
                    min="0"
                    step="any"
                    defaultValue={holding?.averageCost ?? ""}
                    placeholder="e.g. 120.50…"
                    autoComplete="off"
                    className="block flex-1 rounded-md border border-foreground/20 bg-transparent px-3 py-2.5 text-sm tabular-nums placeholder:text-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
                  />
                  <select
                    id="holding-avg-cost-currency"
                    name="averageCostCurrency"
                    defaultValue={holding?.averageCostCurrency ?? "THB"}
                    className="w-20 rounded-md border border-foreground/20 bg-transparent px-2 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
                  >
                    {CURRENCIES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Current Price — hidden for cash-like assets (submitted as 1 via hidden input) */}
            {isCashLike ? (
              <>
                <input type="hidden" name="currentPrice" value="1" />
                <input type="hidden" name="currentPriceCurrency" value="THB" />
              </>
            ) : (
              <div>
                <label htmlFor="holding-current-price" className="block text-sm font-medium">
                  Current Price <span className="font-normal text-foreground/50">(per unit)</span>
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    id="holding-current-price"
                    name="currentPrice"
                    type="number"
                    inputMode="decimal"
                    required
                    min="0"
                    step="any"
                    value={priceValue}
                    onChange={(e) => setPriceValue(e.target.value)}
                    placeholder="e.g. 135.00…"
                    autoComplete="off"
                    className="block flex-1 rounded-md border border-foreground/20 bg-transparent px-3 py-2.5 text-sm tabular-nums placeholder:text-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
                  />
                  <select
                    id="holding-current-price-currency"
                    name="currentPriceCurrency"
                    defaultValue={holding?.currentPriceCurrency ?? "THB"}
                    className="w-20 rounded-md border border-foreground/20 bg-transparent px-2 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
                  >
                    {CURRENCIES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Company ID */}
            <div>
              <label htmlFor="holding-company-id" className="block text-sm font-medium">
                Company ID <span className="font-normal text-foreground/50">(optional)</span>
              </label>
              <input
                id="holding-company-id"
                name="companyId"
                type="text"
                defaultValue={holding?.companyId ?? ""}
                placeholder="e.g. BBL…"
                autoComplete="off"
                className="mt-1 block w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2.5 text-sm placeholder:text-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
              />
            </div>

            {/* Holding ID */}
            <div>
              <label htmlFor="holding-holding-id" className="block text-sm font-medium">
                Holding ID <span className="font-normal text-foreground/50">(optional)</span>
              </label>
              <input
                id="holding-holding-id"
                name="holdingId"
                type="text"
                defaultValue={holding?.holdingId ?? ""}
                placeholder="e.g. 12345…"
                autoComplete="off"
                className="mt-1 block w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2.5 text-sm placeholder:text-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse gap-2 border-t border-foreground/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            {/* Delete + Update NAV — only in edit mode */}
            <div className="flex items-center gap-2">
              {isEditing && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-md px-3 py-2 text-sm font-medium text-loss hover:bg-loss/10 focus-visible:ring-2 focus-visible:ring-loss/30 focus-visible:outline-none"
                >
                  Delete
                </button>
              )}
              {isEditing && holding?.holdingId && (
                <div>
                  <button
                    type="button"
                    onClick={handleUpdateNav}
                    disabled={navLoading}
                    className="inline-flex items-center gap-1.5 rounded-md border border-foreground/20 px-3 py-2 text-sm font-medium hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {navLoading ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Fetching…
                      </>
                    ) : (
                      "Update NAV"
                    )}
                  </button>
                  {navError && (
                    <p className="mt-1 text-xs text-loss">{navError}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-foreground/20 px-4 py-2 text-sm font-medium hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              >
                {isEditing ? "Save Changes" : "Add Holding"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </dialog>
  );
}
