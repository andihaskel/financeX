-- Must be committed before using 'income' in later statements (Postgres enum rule)
ALTER TYPE category_group ADD VALUE IF NOT EXISTS 'income';
