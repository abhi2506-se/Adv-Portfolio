"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export function TwoFactorSettings({ initiallyEnabled }: { initiallyEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initiallyEnabled)
  const [step, setStep] = useState<"idle" | "scanning" | "backup-codes">("idle")
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function startSetup() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/portal/admin/2fa/setup", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setQrCodeDataUrl(data.qrCodeDataUrl)
      setStep("scanning")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function confirmCode() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/portal/admin/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBackupCodes(data.backupCodes)
      setStep("backup-codes")
      setEnabled(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function disable2fa() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/portal/admin/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEnabled(false)
      setStep("idle")
      setPassword("")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (step === "backup-codes") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Save your backup codes</CardTitle>
          <CardDescription>
            Each code works once, if you lose access to your authenticator app. Store them somewhere safe —
            they won't be shown again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-muted p-4 rounded-lg">
            {backupCodes.map((c) => <div key={c}>{c}</div>)}
          </div>
          <Button onClick={() => setStep("idle")}>Done</Button>
        </CardContent>
      </Card>
    )
  }

  if (step === "scanning") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scan this QR code</CardTitle>
          <CardDescription>Use Google Authenticator, Authy, or any TOTP app, then enter the 6-digit code.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {qrCodeDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrCodeDataUrl} alt="2FA QR code" width={200} height={200} className="rounded-lg border" />
          )}
          <div className="space-y-2 max-w-xs">
            <Label>Enter the code from your app</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" maxLength={6} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button onClick={confirmCode} disabled={loading || code.length < 6}>
            {loading ? "Verifying…" : "Confirm & Enable 2FA"}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-factor authentication</CardTitle>
        <CardDescription>
          {enabled
            ? "2FA is currently enabled on your admin account."
            : "Add an extra layer of security to your admin account with an authenticator app."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {enabled ? (
          <div className="space-y-3 max-w-xs">
            <Label>Confirm your password to disable 2FA</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button variant="destructive" onClick={disable2fa} disabled={loading || !password}>
              {loading ? "Disabling…" : "Disable 2FA"}
            </Button>
          </div>
        ) : (
          <>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={startSetup} disabled={loading}>{loading ? "Starting…" : "Enable 2FA"}</Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
