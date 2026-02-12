"use client";

import { useState } from "react";
import { AuthProvider } from "@/context/auth-context";
import { PortfolioListProvider } from "@/context/portfolio-list-context";
import { HoldingsProvider } from "@/context/holdings-context";
import { Header } from "@/components/header";
import { PortfolioNav } from "@/components/portfolio-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <AuthProvider>
      <PortfolioListProvider>
        <HoldingsProvider>
          <Header onMenuToggle={() => setNavOpen((o) => !o)} />
          <div className="flex flex-1">
            <PortfolioNav open={navOpen} onClose={() => setNavOpen(false)} />
            <main id="main-content" className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8">
              {children}
            </main>
          </div>
        </HoldingsProvider>
      </PortfolioListProvider>
    </AuthProvider>
  );
}
