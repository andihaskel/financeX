-- FinanceX initial schema
-- Sign convention: positive amount = money entering account, negative = money leaving account

-- Enums
CREATE TYPE account_type AS ENUM (
  'checking',
  'savings',
  'credit_card',
  'cash',
  'investment'
);

CREATE TYPE transaction_type AS ENUM (
  'income',
  'expense',
  'transfer',
  'credit_card_payment',
  'refund',
  'investment'
);

CREATE TYPE categorization_status AS ENUM (
  'auto',
  'suggested',
  'needs_review',
  'manual'
);

CREATE TYPE category_group AS ENUM (
  'essential',
  'discretionary',
  'extraordinary',
  'income'
);

CREATE TYPE rule_match_type AS ENUM (
  'contains',
  'exact',
  'starts_with'
);

CREATE TYPE import_status AS ENUM (
  'processing',
  'review',
  'completed',
  'failed'
);

CREATE TYPE income_source_type AS ENUM (
  'salary',
  'property',
  'other'
);

-- Accounts
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  institution TEXT,
  type account_type NOT NULL DEFAULT 'checking',
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'UYU')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  "group" category_group NOT NULL DEFAULT 'discretionary',
  icon TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, slug)
);

CREATE INDEX idx_categories_user_id ON categories(user_id);

-- Imports
CREATE TABLE imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  source_type TEXT,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  currency TEXT CHECK (currency IN ('USD', 'UYU')),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  transaction_count INTEGER NOT NULL DEFAULT 0,
  status import_status NOT NULL DEFAULT 'processing'
);

CREATE INDEX idx_imports_user_id ON imports(user_id);

-- Categorization rules
CREATE TABLE categorization_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  match_type rule_match_type NOT NULL DEFAULT 'contains',
  pattern TEXT NOT NULL,
  transaction_type transaction_type NOT NULL DEFAULT 'expense',
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  excluded_from_spending BOOLEAN NOT NULL DEFAULT false,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  is_extraordinary BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categorization_rules_user_id ON categorization_rules(user_id);
CREATE INDEX idx_categorization_rules_priority ON categorization_rules(user_id, priority);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  import_id UUID REFERENCES imports(id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  normalized_description TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'UYU')),
  transaction_type transaction_type NOT NULL DEFAULT 'expense',
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  is_extraordinary BOOLEAN NOT NULL DEFAULT false,
  excluded_from_spending BOOLEAN NOT NULL DEFAULT false,
  categorization_status categorization_status NOT NULL DEFAULT 'needs_review',
  categorization_rule_id UUID REFERENCES categorization_rules(id) ON DELETE SET NULL,
  notes TEXT,
  fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, fingerprint)
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_transaction_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_fingerprint ON transactions(fingerprint);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date);

-- Income sources
CREATE TABLE income_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type income_source_type NOT NULL DEFAULT 'other',
  expected_monthly_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'UYU')),
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_income_sources_user_id ON income_sources(user_id);

-- Monthly budgets
CREATE TABLE monthly_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  budget_amount NUMERIC(14, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'UYU')),
  UNIQUE(user_id, category_id, month)
);

CREATE INDEX idx_monthly_budgets_user_id ON monthly_budgets(user_id);
CREATE INDEX idx_monthly_budgets_month ON monthly_budgets(user_id, month);

-- User settings
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  base_currency TEXT NOT NULL DEFAULT 'USD' CHECK (base_currency IN ('USD', 'UYU')),
  savings_target_percent NUMERIC(5, 2) NOT NULL DEFAULT 40,
  uyu_to_usd_rate NUMERIC(14, 6) NOT NULL DEFAULT 40,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Exchange rates (for future historical FX; MVP uses user_settings.uyu_to_usd_rate)
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_currency TEXT NOT NULL CHECK (from_currency IN ('USD', 'UYU')),
  to_currency TEXT NOT NULL CHECK (to_currency IN ('USD', 'UYU')),
  rate NUMERIC(14, 6) NOT NULL,
  effective_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, from_currency, to_currency, effective_date)
);

CREATE INDEX idx_exchange_rates_user_id ON exchange_rates(user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY accounts_user_policy ON accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY categories_user_policy ON categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY imports_user_policy ON imports FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY categorization_rules_user_policy ON categorization_rules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY transactions_user_policy ON transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY income_sources_user_policy ON income_sources FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY monthly_budgets_user_policy ON monthly_budgets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_settings_user_policy ON user_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY exchange_rates_user_policy ON exchange_rates FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Seed default data for new users
CREATE OR REPLACE FUNCTION seed_user_defaults()
RETURNS TRIGGER AS $$
DECLARE
  cat_vivienda UUID;
  cat_comida UUID;
  cat_transporte UUID;
  cat_salud UUID;
  cat_servicios UUID;
  cat_suscripciones UUID;
  cat_ocio UUID;
  cat_viajes UUID;
  cat_donaciones UUID;
  cat_impuestos UUID;
  cat_otros UUID;
  budget_month DATE;
BEGIN
  INSERT INTO user_settings (user_id) VALUES (NEW.id);

  INSERT INTO categories (user_id, name, slug, "group", icon) VALUES
    (NEW.id, 'Vivienda', 'vivienda', 'essential', 'home')
    RETURNING id INTO cat_vivienda;
  INSERT INTO categories (user_id, name, slug, "group", icon) VALUES
    (NEW.id, 'Comida', 'comida', 'essential', 'utensils')
    RETURNING id INTO cat_comida;
  INSERT INTO categories (user_id, name, slug, "group", icon) VALUES
    (NEW.id, 'Transporte', 'transporte', 'essential', 'car')
    RETURNING id INTO cat_transporte;
  INSERT INTO categories (user_id, name, slug, "group", icon) VALUES
    (NEW.id, 'Salud & deporte', 'salud-deporte', 'essential', 'heart-pulse')
    RETURNING id INTO cat_salud;
  INSERT INTO categories (user_id, name, slug, "group", icon) VALUES
    (NEW.id, 'Servicios', 'servicios', 'essential', 'zap')
    RETURNING id INTO cat_servicios;
  INSERT INTO categories (user_id, name, slug, "group", icon) VALUES
    (NEW.id, 'Suscripciones', 'suscripciones', 'essential', 'repeat')
    RETURNING id INTO cat_suscripciones;
  INSERT INTO categories (user_id, name, slug, "group", icon) VALUES
    (NEW.id, 'Ocio & compras', 'ocio-compras', 'discretionary', 'shopping-bag')
    RETURNING id INTO cat_ocio;
  INSERT INTO categories (user_id, name, slug, "group", icon) VALUES
    (NEW.id, 'Viajes', 'viajes', 'extraordinary', 'plane')
    RETURNING id INTO cat_viajes;
  INSERT INTO categories (user_id, name, slug, "group", icon) VALUES
    (NEW.id, 'Donaciones & regalos', 'donaciones-regalos', 'discretionary', 'gift')
    RETURNING id INTO cat_donaciones;
  INSERT INTO categories (user_id, name, slug, "group", icon) VALUES
    (NEW.id, 'Impuestos & profesionales', 'impuestos-profesionales', 'essential', 'file-text')
    RETURNING id INTO cat_impuestos;
  INSERT INTO categories (user_id, name, slug, "group", icon) VALUES
    (NEW.id, 'Otros', 'otros', 'discretionary', 'circle-help')
    RETURNING id INTO cat_otros;

  INSERT INTO income_sources (user_id, name, type, expected_monthly_amount, currency) VALUES
    (NEW.id, 'Salary', 'salary', 6600, 'USD');

  budget_month := date_trunc('month', CURRENT_DATE)::DATE;

  INSERT INTO monthly_budgets (user_id, category_id, month, budget_amount, currency) VALUES
    (NEW.id, cat_vivienda, budget_month, 1100, 'USD'),
    (NEW.id, cat_comida, budget_month, 700, 'USD'),
    (NEW.id, cat_transporte, budget_month, 250, 'USD'),
    (NEW.id, cat_salud, budget_month, 350, 'USD'),
    (NEW.id, cat_servicios, budget_month, 200, 'USD'),
    (NEW.id, cat_suscripciones, budget_month, 100, 'USD'),
    (NEW.id, cat_ocio, budget_month, 400, 'USD'),
    (NEW.id, cat_viajes, budget_month, 700, 'USD'),
    (NEW.id, cat_donaciones, budget_month, 300, 'USD'),
    (NEW.id, cat_impuestos, budget_month, 300, 'USD'),
    (NEW.id, cat_otros, budget_month, 200, 'USD');

  -- Exclusion rules (highest priority)
  INSERT INTO categorization_rules (user_id, name, match_type, pattern, transaction_type, excluded_from_spending, priority) VALUES
    (NEW.id, 'Own account transfer T--', 'contains', 'T--', 'transfer', true, 1),
    (NEW.id, 'Own account transfer P--', 'contains', 'P--', 'transfer', true, 2),
    (NEW.id, 'Credit card payment', 'contains', 'PAGO ELECTRONICO TARJETA CREDITO', 'credit_card_payment', true, 3);

  -- Categorization rules
  INSERT INTO categorization_rules (user_id, name, match_type, pattern, transaction_type, category_id, is_recurring, is_extraordinary, priority) VALUES
    (NEW.id, 'Rent - Rocio Velasco', 'contains', 'ROCIO VELASCO', 'expense', cat_vivienda, true, false, 10),
    (NEW.id, 'PedidosYa', 'contains', 'PEDIDOSYA', 'expense', cat_comida, false, false, 20),
    (NEW.id, 'Disco supermarket', 'contains', 'DISCO', 'expense', cat_comida, false, false, 21),
    (NEW.id, 'Uber', 'contains', 'UBER', 'expense', cat_transporte, false, false, 30),
    (NEW.id, 'Spotify', 'contains', 'SPOTIFY', 'expense', cat_suscripciones, true, false, 40),
    (NEW.id, 'Amazon Prime', 'contains', 'AMAZON PRIME', 'expense', cat_suscripciones, true, false, 41),
    (NEW.id, 'Google One', 'contains', 'GOOGLE ONE', 'expense', cat_suscripciones, true, false, 42),
    (NEW.id, 'YouTube Premium', 'contains', 'YOUTUBE PREMIUM', 'expense', cat_suscripciones, true, false, 43),
    (NEW.id, 'Suno', 'contains', 'SUNO', 'expense', cat_suscripciones, true, false, 44),
    (NEW.id, 'Copa Airlines', 'contains', 'COPA', 'expense', cat_viajes, false, true, 50),
    (NEW.id, 'Puro Surf', 'contains', 'PURO SURF', 'expense', cat_viajes, false, true, 51),
    (NEW.id, 'JetSmart', 'contains', 'JETSMART', 'expense', cat_viajes, false, true, 52);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION seed_user_defaults();
