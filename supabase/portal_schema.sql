-- ============================================================================
-- CLIENT PORTAL / PROJECT MANAGEMENT SYSTEM — DATABASE SCHEMA
-- Target: Supabase Postgres. Run this in Supabase SQL editor (or via CLI
-- migration). Safe to run once; uses IF NOT EXISTS guards where practical.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- USERS / CLIENTS
-- Auth identity lives in Supabase's built-in `auth.users`. This table is the
-- app-level profile row, linked 1:1 to auth.users via the same UUID.
-- ---------------------------------------------------------------------------
create table if not exists public.clients (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text not null,
  email          text not null unique,
  phone          text,
  company        text,
  country        text,               -- ISO 3166-1 alpha-2, e.g. 'IN', 'US'
  preferred_language text not null default 'en', -- ISO 639-1, e.g. 'hi', 'es'
  role           text not null default 'client' check (role in ('client','admin')),
  is_2fa_enabled boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_clients_email on public.clients(email);

-- 2FA secrets live in a separate table with NO RLS policies granting
-- select/update to regular users at all (not even "select own row") — every
-- read/write goes through service-role-only API routes
-- (app/api/portal/admin/2fa/*). This means even if clients_self_select ever
-- had a bug, a client's own TOTP secret still couldn't leak through the
-- normal authenticated Supabase client.
create table if not exists public.admin_2fa_secrets (
  client_id          uuid primary key references public.clients(id) on delete cascade,
  totp_secret        text not null,
  totp_backup_codes  text[] default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.admin_2fa_secrets enable row level security;
-- Intentionally no policies are created for this table: with RLS enabled
-- and zero policies, PostgREST/Supabase denies ALL access except via the
-- service_role key, which bypasses RLS entirely. That's the point.


-- ---------------------------------------------------------------------------
-- REFERENCE TABLES
-- ---------------------------------------------------------------------------
create table if not exists public.technologies (
  id   serial primary key,
  name text not null unique
);

create table if not exists public.industries (
  id   serial primary key,
  name text not null unique
);

insert into public.technologies (name) values
  ('React'),('Next.js'),('Node.js'),('Python'),('Django'),('Flutter'),
  ('React Native'),('WordPress'),('Shopify'),('PostgreSQL'),('MongoDB'),
  ('AWS'),('Supabase'),('Vue.js'),('TypeScript')
on conflict (name) do nothing;

insert into public.industries (name) values
  ('E-commerce'),('Healthcare'),('Fintech'),('Education'),('Real Estate'),
  ('SaaS'),('Logistics'),('Media'),('Travel'),('Other')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- PROJECTS
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references public.clients(id) on delete cascade,
  title              text not null,
  description        text not null,
  budget_amount      numeric(12,2) not null check (budget_amount >= 0),
  budget_currency    text not null default 'INR',
  domain             text,                     -- e.g. website / mobile app / api
  industry_id        int references public.industries(id),
  country            text,                     -- client's project-relevant country
  preferred_language text not null default 'en',
  advance_amount     numeric(12,2) not null check (advance_amount >= 0),
  final_amount       numeric(12,2),
  status             text not null default 'draft' check (status in (
                        'draft',                 -- being filled by client, not submitted
                        'pending_payment',        -- submitted, waiting on advance payment
                        'under_review',           -- payment verified, admin reviewing
                        'accepted',
                        'rejected',
                        'refunded',
                        'planning',
                        'design',
                        'development',
                        'testing',
                        'client_review',
                        'approved',
                        'final_payment_pending',
                        'delivered',
                        'completed',
                        'cancelled'
                      )),
  progress_percent   int not null default 0 check (progress_percent between 0 and 100),
  accepted_terms_at  timestamptz,
  terms_version      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_projects_client on public.projects(client_id);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_country on public.projects(country);

create table if not exists public.project_technologies (
  project_id     uuid not null references public.projects(id) on delete cascade,
  technology_id  int not null references public.technologies(id) on delete cascade,
  primary key (project_id, technology_id)
);

create table if not exists public.requirements (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  key         text not null,     -- e.g. 'pages', 'integrations', 'timeline'
  value       text not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- MILESTONES + STATUS HISTORY (audit trail of lifecycle transitions)
-- ---------------------------------------------------------------------------
create table if not exists public.milestones (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  title         text not null,
  description   text,
  weight_percent int not null default 0 check (weight_percent between 0 and 100),
  is_completed  boolean not null default false,
  completed_at  timestamptz,
  due_date      date,
  order_index   int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists idx_milestones_project on public.milestones(project_id);

create table if not exists public.status_history (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  from_status text,
  to_status   text not null,
  changed_by  uuid references public.clients(id),
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_status_history_project on public.status_history(project_id);

-- ---------------------------------------------------------------------------
-- PAYMENTS / REFUNDS (Razorpay)
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects(id) on delete cascade,
  client_id           uuid not null references public.clients(id),
  type                text not null check (type in ('advance','final')),
  razorpay_order_id   text not null unique,
  razorpay_payment_id text unique,
  razorpay_signature  text,
  amount              numeric(12,2) not null,
  currency            text not null default 'INR',
  status              text not null default 'created' check (status in (
                         'created','authorized','captured','failed','refunded','partially_refunded'
                       )),
  method              text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_payments_project on public.payments(project_id);
create unique index if not exists idx_payments_order on public.payments(razorpay_order_id);

-- Idempotency ledger for Razorpay webhook events (prevents duplicate processing)
create table if not exists public.webhook_events (
  id           uuid primary key default gen_random_uuid(),
  provider     text not null default 'razorpay',
  event_id     text not null,          -- Razorpay's x-razorpay-event-id or payload id
  event_type   text not null,
  payload      jsonb not null,
  processed_at timestamptz not null default now(),
  unique(provider, event_id)
);

create table if not exists public.refunds (
  id                uuid primary key default gen_random_uuid(),
  payment_id        uuid not null references public.payments(id) on delete cascade,
  project_id        uuid not null references public.projects(id) on delete cascade,
  razorpay_refund_id text unique,
  amount            numeric(12,2) not null,
  reason            text,
  status            text not null default 'pending' check (status in (
                       'pending','processed','failed'
                     )),
  initiated_by      uuid references public.clients(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_refunds_project on public.refunds(project_id);

-- ---------------------------------------------------------------------------
-- DOCUMENTS (metadata only — binary lives in Supabase Storage)
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  uploaded_by  uuid not null references public.clients(id),
  storage_path text not null,     -- path inside the 'project-documents' bucket
  file_name    text not null,
  mime_type    text not null,
  size_bytes   bigint not null,
  category     text default 'general' check (category in ('general','deliverable','contract','other')),
  created_at   timestamptz not null default now()
);

create index if not exists idx_documents_project on public.documents(project_id);

-- ---------------------------------------------------------------------------
-- MESSAGES + TRANSLATIONS (realtime chat)
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  sender_id      uuid not null references public.clients(id),
  sender_role    text not null check (sender_role in ('client','admin')),
  original_text  text not null,
  original_lang  text not null,
  is_read        boolean not null default false,
  read_at        timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists idx_messages_project on public.messages(project_id, created_at);

create table if not exists public.translations (
  id            uuid primary key default gen_random_uuid(),
  message_id    uuid not null references public.messages(id) on delete cascade,
  target_lang   text not null,
  translated_text text not null,
  provider      text not null default 'google',
  created_at    timestamptz not null default now(),
  unique(message_id, target_lang)
);

-- Typing / presence is handled via Supabase Realtime Presence (ephemeral,
-- no table needed) — see lib/portal/realtime.ts

-- ---------------------------------------------------------------------------
-- REVIEWS
-- ---------------------------------------------------------------------------
create table if not exists public.reviews (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects(id) on delete cascade unique,
  client_id         uuid not null references public.clients(id),
  rating            int not null check (rating between 1 and 5),
  comment           text,
  consent_public_name    boolean not null default false,
  consent_public_country boolean not null default false,
  consent_public_company boolean not null default false,
  is_moderated      boolean not null default false,
  is_published      boolean not null default false,
  moderated_by      uuid references public.clients(id),
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete cascade,
  type        text not null, -- 'status_change','payment','message','milestone','review'
  title       text not null,
  body        text,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_notifications_client on public.notifications(client_id, is_read);

-- ---------------------------------------------------------------------------
-- AUDIT LOGS (admin actions + security-sensitive events)
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.clients(id),
  actor_role  text,
  action      text not null,       -- e.g. 'project.accept', 'payment.refund'
  target_type text,
  target_id   text,
  metadata    jsonb,
  ip_address  text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_logs_actor on public.audit_logs(actor_id);
create index if not exists idx_audit_logs_target on public.audit_logs(target_type, target_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.requirements enable row level security;
alter table public.project_technologies enable row level security;
alter table public.milestones enable row level security;
alter table public.status_history enable row level security;
alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.documents enable row level security;
alter table public.messages enable row level security;
alter table public.translations enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from public.clients where id = auth.uid() and role = 'admin'
  );
$$;

-- clients: a user can read/update only their own row; admins can read all
create policy clients_self_select on public.clients
  for select using (id = auth.uid() or public.is_admin());
create policy clients_self_update on public.clients
  for update using (id = auth.uid());
create policy clients_self_insert on public.clients
  for insert with check (id = auth.uid());

-- projects: owner or admin only (this is the core IDOR guard)
create policy projects_owner_select on public.projects
  for select using (client_id = auth.uid() or public.is_admin());
create policy projects_owner_insert on public.projects
  for insert with check (client_id = auth.uid());
create policy projects_owner_update on public.projects
  for update using (client_id = auth.uid() or public.is_admin());

-- child tables follow the parent project's ownership
create policy requirements_scope on public.requirements
  for all using (
    exists (select 1 from public.projects p where p.id = project_id
            and (p.client_id = auth.uid() or public.is_admin()))
  );

create policy project_tech_scope on public.project_technologies
  for all using (
    exists (select 1 from public.projects p where p.id = project_id
            and (p.client_id = auth.uid() or public.is_admin()))
  );

create policy milestones_scope on public.milestones
  for select using (
    exists (select 1 from public.projects p where p.id = project_id
            and (p.client_id = auth.uid() or public.is_admin()))
  );
create policy milestones_admin_write on public.milestones
  for insert with check (public.is_admin());
create policy milestones_admin_update on public.milestones
  for update using (public.is_admin());

create policy status_history_scope on public.status_history
  for select using (
    exists (select 1 from public.projects p where p.id = project_id
            and (p.client_id = auth.uid() or public.is_admin()))
  );

create policy payments_scope on public.payments
  for select using (client_id = auth.uid() or public.is_admin());

create policy refunds_scope on public.refunds
  for select using (
    exists (select 1 from public.projects p where p.id = project_id
            and (p.client_id = auth.uid() or public.is_admin()))
  );

create policy documents_scope on public.documents
  for select using (
    exists (select 1 from public.projects p where p.id = project_id
            and (p.client_id = auth.uid() or public.is_admin()))
  );
create policy documents_insert_scope on public.documents
  for insert with check (
    exists (select 1 from public.projects p where p.id = project_id
            and (p.client_id = auth.uid() or public.is_admin()))
  );

create policy messages_scope on public.messages
  for select using (
    exists (select 1 from public.projects p where p.id = project_id
            and (p.client_id = auth.uid() or public.is_admin()))
  );
create policy messages_insert_scope on public.messages
  for insert with check (
    exists (select 1 from public.projects p where p.id = project_id
            and (p.client_id = auth.uid() or public.is_admin()))
    and sender_id = auth.uid()
  );

create policy translations_scope on public.translations
  for select using (
    exists (
      select 1 from public.messages m
      join public.projects p on p.id = m.project_id
      where m.id = message_id and (p.client_id = auth.uid() or public.is_admin())
    )
  );

-- reviews: client can insert/see their own; public published reviews are
-- readable by anyone via the public analytics API (service role), not RLS.
create policy reviews_owner_select on public.reviews
  for select using (client_id = auth.uid() or public.is_admin());
create policy reviews_owner_insert on public.reviews
  for insert with check (
    client_id = auth.uid()
    and exists (select 1 from public.projects p where p.id = project_id
                and p.client_id = auth.uid() and p.status = 'completed')
  );
create policy reviews_admin_update on public.reviews
  for update using (public.is_admin());

create policy notifications_owner on public.notifications
  for all using (client_id = auth.uid() or public.is_admin());

create policy audit_logs_admin_only on public.audit_logs
  for select using (public.is_admin());

-- ============================================================================
-- STORAGE BUCKET (private) — run once
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('project-documents', 'project-documents', false)
on conflict (id) do nothing;

-- Storage policy: path convention is `{project_id}/{filename}`. We check
-- project ownership by joining on the folder name = project_id.
create policy "portal_doc_read" on storage.objects
  for select using (
    bucket_id = 'project-documents'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(name))[1]
      and (p.client_id = auth.uid() or public.is_admin())
    )
  );

create policy "portal_doc_insert" on storage.objects
  for insert with check (
    bucket_id = 'project-documents'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(name))[1]
      and (p.client_id = auth.uid() or public.is_admin())
    )
  );

-- ============================================================================
-- REALTIME — enable postgres_changes broadcasts for the tables the chat UI
-- and notification bell subscribe to. Without this, RLS is fine but no
-- INSERT events will ever reach the browser.
-- ============================================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.translations;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.projects;
