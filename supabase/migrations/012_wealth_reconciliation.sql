-- Wealth reconciliation: transfer tags, income/capital splits, account cash anchors
-- Requires 011_wealth_positions.sql

-- Transfer destination tagging (reconcile outflows to accounts / wealth / external)

CREATE TYPE transfer_destination_kind AS ENUM (
  'internal_account',
  'wealth_position',
  'external'
);

ALTER TABLE transactions
ADD COLUMN transfer_destination_kind transfer_destination_kind,
ADD COLUMN transfer_destination_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
ADD COLUMN transfer_destination_wealth_position_id UUID REFERENCES wealth_positions(id) ON DELETE SET NULL;

CREATE INDEX idx_transactions_transfer_destination_account_id
  ON transactions(transfer_destination_account_id)
  WHERE transfer_destination_account_id IS NOT NULL;

CREATE INDEX idx_transactions_transfer_destination_wealth_position_id
  ON transactions(transfer_destination_wealth_position_id)
  WHERE transfer_destination_wealth_position_id IS NOT NULL;

-- Income ↔ wealth links (split payment into interest vs capital repayment)

ALTER TABLE transactions
ADD COLUMN income_wealth_position_id UUID REFERENCES wealth_positions(id) ON DELETE SET NULL,
ADD COLUMN income_principal_amount NUMERIC(14, 2);

CREATE INDEX idx_transactions_income_wealth_position_id
  ON transactions(income_wealth_position_id)
  WHERE income_wealth_position_id IS NOT NULL;

-- Account opening balance anchors (estimated cash in imported accounts)

ALTER TABLE accounts
ADD COLUMN opening_balance NUMERIC(14, 2),
ADD COLUMN opening_balance_date DATE;
