# Patch73 Notes

This patch recovers the useful Lovable-side work from the duplicate
`chaos-gemstones-bdc...` export without copying its older Shopify sync files.

Included:
- `CHAOS-SYSTEMS-SITREP.md`
- WhatsApp intake now accepts/returns multiple stones from one message.
- WhatsApp dashboard renders one card per parsed stone and can save all valid
  parsed stones as hidden drafts.
- Vendors directory query uses a left join to avoid hiding dealers whose
  secondary profile metadata is incomplete.
- Jeweller orders copy reflects the 2.5% platform fee capped at GBP 50.
- `src/lib/platform-fee.ts` centralises fee and bank-transfer threshold rules.
- A defensive SQL migration repairs the public dealer view, adds deny-by-default
  client policies for Shopify server-side tables, and aligns the order receipt
  fee trigger.

Intentionally excluded:
- The duplicate repo's `shopify.server.ts`, `shopify.functions.ts`,
  Shopify callback, and generated Supabase types. Those files were older than
  patch72 and would downgrade the encrypted-token/HMAC/status-log repair.
