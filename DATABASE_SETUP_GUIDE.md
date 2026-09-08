# 🗄️ Database & Deployment Setup Guide

## What We're Using

| Service | Purpose | Cost |
|---------|---------|------|
| **Neon** | PostgreSQL database (stores blogs & certificates metadata) | Free forever |
| **Vercel Blob** | File storage (images, videos, PDFs, audio) | Free up to 1GB |
| **Vercel** | Hosting your Next.js app | Free |

---

## STEP 1 — Set Up Neon (Free Postgres Database)

### 1.1 Create Account
1. Go to **https://neon.tech**
2. Click **Sign Up** → sign in with GitHub (recommended)
3. Click **Create Project**
4. Name it: `portfolio-db`
5. Region: **AWS ap-south-1 (Mumbai)** — closest to India ✅
6. Click **Create Project**

### 1.2 Get Your Connection String
1. After creating the project, you'll see a **Connection Details** panel
2. Click **Connection string** tab
3. Select: **Node.js**
4. Copy the string — it looks like:
   ```
   postgresql://username:password@ep-xxx-xxx.ap-south-1.aws.neon.tech/neondb?sslmode=require
   ```
5. **Save this string** — you'll need it in Step 3

> ✅ Tables (`journey_blogs`, `journey_certificates`) are created **automatically** when your app first starts. You don't need to run any SQL manually.

---

## STEP 2 — Set Up Vercel Blob (File Storage)

### 2.1 Enable Blob on Your Vercel Project
1. Go to **https://vercel.com** → open your project
2. Click the **Storage** tab at the top
3. Click **Create Database** → choose **Blob**
4. Name it: `portfolio-media`
5. Click **Create**
6. Vercel automatically adds `BLOB_READ_WRITE_TOKEN` to your environment variables ✅

> ⚠️ You don't need to copy this token manually — Vercel injects it for you.

---

## STEP 3 — Add Environment Variables

### 3.1 For Local Development (.env.local)
Open the file `portfolio-v2/.env.local` and add:

```env
# --- EXISTING (keep these) ---
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=abhisheksingh89208@gmail.com
SMTP_PASS=uxpk wotu cebj ihkb
ADMIN_EMAIL=abhisheksingh89208@gmail.com

# --- NEW: Database ---
DATABASE_URL=postgresql://username:password@ep-xxx.ap-south-1.aws.neon.tech/neondb?sslmode=require
# ↑ Paste your Neon connection string here

# --- NEW: Vercel Blob (only needed for local testing) ---
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxxx
# ↑ Get this from Vercel Dashboard → Storage → Your Blob Store → .env.local tab
```

### 3.2 For Vercel (Production)
1. Go to **Vercel Dashboard** → your project → **Settings** → **Environment Variables**
2. Add this variable:

| Name | Value |
|------|-------|
| `DATABASE_URL` | Your Neon connection string |

> Note: `BLOB_READ_WRITE_TOKEN` is added automatically by Vercel when you connect the Blob store (Step 2).

---

## STEP 4 — Deploy to Vercel

### Option A: Deploy from GitHub (Recommended)
```bash
# 1. Push your code to GitHub
git add .
git commit -m "Add Neon + Vercel Blob storage"
git push

# 2. Vercel will auto-deploy on push ✅
```

### Option B: Deploy from CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd portfolio-v2
vercel --prod
```

---

## STEP 5 — Install New Packages

After extracting the zip, run:

```bash
cd portfolio-v2
npm install
```

This installs:
- `@neondatabase/serverless` — Neon Postgres client
- `@vercel/blob` — Vercel Blob storage client

---

## STEP 6 — Verify Everything Works

1. Open your portfolio at `https://your-app.vercel.app/admin`
2. Log in and go to **Journey** section
3. Create a blog post and upload an image
4. Open the same URL on your **phone** — you should see the blog! 🎉

---

## How It Works Now

```
Admin uploads image
        ↓
POST /api/journey/media
        ↓
File saved to Vercel Blob CDN
Returns: https://abc.public.blob.vercel-storage.com/journey/blog_v_xxx.mp4
        ↓
That URL saved as mediaId in blog/cert object
        ↓
POST /api/journey/blogs
        ↓
Blog metadata saved to Neon Postgres
        ↓
Any device → GET /api/journey/blogs → reads from Neon → shows files from Blob CDN ✅
```

---

## Troubleshooting

### "DATABASE_URL is not defined"
→ Make sure you added `DATABASE_URL` to Vercel Environment Variables and re-deployed.

### "BLOB_READ_WRITE_TOKEN is not defined"  
→ Make sure you connected the Blob store in Vercel Storage tab (Step 2). Then re-deploy.

### Files upload but show broken image
→ Check Vercel Blob is connected. Look at Vercel function logs for errors.

### Blogs show on PC but not phone
→ This should be fixed now. If still happening, clear browser cache and try again.

---

## Free Tier Limits

| Service | Free Limit |
|---------|-----------|
| Neon | 512 MB storage, 1 project |
| Vercel Blob | 1 GB storage, 100 GB bandwidth/month |
| Vercel Hosting | 100 GB bandwidth, unlimited deploys |

All **more than enough** for a personal portfolio ✅
