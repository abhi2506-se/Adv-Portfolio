# 🤖 Chatbot Fix — "Request error. Please refresh and try again."

## Root Cause
The `GROQ_API_KEY` was blank in `.env.local`, so the AI route had no API key to call.
The route has now been upgraded to support **both Anthropic and Groq**, with proper error handling.

---

## ✅ Fix: Add One API Key

You only need **ONE** of the two options below:

### Option A — Anthropic API (Recommended)
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign in → **API Keys** → **Create Key**
3. Copy the key and add it to `.env.local`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...your-key-here...
   ```
4. Uses **claude-haiku-4-5-20251001** (fast and affordable)

---

### Option B — Groq API (100% Free)
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up (free, no credit card) → **API Keys** → **Create API Key**
3. Copy the key and add it to `.env.local`:
   ```
   GROQ_API_KEY=gsk_...your-key-here...
   ```
4. Uses **llama3-8b-8192** (free, fast Llama 3)

> If both keys are present, Anthropic takes priority.

---

## 🚀 For Vercel Deployment

Add the key in **Vercel Dashboard → Your Project → Settings → Environment Variables**:

| Name | Value |
|------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `GROQ_API_KEY` | `gsk_...` |

Then redeploy: `vercel --prod`

---

## What Changed in `app/api/ai/route.ts`
- ✅ Supports both Anthropic API and Groq API
- ✅ Auto-selects Anthropic if configured, falls back to Groq
- ✅ Proper error handling for 401 (bad key), 429 (rate limit), and network errors
- ✅ Clear user-facing error messages instead of generic "Request error"
- ✅ No more false 503 when key is whitespace-only
