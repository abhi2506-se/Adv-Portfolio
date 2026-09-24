"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { COUNTRIES, LANGUAGES } from "@/lib/portal/reference-data"

const TECH_OPTIONS = [
  { id: 1, name: "React" }, { id: 2, name: "Next.js" }, { id: 3, name: "Node.js" },
  { id: 4, name: "Python" }, { id: 5, name: "Django" }, { id: 6, name: "Flutter" },
  { id: 7, name: "React Native" }, { id: 8, name: "WordPress" }, { id: 9, name: "Shopify" },
]

export default function NewProjectPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    title: "", description: "", budgetAmount: "", advanceAmount: "",
    domain: "website", country: "IN", preferredLanguage: "en",
    timeline: "", pages: "",
  })
  const [selectedTech, setSelectedTech] = useState<number[]>([])
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleTech(id: number) {
    setSelectedTech((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agreedTerms) {
      setError("You must accept the Project Terms & Advance Payment/Refund Policy to continue.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/portal/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          budgetAmount: Number(form.budgetAmount),
          budgetCurrency: "INR",
          domain: form.domain,
          country: form.country,
          preferredLanguage: form.preferredLanguage,
          advanceAmount: Number(form.advanceAmount),
          technologyIds: selectedTech,
          requirements: { timeline: form.timeline, pages: form.pages },
          acceptedTermsVersion: "v1-2026-09",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not create project.")
      router.push(`/portal/project/${data.project.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Start a new project</CardTitle>
          <CardDescription>Tell us what you need. You'll pay a refundable-on-rejection advance to submit it for review.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Project title</Label>
              <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Describe your project</Label>
              <Textarea required rows={5} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Total budget (INR)</Label>
                <Input type="number" min={1} required value={form.budgetAmount}
                  onChange={(e) => setForm({ ...form, budgetAmount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Advance to pay now (INR)</Label>
                <Input type="number" min={1} required value={form.advanceAmount}
                  onChange={(e) => setForm({ ...form, advanceAmount: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Domain</Label>
                <Select value={form.domain} onValueChange={(v) => setForm({ ...form, domain: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="mobile_app">Mobile App</SelectItem>
                    <SelectItem value="api">API / Backend</SelectItem>
                    <SelectItem value="ecommerce">E-commerce</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estimated timeline</Label>
                <Input placeholder="e.g. 6 weeks" value={form.timeline}
                  onChange={(e) => setForm({ ...form, timeline: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Technologies (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {TECH_OPTIONS.map((t) => (
                  <button type="button" key={t.id} onClick={() => toggleTech(t.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      selectedTech.includes(t.id) ? "bg-primary text-primary-foreground border-primary" : "border-input"
                    }`}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Your country</Label>
                <Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Preferred chat language</Label>
                <Select value={form.preferredLanguage} onValueChange={(v) => setForm({ ...form, preferredLanguage: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox id="terms" checked={agreedTerms} onCheckedChange={(v) => setAgreedTerms(Boolean(v))} />
              <Label htmlFor="terms" className="text-sm font-normal leading-snug">
                I agree to the{" "}
                <a href="/terms" target="_blank" className="underline">Project Terms & Conditions</a>,{" "}
                <a href="/refund-policy" target="_blank" className="underline">Advance Payment/Refund Policy</a>, and{" "}
                <a href="/privacy" target="_blank" className="underline">Privacy Policy</a>.
              </Label>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating…" : "Continue to Payment"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
