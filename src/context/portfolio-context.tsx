"use client";

import { createContext, use, useCallback, useEffect, useState } from "react";
import { Holding, AssetType } from "@/types/portfolio";
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
  addHolding: (holding: Holding) => void;
  updateHolding: (id: string, updates: Partial<Omit<Holding, "id">>) => void;
  removeHolding: (id: string) => void;
}

type PortfolioContextValue = PortfolioState & PortfolioActions;

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

// --- Supabase row ↔ Holding mappers ---

interface HoldingRow {
  id: string;
  name: string;
  ticker: string | null;
  asset_type: AssetType;
  shares: number;
  avg_cost: number;
  current_price: number;
}

function rowToHolding(row: HoldingRow): Holding {
  return {
    id: row.id,
    name: row.name,
    ticker: row.ticker ?? undefined,
    assetType: row.asset_type,
    shares: Number(row.shares),
    averageCost: Number(row.avg_cost),
    currentPrice: Number(row.current_price),
  };
}

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
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
          .order("created_at", { ascending: true })
          .then(({ data, error }) => {
            if (error) {
              console.error("Failed to load holdings:", error.message);
              return [] as Holding[];
            }
            return (data as HoldingRow[]).map(rowToHolding);
          })
      : Promise.resolve(loadHoldings());

    loadData.then((loaded) => {
      if (stale) return;
      setHoldings(loaded);
      setLoading(false);
    });

    return () => {
      stale = true;
    };
  }, [user, authLoading]);

  const addHolding = useCallback(
    async (holding: Holding) => {
      if (user) {
        const { data, error } = await supabase
          .from("holdings")
          .insert({
            name: holding.name,
            ticker: holding.ticker ?? null,
            asset_type: holding.assetType,
            shares: holding.shares,
            avg_cost: holding.averageCost,
            current_price: holding.currentPrice,
          })
          .select()
          .single();

        if (error) {
          console.error("Failed to add holding:", error.message);
          return;
        }
        setHoldings((prev) => [...prev, rowToHolding(data as HoldingRow)]);
      } else {
        const next = [...holdings, holding];
        setHoldings(next);
        saveHoldings(next);
      }
    },
    [user, holdings],
  );

  const updateHolding = useCallback(
    async (id: string, updates: Partial<Omit<Holding, "id">>) => {
      if (user) {
        const dbUpdates: Record<string, unknown> = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.ticker !== undefined) dbUpdates.ticker = updates.ticker ?? null;
        if (updates.assetType !== undefined) dbUpdates.asset_type = updates.assetType;
        if (updates.shares !== undefined) dbUpdates.shares = updates.shares;
        if (updates.averageCost !== undefined) dbUpdates.avg_cost = updates.averageCost;
        if (updates.currentPrice !== undefined) dbUpdates.current_price = updates.currentPrice;
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
        const next = holdings.map((h) =>
          h.id === id ? { ...h, ...updates } : h,
        );
        setHoldings(next);
        saveHoldings(next);
      }
    },
    [user, holdings],
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
        const next = holdings.filter((h) => h.id !== id);
        setHoldings(next);
        saveHoldings(next);
      }
    },
    [user, holdings],
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
