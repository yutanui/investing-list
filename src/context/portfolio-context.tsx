"use client";

import { createContext, use, useCallback, useState } from "react";
import { Holding } from "@/types/portfolio";
import { loadHoldings, saveHoldings } from "@/lib/storage";

/**
 * Portfolio context — decouples state management from UI components.
 *
 * Composition patterns applied:
 * - Generic context interface (state + actions separated)
 * - React 19: use() instead of useContext()
 * - Lazy state initializer for localStorage (react-best-practices)
 */

interface PortfolioState {
  holdings: Holding[];
}

interface PortfolioActions {
  addHolding: (holding: Holding) => void;
  updateHolding: (id: string, updates: Partial<Omit<Holding, "id">>) => void;
  removeHolding: (id: string) => void;
}

type PortfolioContextValue = PortfolioState & PortfolioActions;

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializer — runs once, avoids reading localStorage on every render
  const [holdings, setHoldings] = useState<Holding[]>(() => loadHoldings());

  const persist = useCallback((next: Holding[]) => {
    setHoldings(next);
    saveHoldings(next);
  }, []);

  const addHolding = useCallback(
    (holding: Holding) => {
      persist([...holdings, holding]);
    },
    [holdings, persist],
  );

  const updateHolding = useCallback(
    (id: string, updates: Partial<Omit<Holding, "id">>) => {
      persist(
        holdings.map((h) => (h.id === id ? { ...h, ...updates } : h)),
      );
    },
    [holdings, persist],
  );

  const removeHolding = useCallback(
    (id: string) => {
      persist(holdings.filter((h) => h.id !== id));
    },
    [holdings, persist],
  );

  return (
    <PortfolioContext value={{ holdings, addHolding, updateHolding, removeHolding }}>
      {children}
    </PortfolioContext>
  );
}

/**
 * React 19: use() instead of useContext().
 * Throws if used outside PortfolioProvider.
 */
export function usePortfolio(): PortfolioContextValue {
  const context = use(PortfolioContext);
  if (!context) {
    throw new Error("usePortfolio must be used within a <PortfolioProvider>");
  }
  return context;
}
