"use client";

import { createContext, use, useCallback, useEffect, useState } from "react";
import { Holding, Currency } from "@/types/portfolio";
import { loadHoldings } from "@/lib/storage";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { toTHB } from "@/lib/format";

/**
 * Shared holdings context — loads all holdings once so both
 * the sidebar (portfolio cards) and pages can access stats.
 */

export interface PortfolioStats {
  holdingsCount: number;
  totalValue: number;
  totalCost: number;
  gainLoss: number;
  gainLossPercent: number;
}

interface HoldingsContextValue {
  allHoldings: Holding[];
  loading: boolean;
  getPortfolioStats: (portfolioId: string) => PortfolioStats;
  reload: () => void;
}

const HoldingsContext = createContext<HoldingsContextValue | null>(null);

export function HoldingsProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [allHoldings, setAllHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (authLoading) return;

    let stale = false;

    const loadData = user
      ? supabase
          .from("holdings")
          .select("id, portfolio_id, shares, current_price, current_price_currency, avg_cost, avg_cost_currency")
          .then(({ data, error }) => {
            if (error) {
              console.error("Failed to load holdings:", error.message);
              return [] as Holding[];
            }
            return (data ?? []).map((row) => ({
              id: row.id,
              portfolioId: row.portfolio_id,
              shares: Number(row.shares),
              currentPrice: Number(row.current_price),
              currentPriceCurrency: (row.current_price_currency ?? "THB") as Currency,
              averageCost: Number(row.avg_cost),
              averageCostCurrency: (row.avg_cost_currency ?? "THB") as Currency,
            })) as Holding[];
          })
      : Promise.resolve(loadHoldings());

    loadData.then((holdings) => {
      if (stale) return;
      setAllHoldings(holdings);
      setLoading(false);
    });

    return () => {
      stale = true;
    };
  }, [user, authLoading, reloadKey]);

  const getPortfolioStats = useCallback(
    (portfolioId: string): PortfolioStats => {
      const portfolioHoldings = allHoldings.filter((h) => h.portfolioId === portfolioId);
      const holdingsCount = portfolioHoldings.length;
      const totalValue = portfolioHoldings.reduce(
        (sum, h) => sum + h.shares * toTHB(h.currentPrice, h.currentPriceCurrency),
        0,
      );
      const totalCost = portfolioHoldings.reduce(
        (sum, h) => sum + h.shares * toTHB(h.averageCost, h.averageCostCurrency),
        0,
      );
      const gainLoss = totalValue - totalCost;
      const gainLossPercent = totalCost > 0 ? gainLoss / totalCost : 0;
      return { holdingsCount, totalValue, totalCost, gainLoss, gainLossPercent };
    },
    [allHoldings],
  );

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  return (
    <HoldingsContext value={{ allHoldings, loading, getPortfolioStats, reload }}>
      {children}
    </HoldingsContext>
  );
}

export function useAllHoldings(): HoldingsContextValue {
  const context = use(HoldingsContext);
  if (!context) {
    throw new Error("useAllHoldings must be used within a <HoldingsProvider>");
  }
  return context;
}
