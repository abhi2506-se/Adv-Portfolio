import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const AuditSchema = z.object({
  url: z.string().url(),
  contactEmail: z.string().email().optional(),
})

type Check = { label: string; passed: boolean; weight: number; suggestion: string }

function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw)
    return u.toString()
  } catch {
    return `https://${raw}`
  }
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null)
  const parsed = AuditSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Please provide a valid URL." }, { status: 400 })
  }

  const targetUrl = normalizeUrl(parsed.data.url)
  const startedAt = Date.now()

  let html = ""
  let status = 0
  let usedHttps = targetUrl.startsWith("https://")
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PortfolioAuditBot/1.0)" },
    })
    clearTimeout(timeout)
    status = res.status
    usedHttps = res.url.startsWith("https://")
    html = await res.text()
  } catch (e: any) {
    return NextResponse.json(
      { error: "Couldn't reach that site. Check the URL and that it's publicly accessible." },
      { status: 502 }
    )
  }

  const loadMs = Date.now() - startedAt

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  const title = titleMatch?.[1]?.trim() ?? ""
  const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
  const metaDesc = metaDescMatch?.[1]?.trim() ?? ""
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html)
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length
  const imgTags = html.match(/<img\b[^>]*>/gi) || []
  const imgsMissingAlt = imgTags.filter((tag) => !/\balt=["'][^"']+["']/i.test(tag)).length
  const hasOpenGraph = /<meta[^>]+property=["']og:/i.test(html)
  const hasFavicon = /<link[^>]+rel=["'][^"']*icon[^"']*["']/i.test(html)
  const sizeKb = Math.round(Buffer.byteLength(html, "utf8") / 1024)
  const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html)
  const scriptCount = (html.match(/<script\b/gi) || []).length

  const checks: Check[] = [
    { label: "HTTPS enabled", passed: usedHttps, weight: 15,
      suggestion: "Serve the site over HTTPS — browsers flag HTTP sites as 'Not secure', which costs trust and conversions." },
    { label: "Title tag", passed: title.length > 0 && title.length <= 60, weight: 10,
      suggestion: title ? "Your <title> is missing or too long — keep it under ~60 characters and put your main keyword near the front." : "Add a descriptive <title> tag — it's the single biggest on-page SEO signal you're missing." },
    { label: "Meta description", passed: metaDesc.length > 0, weight: 10,
      suggestion: "Add a meta description (~150–160 chars) — it's the snippet Google shows under your title in search results." },
    { label: "Mobile viewport", passed: hasViewport, weight: 15,
      suggestion: "Add a <meta name=\"viewport\"> tag — without it your site won't scale correctly on phones, hurting both UX and Google's mobile-first ranking." },
    { label: "Single clear H1", passed: h1Count === 1, weight: 10,
      suggestion: h1Count === 0 ? "Add exactly one <h1> per page describing what the page is about." : "Use exactly one <h1> per page — multiple H1s confuse both readers and search engines." },
    { label: "Image alt text", passed: imgsMissingAlt === 0, weight: 10,
      suggestion: `${imgsMissingAlt} image(s) are missing alt text — this hurts accessibility and image SEO.` },
    { label: "Open Graph tags", passed: hasOpenGraph, weight: 10,
      suggestion: "Add Open Graph tags (og:title, og:image, og:description) so links look good when shared on WhatsApp, LinkedIn, etc." },
    { label: "Favicon", passed: hasFavicon, weight: 5,
      suggestion: "Add a favicon — small detail, but its absence reads as unfinished/unprofessional to visitors." },
    { label: "Canonical tag", passed: hasCanonical, weight: 5,
      suggestion: "Add a canonical link tag to avoid duplicate-content SEO issues." },
    { label: "Reasonable page weight", passed: sizeKb < 500, weight: 10,
      suggestion: `The HTML payload is ~${sizeKb}KB — trim unused markup/inline scripts to speed up first paint.` },
    { label: "Fast response", passed: loadMs < 1500, weight: 10,
      suggestion: `Server took ~${loadMs}ms to respond — anything over 1.5s noticeably increases bounce rate.` },
  ]

  const maxScore = checks.reduce((s, c) => s + c.weight, 0)
  const earned = checks.filter((c) => c.passed).reduce((s, c) => s + c.weight, 0)
  const score = Math.round((earned / maxScore) * 100)

  const suggestions = checks.filter((c) => !c.passed).map((c) => c.suggestion)

  // A few forward-looking, always-shown suggestions for "build it better" upsell.
  const growthSuggestions = [
    "Add a live-chat or WhatsApp widget so visitors can reach you without leaving the page.",
    "Add an online booking/scheduling flow if you take appointments or consultations.",
    "Add a client portal so customers can track orders, projects, or support tickets in one place.",
  ]

  const result = {
    url: targetUrl,
    httpStatus: status,
    score,
    loadMs,
    sizeKb,
    scriptCount,
    checks: checks.map(({ label, passed, weight }) => ({ label, passed, weight })),
    suggestions,
    growthSuggestions,
  }

  // Best-effort: capture the lead for admin follow-up (cold email/proposal flow).
  try {
    const { getServiceSupabase } = await import("@/lib/portal/supabase")
    const supabase = getServiceSupabase()
    await supabase.from("audit_leads").insert({
      url: targetUrl,
      score,
      summary: result,
      contact_email: parsed.data.contactEmail ?? null,
    })
  } catch {
    // Non-fatal — the audit result is still returned even if lead capture fails
    // (e.g. Supabase env vars not configured yet).
  }

  return NextResponse.json(result)
}
