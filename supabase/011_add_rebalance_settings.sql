CREATE TABLE rebalance_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  drift_threshold NUMERIC(5, 2) NOT NULL DEFAULT 5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE rebalance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own rebalance settings"
  ON rebalance_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Reuse the existing set_updated_at() trigger function (defined in 005_add_updated_at_trigger.sql)
CREATE TRIGGER set_rebalance_settings_updated_at
  BEFORE UPDATE ON rebalance_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
