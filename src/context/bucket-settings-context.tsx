"use client";

import { createContext, use, useCallback, useEffect, useState } from "react";
import { BucketSettings, DEFAULT_BUCKET_SETTINGS } from "@/types/portfolio";
import { loadBucketSettings, saveBucketSettings } from "@/lib/storage";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";

interface BucketSettingsContextValue {
  settings: BucketSettings;
  loading: boolean;
  updateSettings: (settings: BucketSettings) => Promise<void>;
}

const BucketSettingsContext = createContext<BucketSettingsContextValue | null>(null);

export function BucketSettingsProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<BucketSettings>(DEFAULT_BUCKET_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    let stale = false;

    const loadData = user
      ? supabase
          .from("bucket_settings")
          .select("bucket1_target, bucket2_target, bucket3_target")
          .eq("user_id", user.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) {
              console.error("Failed to load bucket settings:", error.message);
              return DEFAULT_BUCKET_SETTINGS;
            }
            if (!data) return DEFAULT_BUCKET_SETTINGS;
            return {
              bucket1Target: data.bucket1_target,
              bucket2Target: data.bucket2_target,
              bucket3Target: data.bucket3_target,
            } as BucketSettings;
          })
      : Promise.resolve(loadBucketSettings());

    loadData.then((loaded) => {
      if (stale) return;
      setSettings(loaded);
      setLoading(false);
    });

    return () => {
      stale = true;
    };
  }, [user, authLoading]);

  const updateSettings = useCallback(
    async (newSettings: BucketSettings): Promise<void> => {
      // Optimistic update
      setSettings(newSettings);

      if (user) {
        const { error } = await supabase.from("bucket_settings").upsert(
          {
            user_id: user.id,
            bucket1_target: newSettings.bucket1Target,
            bucket2_target: newSettings.bucket2Target,
            bucket3_target: newSettings.bucket3Target,
          },
          { onConflict: "user_id" },
        );
        if (error) {
          console.error("Failed to save bucket settings:", error.message);
        }
      } else {
        saveBucketSettings(newSettings);
      }
    },
    [user],
  );

  return (
    <BucketSettingsContext value={{ settings, loading, updateSettings }}>
      {children}
    </BucketSettingsContext>
  );
}

export function useBucketSettings(): BucketSettingsContextValue {
  const context = use(BucketSettingsContext);
  if (!context) {
    throw new Error("useBucketSettings must be used within a <BucketSettingsProvider>");
  }
  return context;
}
