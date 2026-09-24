import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSignature } from "@/lib/portal/razorpay"
import { getServiceSupabase } from "@/lib/portal/supabase"
import { notifyClient, recordStatusChange } from "@/lib/portal/notify"

// IMPORTANT: this route must receive the *raw* body for signature
// verification, so we read req.text() rather than req.json(). Next.js App
// Router route handlers do not parse the body automatically, so this is safe
// by default — do not add a body-parsing middleware in front of this path.

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-razorpay-signature")
  const rawBody = await req.text()

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    console.warn("[razorpay-webhook] invalid signature")
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const payload = JSON.parse(rawBody)
  const eventId: string | undefined = payload.event_id ?? req.headers.get("x-razorpay-event-id") ?? undefined
  const eventType: string = payload.event

  const supabase = getServiceSupabase()

  // Idempotency: Razorpay retries webhooks on timeout/non-2xx, and can send
  // the same event more than once. We dedupe on (provider, event_id) — if
  // Razorpay didn't include an event_id, fall back to a hash-free composite
  // key from payment id + event type, which is still stable per delivery.
  const dedupeKey = eventId ?? `${eventType}:${payload?.payload?.payment?.entity?.id ?? "unknown"}`
  const { error: dedupeError } = await supabase
    .from("webhook_events")
    .insert({ provider: "razorpay", event_id: dedupeKey, event_type: eventType, payload })

  if (dedupeError) {
    // Unique violation => already processed this exact event. Acknowledge
    // with 200 so Razorpay stops retrying, but do nothing further.
    if (dedupeError.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true })
    }
    console.error("[razorpay-webhook] dedupe insert failed", dedupeError)
    return NextResponse.json({ error: "Could not record event" }, { status: 500 })
  }

  try {
    switch (eventType) {
      case "payment.captured":
        await handlePaymentCaptured(payload)
        break
      case "payment.failed":
        await handlePaymentFailed(payload)
        break
      case "refund.processed":
        await handleRefundProcessed(payload)
        break
      case "refund.failed":
        await handleRefundFailed(payload)
        break
      default:
        // Unhandled event types are acknowledged, not errored — Razorpay
        // sends many event types we don't need to act on.
        break
    }
  } catch (err) {
    console.error(`[razorpay-webhook] handler error for ${eventType}`, err)
    // Return 500 so Razorpay retries — our idempotency key above prevents
    // double-processing once we succeed on a retry. Note: this specific
    // dedupe row was already inserted, so on retry we'd short-circuit as a
    // duplicate. To allow a genuine retry-after-failure, we delete the
    // dedupe row before returning the error.
    await supabase.from("webhook_events").delete().eq("provider", "razorpay").eq("event_id", dedupeKey)
    return NextResponse.json({ error: "Processing failed" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

async function handlePaymentCaptured(payload: any) {
  const supabase = getServiceSupabase()
  const entity = payload.payload.payment.entity
  const orderId: string = entity.order_id
  const paymentId: string = entity.id
  const method: string = entity.method

  const { data: payment } = await supabase
    .from("payments")
    .select("id, project_id, client_id, type")
    .eq("razorpay_order_id", orderId)
    .single()

  if (!payment) {
    console.warn("[razorpay-webhook] payment.captured for unknown order", orderId)
    return
  }

  await supabase
    .from("payments")
    .update({ razorpay_payment_id: paymentId, status: "captured", method, updated_at: new Date().toISOString() })
    .eq("id", payment.id)

  if (payment.type === "advance") {
    const { data: project } = await supabase
      .from("projects")
      .select("status")
      .eq("id", payment.project_id)
      .single()

    // Only transition if still pending — guards against a stray duplicate
    // webhook moving an already-progressed project backwards.
    if (project?.status === "pending_payment") {
      await supabase
        .from("projects")
        .update({ status: "under_review", updated_at: new Date().toISOString() })
        .eq("id", payment.project_id)
      await recordStatusChange({
        projectId: payment.project_id,
        fromStatus: "pending_payment",
        toStatus: "under_review",
        changedBy: null,
        note: "Advance payment verified via Razorpay webhook.",
      })
      await notifyClient({
        clientId: payment.client_id,
        projectId: payment.project_id,
        type: "payment",
        title: "Advance payment received",
        body: "Your payment has been verified. Your project is now under review.",
      })
    }
  } else {
    const { data: project } = await supabase
      .from("projects")
      .select("status")
      .eq("id", payment.project_id)
      .single()
    if (project?.status === "final_payment_pending") {
      await supabase
        .from("projects")
        .update({ status: "delivered", updated_at: new Date().toISOString() })
        .eq("id", payment.project_id)
      await recordStatusChange({
        projectId: payment.project_id,
        fromStatus: "final_payment_pending",
        toStatus: "delivered",
        changedBy: null,
        note: "Final payment verified via Razorpay webhook.",
      })
      await notifyClient({
        clientId: payment.client_id,
        projectId: payment.project_id,
        type: "payment",
        title: "Final payment received",
        body: "Thank you! Your final deliverables are now available.",
      })
    }
  }
}

async function handlePaymentFailed(payload: any) {
  const supabase = getServiceSupabase()
  const entity = payload.payload.payment.entity
  const orderId: string = entity.order_id

  const { data: payment } = await supabase
    .from("payments")
    .select("id, project_id, client_id")
    .eq("razorpay_order_id", orderId)
    .single()
  if (!payment) return

  await supabase.from("payments").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", payment.id)
  await notifyClient({
    clientId: payment.client_id,
    projectId: payment.project_id,
    type: "payment",
    title: "Payment failed",
    body: "Your payment attempt did not go through. Please try again from your project page.",
  })
}

async function handleRefundProcessed(payload: any) {
  const supabase = getServiceSupabase()
  const entity = payload.payload.refund.entity
  const razorpayRefundId: string = entity.id

  const { data: refund } = await supabase
    .from("refunds")
    .select("id, project_id, initiated_by")
    .eq("razorpay_refund_id", razorpayRefundId)
    .single()
  if (!refund) return

  await supabase
    .from("refunds")
    .update({ status: "processed", updated_at: new Date().toISOString() })
    .eq("id", refund.id)

  await supabase
    .from("payments")
    .update({ status: "refunded", updated_at: new Date().toISOString() })
    .eq("project_id", refund.project_id)
    .eq("type", "advance")

  const { data: project } = await supabase.from("projects").select("client_id").eq("id", refund.project_id).single()
  if (project) {
    await notifyClient({
      clientId: project.client_id,
      projectId: refund.project_id,
      type: "refund",
      title: "Refund processed",
      body: "Your refund has been processed by Razorpay and should reflect in your account shortly.",
    })
  }
}

async function handleRefundFailed(payload: any) {
  const supabase = getServiceSupabase()
  const entity = payload.payload.refund.entity
  const razorpayRefundId: string = entity.id

  await supabase
    .from("refunds")
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("razorpay_refund_id", razorpayRefundId)
}
