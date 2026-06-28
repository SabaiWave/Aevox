ALTER TABLE klipto.users ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE;

GRANT SELECT, INSERT, UPDATE ON klipto.users TO service_role;
