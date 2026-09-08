"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

export function AdminProjectActions({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [reason, setReason] = useState("")
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function accept() {
    setLoading(true)
    try {
      const res = await fetch(`/api/portal/admin/projects/${projectId}/accept`, { method: "POST" })
      if (!res.ok) throw new Error((await res.json()).error)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function reject() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/portal/admin/projects/${projectId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOpen(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      <Button size="sm" onClick={accept} disabled={loading}>Accept</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="destructive" disabled={loading}>Reject & Refund</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject project & refund advance</DialogTitle></DialogHeader>
          <Textarea placeholder="Reason for rejection (shown to the client)" value={reason} onChange={(e) => setReason(e.target.value)} />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <DialogFooter>
            <Button variant="destructive" onClick={reject} disabled={loading || reason.trim().length < 3}>
              Confirm Reject & Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
