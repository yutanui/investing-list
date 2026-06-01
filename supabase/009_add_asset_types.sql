ALTER TABLE holdings DROP CONSTRAINT IF EXISTS holdings_asset_type_check;

ALTER TABLE holdings
  ADD CONSTRAINT holdings_asset_type_check
  CHECK (asset_type IN (
    'stock', 'etf', 'mutual_fund', 'bond',
    'cash', 'money_market_fund', 'dividend_mutual_fund'
  ));
