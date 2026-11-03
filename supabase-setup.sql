-- Run in Supabase SQL Editor AFTER `npx prisma db push` and AFTER the Vercel deploy.

-- 1) Lock tables away from Supabase's public API (your app uses the postgres role, which is unaffected)
alter table "Account" enable row level security;
alter table "Lead" enable row level security;

-- 2) Check all mailboxes every minute
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'sync-leads', '* * * * *',
  $$ select net.http_post(
       url := 'https://YOUR-APP.vercel.app/api/cron/sync',
       headers := '{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb,
       timeout_milliseconds := 55000
     ); $$
);

-- Useful later:
--   select * from cron.job_run_details order by start_time desc limit 10;   -- did it run?
--   select cron.unschedule('sync-leads');                                   -- stop it
