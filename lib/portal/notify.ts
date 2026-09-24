import { getServiceSupabase } from "./supabase"

export async function notifyClient(params: {
  clientId: string
  projectId?: string
  type: "status_change" | "payment" | "message" | "milestone" | "review" | "refund"
  title: string
  body?: string
}) {
  const supabase = getServiceSupabase()
  await supabase.from("notifications").insert({
    client_id: params.clientId,
    project_id: params.projectId ?? null,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
  })
  // Realtime: any client subscribed to `notifications` filtered on their own
  // client_id (via postgres_changes) receives this insert immediately —
  // no extra push step needed, see hooks/portal/use-notifications.ts
}

export async function recordStatusChange(params: {
  projectId: string
  fromStatus: string | null
  toStatus: string
  changedBy: string | null
  note?: string
}) {
  const supabase = getServiceSupabase()
  await supabase.from("status_history").insert({
    project_id: params.projectId,
    from_status: params.fromStatus,
    to_status: params.toStatus,
    changed_by: params.changedBy,
    note: params.note ?? null,
  })
}
