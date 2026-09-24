"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type CoAdmin = {
  id: string
  full_name: string
  email: string
  commission_per_sent_email: number
  commission_per_reply: number
  is_active: boolean
}

export function CoAdminManager() {
  const [coAdmins, setCoAdmins] = useState<CoAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ fullName: "", email: "", password: "", commissionPerSentEmail: "0", commissionPerReply: "0" })
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/portal/admin/co-admins")
    const data = await res.json()
    setCoAdmins(data.coAdmins ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const res = await fetch("/api/portal/admin/co-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          commissionPerSentEmail: Number(form.commissionPerSentEmail),
          commissionPerReply: Number(form.commissionPerReply),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not create co-admin")
      setForm({ fullName: "", email: "", password: "", commissionPerSentEmail: "0", commissionPerReply: "0" })
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function updateRate(id: string, field: "commission_per_sent_email" | "commission_per_reply", value: number) {
    await fetch("/api/portal/admin/co-admins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        commissionPerSentEmail: field === "commission_per_sent_email" ? value : undefined,
        commissionPerReply: field === "commission_per_reply" ? value : undefined,
      }),
    })
    await load()
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch("/api/portal/admin/co-admins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    })
    await load()
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Co-Admins</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleCreate} className="grid md:grid-cols-5 gap-2 items-end">
          <Input placeholder="Full name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <Input placeholder="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Input placeholder="₹ per sent" type="number" step="0.01" value={form.commissionPerSentEmail} onChange={(e) => setForm({ ...form, commissionPerSentEmail: e.target.value })} />
          <Input placeholder="₹ per reply" type="number" step="0.01" value={form.commissionPerReply} onChange={(e) => setForm({ ...form, commissionPerReply: e.target.value })} />
          <Button type="submit" disabled={creating} className="md:col-span-5 w-fit">{creating ? "Creating…" : "Add co-admin"}</Button>
        </form>
        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="divide-y">
          {!loading && coAdmins.length === 0 && <p className="text-sm text-muted-foreground">No co-admins yet.</p>}
          {coAdmins.map((ca) => (
            <div key={ca.id} className="py-3 flex flex-wrap items-center gap-3 justify-between">
              <div>
                <p className="font-medium">{ca.full_name} {!ca.is_active && <span className="text-xs text-red-500">(inactive)</span>}</p>
                <p className="text-xs text-muted-foreground">{ca.email}</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <label className="flex items-center gap-1">₹/sent
                  <Input className="w-20 h-8" type="number" step="0.01" defaultValue={ca.commission_per_sent_email}
                    onBlur={(e) => updateRate(ca.id, "commission_per_sent_email", Number(e.target.value))} />
                </label>
                <label className="flex items-center gap-1">₹/reply
                  <Input className="w-20 h-8" type="number" step="0.01" defaultValue={ca.commission_per_reply}
                    onBlur={(e) => updateRate(ca.id, "commission_per_reply", Number(e.target.value))} />
                </label>
                <Button size="sm" variant="outline" onClick={() => toggleActive(ca.id, ca.is_active)}>
                  {ca.is_active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
