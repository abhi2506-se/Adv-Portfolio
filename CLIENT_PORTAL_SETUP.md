# Client Portal / Project Management System — Setup Guide

This adds a full client portal to your existing portfolio without touching
its existing pages/content, except two small additions:
- `app/page.tsx`: one new `<ClientPortalAnalytics />` section (self-hides
  until you have real project data)
- `components/navbar.tsx`: one new "Client Portal" link

Everything else lives in new files under `app/portal`, `app/api/portal`,
`components/portal`, `lib/portal`, and `supabase/`.

## 1. Create a Supabase project (if you don't already have one)

1. Go to https://supabase.com, create a project.
2. In **Project Settings → API**, copy the Project URL, `anon` public key,
   and `service_role` secret key.
3. In **Authentication → Providers**, ensure Email is enabled. Under
   **Authentication → Settings**, decide whether you want email
   confirmation required (if yes, also configure SMTP or use Supabase's
   default dev email sender, and flip `email_confirm: true` in
   `app/api/portal/auth/register/route.ts`).

## 2. Run the database schema

1. Open **SQL Editor** in Supabase.
2. Paste the entire contents of `supabase/portal_schema.sql` and run it.
   This creates all tables, RLS policies, the storage bucket, and enables
   realtime on `messages`, `translations`, `notifications`, `projects`.
3. Confirm in **Table Editor** that ~17 new tables appear, and in
   **Storage** that a `project-documents` bucket exists (private).

## 3. Set up Razorpay

1. Create a Razorpay account, complete KYC (required for live payments —
   test mode works immediately for development).
2. **Settings → API Keys**: generate a Key ID + Key Secret.
3. **Settings → Webhooks**: add a webhook with URL
   `https://yourdomain.com/api/portal/payments/webhook`, and subscribe to:
   - `payment.captured`
   - `payment.failed`
   - `refund.processed`
   - `refund.failed`
   Copy the **Webhook Secret** shown (different from the API key secret).

## 4. Set up translation

1. In Google Cloud Console, create/select a project, enable the
   **Cloud Translation API**.
2. Create an API key, restrict it to that API only.

## 5. Set up Upstash Redis (for real rate limiting)

1. Go to https://console.upstash.com, create a Redis database (Regional,
   free tier is enough to start).
2. On the database's page, find the **REST API** section and copy the
   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. This is what makes login/register/2FA rate limiting actually work across
   multiple server instances (Vercel serverless). If you skip this, the app
   still runs — it silently falls back to an in-memory limiter that only
   protects a single instance, which isn't meaningful protection in
   production.

## 6. Environment variables

Copy `.env.portal.example` values into your `.env.local` (dev) and into
your Vercel project's Environment Variables (Production + Preview):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # secret — server only
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...              # secret
RAZORPAY_WEBHOOK_SECRET=...          # secret
GOOGLE_TRANSLATE_API_KEY=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...         # secret
```

New npm packages added for this update: `otplib`, `qrcode`,
`@upstash/ratelimit`, `@upstash/redis` (already installed in this zip's
`package.json` — just run `npm install` after unzipping).

## 7. Create your admin account and enable 2FA

1. Deploy (or run locally with `npm run dev`), go to `/portal/register`,
   sign up with the email you want to use as the site owner/admin.
2. In Supabase SQL Editor, run `supabase/promote_to_admin.sql` with your
   email substituted in.
3. Log out and back in at `/portal/login` — you'll land on `/portal/admin`
   (2FA is off by default, so this first login is password-only).
4. Go to `/portal/admin/security`, click **Enable 2FA**, scan the QR code
   with Google Authenticator/Authy/1Password, enter the 6-digit code to
   confirm, and **save the 8 backup codes shown** — they're shown exactly
   once and let you back in if you lose your authenticator device.
5. Log out and back in again — you'll now be prompted for a 2FA code after
   your password, confirming enrollment worked.

2FA secrets and backup-code hashes live in a separate `admin_2fa_secrets`
table with row-level security enabled and **zero** policies granted — only
the service-role key (used exclusively inside `/api/portal/admin/2fa/*` and
the login-verification route) can read or write it. Your normal
authenticated session can never fetch your own TOTP secret back out.

## 8. Test the critical flows before going live

Use Razorpay **test mode** keys and test cards
(https://razorpay.com/docs/payments/payments/test-card-upi-details/) to
verify, end-to-end, before switching to live keys:

1. Register a second (client) test account.
2. Create a project, pay the advance with a test card.
3. Confirm the webhook fires (Razorpay dashboard → Webhooks → Logs) and the
   project flips to "Under Review" within a few seconds.
4. As admin, Accept one test project and Reject another — confirm the
   rejected one shows a refund initiated, and check Razorpay dashboard →
   Refunds to see it recorded there too.
5. Send a chat message as both client and admin in different languages —
   confirm translation appears, and "show original" toggles correctly.
6. Try opening another client's project URL directly while logged in as
   the first client — confirm you get a 404, not their data (IDOR check).
7. Upload a document, then download it back.
8. Walk a test project through planning → design → development → testing →
   client_review → approve → final payment → delivered → completed, then
   leave a review and publish it via admin moderation; confirm it appears
   in the public analytics section on your homepage.

## 9. Production hardening notes (do these before real traffic)

- **Rate limiting**: now backed by Upstash Redis when the env vars from
  step 5 are set — this is real, persistent, cross-instance rate limiting
  on login, register, and 2FA verification. Without those env vars it
  silently falls back to in-memory (single-instance only), so don't skip
  step 5 for production.
- **Admin 2FA**: implemented — TOTP (Google Authenticator-compatible) with
  hashed one-time backup codes, enrolled at `/portal/admin/security`. The
  pending-login cookie that bridges "password OK" and "2FA OK" is
  short-lived (5 minutes) and httpOnly.
- **Email confirmation**: registration doesn't yet require email
  verification (`email_confirm: false`). Turn this on once you've
  configured SMTP in Supabase, or accounts can be created with unverified
  emails.
- **Backups**: enable Point-in-Time Recovery in Supabase (Settings →
  Database → Backups) — not automatic on the free tier.
- **Storage cleanup**: there's no automatic deletion of documents for
  rejected/cancelled projects — add a scheduled job if you want that.

## What was NOT changed

Nothing in your existing portfolio pages, components, admin dashboard, or
data was modified beyond the two files noted above. All portal code is
additive and namespaced under `/portal` (pages) and `/api/portal` (APIs).
