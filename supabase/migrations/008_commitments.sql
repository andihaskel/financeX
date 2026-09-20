-- Control: recurring commitments + per-month occurrences

CREATE TYPE commitment_direction AS ENUM ('pay', 'receive');
CREATE TYPE commitment_amount_type AS ENUM ('fixed', 'variable');
CREATE TYPE commitment_recurrence_type AS ENUM ('monthly', 'annual', 'one_time', 'custom');
CREATE TYPE commitment_occurrence_status AS ENUM (
  'pending',
  'completed',
  'reconciled',
  'skipped'
);

CREATE TABLE commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  direction commitment_direction NOT NULL,
  amount NUMERIC(14, 2),
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'UYU')),
  amount_type commitment_amount_type NOT NULL DEFAULT 'fixed',
  recurrence_type commitment_recurrence_type NOT NULL DEFAULT 'monthly',
  due_day INT CHECK (due_day IS NULL OR (due_day >= 1 AND due_day <= 31)),
  due_month INT CHECK (due_month IS NULL OR (due_month >= 1 AND due_month <= 12)),
  custom_months INT[] DEFAULT NULL,
  start_date DATE,
  end_date DATE,
  match_hint TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_commitments_user_id ON commitments(user_id);
CREATE INDEX idx_commitments_user_active ON commitments(user_id, active);

CREATE TABLE commitment_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commitment_id UUID NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
  year INT NOT NULL CHECK (year >= 2000 AND year <= 2100),
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  expected_amount NUMERIC(14, 2),
  actual_amount NUMERIC(14, 2),
  status commitment_occurrence_status NOT NULL DEFAULT 'pending',
  manually_completed_at TIMESTAMPTZ,
  reconciled_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  reconciled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (commitment_id, year, month)
);

CREATE INDEX idx_commitment_occurrences_user_period
  ON commitment_occurrences(user_id, year, month);
CREATE INDEX idx_commitment_occurrences_commitment
  ON commitment_occurrences(commitment_id);

ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY commitments_user_policy ON commitments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE commitment_occurrences ENABLE ROW LEVEL SECURITY;
CREATE POLICY commitment_occurrences_user_policy ON commitment_occurrences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
