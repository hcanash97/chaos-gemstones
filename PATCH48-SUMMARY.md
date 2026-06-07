# Patch 48 Summary

## What This Fixes

Your latest copied diagnostic summary showed:

- `Errors: 0`
- `Warnings: 22`
- all batches saved successfully

That means the sync engine is working. The remaining warnings were not actual
row failures. They were mostly Nancy/Kodllin rows with no public certificate
number, which Chaos already handled safely by using stock-number sync keys.

## Important Duplicate-Prevention Fix

Patch48 adds paginated loading of existing dealer stones before the sync writes
anything.

Why this matters:

- Supabase/PostgREST often returns only the first 1,000 rows unless a range is
  requested.
- Nancy has around 7,247 rows.
- Without pagination, a second sync could only recognise the first 1,000
  existing stones, then accidentally treat later rows as new.

Patch48 now loads all existing dealer stones in 1,000-row pages before matching
the feed.

## Diagnostic Clean-Up

- The private schema-cache fallback notice is now informational because Patch47
  can still sync safely without that fast path.
- Missing Nancy/Kodllin certificate/report numbers are now informational, not
  warnings.
- The message now explains that stock-number sync keys are expected and safe for
  this feed.
- True warnings are still kept for real data issues, such as duplicate sync keys
  appearing inside the same feed.

## What To Check After Applying

Run the Nancy/Kodllin sync twice:

1. First sync after clearing inventory may show mostly `new`.
2. Second sync should show mostly `updated`, not `new`.

That second result is the key proof that duplicates are under control.

## Verification

- Manual diff inspection completed.
- `npm run build` could not be run in this extracted Codex workspace because
  npm is unavailable here. Run it in the real repo after applying the patch.
