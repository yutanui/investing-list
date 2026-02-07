"use client";

import { useRef, useEffect } from "react";
import { Holding, AssetType, ASSET_TYPE_LABELS } from "@/types/portfolio";

// Holding data without portfolioId - the context adds it
type HoldingFormData = Omit<Holding, "portfolioId">;

interface HoldingDialogProps {
  open: boolean;
  holding?: Holding | null;
  onSave: (holding: HoldingFormData) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const ASSET_TYPES = Object.entries(ASSET_TYPE_LABELS) as [AssetType, string][];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function HoldingDialog({
  open,
  holding,
  onSave,
  onDelete,
  onClose,
}: HoldingDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!holding;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
      requestAnimationFrame(() => firstInputRef.current?.focus());
    } else {
      dialog.close();
    }
  }, [open]);

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
      shares: Number(formData.get("shares")),
      averageCost: Number(formData.get("averageCost")),
      currentPrice: Number(formData.get("currentPrice")),
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
                defaultValue={holding?.assetType ?? "stock"}
                className="mt-1 block w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
              >
                {ASSET_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Shares / Units */}
            <div>
              <label htmlFor="holding-shares" className="block text-sm font-medium">
                Shares / Units
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
                placeholder="e.g. 100…"
                autoComplete="off"
                className="mt-1 block w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2.5 text-sm tabular-nums placeholder:text-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
              />
            </div>

            {/* Average Cost */}
            <div>
              <label htmlFor="holding-avg-cost" className="block text-sm font-medium">
                Average Cost <span className="font-normal text-foreground/50">(THB per unit)</span>
              </label>
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
                className="mt-1 block w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2.5 text-sm tabular-nums placeholder:text-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
              />
            </div>

            {/* Current Price */}
            <div>
              <label htmlFor="holding-current-price" className="block text-sm font-medium">
                Current Price <span className="font-normal text-foreground/50">(THB per unit)</span>
              </label>
              <input
                id="holding-current-price"
                name="currentPrice"
                type="number"
                inputMode="decimal"
                required
                min="0"
                step="any"
                defaultValue={holding?.currentPrice ?? ""}
                placeholder="e.g. 135.00…"
                autoComplete="off"
                className="mt-1 block w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2.5 text-sm tabular-nums placeholder:text-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse gap-2 border-t border-foreground/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            {/* Delete — only in edit mode */}
            <div>
              {isEditing && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-md px-3 py-2 text-sm font-medium text-loss hover:bg-loss/10 focus-visible:ring-2 focus-visible:ring-loss/30 focus-visible:outline-none"
                >
                  Delete
                </button>
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
