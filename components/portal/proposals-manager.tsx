"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

type Proposal = {
  id: string
  sender_id: string
  sender_role: "admin" | "co_admin"
  recipient_email: string
  recipient_name: string | null
  subject: string
  status: "sent" | "failed" | "replied" | "bounced"
  is_follow_up: boolean
  sent_at: string
  replied_at: string | null
  commission_sent_amount: number
  commission_reply_amount: number
  clients?: { full_name: string; email: string; role: string } | null
}

type CommissionSelf = {
  self: { sentCount: number; repliedCount: number; sentCommission: number; replyCommission: number; totalCommission: number }
}
type CommissionAdmin = {
  breakdown: Array<{
    id: string; fullName: string; email: string
    commissionPerSentEmail: number; commissionPerReply: number
    sentCount: number; repliedCount: number; sentCommission: number; replyCommission: number; totalCommission: number
  }>
  totals: { totalEmails: number; totalReplied: number; grandTotalCommission: number }
}

export function ProposalsManager({ role }: { role: "admin" | "co_admin" }) {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [commission, setCommission] = useState<CommissionSelf | CommissionAdmin | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ recipientEmail: "", recipientName: "", subject: "", bodyHtml: "" })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, cRes] = await Promise.all([
        fetch("/api/portal/admin/proposals").then((r) => r.json()),
        fetch("/api/portal/admin/proposals/commission").then((r) => r.json()),
      ])
      setProposals(pRes.proposals ?? [])
      setCommission(cRes)
    } catch {
      setError("Could not load proposals.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setError(null)
    try {
      const res = await fetch("/api/portal/admin/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Send failed")
      setForm({ recipientEmail: "", recipientName: "", subject: "", bodyHtml: "" })
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  async function markReplied(id: string) {
    await fetch(`/api/portal/admin/proposals/${id}/reply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
    await load()
  }

  async function sendFollowUp(p: Proposal) {
    const subject = `Following up: ${p.subject}`
    const bodyHtml = `<p>Hi ${p.recipient_name || "there"},</p><p>Just following up on my earlier note below — happy to answer any questions.</p><hr/>`
    await fetch(`/api/portal/admin/proposals/${p.id}/follow-up`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, bodyHtml }),
    })
    await load()
  }

  const isAdmin = role === "admin"

  return (
    <div className="space-y-8">
      {/* Commission summary */}
      {commission && "self" in commission && (
        <Card>
          <CardHeader><CardTitle className="text-base">Your Commission</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <Stat label="Emails sent" value={commission.self.sentCount} />
            <Stat label="Replies" value={commission.self.repliedCount} />
            <Stat label="Sent commission" value={`₹${commission.self.sentCommission.toFixed(2)}`} />
            <Stat label="Total commission" value={`₹${commission.self.totalCommission.toFixed(2)}`} highlight />
          </CardContent>
        </Card>
      )}

      {commission && "breakdown" in commission && (
        <Card>
          <CardHeader><CardTitle className="text-base">Co-Admin Commission Overview</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <Stat label="Total emails" value={commission.totals.totalEmails} />
              <Stat label="Total replies" value={commission.totals.totalReplied} />
              <Stat label="Total commission owed" value={`₹${commission.totals.grandTotalCommission.toFixed(2)}`} highlight />
            </div>
            <div className="divide-y">
              {commission.breakdown.map((b) => (
                <div key={b.id} className="py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div>
                    <p className="font-medium">{b.fullName}</p>
                    <p className="text-xs text-muted-foreground">{b.email}</p>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span>Sent: <b>{b.sentCount}</b></span>
                    <span>Replied: <b>{b.repliedCount}</b></span>
                    <span>Commission: <b>₹{b.totalCommission.toFixed(2)}</b></span>
                  </div>
                </div>
              ))}
              {commission.breakdown.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">No co-admins yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compose */}
      <Card>
        <CardHeader><CardTitle className="text-base">Send a Proposal / Cold Email</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <Input placeholder="Recipient email" type="email" required
                value={form.recipientEmail} onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })} />
              <Input placeholder="Recipient name (optional)"
                value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} />
            </div>
            <Input placeholder="Subject" required
              value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            <Textarea placeholder="Message (HTML allowed)" rows={6} required
              value={form.bodyHtml} onChange={(e) => setForm({ ...form, bodyHtml: e.target.value })} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={sending}>{sending ? "Sending…" : "Send from sales@theabhisheksingh.in"}</Button>
          </form>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader><CardTitle className="text-base">{isAdmin ? "All Proposals" : "Your Proposals"}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && proposals.length === 0 && <p className="text-sm text-muted-foreground">No proposals sent yet.</p>}
          {proposals.map((p) => (
            <div key={p.id} className="border rounded-lg p-3 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">{p.subject}</p>
                  {p.is_follow_up && <Badge variant="outline">Follow-up</Badge>}
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  To: {p.recipient_name ? `${p.recipient_name} <${p.recipient_email}>` : p.recipient_email}
                </p>
                {isAdmin && (
                  <p className="text-xs text-muted-foreground">
                    By: {p.clients?.full_name ?? "—"} ({p.sender_role})
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Sent {new Date(p.sent_at).toLocaleString()}
                  {p.replied_at && ` · Replied ${new Date(p.replied_at).toLocaleString()}`}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {p.status !== "replied" && (
                  <Button size="sm" variant="outline" onClick={() => markReplied(p.id)}>Mark replied</Button>
                )}
                <Button size="sm" variant="outline" onClick={() => sendFollowUp(p)}>Follow up</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={highlight ? "text-lg font-semibold text-emerald-500" : "text-lg font-semibold"}>{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: Proposal["status"] }) {
  const map: Record<Proposal["status"], string> = {
    sent: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    replied: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    failed: "bg-red-500/10 text-red-500 border-red-500/20",
    bounced: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${map[status]}`}>{status}</span>
}
