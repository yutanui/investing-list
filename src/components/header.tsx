"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { usePrivacyMode } from "@/context/privacy-context";
import { usePortfolioList } from "@/context/portfolio-list-context";
import { AuthDialog } from "@/components/auth-dialog";
import { PortfolioDialog } from "@/components/portfolio-dialog";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Portfolio } from "@/types/portfolio";

export function Header() {
  const { user, loading, signOut, isRecoveryMode, clearRecoveryMode } = useAuth();
  const { addPortfolio } = usePortfolioList();
  const { privacyMode, togglePrivacyMode } = usePrivacyMode();
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
              onClick={togglePrivacyMode}
              data-testid="privacy-toggle"
              aria-pressed={privacyMode}
              aria-label={privacyMode ? "Disable privacy mode" : "Enable privacy mode"}
              className={
                privacyMode
                  ? "inline-flex items-center justify-center rounded-md bg-blue-100 px-2.5 py-1.5 text-blue-700 hover:bg-blue-200 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
                  : "inline-flex items-center justify-center rounded-md border border-foreground/20 px-2.5 py-1.5 text-foreground/80 hover:bg-foreground/5 hover:border-foreground/40 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
              }
            >
              {privacyMode ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              )}
            </button>
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
