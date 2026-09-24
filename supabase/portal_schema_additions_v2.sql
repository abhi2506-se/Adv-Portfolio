-- ============================================================================
-- ADDITIONS v2 — co-admin roles + commissions, cold-email/proposal system.
-- Run AFTER supabase/portal_schema.sql. Safe to run once (guards included).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. ROLES: allow 'co_admin' alongside 'client' / 'admin', + commission rates
-- ---------------------------------------------------------------------------
alter table public.clients drop constraint if exists clients_role_check;
alter table public.clients add constraint clients_role_check
  check (role in ('client', 'admin', 'co_admin'));

alter table public.clients add column if not exists commission_per_sent_email  numeric(10,2) not null default 0;
alter table public.clients add column if not exists commission_per_reply       numeric(10,2) not null default 0;
alter table public.clients add column if not exists is_active                 boolean not null default true;

-- ---------------------------------------------------------------------------
-- 2. PROPOSALS / COLD EMAILS
-- ---------------------------------------------------------------------------
create table if not exists public.proposal_emails (
  id              uuid primary key default gen_random_uuid(),
  sender_id       uuid not null references public.clients(id) on delete cascade,
  sender_role     text not null check (sender_role in ('admin','co_admin')),
  recipient_email text not null,
  recipient_name  text,
  subject         text not null,
  body_html       text not null,
  thread_key      uuid not null default gen_random_uuid(), -- groups an email with its follow-ups
  is_follow_up    boolean not null default false,
  parent_email_id uuid references public.proposal_emails(id) on delete set null,
  status          text not null default 'sent' check (status in ('sent','failed','replied','bounced')),
  sent_at         timestamptz not null default now(),
  replied_at      timestamptz,
  reply_snippet   text,
  commission_sent_amount   numeric(10,2) not null default 0, -- snapshot of rate at send time
  commission_reply_amount  numeric(10,2) not null default 0, -- snapshot of rate, filled when marked replied
  created_at      timestamptz not null default now()
);

create index if not exists idx_proposal_sender on public.proposal_emails(sender_id);
create index if not exists idx_proposal_status on public.proposal_emails(status);
create index if not exists idx_proposal_thread on public.proposal_emails(thread_key);
create index if not exists idx_proposal_recipient on public.proposal_emails(recipient_email);

alter table public.proposal_emails enable row level security;

-- co-admins see only their own sent proposals; admins see everything
create policy proposals_scope_select on public.proposal_emails
  for select using (sender_id = auth.uid() or public.is_admin());
create policy proposals_scope_insert on public.proposal_emails
  for insert with check (sender_id = auth.uid() or public.is_admin());
create policy proposals_scope_update on public.proposal_emails
  for update using (sender_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. WEBSITE AUDIT LEADS (captured from the public "Free Website Audit"
--    section so admin/co-admin can follow up with a cold email)
-- ---------------------------------------------------------------------------
create table if not exists public.audit_leads (
  id           uuid primary key default gen_random_uuid(),
  url          text not null,
  score        int,
  summary      jsonb,
  contact_email text,
  created_at   timestamptz not null default now()
);

alter table public.audit_leads enable row level security;
create policy audit_leads_admin_only on public.audit_leads
  for select using (public.is_admin());
-- inserts happen via the service role from the public API route (no client policy needed)

-- ---------------------------------------------------------------------------
-- 4. Realtime for the reply-inbox live view (admin + co-admin dashboards)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.proposal_emails;
