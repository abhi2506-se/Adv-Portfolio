"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ProjectReviewForm({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [consent, setConsent] = useState({ name: false, country: false, company: false })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/portal/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId, rating, comment,
          consentPublicName: consent.name,
          consentPublicCountry: consent.country,
          consentPublicCompany: consent.company,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not submit review.")
      setDone(true)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) return <p className="text-sm text-green-600">Thanks for your review! It'll appear publicly once moderated.</p>

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Leave a review</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setRating(n)} className={`text-2xl ${n <= rating ? "text-amber-400" : "text-gray-300"}`}>★</button>
          ))}
        </div>
        <Textarea placeholder="How was your experience?" value={comment} onChange={(e) => setComment(e.target.value)} rows={4} />
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Choose what we can display publicly alongside your review:</p>
          <div className="flex items-center gap-2">
            <Checkbox checked={consent.name} onCheckedChange={(v) => setConsent((c) => ({ ...c, name: Boolean(v) }))} />
            <Label className="font-normal text-sm">My name</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={consent.company} onCheckedChange={(v) => setConsent((c) => ({ ...c, company: Boolean(v) }))} />
            <Label className="font-normal text-sm">My company</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={consent.country} onCheckedChange={(v) => setConsent((c) => ({ ...c, country: Boolean(v) }))} />
            <Label className="font-normal text-sm">My country</Label>
          </div>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button onClick={submit} disabled={submitting}>{submitting ? "Submitting…" : "Submit review"}</Button>
      </CardContent>
    </Card>
  )
}
