import { Holding, Portfolio, Currency } from "@/types/portfolio";

/**
 * Versioned localStorage utility.
 *
 * Best practice (react-best-practices/client-localstorage-schema):
 * - Version the storage key so schema changes don't corrupt data
 * - Wrap reads in try-catch (storage may be unavailable or corrupted)
 * - Store minimal fields; derive the rest at render time
 */

const LEGACY_HOLDINGS_KEY = "investing-list-holdings-v1";
const PORTFOLIOS_KEY = "investing-list-portfolios-v1";
const HOLDINGS_KEY = "investing-list-holdings-v2";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─────────────────────────────────────────────────────────────
// Portfolio Storage
// ─────────────────────────────────────────────────────────────

export function loadPortfolios(): Portfolio[] {
  if (typeof window === "undefined") return [];

  // Run migration first if needed
  migrateLocalStorage();

  try {
    const raw = localStorage.getItem(PORTFOLIOS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Portfolio[];
  } catch {
    return [];
  }
}

export function savePortfolios(portfolios: Portfolio[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(PORTFOLIOS_KEY, JSON.stringify(portfolios));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

// ─────────────────────────────────────────────────────────────
// Holdings Storage (v2 with portfolioId)
// ─────────────────────────────────────────────────────────────

export function loadHoldings(): Holding[] {
  if (typeof window === "undefined") return [];

  // Run migration first if needed
  migrateLocalStorage();

  try {
    const raw = localStorage.getItem(HOLDINGS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Ensure currency fields exist (migration for existing holdings)
    const holdings = (parsed as Record<string, unknown>[]).map((h) => ({
      ...h,
      averageCostCurrency: (h.averageCostCurrency as Currency) ?? "THB",
      currentPriceCurrency: (h.currentPriceCurrency as Currency) ?? "THB",
    })) as Holding[];

    return holdings;
  } catch {
    return [];
  }
}

export function loadHoldingsByPortfolio(portfolioId: string): Holding[] {
  const allHoldings = loadHoldings();
  return allHoldings.filter((h) => h.portfolioId === portfolioId);
}

export function saveHoldings(holdings: Holding[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(HOLDINGS_KEY, JSON.stringify(holdings));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

// ─────────────────────────────────────────────────────────────
// Migration from v1 to v2
// ─────────────────────────────────────────────────────────────

interface LegacyHolding {
  id: string;
  name: string;
  ticker?: string;
  assetType: string;
  shares: number;
  averageCost: number;
  currentPrice: number;
}

function migrateLocalStorage(): void {
  if (typeof window === "undefined") return;

  try {
    // Check if legacy holdings exist
    const legacyRaw = localStorage.getItem(LEGACY_HOLDINGS_KEY);
    if (!legacyRaw) return;

    // Check if already migrated
    const existingPortfolios = localStorage.getItem(PORTFOLIOS_KEY);
    if (existingPortfolios) {
      // Already migrated, just remove legacy key
      localStorage.removeItem(LEGACY_HOLDINGS_KEY);
      return;
    }

    const legacyHoldings: LegacyHolding[] = JSON.parse(legacyRaw);
    if (!Array.isArray(legacyHoldings) || legacyHoldings.length === 0) {
      localStorage.removeItem(LEGACY_HOLDINGS_KEY);
      return;
    }

    // Create default portfolio
    const defaultPortfolio: Portfolio = {
      id: generateId(),
      name: "My Portfolio",
    };

    // Migrate holdings with portfolioId and default currency (THB)
    const migratedHoldings: Holding[] = legacyHoldings.map((h) => ({
      ...h,
      portfolioId: defaultPortfolio.id,
      assetType: h.assetType as Holding["assetType"],
      averageCostCurrency: "THB" as Currency,
      currentPriceCurrency: "THB" as Currency,
    }));

    // Save migrated data
    localStorage.setItem(PORTFOLIOS_KEY, JSON.stringify([defaultPortfolio]));
    localStorage.setItem(HOLDINGS_KEY, JSON.stringify(migratedHoldings));

    // Clear legacy key
    localStorage.removeItem(LEGACY_HOLDINGS_KEY);
  } catch {
    // Migration failed — leave data as is
  }
}
