import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requirePortalUser, PortalAuthError } from "@/lib/portal/auth"
import { getServerSupabase } from "@/lib/portal/supabase"
import { createRazorpayOrder } from "@/lib/portal/razorpay"

const Schema = z.object({
  projectId: z.string().uuid(),
  type: z.enum(["advance", "final"]),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requirePortalUser()
    const parsed = Schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 })
    const { projectId, type } = parsed.data

    const supabase = await getServerSupabase()
    const { data: project, error } = await supabase
      .from("projects")
      .select("id, client_id, status, advance_amount, final_amount, budget_currency")
      .eq("id", projectId)
      .single()

    if (error || !project || project.client_id !== user.id) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 })
    }

    // Server decides the amount — never trust an amount from the client.
    let amount: number
    if (type === "advance") {
      if (project.status !== "pending_payment") {
        return NextResponse.json({ error: "Advance payment is not currently due." }, { status: 409 })
      }
      amount = Number(project.advance_amount)
    } else {
      if (project.status !== "final_payment_pending") {
        return NextResponse.json({ error: "Final payment is not currently due." }, { status: 409 })
      }
      if (!project.final_amount) {
        return NextResponse.json({ error: "Final amount has not been set yet." }, { status: 409 })
      }
      amount = Number(project.final_amount)
    }

    const receipt = `${type}_${project.id}_${Date.now()}`
    const order = await createRazorpayOrder({
      amountInRupees: amount,
      currency: project.budget_currency || "INR",
      receipt,
      notes: { projectId: project.id, type, clientId: user.id },
    })

    const { error: insertErr } = await supabase.from("payments").insert({
      project_id: project.id,
      client_id: user.id,
      type,
      razorpay_order_id: order.id,
      amount,
      currency: order.currency,
      status: "created",
    })
    if (insertErr) {
      return NextResponse.json({ error: "Could not record payment order." }, { status: 500 })
    }

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID, // publishable, safe to expose
    })
  } catch (err) {
    if (err instanceof PortalAuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error("[payments.create-order]", err)
    return NextResponse.json({ error: "Could not create payment order." }, { status: 500 })
  }
}
