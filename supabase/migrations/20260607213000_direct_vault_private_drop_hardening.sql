-- Patch 60: harden Direct Vault/private-drop follow checks.
-- The app now derives followed dealer IDs server-side from the authenticated
-- request token instead of trusting browser-supplied dealer IDs.

CREATE EXTENSION IF NOT EXISTS pg_net;

COMMENT ON COLUMN public.stones.private_until IS
  'If in the future, listing is early-access/private. Marketplace server code and RLS only expose it to jewellers following the dealer.';
