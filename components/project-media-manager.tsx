'use client'

import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  Upload, Trash2, GripVertical, Image as ImageIcon, Film, FileImage,
  Pencil, Check, X, Loader2, Plus, Eye, EyeOff, ChevronDown, ChevronUp,
} from 'lucide-react'

export interface ProjectMediaItem {
  id: string
  project_id: string
  media_type: 'image' | 'gif' | 'video'
  media_url: string
  thumbnail_url?: string
  title: string
  description: string
  display_order: number
  uploaded_at: string
}

interface Props {
  projectId: string
  projectTitle?: string
  onClose?: () => void
}

function mediaTypeIcon(type: string) {
  if (type === 'video') return <Film className="w-3.5 h-3.5" />
  if (type === 'gif') return <FileImage className="w-3.5 h-3.5" />
  return <ImageIcon className="w-3.5 h-3.5" />
}

function mediaTypeBadge(type: string) {
  const map: Record<string, string> = {
    image: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    gif:   'bg-purple-500/10 text-purple-400 border-purple-500/20',
    video: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  }
  return map[type] ?? map.image
}

export default function ProjectMediaManager({ projectId, projectTitle, onClose }: Props) {
  const [items, setItems] = useState<ProjectMediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [previewItem, setPreviewItem] = useState<ProjectMediaItem | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/project-media?projectId=${projectId}`)
      const d = await r.json()
      setItems((d.media || []).sort((a: ProjectMediaItem, b: ProjectMediaItem) => a.display_order - b.display_order))
    } catch {
      setError('Failed to load media')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  React.useEffect(() => { load() }, [load])

  // ── Toast helpers ─────────────────────────────────────────────────────────
  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3000)
  }
  const showError = (msg: string) => {
    setError(msg)
    setTimeout(() => setError(null), 4000)
  }

  // ── Upload ────────────────────────────────────────────────────────────────
  const uploadFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files)
    if (!fileArr.length) return
    setUploading(true)
    setUploadProgress(0)

    for (let i = 0; i < fileArr.length; i++) {
      const file = fileArr[i]
      try {
        setUploadProgress(Math.round(((i + 0.5) / fileArr.length) * 100))

        // Determine media type
        let mediaType: 'image' | 'gif' | 'video' = 'image'
        if (file.type.startsWith('video/')) mediaType = 'video'
        else if (file.name.toLowerCase().endsWith('.gif') || file.type === 'image/gif') mediaType = 'gif'

        // Upload to Vercel Blob
        const uploadRes = await fetch(`/api/blob-upload?filename=${encodeURIComponent(file.name)}&projectId=${projectId}`, {
          method: 'POST',
          body: file,
        })

        let mediaUrl: string
        if (uploadRes.ok) {
          const blobData = await uploadRes.json()
          mediaUrl = blobData.url
        } else {
          // Fallback: create a data URL for preview (not production-ready)
          mediaUrl = URL.createObjectURL(file)
        }

        // Create media record
        await fetch('/api/admin/project-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            media_type: mediaType,
            media_url: mediaUrl,
            title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
            description: '',
            display_order: items.length + i,
          }),
        })

        setUploadProgress(Math.round(((i + 1) / fileArr.length) * 100))
      } catch (e) {
        showError(`Failed to upload ${file.name}`)
      }
    }

    setUploading(false)
    setUploadProgress(0)
    showSuccess(`${fileArr.length} file${fileArr.length > 1 ? 's' : ''} uploaded!`)
    load()
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) uploadFiles(e.target.files)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files)
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this media item?')) return
    try {
      await fetch('/api/admin/project-media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setItems(prev => prev.filter(i => i.id !== id))
      showSuccess('Deleted')
    } catch {
      showError('Failed to delete')
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────
  const startEdit = (item: ProjectMediaItem) => {
    setEditingId(item.id)
    setEditTitle(item.title)
    setEditDesc(item.description)
  }

  const saveEdit = async (id: string) => {
    try {
      await fetch('/api/admin/project-media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, title: editTitle, description: editDesc }),
      })
      setItems(prev => prev.map(i => i.id === id ? { ...i, title: editTitle, description: editDesc } : i))
      setEditingId(null)
      showSuccess('Saved')
    } catch {
      showError('Failed to save')
    }
  }

  // ── Reorder ───────────────────────────────────────────────────────────────
  const handleReorder = async (newItems: ProjectMediaItem[]) => {
    const reordered = newItems.map((item, idx) => ({ ...item, display_order: idx }))
    setItems(reordered)
    try {
      await fetch('/api/admin/project-media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reordered.map(i => ({ id: i.id, display_order: i.display_order }))),
      })
    } catch {
      showError('Failed to save order')
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h2 className="font-bold text-white text-sm">Project Media</h2>
            {projectTitle && <p className="text-xs text-slate-500">{projectTitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Toast messages */}
      <AnimatePresence>
        {(success || error) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className={`mx-4 mt-3 px-4 py-2.5 rounded-xl text-sm font-medium ${
              success ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}
          >
            {success || error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mx-4 mt-3 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
          dragOver
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.gif"
          className="hidden"
          onChange={handleFileInput}
        />
        {uploading ? (
          <div className="w-full space-y-2">
            <div className="flex items-center gap-2 justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              <span className="text-sm text-slate-300">Uploading… {uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5">
              <motion.div
                className="bg-blue-500 h-1.5 rounded-full"
                style={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 text-slate-500" />
            <div className="text-center">
              <p className="text-sm text-slate-300 font-medium">
                {dragOver ? 'Drop to upload' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Images, GIFs, Videos • Multiple files supported</p>
            </div>
          </>
        )}
      </div>

      {/* Media list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            <ImageIcon className="w-10 h-10 mx-auto mb-3 text-slate-700" />
            No media uploaded yet
          </div>
        ) : (
          <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="space-y-2">
            {items.map((item) => (
              <Reorder.Item key={item.id} value={item}>
                <motion.div
                  layout
                  className="bg-slate-800/60 border border-slate-700/40 rounded-xl overflow-hidden"
                >
                  <div className="flex items-start gap-3 p-3">
                    {/* Drag handle */}
                    <div className="flex-shrink-0 cursor-grab active:cursor-grabbing pt-1 text-slate-600 hover:text-slate-400 transition-colors">
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Thumbnail */}
                    <div
                      className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-slate-900 border border-slate-700 cursor-pointer relative group"
                      onClick={() => setPreviewItem(item)}
                    >
                      {item.media_type === 'video' ? (
                        <div className="w-full h-full flex items-center justify-center bg-slate-900">
                          <Film className="w-6 h-6 text-orange-400" />
                        </div>
                      ) : (
                        <img
                          src={item.thumbnail_url || item.media_url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).src = '/placeholder.jpg' }}
                        />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <Eye className="w-4 h-4 text-white" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {editingId === item.id ? (
                        <div className="space-y-2">
                          <input
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            placeholder="Title"
                            className="w-full text-xs bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-blue-500"
                          />
                          <textarea
                            value={editDesc}
                            onChange={e => setEditDesc(e.target.value)}
                            placeholder="Description"
                            rows={2}
                            className="w-full text-xs bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-blue-500 resize-none"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => saveEdit(item.id)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 text-xs transition-colors">
                              <Check className="w-3 h-3" /> Save
                            </button>
                            <button onClick={() => setEditingId(null)} className="px-2 py-1 rounded-lg bg-slate-700 text-slate-400 hover:text-white text-xs transition-colors">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${mediaTypeBadge(item.media_type)}`}>
                              {mediaTypeIcon(item.media_type)} {item.media_type}
                            </span>
                            <span className="text-xs text-slate-400 font-medium truncate">{item.title || 'Untitled'}</span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-slate-500 truncate">{item.description}</p>
                          )}
                          <p className="text-[10px] text-slate-600 mt-1 truncate">
                            {new Date(item.uploaded_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    {editingId !== item.id && (
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <button onClick={() => startEdit(item)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-blue-400 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>

      {/* Preview modal */}
      <AnimatePresence>
        {previewItem && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setPreviewItem(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="max-w-3xl w-full max-h-[80vh] overflow-hidden rounded-2xl bg-slate-900 border border-slate-700"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <span className="text-sm font-medium text-white">{previewItem.title || 'Preview'}</span>
                <button onClick={() => setPreviewItem(null)} className="p-1 rounded text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4">
                {previewItem.media_type === 'video' ? (
                  <video
                    src={previewItem.media_url}
                    controls
                    className="w-full rounded-xl"
                    controlsList="nodownload"
                    onContextMenu={e => e.preventDefault()}
                  />
                ) : (
                  <img
                    src={previewItem.media_url}
                    alt={previewItem.title}
                    className="w-full rounded-xl object-contain max-h-[60vh]"
                    onContextMenu={e => e.preventDefault()}
                    draggable={false}
                  />
                )}
                {previewItem.description && (
                  <p className="text-sm text-slate-400 mt-3">{previewItem.description}</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
