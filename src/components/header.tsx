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
      <header className="sticky top-0 z-20 border-b border-line bg-background/80 backdrop-blur-md">
        <nav
          className="mx-auto flex h-[76px] max-w-[1280px] items-center justify-between px-4 sm:px-8 lg:px-14"
          aria-label="Main navigation"
        >
          {/* Logo + wordmark */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-accent text-white flex-shrink-0">
              {/* Layers icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/>
                <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/>
                <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>
              </svg>
            </span>
            <span className="text-[18px] font-bold tracking-[-0.01em] text-ink">Investing Portfolio</span>
          </Link>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            {/* Privacy toggle */}
            <button
              type="button"
              onClick={togglePrivacyMode}
              data-testid="privacy-toggle"
              aria-pressed={privacyMode}
              aria-label={privacyMode ? "Disable privacy mode" : "Enable privacy mode"}
              className="flex h-10 w-10 items-center justify-center rounded-[11px] border border-line2 bg-panel text-muted hover:border-faint hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            >
              {privacyMode ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9.88 9.88a3 3 0 1 0 4.243 4.243M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                  <line x1="2" x2="22" y1="2" y2="22"/>
                </svg>
              )}
            </button>

            {/* Add Portfolio — navy primary */}
            <button
              type="button"
              onClick={openAddPortfolio}
              className="inline-flex h-10 items-center gap-2 rounded-[11px] bg-accent px-4 text-[14px] font-semibold text-white hover:brightness-110 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              aria-label="Add new portfolio"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M12 5v14"/>
              </svg>
              <span className="hidden sm:inline">Add Portfolio</span>
            </button>

            {isSupabaseConfigured && !loading && (
              <>
                {user ? (
                  <>
                    {/* User chip */}
                    <div className="hidden sm:flex items-center gap-2 rounded-full border border-line2 bg-panel py-[5px] pl-[6px] pr-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-[12px] font-bold text-accent">
                        {user.email?.[0]?.toUpperCase() ?? "U"}
                      </span>
                      <span className="text-[13px] font-medium text-muted max-w-[160px] truncate">{user.email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => signOut()}
                      className="inline-flex h-10 items-center gap-2 rounded-[11px] border border-line2 bg-panel px-4 text-[14px] font-semibold text-muted hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" x2="9" y1="12" y2="12"/>
                      </svg>
                      <span className="hidden sm:inline">Sign Out</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAuthDialogOpen(true)}
                    className="inline-flex h-10 items-center rounded-[11px] border border-line2 bg-panel px-4 text-[14px] font-semibold text-muted hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
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
