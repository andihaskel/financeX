-- Asset classes for wealth allocation: fixed_income + equity
-- (Remap of investment → equity is in 014; new enum values must be committed first.)

ALTER TYPE wealth_position_kind ADD VALUE IF NOT EXISTS 'fixed_income';
ALTER TYPE wealth_position_kind ADD VALUE IF NOT EXISTS 'equity';
