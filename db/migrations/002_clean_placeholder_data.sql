-- 002_clean_placeholder_data.sql
--
-- Replaces leftover placeholder values on `profiles` with NULL so the UI's
-- "Not set yet" / "Undeclared" fallbacks actually fire.
--
-- Background: prior to this migration, `upsertCurrentUser` in
-- src/app/utils/uploadHelpers.ts wrote literal strings ('Not set yet.') and
-- the number 0 into school/major/year for new users. That bypassed the
-- frontend's null-fallback logic because the columns were not actually null.
--
-- This is a one-shot, forward-only cleanup. Re-running it is safe — the
-- WHERE clauses match nothing on a clean database.

BEGIN;

UPDATE public.profiles
   SET school = NULL
 WHERE school = 'Not set yet.';

UPDATE public.profiles
   SET major = NULL
 WHERE major = 'Not set yet.';

UPDATE public.profiles
   SET year = NULL
 WHERE year = 0;

COMMIT;
