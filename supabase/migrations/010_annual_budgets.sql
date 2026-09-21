-- Annual category budgets (year-level targets)

CREATE TABLE annual_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  budget_amount NUMERIC(14, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'UYU')),
  UNIQUE(user_id, category_id, year)
);

CREATE INDEX idx_annual_budgets_user_year ON annual_budgets(user_id, year);

ALTER TABLE annual_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY annual_budgets_user_policy ON annual_budgets
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
