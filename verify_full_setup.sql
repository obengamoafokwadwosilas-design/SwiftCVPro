-- Full-system check — confirms every table, column, and function the app
-- actually calls (verified by grepping the codebase for every .from()/.rpc()
-- use) exists in this database. Run in the Supabase SQL editor; every row
-- should read `true`. Safe, read-only — checks information_schema only.

select 'cv_credits table' as check_name,
  exists(select 1 from information_schema.tables where table_name = 'cv_credits') as exists
union all
select 'cv_credits.cover_letter_credits column',
  exists(select 1 from information_schema.columns
    where table_name = 'cv_credits' and column_name = 'cover_letter_credits')
union all
select 'payments table',
  exists(select 1 from information_schema.tables where table_name = 'payments')
union all
select 'cv_history table',
  exists(select 1 from information_schema.tables where table_name = 'cv_history')
union all
select 'cv_history.download_paid column',
  exists(select 1 from information_schema.columns
    where table_name = 'cv_history' and column_name = 'download_paid')
union all
select 'customer_pins table',
  exists(select 1 from information_schema.tables where table_name = 'customer_pins')
union all
select 'pin_resets table',
  exists(select 1 from information_schema.tables where table_name = 'pin_resets')
union all
select 'free_generation_usage table',
  exists(select 1 from information_schema.tables where table_name = 'free_generation_usage')
union all
select 'function: add_cv_credits',
  exists(select 1 from information_schema.routines where routine_name = 'add_cv_credits')
union all
select 'function: deduct_cv_credit',
  exists(select 1 from information_schema.routines where routine_name = 'deduct_cv_credit')
union all
select 'function: grant_cover_letter_credit',
  exists(select 1 from information_schema.routines where routine_name = 'grant_cover_letter_credit')
union all
select 'function: deduct_cover_letter_credit',
  exists(select 1 from information_schema.routines where routine_name = 'deduct_cover_letter_credit')
union all
select 'function: consume_free_generation',
  exists(select 1 from information_schema.routines where routine_name = 'consume_free_generation')
union all
select 'function: refund_free_generation',
  exists(select 1 from information_schema.routines where routine_name = 'refund_free_generation')
-- RLS should be ON for every table here — the app only ever talks to
-- Supabase via the service-role key, which bypasses RLS anyway, but RLS
-- being off is the difference between "safe" and "wide open" if the anon
-- key were ever exposed client-side by mistake.
union all
select 'RLS enabled: cv_credits',
  coalesce((select relrowsecurity from pg_class where relname = 'cv_credits'), false)
union all
select 'RLS enabled: payments',
  coalesce((select relrowsecurity from pg_class where relname = 'payments'), false)
union all
select 'RLS enabled: cv_history',
  coalesce((select relrowsecurity from pg_class where relname = 'cv_history'), false)
union all
select 'RLS enabled: customer_pins',
  coalesce((select relrowsecurity from pg_class where relname = 'customer_pins'), false)
union all
select 'RLS enabled: pin_resets',
  coalesce((select relrowsecurity from pg_class where relname = 'pin_resets'), false)
union all
select 'RLS enabled: free_generation_usage',
  coalesce((select relrowsecurity from pg_class where relname = 'free_generation_usage'), false)
order by exists asc, check_name;
