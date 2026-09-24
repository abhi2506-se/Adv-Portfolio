'use client'
/**
 * MeetingsAdminSectionV2 — admin UI for the "Schedule Meeting / Interview"
 * system. Three tabs:
 *   - Requests:     approve/reject/reschedule incoming bookings
 *   - Availability: set weekly availability windows + global buffer/notice
 *                   (the spec's primary admin surface — bookable slots are
 *                   generated dynamically from this, nothing pre-created)
 *   - Manual Slots: legacy/override tool to hand-create or block individual
 *                   slot rows outside the normal windows-based flow
 * Renders inside the existing admin dashboard's "Meetings & Interviews"
 * sidebar section (app/admin/dashboard/page.tsx).
 */
import React from 'react'
import {
  Calendar, Clock, RefreshCw, CheckCircle2, XCircle, RotateCcw, Trash2,
  Plus, AlertTriangle, Mail, Phone, Building2, Briefcase, X, Loader2,
} from 'lucide-react'

/* ── Shared mini "SectionCard" wrapper (kept local — the dashboard's own
   SectionCard isn't exported from page.tsx) ───────────────────────────── */
function Card({ title, icon: Icon, children, right }: {
  title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; right?: React.ReactNode
}) {
  return (
    <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700/40 bg-slate-800/30">
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500"><Icon className="w-4 h-4 text-white" /></div>
        <h2 className="font-semibold text-white flex-1">{title}</h2>
        {right}
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

const STATUS_STYLE: Record<string, string> = {
  pending:     'bg-amber-500/10 text-amber-400 border-amber-500/30',
  approved:    'bg-green-500/10 text-green-400 border-green-500/30',
  rejected:    'bg-red-500/10 text-red-400 border-red-500/30',
  rescheduled: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  cancelled:   'bg-slate-500/10 text-slate-400 border-slate-500/30',
}
const PLATFORM_LABEL: Record<string, string> = { google_meet: '🟢 Google Meet', zoom: '🔵 Zoom', teams: '🟣 MS Teams' }
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function fmtDateTime(date: string, time: string): string {
  try {
    const d = new Date(`${date}T${time}:00`)
    return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch { return `${date} ${time}` }
}

export function MeetingsAdminSectionV2({ addToast }: { addToast: (m: string, t?: 'success' | 'error') => void }) {
  const [tab, setTab] = React.useState<'requests' | 'availability' | 'slots'>('requests')
  return (
    <Card title="Meetings & Interviews" icon={Calendar} right={
      <div className="flex gap-1.5">
        {(['requests', 'availability', 'slots'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
            {t === 'requests' ? 'Requests' : t === 'availability' ? 'Availability' : 'Manual Slots'}
          </button>
        ))}
      </div>
    }>
      {tab === 'requests' ? <RequestsTab addToast={addToast} /> : tab === 'availability' ? <AvailabilityTab addToast={addToast} /> : <SlotsTab addToast={addToast} />}
    </Card>
  )
}

/* ════════════════════════════════════════════════════════════════════════
   REQUESTS TAB
   ════════════════════════════════════════════════════════════════════════ */
function RequestsTab({ addToast }: { addToast: (m: string, t?: 'success' | 'error') => void }) {
  const [requests, setRequests] = React.useState<any[]>([])
  const [stats, setStats] = React.useState<Record<string, number>>({})
  const [filter, setFilter] = React.useState<'all' | 'pending' | 'approved' | 'rejected' | 'rescheduled'>('pending')
  const [loading, setLoading] = React.useState(true)

  const [approveModal, setApproveModal] = React.useState<any | null>(null)
  const [rejectModal, setRejectModal] = React.useState<any | null>(null)
  const [rescheduleModal, setRescheduleModal] = React.useState<any | null>(null)
  const [manualLink, setManualLink] = React.useState('')
  const [adminNotes, setAdminNotes] = React.useState('')
  const [rejectReason, setRejectReason] = React.useState('')
  const [openSlots, setOpenSlots] = React.useState<any[]>([])
  const [newSlotId, setNewSlotId] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  // FIX: All fetch calls include credentials:'include' so the admin session
  // cookie is sent in PWA mode (installed app) where the browser doesn't
  // automatically attach cookies to same-origin requests by default.
  // cache:'no-store' prevents the service worker or browser from returning
  // stale data — critical for an admin dashboard that must show live state.
  const apiFetch = React.useCallback(
    (url: string, init?: RequestInit) =>
      fetch(url, { credentials: 'include', cache: 'no-store', ...init }),
    []
  )

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const url = filter === 'all' ? '/api/meetings' : `/api/meetings?status=${filter}`
      const r = await apiFetch(url)
      if (!r.ok) throw new Error()
      const d = await r.json()
      setRequests(d.requests || [])
      setStats(d.stats || {})
    } catch { addToast('Failed to load meeting requests', 'error') }
    finally { setLoading(false) }
  }, [filter, addToast, apiFetch])

  React.useEffect(() => { load() }, [load])
  React.useEffect(() => { const iv = setInterval(load, 15_000); return () => clearInterval(iv) }, [load])

  const openReschedule = async (req: any) => {
    setRescheduleModal(req); setNewSlotId('')
    try {
      const r = await apiFetch('/api/admin/meeting-slots?status=open')
      const d = await r.json()
      setOpenSlots(d.slots || [])
    } catch { setOpenSlots([]) }
  }

  const doApprove = async () => {
    if (!approveModal) return
    setSubmitting(true)
    try {
      const r = await apiFetch(`/api/meetings/${approveModal.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', manual_link: manualLink.trim() || undefined, admin_notes: adminNotes.trim() || undefined }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      addToast(d.usedApi ? '✅ Approved! Meeting link auto-generated & email sent.' : '✅ Approved & email sent.', 'success')
      setApproveModal(null); setManualLink(''); setAdminNotes(''); load()
    } catch (e: any) { addToast(e.message || 'Error approving', 'error') }
    finally { setSubmitting(false) }
  }

  const doReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return
    setSubmitting(true)
    try {
      const r = await apiFetch(`/api/meetings/${rejectModal.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejection_reason: rejectReason.trim(), admin_notes: adminNotes.trim() || undefined }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      addToast('❌ Rejected & visitor notified.', 'success')
      setRejectModal(null); setRejectReason(''); setAdminNotes(''); load()
    } catch (e: any) { addToast(e.message || 'Error', 'error') }
    finally { setSubmitting(false) }
  }

  const doReschedule = async () => {
    if (!rescheduleModal || !newSlotId) return
    setSubmitting(true)
    try {
      const r = await apiFetch(`/api/meetings/${rescheduleModal.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reschedule', new_slot_id: newSlotId, admin_notes: adminNotes.trim() || undefined }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      addToast('🔄 Rescheduled & visitor notified.', 'success')
      setRescheduleModal(null); setAdminNotes(''); load()
    } catch (e: any) { addToast(e.message || 'Error', 'error') }
    finally { setSubmitting(false) }
  }

  const doDelete = async (id: string) => {
    if (!confirm('Delete this request? This frees its slot.')) return
    await apiFetch(`/api/meetings/${id}`, { method: 'DELETE' })
    addToast('Deleted', 'success'); load()
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Pending', v: stats.pending ?? 0, cls: 'border-amber-500/30 text-amber-400' },
          { label: 'Approved', v: stats.approved ?? 0, cls: 'border-green-500/30 text-green-400' },
          { label: 'Rejected', v: stats.rejected ?? 0, cls: 'border-red-500/30 text-red-400' },
          { label: 'Rescheduled', v: stats.rescheduled ?? 0, cls: 'border-purple-500/30 text-purple-400' },
          { label: 'Total', v: Object.values(stats).reduce((a, b) => a + b, 0), cls: 'border-slate-700 text-slate-300' },
        ].map(s => (
          <div key={s.label} className={`border rounded-xl p-3 text-center ${s.cls}`}>
            <div className="text-2xl font-bold">{s.v}</div>
            <div className="text-xs font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['pending', 'approved', 'rejected', 'rescheduled', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
            {f}
          </button>
        ))}
        <button onClick={load} className="ml-auto px-3 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
      ) : requests.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-10">No {filter !== 'all' ? filter : ''} requests.</p>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className="border border-slate-700/50 rounded-xl p-4 bg-slate-800/30">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white text-sm">{req.full_name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase ${STATUS_STYLE[req.status] ?? ''}`}>{req.status}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300">{req.type === 'recruiter' ? '💼 Recruiter' : '🎯 Freelance'}</span>
                    {req.email_error && (
                      <span title={req.email_error} className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 cursor-help">✉️ email failed</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{req.email}</span>
                    {req.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{req.phone}</span>}
                    {req.company_name && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{req.company_name}</span>}
                    {req.job_role && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{req.job_role}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDateTime(req.slot_date, req.slot_time)}</span>
                    <span>{PLATFORM_LABEL[req.platform] ?? req.platform}</span>
                  </div>
                  {req.details && <p className="text-xs text-slate-500 max-w-xl">{req.details}</p>}
                  {req.meeting_link && (
                    <a href={req.meeting_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">{req.meeting_link}</a>
                  )}
                  {req.rejection_reason && <p className="text-xs text-red-400">Reason: {req.rejection_reason}</p>}
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {req.status === 'pending' && (
                    <>
                      <button onClick={() => { setApproveModal(req); setManualLink(''); setAdminNotes('') }}
                        className="p-2 rounded-lg bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/30 transition-colors" title="Approve">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setRejectModal(req); setRejectReason(''); setAdminNotes('') }}
                        className="p-2 rounded-lg bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 transition-colors" title="Reject">
                        <XCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => openReschedule(req)}
                        className="p-2 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-400 hover:bg-purple-600/30 transition-colors" title="Reschedule">
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button onClick={() => doDelete(req.id)} className="p-2 rounded-lg bg-slate-700/40 border border-slate-600/40 text-slate-400 hover:text-red-400 transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve modal */}
      {approveModal && (
        <Modal onClose={() => setApproveModal(null)} title="Approve Request">
          <p className="text-sm text-slate-400 mb-3">Approving <strong className="text-white">{approveModal.full_name}</strong> for {fmtDateTime(approveModal.slot_date, approveModal.slot_time)}.</p>
          <label className="block text-xs text-slate-400 mb-1">Manual meeting link (optional — leave blank to auto-generate)</label>
          <input value={manualLink} onChange={e => setManualLink(e.target.value)} placeholder="https://..."
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white mb-3" />
          <label className="block text-xs text-slate-400 mb-1">Admin notes (optional, internal only)</label>
          <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={2}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white mb-4" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setApproveModal(null)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white">Cancel</button>
            <button onClick={doApprove} disabled={submitting} className="px-4 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium flex items-center gap-2">
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Approve & Notify
            </button>
          </div>
        </Modal>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <Modal onClose={() => setRejectModal(null)} title="Reject Request">
          <p className="text-sm text-slate-400 mb-3">Rejecting <strong className="text-white">{rejectModal.full_name}</strong>.</p>
          <label className="block text-xs text-slate-400 mb-1">Reason (required — sent to the requester)</label>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white mb-4" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setRejectModal(null)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white">Cancel</button>
            <button onClick={doReject} disabled={submitting || !rejectReason.trim()} className="px-4 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium flex items-center gap-2">
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Reject & Notify
            </button>
          </div>
        </Modal>
      )}

      {/* Reschedule modal */}
      {rescheduleModal && (
        <Modal onClose={() => setRescheduleModal(null)} title="Reschedule Request">
          <p className="text-sm text-slate-400 mb-3">Pick a new open slot for <strong className="text-white">{rescheduleModal.full_name}</strong>.</p>
          {openSlots.length === 0 ? (
            <p className="text-xs text-amber-400 flex items-center gap-1.5 mb-4"><AlertTriangle className="w-3.5 h-3.5" /> No open slots available — add one in the Manage Slots tab first.</p>
          ) : (
            <select value={newSlotId} onChange={e => setNewSlotId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white mb-4">
              <option value="">Select a slot…</option>
              {openSlots.map((s: any) => (
                <option key={s.id} value={s.id}>{fmtDateTime(s.slot_date, s.start_time)} ({s.platforms})</option>
              ))}
            </select>
          )}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setRescheduleModal(null)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white">Cancel</button>
            <button onClick={doReschedule} disabled={submitting || !newSlotId} className="px-4 py-2 rounded-lg text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium flex items-center gap-2">
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Reschedule & Notify
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════
   AVAILABILITY TAB — windows-based engine (the spec's primary admin UI)
   ════════════════════════════════════════════════════════════════════════ */
const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function emptyWindowsByDay(): Record<number, { id?: string; start_time: string; end_time: string; is_active: boolean }[]> {
  return { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
}

function AvailabilityTab({ addToast }: { addToast: (m: string, t?: 'success' | 'error') => void }) {
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [byDay, setByDay] = React.useState(emptyWindowsByDay())
  const [bufferMinutes, setBufferMinutes] = React.useState(10)
  const [minNoticeMinutes, setMinNoticeMinutes] = React.useState(60)
  const [timezone, setTimezone] = React.useState('Asia/Kolkata')

  const apiFetch = React.useCallback(
    (url: string, init?: RequestInit) => fetch(url, { credentials: 'include', cache: 'no-store', ...init }),
    []
  )

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const r = await apiFetch('/api/admin/availability')
      const d = await r.json()
      const grouped = emptyWindowsByDay()
      for (const w of d.windows || []) {
        grouped[w.day_of_week] = grouped[w.day_of_week] || []
        grouped[w.day_of_week].push({ id: w.id, start_time: w.start_time, end_time: w.end_time, is_active: w.is_active })
      }
      setByDay(grouped)
      setBufferMinutes(d.settings?.buffer_minutes ?? 10)
      setMinNoticeMinutes(d.settings?.min_notice_minutes ?? 60)
      setTimezone(d.settings?.timezone ?? 'Asia/Kolkata')
    } catch { addToast('Failed to load availability', 'error') }
    finally { setLoading(false) }
  }, [addToast, apiFetch])

  React.useEffect(() => { load() }, [load])

  const addWindow = (day: number) => {
    setByDay(prev => ({
      ...prev,
      [day]: [...prev[day], { start_time: '09:00', end_time: '17:00', is_active: true }],
    }))
  }

  const updateWindow = (day: number, idx: number, patch: Partial<{ start_time: string; end_time: string; is_active: boolean }>) => {
    setByDay(prev => ({
      ...prev,
      [day]: prev[day].map((w, i) => (i === idx ? { ...w, ...patch } : w)),
    }))
  }

  const removeWindow = (day: number, idx: number) => {
    setByDay(prev => ({ ...prev, [day]: prev[day].filter((_, i) => i !== idx) }))
  }

  const copyToAllWeekdays = (day: number) => {
    setByDay(prev => {
      const source = prev[day]
      const next = { ...prev }
      for (const d of [1, 2, 3, 4, 5]) {
        if (d !== day) next[d] = source.map(w => ({ ...w }))
      }
      return next
    })
    addToast('Copied to Mon–Fri', 'success')
  }

  const save = async () => {
    // Basic client-side sanity check before hitting the API.
    for (const [day, windows] of Object.entries(byDay)) {
      for (const w of windows) {
        if (w.end_time <= w.start_time) {
          addToast(`${DOW_LABELS[Number(day)]}: window end must be after start`, 'error')
          return
        }
      }
    }
    setSaving(true)
    try {
      const windows = Object.entries(byDay).flatMap(([day, list]) =>
        list.map(w => ({ day_of_week: Number(day), start_time: w.start_time, end_time: w.end_time, is_active: w.is_active }))
      )
      const r = await apiFetch('/api/admin/availability', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ windows, settings: { buffer_minutes: bufferMinutes, min_notice_minutes: minNoticeMinutes, timezone } }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Save failed')
      addToast('✅ Availability saved — live immediately', 'success')
      load()
    } catch (e: any) { addToast(e.message || 'Failed to save availability', 'error') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-blue-400" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        Set the hours you're open to meetings on each day. Bookable time slots are generated automatically from these windows, the visitor's chosen duration, and the buffer below — nothing to pre-create.
      </div>

      {/* Global settings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Buffer after each meeting</label>
          <select value={bufferMinutes} onChange={e => setBufferMinutes(Number(e.target.value))}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white">
            {[0, 5, 10, 15, 20, 30].map(n => <option key={n} value={n}>{n === 0 ? 'No buffer' : `${n} min`}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Minimum notice</label>
          <select value={minNoticeMinutes} onChange={e => setMinNoticeMinutes(Number(e.target.value))}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white">
            {[0, 30, 60, 120, 240, 1440].map(n => <option key={n} value={n}>{n === 0 ? 'None' : n < 60 ? `${n} min` : n === 1440 ? '1 day' : `${n / 60} hr`}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Scheduling timezone</label>
          <select value={timezone} onChange={e => setTimezone(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white">
            {['Asia/Kolkata','America/New_York','America/Los_Angeles','Europe/London','UTC'].map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>
      </div>

      {/* Per-day windows */}
      <div className="space-y-3">
        {[0, 1, 2, 3, 4, 5, 6].map(day => {
          const windows = byDay[day] || []
          return (
            <div key={day} className="border border-slate-700/50 rounded-xl p-4 bg-slate-800/30">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-white w-20">{DOW_LABELS[day]}</h4>
                <div className="flex gap-2">
                  {windows.length > 0 && (
                    <button onClick={() => copyToAllWeekdays(day)} className="text-[10px] px-2 py-1 rounded bg-slate-700/50 text-slate-300 hover:text-white">
                      Copy to Mon–Fri
                    </button>
                  )}
                  <button onClick={() => addWindow(day)} className="text-[10px] px-2 py-1 rounded bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add window
                  </button>
                </div>
              </div>
              {windows.length === 0 ? (
                <p className="text-xs text-slate-500">Not available — no windows set for this day.</p>
              ) : (
                <div className="space-y-2">
                  {windows.map((w, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input type="time" step={300} value={w.start_time}
                        onChange={e => updateWindow(day, idx, { start_time: e.target.value })}
                        className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white w-28" />
                      <span className="text-slate-500 text-xs">to</span>
                      <input type="time" step={300} value={w.end_time}
                        onChange={e => updateWindow(day, idx, { end_time: e.target.value })}
                        className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white w-28" />
                      <button onClick={() => updateWindow(day, idx, { is_active: !w.is_active })}
                        className={`text-[10px] px-2 py-1 rounded border ${w.is_active ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-slate-700/50 border-slate-600 text-slate-400'}`}>
                        {w.is_active ? 'Active' : 'Paused'}
                      </button>
                      <button onClick={() => removeWindow(day, idx)} className="ml-auto p-1 rounded text-slate-500 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-slate-500">
        Example: Mon window <strong className="text-slate-300">08:00–10:00</strong>, buffer <strong className="text-slate-300">10 min</strong> — a visitor picking a 45-min meeting sees <strong className="text-slate-300">08:00–08:45</strong> then <strong className="text-slate-300">08:55–09:40</strong> as the bookable times for that day. Add as many windows per day as you like (e.g. a second window <strong className="text-slate-300">13:00–14:00</strong>, a third <strong className="text-slate-300">20:00–23:00</strong>).
      </p>

      <button onClick={save} disabled={saving} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Availability
      </button>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════
   SLOTS TAB
   ════════════════════════════════════════════════════════════════════════ */
function SlotsTab({ addToast }: { addToast: (m: string, t?: 'success' | 'error') => void }) {
  const [slots, setSlots] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showBulk, setShowBulk] = React.useState(false)

  const todayKey = new Date().toISOString().split('T')[0]
  // Duration is now a fixed 15/30/45/60-min dropdown (same as bulk-generate)
  // instead of a freeform end-time field — that freeform field was the
  // actual source of the messy, inconsistent slot grid (8:00, 8:25, 8:40,
  // 8:55…): admins could type literally any end time. Picking a clean
  // duration and deriving end_time from it keeps every slot on a 15-minute
  // boundary.
  const [single, setSingle] = React.useState({ slot_date: todayKey, start_time: '10:00', length_min: 30, platforms: ['google_meet', 'zoom', 'teams'] })

  const addMinutesClient = (hhmm: string, minutes: number): string => {
    const [h, m] = hhmm.split(':').map(Number)
    const total = h * 60 + m + minutes
    const hh = Math.floor(total / 60) % 24
    const mm = total % 60
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }

  const inFourWeeks = (() => { const d = new Date(); d.setDate(d.getDate() + 28); return d.toISOString().split('T')[0] })()
  const [bulk, setBulk] = React.useState({
    from: todayKey, to: inFourWeeks, weekdays: [1, 2, 3, 4, 5], start_time: '10:00', end_time: '18:00',
    slot_length_min: 30, buffer_min: 10, platforms: ['google_meet', 'zoom', 'teams'],
  })
  const [submitting, setSubmitting] = React.useState(false)

  // FIX: Use credentials:'include' + cache:'no-store' so PWA mode works.
  const slotApiFetch = React.useCallback(
    (url: string, init?: RequestInit) =>
      fetch(url, { credentials: 'include', cache: 'no-store', ...init }),
    []
  )

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const r = await slotApiFetch(`/api/admin/meeting-slots?from=${todayKey}`)
      const d = await r.json()
      setSlots(d.slots || [])
    } catch { addToast('Failed to load slots', 'error') }
    finally { setLoading(false) }
  }, [addToast, todayKey, slotApiFetch])

  React.useEffect(() => { load() }, [load])

  const togglePlatform = (list: string[], p: string) =>
    list.includes(p) ? list.filter(x => x !== p) : [...list, p]

  const addSingle = async () => {
    setSubmitting(true)
    try {
      const end_time = addMinutesClient(single.start_time, single.length_min)
      const r = await slotApiFetch('/api/admin/meeting-slots', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_date: single.slot_date, start_time: single.start_time, end_time, platforms: single.platforms.join(',') }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      addToast('Slot added', 'success'); load()
    } catch (e: any) { addToast(e.message || 'Failed to add slot', 'error') }
    finally { setSubmitting(false) }
  }

  const runBulk = async () => {
    if (bulk.weekdays.length === 0) { addToast('Select at least one weekday', 'error'); return }
    setSubmitting(true)
    try {
      const r = await slotApiFetch('/api/admin/meeting-slots', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulk: true, ...bulk, platforms: bulk.platforms.join(',') }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      addToast(`✅ Created ${d.created} new slot(s) (${d.attempted - d.created} already existed)`, 'success')
      setShowBulk(false); load()
    } catch (e: any) { addToast(e.message || 'Bulk creation failed', 'error') }
    finally { setSubmitting(false) }
  }

  const toggleBlock = async (slot: any) => {
    const next = slot.status === 'open' ? 'blocked' : 'open'
    try {
      const r = await slotApiFetch(`/api/admin/meeting-slots/${slot.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
      load()
    } catch (e: any) { addToast(e.message || 'Failed to update slot', 'error') }
  }

  const deleteSlot = async (slot: any) => {
    if (!confirm('Delete this slot?')) return
    try {
      const r = await slotApiFetch(`/api/admin/meeting-slots/${slot.id}`, { method: 'DELETE' })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
      load()
    } catch (e: any) { addToast(e.message || 'Failed to delete slot', 'error') }
  }

  const groupedByDate = React.useMemo(() => {
    const map: Record<string, any[]> = {}
    for (const s of slots) { (map[s.slot_date] ||= []).push(s) }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [slots])

  return (
    <div className="space-y-6">
      {/* Quick add single slot */}
      <div className="border border-slate-700/50 rounded-xl p-4 bg-slate-800/30">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add a single slot</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <input type="date" value={single.slot_date} onChange={e => setSingle(s => ({ ...s, slot_date: e.target.value }))}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white" />
          <input type="time" step={900} value={single.start_time} onChange={e => setSingle(s => ({ ...s, start_time: e.target.value }))}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white" />
          <select value={single.length_min} onChange={e => setSingle(s => ({ ...s, length_min: Number(e.target.value) }))}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white">
            {[15, 30, 45, 60].map(n => <option key={n} value={n}>{n} min</option>)}
          </select>
          <button onClick={addSingle} disabled={submitting} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">Add Slot</button>
        </div>
        <div className="flex gap-2">
          {(['google_meet', 'zoom', 'teams'] as const).map(p => (
            <button key={p} onClick={() => setSingle(s => ({ ...s, platforms: togglePlatform(s.platforms, p) }))}
              className={`px-2.5 py-1 rounded-lg text-xs border ${single.platforms.includes(p) ? 'bg-blue-600/20 border-blue-500/40 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
              {PLATFORM_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk generate */}
      <div className="border border-slate-700/50 rounded-xl p-4 bg-slate-800/30">
        <button onClick={() => setShowBulk(v => !v)} className="text-sm font-semibold text-white flex items-center gap-1.5 w-full">
          <RefreshCw className="w-4 h-4" /> Bulk-generate recurring slots {showBulk ? '▲' : '▼'}
        </button>
        {showBulk && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">From</label>
                <input type="date" value={bulk.from} onChange={e => setBulk(b => ({ ...b, from: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">To</label>
                <input type="date" value={bulk.to} onChange={e => setBulk(b => ({ ...b, to: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Days of the week</label>
              <div className="flex gap-1.5 mb-2">
                {WEEKDAYS.map((d, i) => (
                  <button key={i} onClick={() => setBulk(b => ({ ...b, weekdays: b.weekdays.includes(i) ? b.weekdays.filter(x => x !== i) : [...b.weekdays, i] }))}
                    className={`w-9 h-9 rounded-lg text-xs font-medium border ${bulk.weekdays.includes(i) ? 'bg-blue-600/20 border-blue-500/40 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                    {d}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => setBulk(b => ({ ...b, weekdays: [0, 1, 2, 3, 4, 5, 6] }))}
                  className="px-2 py-1 rounded-md text-[10px] font-medium bg-slate-800 border border-slate-700 text-slate-400 hover:text-white">All days</button>
                <button onClick={() => setBulk(b => ({ ...b, weekdays: [1, 2, 3, 4, 5] }))}
                  className="px-2 py-1 rounded-md text-[10px] font-medium bg-slate-800 border border-slate-700 text-slate-400 hover:text-white">Weekdays (Mon–Fri)</button>
                <button onClick={() => setBulk(b => ({ ...b, weekdays: [0, 6] }))}
                  className="px-2 py-1 rounded-md text-[10px] font-medium bg-slate-800 border border-slate-700 text-slate-400 hover:text-white">Weekends</button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Day start</label>
                <input type="time" step={900} value={bulk.start_time} onChange={e => setBulk(b => ({ ...b, start_time: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Day end</label>
                <input type="time" step={900} value={bulk.end_time} onChange={e => setBulk(b => ({ ...b, end_time: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Meeting length</label>
                <select value={bulk.slot_length_min} onChange={e => setBulk(b => ({ ...b, slot_length_min: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white">
                  {[15, 30, 45, 60].map(n => <option key={n} value={n}>{n} min</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Rest between</label>
                <select value={bulk.buffer_min} onChange={e => setBulk(b => ({ ...b, buffer_min: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white">
                  {[0, 5, 10, 15, 20, 30].map(n => <option key={n} value={n}>{n === 0 ? 'No rest' : `${n} min`}</option>)}
                </select>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Example: day start <strong className="text-slate-300">8:00 AM</strong>, meeting length <strong className="text-slate-300">30 min</strong>, rest <strong className="text-slate-300">10 min</strong> → slots at 8:00–8:30, 8:40–9:10, 9:20–9:50… Once someone books 8:00–8:30, that whole 8:00–8:40 window disappears for everyone else — no double-booking, no back-to-back meetings.
            </p>
            <div className="flex gap-2">
              {(['google_meet', 'zoom', 'teams'] as const).map(p => (
                <button key={p} onClick={() => setBulk(b => ({ ...b, platforms: togglePlatform(b.platforms, p) }))}
                  className={`px-2.5 py-1 rounded-lg text-xs border ${bulk.platforms.includes(p) ? 'bg-blue-600/20 border-blue-500/40 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                  {PLATFORM_LABEL[p]}
                </button>
              ))}
            </div>
            <button onClick={runBulk} disabled={submitting} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Generate Slots
            </button>
          </div>
        )}
      </div>

      {/* Upcoming slots list */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Upcoming slots</h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-400" /></div>
        ) : groupedByDate.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No upcoming slots — add one above.</p>
        ) : (
          <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
            {groupedByDate.map(([date, daySlots]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-slate-400 mb-2">{new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                <div className="space-y-1.5">
                  {daySlots.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-700/40">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`w-2 h-2 rounded-full ${s.status === 'open' ? 'bg-green-400' : s.status === 'booked' ? 'bg-blue-400' : 'bg-slate-500'}`} />
                        <span className="text-white font-medium">{s.start_time}–{s.end_time}</span>
                        <span className="text-slate-500">{s.platforms}</span>
                        <span className={`uppercase text-[10px] ${s.status === 'open' ? 'text-green-400' : s.status === 'booked' ? 'text-blue-400' : 'text-slate-500'}`}>{s.status}</span>
                      </div>
                      <div className="flex gap-1.5">
                        {s.status !== 'booked' && (
                          <button onClick={() => toggleBlock(s)} className="text-[10px] px-2 py-1 rounded bg-slate-700/50 text-slate-300 hover:text-white">
                            {s.status === 'open' ? 'Block' : 'Re-open'}
                          </button>
                        )}
                        {s.status !== 'booked' && (
                          <button onClick={() => deleteSlot(s)} className="p-1 rounded text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Tiny modal shell ─────────────────────────────────────────────────────── */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white text-sm">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
