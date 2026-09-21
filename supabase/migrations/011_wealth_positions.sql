-- Manual wealth / balance positions (stock, not cash flow)

CREATE TYPE wealth_position_kind AS ENUM (
  'cash',
  'checking',
  'savings',
  'investment',
  'other'
);

CREATE TABLE wealth_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind wealth_position_kind NOT NULL DEFAULT 'other',
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'UYU')),
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wealth_positions_user_id ON wealth_positions(user_id);

ALTER TABLE wealth_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY wealth_positions_user_policy ON wealth_positions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
