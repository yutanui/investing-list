"use client";

import { useRef, useEffect } from "react";
import { Portfolio } from "@/types/portfolio";

interface PortfolioDialogProps {
  open: boolean;
  portfolio?: Portfolio | null;
  onSave: (portfolio: Portfolio) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function PortfolioDialog({
  open,
  portfolio,
  onSave,
  onDelete,
  onClose,
}: PortfolioDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!portfolio;

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

    const saved: Portfolio = {
      id: portfolio?.id ?? generateId(),
      name: (formData.get("name") as string).trim(),
    };

    onSave(saved);
  }

  function handleDelete() {
    if (!portfolio || !onDelete) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${portfolio.name}"? All holdings in this portfolio will also be deleted. This action cannot be undone.`,
    );
    if (confirmed) {
      onDelete(portfolio.id);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 m-0 h-full w-full bg-transparent p-0 backdrop:bg-black/50 sm:m-auto sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-md sm:rounded-xl"
    >
      <div className="flex h-full flex-col bg-background text-foreground sm:rounded-xl sm:border sm:border-foreground/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-3 sm:px-6">
          <h2 className="text-lg font-semibold">
            {isEditing ? "Edit Portfolio" : "Add Portfolio"}
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
              <label htmlFor="portfolio-name" className="block text-sm font-medium">
                Portfolio Name
              </label>
              <input
                ref={firstInputRef}
                id="portfolio-name"
                name="name"
                type="text"
                required
                defaultValue={portfolio?.name ?? ""}
                placeholder="e.g. Retirement Fund…"
                autoComplete="off"
                className="mt-1 block w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2.5 text-sm placeholder:text-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
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
                {isEditing ? "Save Changes" : "Add Portfolio"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </dialog>
  );
}
