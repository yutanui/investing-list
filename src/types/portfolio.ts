export type AssetType =
  | "stock"
  | "etf"
  | "mutual_fund"
  | "bond"
  | "cash"
  | "money_market_fund"
  | "dividend_mutual_fund";

export type HoldingType = "core" | "satellite";

export type Currency = "THB" | "USD";

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  stock: "Stock",
  etf: "ETF",
  mutual_fund: "Mutual Fund",
  bond: "Bond / Fixed Income",
  cash: "Cash",
  money_market_fund: "Money Market Fund",
  dividend_mutual_fund: "Dividend Mutual Fund",
};

export const HOLDING_TYPE_LABELS: Record<HoldingType, string> = {
  core: "Core",
  satellite: "Satellite",
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
  holdingType: HoldingType;
  shares: number;
  averageCost: number; // per unit in original currency
  averageCostCurrency: Currency;
  currentPrice: number; // per unit in original currency
  currentPriceCurrency: Currency;
  updatedAt?: Date;
  companyId?: string;
  holdingId?: string;
  navDate?: string;
}

export type BucketId = 1 | 2 | 3;

export const BUCKET_LABELS: Record<BucketId, string> = {
  1: "Bucket 1 — Liquidity",
  2: "Bucket 2 — Income & Stability",
  3: "Bucket 3 — Growth",
};

export const ASSET_TYPE_BUCKET: Record<AssetType, BucketId> = {
  cash: 1,
  money_market_fund: 1,
  dividend_mutual_fund: 2,
  bond: 2,
  stock: 3,
  etf: 3,
  mutual_fund: 3,
};

export interface BucketSettings {
  bucket1Target: number;
  bucket2Target: number;
  bucket3Target: number;
}

export const DEFAULT_BUCKET_SETTINGS: BucketSettings = {
  bucket1Target: 0,
  bucket2Target: 0,
  bucket3Target: 0,
};
