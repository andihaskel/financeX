-- Run once if you already signed up before P-- transfer rule existed
INSERT INTO categorization_rules (user_id, name, match_type, pattern, transaction_type, excluded_from_spending, priority, active)
SELECT id, 'Own account transfer P--', 'contains', 'P--', 'transfer', true, 2, true
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM categorization_rules r
  WHERE r.user_id = auth.users.id AND r.pattern = 'P--'
);
