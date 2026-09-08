"use client"

import { useState } from "react"
import Script from "next/script"
import { Button } from "@/components/ui/button"

declare global {
  interface Window {
    Razorpay: any
  }
}

export function PayButton({
  projectId,
  type,
  label,
  clientName,
  clientEmail,
  onSuccess,
}: {
  projectId: string
  type: "advance" | "final"
  label: string
  clientName: string
  clientEmail: string
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePay() {
    setLoading(true)
    setError(null)
    try {
      const orderRes = await fetch("/api/portal/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, type }),
      })
      const order = await orderRes.json()
      if (!orderRes.ok) throw new Error(order.error || "Could not start payment.")

      const rzp = new window.Razorpay({
        key: order.razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "Abhishek Singh — Client Portal",
        description: type === "advance" ? "Project advance payment" : "Final project payment",
        prefill: { name: clientName, email: clientEmail },
        handler: async function (response: any) {
          // NOTE: this callback firing does NOT mean the payment is trusted
          // yet — real confirmation comes from the server-verified webhook.
          // We still call verify here for a fast UI update, but the
          // project's authoritative status change happens in the webhook.
          await fetch("/api/portal/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            }),
          })
          onSuccess()
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
        theme: { color: "#0f172a" },
      })
      rzp.on("payment.failed", function () {
        setError("Payment failed or was cancelled. You can try again.")
        setLoading(false)
      })
      rzp.open()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <Button onClick={handlePay} disabled={loading}>
        {loading ? "Processing…" : label}
      </Button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
