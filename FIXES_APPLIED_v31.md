# v31 Fixes Applied

## Fix 1 — Zoom/Meet Auto-Generate Error in Admin Panel
**Problem:** Clicking "Auto-Generate Link" in the admin panel showed "Could not auto-generate a zoom link. Please paste one manually…" AND blocked approval entirely if no link was provided.

**Fixed:**
- Approval no longer requires a meeting link — you can approve without one (link shows as "PENDING" and you can add it later)
- The auto-generate button still tries Google Meet / Zoom if env vars are configured
- Clear helper text in the modal explains the env vars needed
- Added `RESEND_FROM_EMAIL` env var + admin settings field for configuring the sender address

**Required env vars for auto-generate (optional):**
```
# Google Meet (pick one):
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=primary

# Zoom Server-to-Server OAuth:
ZOOM_ACCOUNT_ID=your_account_id
ZOOM_CLIENT_ID=your_client_id
ZOOM_CLIENT_SECRET=your_client_secret
```

---

## Fix 2 — Hero Section Side Padding / Gap
**Problem:** The hero section's side padding was removed in a previous fix, misaligning content vs the navbar.

**Fixed:** Hero content now uses the exact same `max-w-5xl mx-auto px-4 md:px-6 lg:px-8` as the navbar, so horizontal gaps match perfectly on all screen sizes.

---

## Fix 3 — Schedule Modal Opens Mid-Page / Scroll Issue
**Problem:** When clicking "Schedule Meeting/Interview", the page would scroll to the middle and the modal wasn't truly fixed to the viewport.

**Fixed:**
- Body scroll is now locked (`position: fixed`) when the modal opens, preventing any page movement
- Scroll position is restored exactly when the modal closes
- Modal uses explicit `style={{ position: 'fixed', top: 0, ... }}` to guarantee viewport-center positioning

---

## Fix 4 — Meeting Emails & Push Notifications
**Problem:** 
- Admin PWA received no push notification when a new meeting was booked
- Visitor received no email confirmation after submitting a meeting request
- Approval/rejection emails used a hardcoded `noreply@yourdomain.com` sender

**Fixed:**
- **New booking → Admin push notification** sent immediately via VAPID web-push to all subscribed admin devices
- **New booking → Visitor confirmation email** sent with a "Pending Review" status email so they know it was received
- **Approval → Visitor email** with meeting link and join button (unchanged logic, now with dynamic sender)
- **Rejection → Visitor email** with reason (unchanged logic, now with dynamic sender)
- **Dynamic sender:** All emails now read `resend_from_email` from admin settings (or `RESEND_FROM_EMAIL` env var) instead of the hardcoded placeholder

**How to configure the From email:**
1. Go to Admin → Settings → "Email From Address (Resend)"
2. Enter e.g. `Abhishek Singh <noreply@yourdomain.com>` (must be verified in Resend dashboard)
3. OR set `RESEND_FROM_EMAIL=Abhishek Singh <noreply@yourdomain.com>` in `.env.local`

**Required env vars for all email + push to work:**
```
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=Abhishek Singh <noreply@yourdomain.com>
ADMIN_EMAIL=your@email.com
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
NEXTAUTH_URL=https://yourdomain.com
```

