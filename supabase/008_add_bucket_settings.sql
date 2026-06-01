CREATE TABLE IF NOT EXISTS bucket_settings (
  user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket1_target NUMERIC(5, 2) NOT NULL DEFAULT 0,
  bucket2_target NUMERIC(5, 2) NOT NULL DEFAULT 0,
  bucket3_target NUMERIC(5, 2) NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE bucket_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own bucket settings"
  ON bucket_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_bucket_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bucket_settings_updated_at
  BEFORE UPDATE ON bucket_settings
  FOR EACH ROW EXECUTE FUNCTION update_bucket_settings_updated_at();
