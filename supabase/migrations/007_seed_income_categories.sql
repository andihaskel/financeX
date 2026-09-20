-- Run after 006_add_income_category_group.sql (enum value must be committed first)

-- Seed income categories for existing users
INSERT INTO categories (user_id, name, slug, "group", icon)
SELECT u.id, 'Sueldo', 'sueldo', 'income', 'banknote'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM categories c WHERE c.user_id = u.id AND c.slug = 'sueldo'
);

INSERT INTO categories (user_id, name, slug, "group", icon)
SELECT u.id, 'Renta fija', 'renta-fija', 'income', 'landmark'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM categories c WHERE c.user_id = u.id AND c.slug = 'renta-fija'
);

INSERT INTO categories (user_id, name, slug, "group", icon)
SELECT u.id, 'Renta variable', 'renta-variable', 'income', 'trending-up'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM categories c WHERE c.user_id = u.id AND c.slug = 'renta-variable'
);

INSERT INTO categories (user_id, name, slug, "group", icon)
SELECT u.id, 'Otros ingresos', 'otros-ingresos', 'income', 'circle-plus'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM categories c WHERE c.user_id = u.id AND c.slug = 'otros-ingresos'
);

-- Replace seed trigger to include income categories for new users
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

  INSERT INTO categories (user_id, name, slug, "group", icon) VALUES
    (NEW.id, 'Sueldo', 'sueldo', 'income', 'banknote'),
    (NEW.id, 'Renta fija', 'renta-fija', 'income', 'landmark'),
    (NEW.id, 'Renta variable', 'renta-variable', 'income', 'trending-up'),
    (NEW.id, 'Otros ingresos', 'otros-ingresos', 'income', 'circle-plus');

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
