-- Merge duplicate Santander accounts (UYU / USD / card) left by partial migrations or imports

UPDATE accounts
SET name = 'Tarjeta de crédito'
WHERE type = 'credit_card'
  AND name IN ('Credit Card', 'Tarjeta de credito');

WITH ranked AS (
  SELECT
    id,
    user_id,
    CASE
      WHEN type = 'credit_card' THEN 'card'
      WHEN currency = 'UYU' THEN 'uyu'
      WHEN currency = 'USD' THEN 'usd'
      ELSE 'other'
    END AS bucket,
    ROW_NUMBER() OVER (
      PARTITION BY user_id,
        CASE
          WHEN type = 'credit_card' THEN 'card'
          WHEN currency = 'UYU' THEN 'uyu'
          WHEN currency = 'USD' THEN 'usd'
          ELSE 'other'
        END
      ORDER BY
        CASE lower(name)
          WHEN 'santander uyu' THEN 0
          WHEN 'santander usd' THEN 0
          WHEN 'credit card' THEN 0
          WHEN 'tarjeta de crédito' THEN 0
          WHEN 'tarjeta de credito' THEN 0
          ELSE 1
        END,
        CASE type
          WHEN 'bank_account' THEN 0
          WHEN 'checking' THEN 1
          WHEN 'savings' THEN 2
          ELSE 3
        END,
        created_at ASC
    ) AS rn
  FROM accounts
  WHERE active = true
    AND (
      type = 'credit_card'
      OR type IN ('bank_account', 'checking', 'savings')
    )
),
dupes AS (
  SELECT loser.id AS dupe_id, keeper.id AS keeper_id
  FROM ranked loser
  JOIN ranked keeper
    ON keeper.user_id = loser.user_id
   AND keeper.bucket = loser.bucket
   AND keeper.rn = 1
  WHERE loser.rn > 1
    AND loser.bucket IN ('uyu', 'usd', 'card')
)
UPDATE transactions t
SET account_id = d.keeper_id
FROM dupes d
WHERE t.account_id = d.dupe_id;

WITH ranked AS (
  SELECT
    id,
    user_id,
    CASE
      WHEN type = 'credit_card' THEN 'card'
      WHEN currency = 'UYU' THEN 'uyu'
      WHEN currency = 'USD' THEN 'usd'
      ELSE 'other'
    END AS bucket,
    ROW_NUMBER() OVER (
      PARTITION BY user_id,
        CASE
          WHEN type = 'credit_card' THEN 'card'
          WHEN currency = 'UYU' THEN 'uyu'
          WHEN currency = 'USD' THEN 'usd'
          ELSE 'other'
        END
      ORDER BY
        CASE lower(name)
          WHEN 'santander uyu' THEN 0
          WHEN 'santander usd' THEN 0
          WHEN 'credit card' THEN 0
          WHEN 'tarjeta de crédito' THEN 0
          WHEN 'tarjeta de credito' THEN 0
          ELSE 1
        END,
        CASE type
          WHEN 'bank_account' THEN 0
          WHEN 'checking' THEN 1
          WHEN 'savings' THEN 2
          ELSE 3
        END,
        created_at ASC
    ) AS rn
  FROM accounts
  WHERE active = true
    AND (
      type = 'credit_card'
      OR type IN ('bank_account', 'checking', 'savings')
    )
)
UPDATE accounts a
SET active = false
FROM ranked r
WHERE a.id = r.id
  AND r.rn > 1
  AND r.bucket IN ('uyu', 'usd', 'card');

UPDATE accounts
SET name = 'Santander UYU'
WHERE active = true
  AND type IN ('bank_account', 'checking', 'savings')
  AND currency = 'UYU';

UPDATE accounts
SET name = 'Santander USD'
WHERE active = true
  AND type IN ('bank_account', 'checking', 'savings')
  AND currency = 'USD';
