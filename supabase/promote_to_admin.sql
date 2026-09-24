-- Run this in the Supabase SQL editor AFTER you have registered your own
-- account through /portal/register with the email you want to use as admin.
--
-- Replace the email below, then run:

update public.clients
set role = 'admin'
where email = 'you@example.com';

-- Verify:
select id, email, role from public.clients where role = 'admin';
