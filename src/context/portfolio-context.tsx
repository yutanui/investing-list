"use client";

import { createContext, use, useCallback, useEffect, useState } from "react";
import { Holding, AssetType, HoldingType, Currency } from "@/types/portfolio";
import { loadHoldings, saveHoldings } from "@/lib/storage";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";

/**
 * Portfolio context — decouples state management from UI components.
 *
 * When logged in:  reads/writes to Supabase (cloud sync)
 * When logged out: reads/writes to localStorage (local-only)
 */

interface PortfolioState {
  holdings: Holding[];
  loading: boolean;
}

interface PortfolioActions {
  addHolding: (holding: Omit<Holding, "portfolioId">) => void;
  updateHolding: (id: string, updates: Partial<Omit<Holding, "id" | "portfolioId">>) => void;
  removeHolding: (id: string) => void;
}

type PortfolioContextValue = PortfolioState & PortfolioActions;

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

// --- Supabase row ↔ Holding mappers ---

interface HoldingRow {
  id: string;
  portfolio_id: string;
  name: string;
  ticker: string | null;
  asset_type: AssetType;
  holding_type: HoldingType;
  shares: number;
  avg_cost: number;
  avg_cost_currency: Currency;
  current_price: number;
  current_price_currency: Currency;
}

function rowToHolding(row: HoldingRow): Holding {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    name: row.name,
    ticker: row.ticker ?? undefined,
    assetType: row.asset_type,
    holdingType: row.holding_type ?? "core",
    shares: Number(row.shares),
    averageCost: Number(row.avg_cost),
    averageCostCurrency: row.avg_cost_currency ?? "THB",
    currentPrice: Number(row.current_price),
    currentPriceCurrency: row.current_price_currency ?? "THB",
  };
}

interface PortfolioProviderProps {
  portfolioId: string;
  children: React.ReactNode;
}

export function PortfolioProvider({ portfolioId, children }: PortfolioProviderProps) {
  const { user, loading: authLoading } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);

  // Load holdings when auth state changes.
  // All setState calls happen inside async .then() callbacks
  // to satisfy the React compiler lint rule (no synchronous setState in effects).
  useEffect(() => {
    if (authLoading) return;

    let stale = false;

    const loadData = user
      ? supabase
          .from("holdings")
          .select("*")
          .eq("portfolio_id", portfolioId)
          .order("created_at", { ascending: true })
          .then(({ data, error }) => {
            if (error) {
              console.error("Failed to load holdings:", error.message);
              return [] as Holding[];
            }
            return (data as HoldingRow[]).map(rowToHolding);
          })
      : Promise.resolve(
          loadHoldings().filter((h) => h.portfolioId === portfolioId)
        );

    loadData.then((loaded) => {
      if (stale) return;
      setHoldings(loaded);
      setLoading(false);
    });

    return () => {
      stale = true;
    };
  }, [user, authLoading, portfolioId]);

  const addHolding = useCallback(
    async (holding: Omit<Holding, "portfolioId">) => {
      if (user) {
        const { data, error } = await supabase
          .from("holdings")
          .insert({
            portfolio_id: portfolioId,
            name: holding.name,
            ticker: holding.ticker ?? null,
            asset_type: holding.assetType,
            holding_type: holding.holdingType,
            shares: holding.shares,
            avg_cost: holding.averageCost,
            avg_cost_currency: holding.averageCostCurrency,
            current_price: holding.currentPrice,
            current_price_currency: holding.currentPriceCurrency,
          })
          .select()
          .single();

        if (error) {
          console.error("Failed to add holding:", error.message);
          return;
        }
        setHoldings((prev) => [...prev, rowToHolding(data as HoldingRow)]);
      } else {
        const newHolding: Holding = { ...holding, portfolioId };
        const allHoldings = loadHoldings();
        const next = [...allHoldings, newHolding];
        saveHoldings(next);
        setHoldings((prev) => [...prev, newHolding]);
      }
    },
    [user, portfolioId],
  );

  const updateHolding = useCallback(
    async (id: string, updates: Partial<Omit<Holding, "id" | "portfolioId">>) => {
      if (user) {
        const dbUpdates: Record<string, unknown> = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.ticker !== undefined) dbUpdates.ticker = updates.ticker ?? null;
        if (updates.assetType !== undefined) dbUpdates.asset_type = updates.assetType;
        if (updates.holdingType !== undefined) dbUpdates.holding_type = updates.holdingType;
        if (updates.shares !== undefined) dbUpdates.shares = updates.shares;
        if (updates.averageCost !== undefined) dbUpdates.avg_cost = updates.averageCost;
        if (updates.averageCostCurrency !== undefined) dbUpdates.avg_cost_currency = updates.averageCostCurrency;
        if (updates.currentPrice !== undefined) dbUpdates.current_price = updates.currentPrice;
        if (updates.currentPriceCurrency !== undefined) dbUpdates.current_price_currency = updates.currentPriceCurrency;
        dbUpdates.updated_at = new Date().toISOString();

        const { error } = await supabase
          .from("holdings")
          .update(dbUpdates)
          .eq("id", id);

        if (error) {
          console.error("Failed to update holding:", error.message);
          return;
        }
        setHoldings((prev) =>
          prev.map((h) => (h.id === id ? { ...h, ...updates } : h)),
        );
      } else {
        const allHoldings = loadHoldings();
        const next = allHoldings.map((h) =>
          h.id === id ? { ...h, ...updates } : h,
        );
        saveHoldings(next);
        setHoldings((prev) =>
          prev.map((h) => (h.id === id ? { ...h, ...updates } : h)),
        );
      }
    },
    [user],
  );

  const removeHolding = useCallback(
    async (id: string) => {
      if (user) {
        const { error } = await supabase
          .from("holdings")
          .delete()
          .eq("id", id);

        if (error) {
          console.error("Failed to delete holding:", error.message);
          return;
        }
        setHoldings((prev) => prev.filter((h) => h.id !== id));
      } else {
        const allHoldings = loadHoldings();
        const next = allHoldings.filter((h) => h.id !== id);
        saveHoldings(next);
        setHoldings((prev) => prev.filter((h) => h.id !== id));
      }
    },
    [user],
  );

  return (
    <PortfolioContext value={{ holdings, loading, addHolding, updateHolding, removeHolding }}>
      {children}
    </PortfolioContext>
  );
}

export function usePortfolio(): PortfolioContextValue {
  const context = use(PortfolioContext);
  if (!context) {
    throw new Error("usePortfolio must be used within a <PortfolioProvider>");
  }
  return context;
}
