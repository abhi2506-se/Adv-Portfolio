import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requirePortalUser, PortalAuthError } from "@/lib/portal/auth"
import { getServerSupabase } from "@/lib/portal/supabase"

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
])
const MAX_SIZE_BYTES = 25 * 1024 * 1024 // 25MB

const RequestUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive(),
})

const ConfirmSchema = z.object({
  storagePath: z.string().min(1),
  fileName: z.string().min(1).max(255),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive(),
  category: z.enum(["general", "deliverable", "contract", "other"]).default("general"),
})

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-150)
}

async function assertProjectAccess(supabase: any, userId: string, role: string, projectId: string) {
  const { data: project } = await supabase.from("projects").select("client_id").eq("id", projectId).single()
  if (!project || (role !== "admin" && project.client_id !== userId)) return false
  return true
}

// Step 1: client asks for a signed upload URL after picking a file.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePortalUser()
    const { id: projectId } = await params
    const parsed = RequestUploadSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 })

    const { fileName, mimeType, sizeBytes } = parsed.data
    if (!ALLOWED_MIME.has(mimeType)) {
      return NextResponse.json({ error: `File type '${mimeType}' is not allowed.` }, { status: 400 })
    }
    if (sizeBytes > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File exceeds the 25MB limit." }, { status: 400 })
    }

    const supabase = await getServerSupabase()
    const hasAccess = await assertProjectAccess(supabase, user.id, user.role, projectId)
    if (!hasAccess) return NextResponse.json({ error: "Not found." }, { status: 404 })

    const storagePath = `${projectId}/${Date.now()}_${sanitizeFileName(fileName)}`
    const { data, error } = await supabase.storage.from("project-documents").createSignedUploadUrl(storagePath)
    if (error || !data) return NextResponse.json({ error: "Could not prepare upload." }, { status: 500 })

    return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, storagePath })
  } catch (err) {
    if (err instanceof PortalAuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 })
  }
}

// Step 2: after the browser PUTs the file directly to Supabase Storage using
// the signed URL, it calls this to record metadata in Postgres.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePortalUser()
    const { id: projectId } = await params
    const parsed = ConfirmSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 })

    const supabase = await getServerSupabase()
    const hasAccess = await assertProjectAccess(supabase, user.id, user.role, projectId)
    if (!hasAccess) return NextResponse.json({ error: "Not found." }, { status: 404 })

    const { data: document, error } = await supabase
      .from("documents")
      .insert({
        project_id: projectId,
        uploaded_by: user.id,
        storage_path: parsed.data.storagePath,
        file_name: parsed.data.fileName,
        mime_type: parsed.data.mimeType,
        size_bytes: parsed.data.sizeBytes,
        category: parsed.data.category,
      })
      .select()
      .single()

    if (error || !document) return NextResponse.json({ error: "Could not save document metadata." }, { status: 500 })
    return NextResponse.json({ ok: true, document })
  } catch (err) {
    if (err instanceof PortalAuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 })
  }
}
