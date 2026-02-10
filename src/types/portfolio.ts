export type AssetType = "stock" | "etf" | "mutual_fund" | "bond";

export type Currency = "THB" | "USD";

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  stock: "Stock",
  etf: "ETF",
  mutual_fund: "Mutual Fund",
  bond: "Bond / Fixed Income",
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  THB: "THB",
  USD: "USD",
};

export interface Portfolio {
  id: string;
  name: string;
}

export interface Holding {
  id: string;
  portfolioId: string;
  name: string;
  ticker?: string;
  assetType: AssetType;
  shares: number;
  averageCost: number; // per unit in original currency
  averageCostCurrency: Currency;
  currentPrice: number; // per unit in original currency
  currentPriceCurrency: Currency;
}
