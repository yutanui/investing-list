import { Holding } from "@/types/portfolio";

/**
 * Versioned localStorage utility.
 *
 * Best practice (react-best-practices/client-localstorage-schema):
 * - Version the storage key so schema changes don't corrupt data
 * - Wrap reads in try-catch (storage may be unavailable or corrupted)
 * - Store minimal fields; derive the rest at render time
 */

const STORAGE_KEY = "investing-list-holdings-v1";

export function loadHoldings(): Holding[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Holding[];
  } catch {
    return [];
  }
}

export function saveHoldings(holdings: Holding[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
  } catch {
    // Storage full or unavailable — fail silently
  }
}
