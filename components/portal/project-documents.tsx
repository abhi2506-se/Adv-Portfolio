"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getBrowserSupabase } from "@/lib/portal/supabase-browser"

interface Doc {
  id: string
  file_name: string
  mime_type: string
  size_bytes: number
  category: string
  created_at: string
  storage_path: string
}

export function ProjectDocuments({ projectId }: { projectId: string }) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  async function loadDocs() {
    const res = await fetch(`/api/portal/projects/${projectId}`)
    const data = await res.json()
    setDocs(data.documents ?? [])
  }

  useEffect(() => { loadDocs() }, [projectId])

  async function handleUpload(file: File) {
    setUploading(true)
    setError(null)
    try {
      const prepRes = await fetch(`/api/portal/projects/${projectId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type, sizeBytes: file.size }),
      })
      const prep = await prepRes.json()
      if (!prepRes.ok) throw new Error(prep.error || "Upload not allowed.")

      const supabase = getBrowserSupabase()
      const { error: uploadErr } = await supabase.storage
        .from("project-documents")
        .uploadToSignedUrl(prep.storagePath, prep.token, file)
      if (uploadErr) throw new Error(uploadErr.message)

      const confirmRes = await fetch(`/api/portal/projects/${projectId}/documents`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storagePath: prep.storagePath, fileName: file.name, mimeType: file.type, sizeBytes: file.size,
        }),
      })
      if (!confirmRes.ok) throw new Error("Upload succeeded but could not be recorded.")
      await loadDocs()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ""
    }
  }

  async function downloadDoc(doc: Doc) {
    const supabase = getBrowserSupabase()
    const { data, error } = await supabase.storage.from("project-documents").createSignedUrl(doc.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, "_blank")
    else setError(error?.message ?? "Could not generate download link.")
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <input
            ref={fileInput}
            type="file"
            className="text-sm"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
          />
          {uploading && <span className="text-xs text-muted-foreground">Uploading…</span>}
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}

        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                <div>
                  <p className="font-medium">{d.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(d.size_bytes / 1024).toFixed(0)} KB · {new Date(d.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => downloadDoc(d)}>Download</Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
