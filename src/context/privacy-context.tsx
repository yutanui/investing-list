"use client";

import { createContext, use, useCallback, useState } from "react";

/**
 * Privacy mode context.
 *
 * In-memory only — never persisted to localStorage or Supabase.
 * When enabled, THB amounts across the app are masked.
 */

interface PrivacyModeContextValue {
  privacyMode: boolean;
  togglePrivacyMode: () => void;
}

const PrivacyModeContext = createContext<PrivacyModeContextValue | null>(null);

export function PrivacyModeProvider({ children }: { children: React.ReactNode }) {
  const [privacyMode, setPrivacyMode] = useState(false);

  const togglePrivacyMode = useCallback(() => {
    setPrivacyMode((prev) => !prev);
  }, []);

  return (
    <PrivacyModeContext value={{ privacyMode, togglePrivacyMode }}>
      {children}
    </PrivacyModeContext>
  );
}

export function usePrivacyMode(): PrivacyModeContextValue {
  const ctx = use(PrivacyModeContext);
  if (!ctx) {
    throw new Error("usePrivacyMode must be used within a PrivacyModeProvider");
  }
  return ctx;
}
