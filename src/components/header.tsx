"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { usePortfolioList } from "@/context/portfolio-list-context";
import { AuthDialog } from "@/components/auth-dialog";
import { PortfolioDialog } from "@/components/portfolio-dialog";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Portfolio } from "@/types/portfolio";

export function Header() {
  const { user, loading, signOut, isRecoveryMode, clearRecoveryMode } = useAuth();
  const { addPortfolio } = usePortfolioList();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [portfolioDialogOpen, setPortfolioDialogOpen] = useState(false);
  const [portfolioDialogKey, setPortfolioDialogKey] = useState(0);

  // Auto-open the dialog in password-reset mode when Supabase fires PASSWORD_RECOVERY
  useEffect(() => {
    if (isRecoveryMode) setAuthDialogOpen(true);
  }, [isRecoveryMode]);

  function openAddPortfolio() {
    setPortfolioDialogKey((k) => k + 1);
    setPortfolioDialogOpen(true);
  }

  function handlePortfolioSave(portfolio: Portfolio) {
    addPortfolio(portfolio);
    setPortfolioDialogOpen(false);
  }

  return (
    <>
      <header className="border-b border-foreground/10">
        <nav
          className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8"
          aria-label="Main navigation"
        >
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-semibold tracking-tight hover:text-foreground/80">
              Investing Portfolio
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openAddPortfolio}
              className="inline-flex items-center gap-1.5 rounded-md border border-foreground/20 px-3 py-1.5 text-sm font-medium text-foreground/80 hover:bg-foreground/5 hover:border-foreground/40 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
              aria-label="Add new portfolio"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="hidden sm:inline">Add Portfolio</span>
            </button>

            {isSupabaseConfigured && !loading && (
              <>
                {user ? (
                  <>
                    <span className="hidden text-sm text-foreground/50 sm:block">
                      {user.email}
                    </span>
                    <button
                      type="button"
                      onClick={() => signOut()}
                      className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm font-medium hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAuthDialogOpen(true)}
                    className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                  >
                    Sign In
                  </button>
                )}
              </>
            )}
          </div>
        </nav>
      </header>

      <AuthDialog
        open={authDialogOpen}
        onClose={() => { setAuthDialogOpen(false); clearRecoveryMode(); }}
        initialMode={isRecoveryMode ? "reset_new_password" : undefined}
      />

      <PortfolioDialog
        key={portfolioDialogKey}
        open={portfolioDialogOpen}
        portfolio={null}
        onSave={handlePortfolioSave}
        onClose={() => setPortfolioDialogOpen(false)}
      />
    </>
  );
}
