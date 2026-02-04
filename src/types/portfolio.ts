export type AssetType = "stock" | "etf" | "mutual_fund" | "bond";

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  stock: "Stock",
  etf: "ETF",
  mutual_fund: "Mutual Fund",
  bond: "Bond / Fixed Income",
};

export interface Holding {
  id: string;
  name: string;
  ticker?: string;
  assetType: AssetType;
  shares: number;
  averageCost: number; // per unit in THB
  currentPrice: number; // per unit in THB
}
