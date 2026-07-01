-- Track pending cancellation date so upgrade page avoids a Stripe API call
ALTER TABLE klipto.users ADD COLUMN IF NOT EXISTS subscription_cancel_at timestamptz;
