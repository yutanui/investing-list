"use client";

import { AuthProvider } from "@/context/auth-context";
import { PortfolioListProvider } from "@/context/portfolio-list-context";
import { HoldingsProvider } from "@/context/holdings-context";
import { BucketSettingsProvider } from "@/context/bucket-settings-context";
import { Header } from "@/components/header";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PortfolioListProvider>
        <HoldingsProvider>
          <BucketSettingsProvider>
            <Header />
            <main id="main-content" className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8">
              {children}
            </main>
          </BucketSettingsProvider>
        </HoldingsProvider>
      </PortfolioListProvider>
    </AuthProvider>
  );
}
