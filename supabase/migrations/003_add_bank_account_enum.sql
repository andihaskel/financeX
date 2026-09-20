-- Must run in its own migration/transaction before using the new enum value.
-- PostgreSQL error 55P04 if you ADD VALUE and INSERT in the same script.

DO $$ BEGIN
  ALTER TYPE account_type ADD VALUE 'bank_account';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
