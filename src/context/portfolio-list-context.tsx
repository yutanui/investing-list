"use client";

import { createContext, use, useCallback, useEffect, useState } from "react";
import { Portfolio } from "@/types/portfolio";
import { loadPortfolios, savePortfolios } from "@/lib/storage";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";

/**
 * Portfolio list context — manages the list of portfolios.
 *
 * When logged in:  reads/writes to Supabase (cloud sync)
 * When logged out: reads/writes to localStorage (local-only)
 */

interface PortfolioListState {
  portfolios: Portfolio[];
  loading: boolean;
}

interface PortfolioListActions {
  addPortfolio: (portfolio: Portfolio) => void;
  updatePortfolio: (id: string, updates: Partial<Omit<Portfolio, "id">>) => void;
  removePortfolio: (id: string) => void;
}

type PortfolioListContextValue = PortfolioListState & PortfolioListActions;

const PortfolioListContext = createContext<PortfolioListContextValue | null>(null);

// --- Supabase row ↔ Portfolio mappers ---

interface PortfolioRow {
  id: string;
  name: string;
}

function rowToPortfolio(row: PortfolioRow): Portfolio {
  return {
    id: row.id,
    name: row.name,
  };
}

export function PortfolioListProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);

  // Load portfolios when auth state changes.
  // All setState calls happen inside async .then() callbacks
  // to satisfy the React compiler lint rule (no synchronous setState in effects).
  useEffect(() => {
    if (authLoading) return;

    let stale = false;

    const loadData = user
      ? supabase
          .from("portfolios")
          .select("*")
          .order("created_at", { ascending: true })
          .then(({ data, error }) => {
            if (error) {
              console.error("Failed to load portfolios:", error.message);
              return [] as Portfolio[];
            }
            return (data as PortfolioRow[]).map(rowToPortfolio);
          })
      : Promise.resolve(loadPortfolios());

    loadData.then((loaded) => {
      if (stale) return;
      setPortfolios(loaded);
      setLoading(false);
    });

    return () => {
      stale = true;
    };
  }, [user, authLoading]);

  const addPortfolio = useCallback(
    async (portfolio: Portfolio) => {
      if (user) {
        const { data, error } = await supabase
          .from("portfolios")
          .insert({
            name: portfolio.name,
          })
          .select()
          .single();

        if (error) {
          console.error("Failed to add portfolio:", error.message);
          return;
        }
        setPortfolios((prev) => [...prev, rowToPortfolio(data as PortfolioRow)]);
      } else {
        const next = [...portfolios, portfolio];
        setPortfolios(next);
        savePortfolios(next);
      }
    },
    [user, portfolios],
  );

  const updatePortfolio = useCallback(
    async (id: string, updates: Partial<Omit<Portfolio, "id">>) => {
      if (user) {
        const dbUpdates: Record<string, unknown> = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        dbUpdates.updated_at = new Date().toISOString();

        const { error } = await supabase
          .from("portfolios")
          .update(dbUpdates)
          .eq("id", id);

        if (error) {
          console.error("Failed to update portfolio:", error.message);
          return;
        }
        setPortfolios((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        );
      } else {
        const next = portfolios.map((p) =>
          p.id === id ? { ...p, ...updates } : p,
        );
        setPortfolios(next);
        savePortfolios(next);
      }
    },
    [user, portfolios],
  );

  const removePortfolio = useCallback(
    async (id: string) => {
      if (user) {
        const { error } = await supabase
          .from("portfolios")
          .delete()
          .eq("id", id);

        if (error) {
          console.error("Failed to delete portfolio:", error.message);
          return;
        }
        setPortfolios((prev) => prev.filter((p) => p.id !== id));
      } else {
        const next = portfolios.filter((p) => p.id !== id);
        setPortfolios(next);
        savePortfolios(next);
      }
    },
    [user, portfolios],
  );

  return (
    <PortfolioListContext value={{ portfolios, loading, addPortfolio, updatePortfolio, removePortfolio }}>
      {children}
    </PortfolioListContext>
  );
}

export function usePortfolioList(): PortfolioListContextValue {
  const context = use(PortfolioListContext);
  if (!context) {
    throw new Error("usePortfolioList must be used within a <PortfolioListProvider>");
  }
  return context;
}
