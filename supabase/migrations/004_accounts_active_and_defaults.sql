-- Run after 003_add_bank_account_enum.sql (enum value must be committed first)

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- Default accounts for users with none yet
INSERT INTO accounts (user_id, name, institution, type, currency, active)
SELECT u.id, 'Santander UYU', 'Santander', 'bank_account', 'UYU', true
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM accounts a WHERE a.user_id = u.id);

INSERT INTO accounts (user_id, name, institution, type, currency, active)
SELECT u.id, 'Santander USD', 'Santander', 'bank_account', 'USD', true
FROM auth.users u
WHERE (SELECT COUNT(*) FROM accounts a WHERE a.user_id = u.id) = 1;

INSERT INTO accounts (user_id, name, institution, type, currency, active)
SELECT u.id, 'Tarjeta de crédito', 'Santander', 'credit_card', 'USD', true
FROM auth.users u
WHERE (SELECT COUNT(*) FROM accounts a WHERE a.user_id = u.id) = 2;

-- Replace seed trigger to include default accounts for new users
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

  INSERT INTO accounts (user_id, name, institution, type, currency, active) VALUES
    (NEW.id, 'Santander UYU', 'Santander', 'bank_account', 'UYU', true),
    (NEW.id, 'Santander USD', 'Santander', 'bank_account', 'USD', true),
    (NEW.id, 'Tarjeta de crédito', 'Santander', 'credit_card', 'USD', true);

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

  INSERT INTO categorization_rules (user_id, name, match_type, pattern, transaction_type, excluded_from_spending, priority) VALUES
    (NEW.id, 'Own account transfer T--', 'contains', 'T--', 'transfer', true, 1),
    (NEW.id, 'Own account transfer P--', 'contains', 'P--', 'transfer', true, 2),
    (NEW.id, 'Credit card payment', 'contains', 'PAGO ELECTRONICO TARJETA CREDITO', 'credit_card_payment', true, 3);

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
