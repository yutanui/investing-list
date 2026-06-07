"use client";

import { createContext, use, useCallback, useEffect, useState } from "react";
import { RebalanceSettings, DEFAULT_REBALANCE_SETTINGS } from "@/types/portfolio";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";

/**
 * Rebalance settings context.
 *
 * When logged in:  reads/writes the `rebalance_settings` Supabase table.
 * When logged out: uses DEFAULT_REBALANCE_SETTINGS in-memory only
 *                  (no localStorage persistence for the MVP).
 */

interface RebalanceSettingsContextValue {
  rebalanceSettings: RebalanceSettings;
  loading: boolean;
  updateRebalanceSettings: (settings: Partial<RebalanceSettings>) => Promise<void>;
}

const RebalanceSettingsContext = createContext<RebalanceSettingsContextValue | null>(null);

export function RebalanceSettingsProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [rebalanceSettings, setRebalanceSettings] = useState<RebalanceSettings>(
    DEFAULT_REBALANCE_SETTINGS,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    let stale = false;

    const loadData = user
      ? supabase
          .from("rebalance_settings")
          .select("drift_threshold")
          .eq("user_id", user.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) {
              console.error("Failed to load rebalance settings:", error.message);
              return DEFAULT_REBALANCE_SETTINGS;
            }
            if (!data) return DEFAULT_REBALANCE_SETTINGS;
            return { driftThreshold: Number(data.drift_threshold) } as RebalanceSettings;
          })
      : Promise.resolve(DEFAULT_REBALANCE_SETTINGS);

    loadData.then((loaded) => {
      if (stale) return;
      setRebalanceSettings(loaded);
      setLoading(false);
    });

    return () => {
      stale = true;
    };
  }, [user, authLoading]);

  const updateRebalanceSettings = useCallback(
    async (updates: Partial<RebalanceSettings>): Promise<void> => {
      const next: RebalanceSettings = { ...rebalanceSettings, ...updates };
      // Optimistic update
      setRebalanceSettings(next);

      if (user) {
        const { error } = await supabase.from("rebalance_settings").upsert(
          {
            user_id: user.id,
            drift_threshold: next.driftThreshold,
          },
          { onConflict: "user_id" },
        );
        if (error) {
          console.error("Failed to save rebalance settings:", error.message);
        }
      }
    },
    [user, rebalanceSettings],
  );

  return (
    <RebalanceSettingsContext value={{ rebalanceSettings, loading, updateRebalanceSettings }}>
      {children}
    </RebalanceSettingsContext>
  );
}

export function useRebalanceSettings(): RebalanceSettingsContextValue {
  const context = use(RebalanceSettingsContext);
  if (!context) {
    throw new Error(
      "useRebalanceSettings must be used within a <RebalanceSettingsProvider>",
    );
  }
  return context;
}
