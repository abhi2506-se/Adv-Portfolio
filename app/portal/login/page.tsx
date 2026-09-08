"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [needs2fa, setNeeds2fa] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/portal/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Login failed.")

      if (data.requires2fa) {
        setNeeds2fa(true)
        return
      }
      router.push(data.user.role === "admin" ? "/portal/admin" : "/portal/dashboard")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify2fa(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/portal/auth/2fa-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Invalid code.")
      router.push("/portal/admin")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (needs2fa) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Two-factor verification</CardTitle>
            <CardDescription>Enter the 6-digit code from your authenticator app, or a backup code.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify2fa} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input id="code" required autoFocus value={code} onChange={(e) => setCode(e.target.value)}
                  placeholder="123456" maxLength={20} />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying…" : "Verify"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Client Portal Login</CardTitle>
          <CardDescription>Track your project, chat, and manage payments.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in…" : "Log in"}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              New here? <a href="/portal/register" className="underline">Create an account</a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
