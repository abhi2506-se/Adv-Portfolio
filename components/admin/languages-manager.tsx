'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Plus, Trash2, Edit2, Upload, X, CheckCircle2,
  Clock, Globe2, BookOpen, Award, Zap, Save, AlertCircle
} from 'lucide-react'

interface LanguageProfile {
  id: string
  name: string
  code: string
  proficiency: 'native' | 'fluent' | 'intermediate' | 'beginner'
  status: 'known' | 'learning'
  learningSince?: string
  flag: string
}

interface LearningUpdate {
  id: string
  language: string
  date: string
  content: string
  category: string
}

interface Exam {
  id: string
  language: string
  level: string
  status: 'cleared' | 'pending'
  score?: number
  totalScore?: number
  clearedDate?: string
  certificate?: string
}

type Tab = 'languages' | 'updates' | 'exams'

// ─── Shared input style ───────────────────────────────────────────────────────
const inputCls = 'w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60 focus:bg-slate-800 transition-all'
const selectCls = inputCls
const labelCls = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  )
}

// ─── Language Form ────────────────────────────────────────────────────────────
function LanguageForm({ onSubmit, onClose }: { onSubmit: (d: any) => void; onClose: () => void }) {
  const [d, setD] = useState({ name: '', code: '', flag: '🌐', proficiency: 'beginner', status: 'learning', learningSince: '' })
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Language Name">
          <input className={inputCls} value={d.name} onChange={e => setD({...d, name: e.target.value})} placeholder="e.g. German" />
        </Field>
        <Field label="Code (ISO 639-1)">
          <input className={inputCls} value={d.code} onChange={e => setD({...d, code: e.target.value})} placeholder="e.g. de" />
        </Field>
      </div>
      <Field label="Flag Emoji">
        <input className={inputCls} value={d.flag} onChange={e => setD({...d, flag: e.target.value})} placeholder="e.g. 🇩🇪" />
      </Field>
      <Field label="Proficiency Level">
        <select className={selectCls} value={d.proficiency} onChange={e => setD({...d, proficiency: e.target.value})}>
          <option value="native">Native</option>
          <option value="fluent">Fluent</option>
          <option value="intermediate">Intermediate</option>
          <option value="beginner">Beginner</option>
        </select>
      </Field>
      <Field label="Status">
        <select className={selectCls} value={d.status} onChange={e => setD({...d, status: e.target.value})}>
          <option value="known">Known</option>
          <option value="learning">Currently Learning</option>
        </select>
      </Field>
      {d.status === 'learning' && (
        <Field label="Learning Since">
          <input className={inputCls} value={d.learningSince} onChange={e => setD({...d, learningSince: e.target.value})} placeholder="e.g. January 2024" />
        </Field>
      )}
      <div className="flex gap-2 pt-2">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white text-sm transition-colors">Cancel</button>
        <button
          onClick={() => { if (!d.name || !d.code) { toast.error('Name and code are required'); return }; onSubmit(d) }}
          className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
        >
          Add Language
        </button>
      </div>
    </div>
  )
}

// ─── Update Form ──────────────────────────────────────────────────────────────
function UpdateForm({ onSubmit, onClose, languages }: { onSubmit: (d: any) => void; onClose: () => void; languages: LanguageProfile[] }) {
  const [d, setD] = useState({ language: '', content: '', category: 'Vocabulary' })
  return (
    <div className="space-y-4">
      <Field label="Language">
        <select className={selectCls} value={d.language} onChange={e => setD({...d, language: e.target.value})}>
          <option value="">Select a language…</option>
          {languages.map(l => <option key={l.id} value={l.name}>{l.flag} {l.name}</option>)}
        </select>
      </Field>
      <Field label="Category">
        <select className={selectCls} value={d.category} onChange={e => setD({...d, category: e.target.value})}>
          {['Vocabulary','Grammar','Listening','Speaking','Reading','Writing','General'].map(c =>
            <option key={c} value={c}>{c}</option>
          )}
        </select>
      </Field>
      <Field label="What did you learn today?">
        <textarea
          className={`${inputCls} resize-none`}
          rows={4}
          value={d.content}
          onChange={e => setD({...d, content: e.target.value})}
          placeholder="Describe what you learned in detail…"
        />
      </Field>
      <div className="flex gap-2 pt-2">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white text-sm transition-colors">Cancel</button>
        <button
          onClick={() => { if (!d.language || !d.content) { toast.error('Language and content required'); return }; onSubmit(d) }}
          className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors"
        >
          Add Update
        </button>
      </div>
    </div>
  )
}

// ─── Exam Form ────────────────────────────────────────────────────────────────
function ExamForm({ onSubmit, onClose, languages }: { onSubmit: (d: any) => void; onClose: () => void; languages: LanguageProfile[] }) {
  const [d, setD] = useState({ language: '', level: '', status: 'pending', score: '', totalScore: '', clearedDate: '' })
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Language">
          <select className={selectCls} value={d.language} onChange={e => setD({...d, language: e.target.value})}>
            <option value="">Select…</option>
            {languages.map(l => <option key={l.id} value={l.name}>{l.flag} {l.name}</option>)}
          </select>
        </Field>
        <Field label="Level (CEFR)">
          <select className={selectCls} value={d.level} onChange={e => setD({...d, level: e.target.value})}>
            <option value="">Select…</option>
            {['A1','A2','B1','B2','C1','C2'].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Status">
        <select className={selectCls} value={d.status} onChange={e => setD({...d, status: e.target.value})}>
          <option value="pending">Pending / Upcoming</option>
          <option value="cleared">Cleared ✓</option>
        </select>
      </Field>
      {d.status === 'cleared' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Your Score">
              <input type="number" className={inputCls} value={d.score} onChange={e => setD({...d, score: e.target.value})} placeholder="72" />
            </Field>
            <Field label="Total Score">
              <input type="number" className={inputCls} value={d.totalScore} onChange={e => setD({...d, totalScore: e.target.value})} placeholder="100" />
            </Field>
          </div>
          <Field label="Date Cleared">
            <input type="date" className={inputCls} value={d.clearedDate} onChange={e => setD({...d, clearedDate: e.target.value})} />
          </Field>
        </>
      )}
      <div className="flex gap-2 pt-2">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white text-sm transition-colors">Cancel</button>
        <button
          onClick={() => { if (!d.language || !d.level) { toast.error('Language and level required'); return }; onSubmit(d) }}
          className="flex-1 py-2.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-semibold transition-colors"
        >
          Add Exam
        </button>
      </div>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/40">
          <h3 className="font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export function LanguagesManager() {
  const [tab, setTab] = useState<Tab>('languages')
  const [languages, setLanguages] = useState<LanguageProfile[]>([])
  const [updates, setUpdates] = useState<LearningUpdate[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ type: 'lang' | 'update' | 'exam' } | null>(null)
  const [certUploading, setCertUploading] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingCertExamId, setPendingCertExamId] = useState<string | null>(null)

  const fetchAll = async () => {
    try {
      setLoading(true)
      const [l, u, e] = await Promise.all([
        fetch('/api/languages/profile').then(r => r.ok ? r.json() : []),
        fetch('/api/languages/updates').then(r => r.ok ? r.json() : []),
        fetch('/api/languages/exams').then(r => r.ok ? r.json() : []),
      ])
      setLanguages(l)
      setUpdates(u)
      setExams(e)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const addLanguage = async (data: any) => {
    try {
      const res = await fetch('/api/languages/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin' },
        body: JSON.stringify(data)
      })
      if (res.ok) { toast.success('Language added'); setModal(null); fetchAll() }
      else toast.error('Failed to add language')
    } catch { toast.error('Error') }
  }

  const addUpdate = async (data: any) => {
    try {
      const res = await fetch('/api/languages/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin' },
        body: JSON.stringify(data)
      })
      if (res.ok) { toast.success('Update added'); setModal(null); fetchAll() }
      else toast.error('Failed to add update')
    } catch { toast.error('Error') }
  }

  const addExam = async (data: any) => {
    try {
      const res = await fetch('/api/languages/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin' },
        body: JSON.stringify(data)
      })
      if (res.ok) { toast.success('Exam added'); setModal(null); fetchAll() }
      else toast.error('Failed to add exam')
    } catch { toast.error('Error') }
  }

  const handleUploadCertificate = async (examId: string, file: File) => {
    try {
      setCertUploading(examId)
      const form = new FormData()
      form.append('file', file)
      const up = await fetch('/api/blob-upload', { method: 'POST', body: form })
      if (!up.ok) throw new Error('Upload failed')
      const { url } = await up.json()
      const res = await fetch('/api/languages/exams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin' },
        body: JSON.stringify({ examId, certificate: url })
      })
      if (res.ok) { toast.success('Certificate uploaded'); fetchAll() }
      else toast.error('Failed to save certificate URL')
    } catch { toast.error('Upload error') }
    finally { setCertUploading(null) }
  }

  const TABS = [
    { id: 'languages' as Tab, label: 'Languages', icon: Globe2, count: languages.length },
    { id: 'updates' as Tab, label: 'Daily Updates', icon: Zap, count: updates.length },
    { id: 'exams' as Tab, label: 'Exams & Certs', icon: Award, count: exams.length },
  ]

  return (
    <div className="space-y-6">

      {/* Hidden file input for certificate upload */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file && pendingCertExamId) {
            handleUploadCertificate(pendingCertExamId, file)
            setPendingCertExamId(null)
          }
          e.target.value = ''
        }}
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/40 rounded-xl p-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
            }`}
          >
            <t.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.label}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${
              tab === t.id ? 'bg-blue-600/30 text-blue-300' : 'bg-slate-700/60 text-slate-500'
            }`}>{t.count}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
        </div>
      )}

      {/* ── Languages Tab ── */}
      {!loading && tab === 'languages' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">{languages.length} language{languages.length !== 1 ? 's' : ''} configured</p>
            <button
              onClick={() => setModal({ type: 'lang' })}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Language
            </button>
          </div>
          <div className="space-y-2">
            {languages.map(lang => (
              <div key={lang.id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 hover:border-slate-600/60 transition-colors">
                <span className="text-2xl">{lang.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white">{lang.name}</div>
                  <div className="text-xs text-slate-500">{lang.code} · {lang.proficiency} · {lang.status}</div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                  lang.status === 'learning'
                    ? 'bg-green-500/15 border-green-500/30 text-green-400'
                    : 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                }`}>{lang.status}</span>
                <button className="text-slate-600 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {languages.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Globe2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No languages added yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Updates Tab ── */}
      {!loading && tab === 'updates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">{updates.length} learning entr{updates.length !== 1 ? 'ies' : 'y'}</p>
            <button
              onClick={() => setModal({ type: 'update' })}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Today's Update
            </button>
          </div>
          <div className="space-y-2">
            {updates.map(u => {
              const isToday = u.date === new Date().toISOString().split('T')[0]
              return (
                <div key={u.id} className={`p-4 rounded-xl border transition-colors ${
                  isToday
                    ? 'bg-cyan-950/30 border-cyan-500/30'
                    : 'bg-slate-800/40 border-slate-700/40'
                }`}>
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-sm">{u.language}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-400">{u.category}</span>
                      {isToday && <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">Today</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 font-mono">{u.date}</span>
                      <button className="text-slate-600 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{u.content}</p>
                </div>
              )
            })}
            {updates.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No updates yet. Add your first learning update!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Exams Tab ── */}
      {!loading && tab === 'exams' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">{exams.filter(e => e.status === 'cleared').length}/{exams.length} exams cleared</p>
            <button
              onClick={() => setModal({ type: 'exam' })}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Exam
            </button>
          </div>
          <div className="space-y-3">
            {exams.map(exam => (
              <div key={exam.id} className={`p-4 rounded-xl border transition-colors ${
                exam.status === 'cleared'
                  ? 'bg-green-950/20 border-green-500/25'
                  : 'bg-yellow-950/10 border-yellow-500/20'
              }`}>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-semibold text-white">{exam.language}</div>
                      <div className="text-xs text-slate-400">Level: {exam.level}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-semibold ${
                      exam.status === 'cleared'
                        ? 'bg-green-500/15 border-green-500/30 text-green-400'
                        : 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
                    }`}>
                      {exam.status === 'cleared'
                        ? <><CheckCircle2 className="w-3 h-3" /> Cleared</>
                        : <><Clock className="w-3 h-3" /> Pending</>
                      }
                    </span>
                    {exam.status === 'cleared' && (
                      <button
                        onClick={() => { setPendingCertExamId(exam.id); fileRef.current?.click() }}
                        disabled={certUploading === exam.id}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50"
                      >
                        {certUploading === exam.id
                          ? <><div className="w-3 h-3 rounded-full border-t-2 border-blue-400 animate-spin" /> Uploading…</>
                          : <><Upload className="w-3 h-3" /> {exam.certificate ? 'Replace Cert' : 'Upload Cert'}</>
                        }
                      </button>
                    )}
                    <button className="text-slate-600 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {exam.score !== undefined && exam.totalScore && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Score</span>
                      <span className="text-white font-mono">{exam.score}/{exam.totalScore}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                        style={{ width: `${Math.round((exam.score / exam.totalScore) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                {exam.clearedDate && (
                  <p className="text-xs text-slate-500 mt-1">Cleared on {exam.clearedDate}</p>
                )}
                {exam.certificate && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-green-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Certificate uploaded
                    <a href={exam.certificate} target="_blank" rel="noopener noreferrer" className="underline hover:text-green-300">View</a>
                  </div>
                )}
              </div>
            ))}
            {exams.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Award className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No exams added yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {modal?.type === 'lang' && (
          <Modal key="lang" open title="Add New Language" onClose={() => setModal(null)}>
            <LanguageForm onSubmit={addLanguage} onClose={() => setModal(null)} />
          </Modal>
        )}
        {modal?.type === 'update' && (
          <Modal key="update" open title="Add Learning Update" onClose={() => setModal(null)}>
            <UpdateForm onSubmit={addUpdate} onClose={() => setModal(null)} languages={languages} />
          </Modal>
        )}
        {modal?.type === 'exam' && (
          <Modal key="exam" open title="Add Exam Record" onClose={() => setModal(null)}>
            <ExamForm onSubmit={addExam} onClose={() => setModal(null)} languages={languages} />
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}
