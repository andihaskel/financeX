-- Remap legacy investment kind → equity (requires 013 committed)

UPDATE wealth_positions
SET kind = 'equity'
WHERE kind = 'investment';
