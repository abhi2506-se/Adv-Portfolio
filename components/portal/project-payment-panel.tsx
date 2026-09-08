"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PayButton } from "@/components/portal/pay-button"

export function ProjectPaymentPanel({
  projectId, type, amount, currency, clientName, clientEmail,
}: {
  projectId: string
  type: "advance" | "final"
  amount: number
  currency: string
  clientName: string
  clientEmail: string
}) {
  const router = useRouter()
  return (
    <Card className="border-amber-300 bg-amber-50">
      <CardHeader>
        <CardTitle className="text-base">
          {type === "advance" ? "Advance payment due" : "Final payment due"}: {currency} {Number(amount).toLocaleString()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Payments are processed securely by Razorpay. We never see or store your card details.
        </p>
        <PayButton
          projectId={projectId}
          type={type}
          label={`Pay ${currency} ${Number(amount).toLocaleString()}`}
          clientName={clientName}
          clientEmail={clientEmail}
          onSuccess={() => {
            // The webhook confirms and flips status server-side (may take a
            // few seconds); refresh to reflect it, and again after a short
            // delay in case the webhook hasn't landed yet.
            router.refresh()
            setTimeout(() => router.refresh(), 4000)
          }}
        />
      </CardContent>
    </Card>
  )
}
