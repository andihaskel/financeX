-- Optional link from a refund to the original expense it reverses.
ALTER TABLE transactions
ADD COLUMN refunds_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL;

CREATE INDEX idx_transactions_refunds_transaction_id
  ON transactions(refunds_transaction_id)
  WHERE refunds_transaction_id IS NOT NULL;
