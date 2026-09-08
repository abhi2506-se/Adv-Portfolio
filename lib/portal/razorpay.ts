import crypto from "crypto"

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID!
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!
const RAZORPAY_API_BASE = "https://api.razorpay.com/v1"

function authHeader() {
  const token = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")
  return `Basic ${token}`
}

/**
 * Creates a Razorpay Order. Amount must be in the smallest currency unit
 * (paise for INR, i.e. amount * 100). This is a real server-to-server call
 * to Razorpay's Orders API — no card/UPI details ever pass through our
 * server; the client-side Razorpay Checkout widget collects those directly
 * and hands us back an order/payment/signature triple to verify.
 */
export async function createRazorpayOrder(params: {
  amountInRupees: number
  currency?: string
  receipt: string
  notes?: Record<string, string>
}) {
  const res = await fetch(`${RAZORPAY_API_BASE}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      amount: Math.round(params.amountInRupees * 100),
      currency: params.currency ?? "INR",
      receipt: params.receipt,
      notes: params.notes ?? {},
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Razorpay order creation failed (${res.status}): ${body}`)
  }
  return res.json() as Promise<{
    id: string
    amount: number
    currency: string
    receipt: string
    status: string
  }>
}

/**
 * Verifies the signature returned by Razorpay Checkout after a successful
 * client-side payment. This is the mandatory server-side check — trusting
 * the frontend's "payment succeeded" callback alone would let anyone mark
 * a project paid without actually paying.
 * HMAC-SHA256(order_id + "|" + payment_id, key_secret) === signature
 */
export function verifyPaymentSignature(params: {
  orderId: string
  paymentId: string
  signature: string
}): boolean {
  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex")
  return timingSafeEqual(expected, params.signature)
}

/**
 * Verifies the webhook signature Razorpay sends in the
 * `X-Razorpay-Signature` header, computed over the *raw* request body using
 * the separate webhook secret (configured in the Razorpay dashboard, not
 * the same as the API key secret). Must be checked BEFORE parsing/trusting
 * the payload for anything.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
  const expected = crypto
    .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex")
  return timingSafeEqual(expected, signatureHeader)
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

/**
 * Initiates a refund via Razorpay's Refunds API. Called when an admin
 * rejects a project before acceptance (or issues a manual refund). Returns
 * Razorpay's refund object; the caller is responsible for persisting status
 * and reconciling it again when the refund.processed webhook arrives
 * (refunds are asynchronous on Razorpay's side, typically 5-7 business days
 * for UPI/cards).
 */
export async function initiateRazorpayRefund(params: {
  paymentId: string
  amountInRupees: number
  notes?: Record<string, string>
}) {
  const res = await fetch(`${RAZORPAY_API_BASE}/payments/${params.paymentId}/refund`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      amount: Math.round(params.amountInRupees * 100),
      notes: params.notes ?? {},
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Razorpay refund failed (${res.status}): ${body}`)
  }
  return res.json() as Promise<{ id: string; status: string; amount: number }>
}
