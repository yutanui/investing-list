"use client";

import { AuthProvider } from "@/context/auth-context";
import { PrivacyModeProvider } from "@/context/privacy-context";
import { PortfolioListProvider } from "@/context/portfolio-list-context";
import { HoldingsProvider } from "@/context/holdings-context";
import { BucketSettingsProvider } from "@/context/bucket-settings-context";
import { RebalanceSettingsProvider } from "@/context/rebalance-settings-context";
import { Header } from "@/components/header";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PrivacyModeProvider>
        <PortfolioListProvider>
          <HoldingsProvider>
            <BucketSettingsProvider>
              <RebalanceSettingsProvider>
                <Header />
                <main id="main-content" className="min-w-0 flex-1">
                  <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-8 lg:px-14">
                    {children}
                  </div>
                </main>
              </RebalanceSettingsProvider>
            </BucketSettingsProvider>
          </HoldingsProvider>
        </PortfolioListProvider>
      </PrivacyModeProvider>
    </AuthProvider>
  );
}
