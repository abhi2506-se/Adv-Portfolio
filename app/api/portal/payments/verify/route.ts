import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requirePortalUser, PortalAuthError } from "@/lib/portal/auth"
import { getServerSupabase } from "@/lib/portal/supabase"
import { verifyPaymentSignature } from "@/lib/portal/razorpay"

const Schema = z.object({
  orderId: z.string(),
  paymentId: z.string(),
  signature: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requirePortalUser()
    const parsed = Schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 })
    const { orderId, paymentId, signature } = parsed.data

    const valid = verifyPaymentSignature({ orderId, paymentId, signature })
    if (!valid) {
      return NextResponse.json({ error: "Signature verification failed." }, { status: 400 })
    }

    const supabase = await getServerSupabase()
    const { data: payment } = await supabase
      .from("payments")
      .select("id, client_id")
      .eq("razorpay_order_id", orderId)
      .single()

    if (!payment || payment.client_id !== user.id) {
      return NextResponse.json({ error: "Payment not found." }, { status: 404 })
    }

    // We intentionally do NOT set status to "captured" or flip the project
    // status here — that only happens once Razorpay's server-to-server
    // `payment.captured` webhook arrives (see /api/portal/payments/webhook).
    // This endpoint only marks the payment as "authorized" so the UI can
    // show "verifying your payment…" instead of silently doing nothing.
    await supabase
      .from("payments")
      .update({ razorpay_payment_id: paymentId, razorpay_signature: signature, status: "authorized", updated_at: new Date().toISOString() })
      .eq("id", payment.id)

    return NextResponse.json({ ok: true, status: "authorized" })
  } catch (err) {
    if (err instanceof PortalAuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 })
  }
}
