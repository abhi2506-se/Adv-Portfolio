'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import {
  Flame, Trophy, Target, BookOpen, Globe2, Mic, BookMarked,
  Award, TrendingUp, Brain, Languages, Sparkles, Star, ChevronRight,
  Play, Square, Volume2, CheckCircle2, XCircle, Clock, Calendar,
  Briefcase, ArrowLeft, RotateCcw, Send, Loader2, Plus, Trash2,
  FileText, Zap, MessageCircle, Map, Check, BarChart2, X
} from 'lucide-react'
import Link from 'next/link'

/* ─── Types ───────────────────────────────────────────────────────────────── */
interface LanguageProfile {
  id: string; name: string; code: string
  proficiency: 'native'|'fluent'|'intermediate'|'beginner'
  status: 'known'|'learning'; learningSince?: string; flag: string
}
interface JournalEntry { id: string; date: string; language: string; content: string; mood: string }
interface GoalItem     { id: string; text: string; language: string; targetDate: string; done: boolean }
interface VocabWord    { word: string; translation: string; example: string; language: string; mastered: boolean }
interface QuizResult   { date: string; score: number; total: number; language: string }

/* ─── Constants ───────────────────────────────────────────────────────────── */
const TAB_LIST = [
  { id:'heatmap',     label:'Heatmap',    icon: Flame },
  { id:'achievements',label:'Achievements',icon: Trophy },
  { id:'progress',   label:'Progress',   icon: TrendingUp },
  { id:'journal',    label:'Journal',    icon: BookOpen },
  { id:'globe',      label:'Globe',      icon: Globe2 },
  { id:'speaking',   label:'Speaking',   icon: Mic },
  { id:'vocab',      label:'Vocab',      icon: BookMarked },
  { id:'certs',      label:'Certs',      icon: Award },
  { id:'streak',     label:'Streak',     icon: Zap },
  { id:'goals',      label:'Goals',      icon: Target },
  { id:'translator', label:'Translator', icon: Languages },
  { id:'quiz',       label:'Quiz',       icon: Brain },
  { id:'resources',  label:'Resources',  icon: FileText },
  { id:'mentor',     label:'AI Mentor',  icon: MessageCircle },
  { id:'recruiter',  label:'Recruiter',  icon: Briefcase },
]

const ACHIEVEMENTS_DATA = [
  { id:'first_word',   icon:'🎯', title:'First Word',      desc:'Learned your first word',               xp:50,   unlocked:true  },
  { id:'week_streak',  icon:'🔥', title:'Week Warrior',    desc:'7-day study streak',                    xp:100,  unlocked:true  },
  { id:'vocab_50',     icon:'📚', title:'Vocab Builder',   desc:'Learned 50 vocabulary words',           xp:150,  unlocked:true  },
  { id:'first_exam',   icon:'🏆', title:'Exam Cleared',    desc:'Passed your first level exam',          xp:300,  unlocked:true  },
  { id:'multilingual', icon:'🌍', title:'Polyglot',        desc:'Know 3+ languages',                     xp:500,  unlocked:true  },
  { id:'month_streak', icon:'🚀', title:'Month Master',    desc:'30-day study streak',                   xp:400,  unlocked:false },
  { id:'vocab_200',    icon:'🧠', title:'Word Wizard',     desc:'Learned 200 vocabulary words',          xp:600,  unlocked:false },
  { id:'b2_level',     icon:'⭐', title:'Advanced Learner','desc':'Reached B2 level in any language',    xp:800,  unlocked:false },
  { id:'native_speed', icon:'💬', title:'Native Speed',    desc:'Completed speaking at native speed',    xp:1000, unlocked:false },
  { id:'all_certs',    icon:'🎓', title:'Certified Polyglot','desc':'Hold certificates in 3+ languages', xp:1500, unlocked:false },
]

const VOCAB_BANK: VocabWord[] = [
  { word:'Danke',       translation:'Thank you',      example:'Danke schön!',           language:'German',  mastered:false },
  { word:'Bitte',       translation:'Please/You\'re welcome', example:'Bitte sehr!',    language:'German',  mastered:false },
  { word:'Entschuldigung', translation:'Excuse me',   example:'Entschuldigung, wo ist...?', language:'German', mastered:false },
  { word:'Guten Morgen',translation:'Good morning',   example:'Guten Morgen! Wie geht es Ihnen?', language:'German', mastered:false },
  { word:'Auf Wiedersehen', translation:'Goodbye',    example:'Auf Wiedersehen! Bis morgen.', language:'German', mastered:false },
  { word:'आप कैसे हैं', translation:'How are you',   example:'नमस्ते! आप कैसे हैं?',   language:'Hindi',   mastered:false },
  { word:'धन्यवाद',     translation:'Thank you',      example:'बहुत धन्यवाद!',          language:'Hindi',   mastered:false },
  { word:'नमस्ते',      translation:'Hello/Namaste',  example:'नमस्ते, मेरा नाम... है।', language:'Hindi',   mastered:false },
]

const QUIZ_QUESTIONS = [
  { q:'What is "Thank you" in German?',     opts:['Bitte','Danke','Hallo','Tschüss'],     ans:1, lang:'German' },
  { q:'What is "Good morning" in German?',  opts:['Gute Nacht','Guten Tag','Guten Morgen','Auf Wiedersehen'], ans:2, lang:'German' },
  { q:'नमस्ते का अर्थ क्या है?',            opts:['Goodbye','Hello','Thank you','Sorry'], ans:1, lang:'Hindi'  },
  { q:'What is "Auf Wiedersehen"?',          opts:['Hello','Please','Goodbye','Sorry'],    ans:2, lang:'German' },
  { q:'"Entschuldigung" means?',             opts:['Good evening','Sorry/Excuse me','Thank you','Welcome'], ans:1, lang:'German' },
  { q:'What is "धन्यवाद" in English?',      opts:['Hello','Please','Goodbye','Thank you'], ans:3, lang:'Hindi' },
]

const RESOURCES = [
  { title:'Duolingo',       desc:'Gamified daily lessons',            url:'https://duolingo.com',      tag:'App',      lang:'All' },
  { title:'Anki',           desc:'Spaced repetition flashcards',      url:'https://apps.ankiweb.net',  tag:'Flashcards',lang:'All' },
  { title:'Deutsche Welle', desc:'Free German courses A1-C1',         url:'https://dw.com/de/deutsch-lernen', tag:'Course', lang:'German' },
  { title:'italki',         desc:'1-on-1 tutors & language partners',  url:'https://italki.com',        tag:'Tutoring', lang:'All' },
  { title:'Goethe Institut',desc:'Official German language courses',   url:'https://goethe.de',         tag:'Official', lang:'German' },
  { title:'BBC Hindi',      desc:'Learn Hindi with BBC resources',     url:'https://bbc.com/hindi',     tag:'News',     lang:'Hindi' },
  { title:'Tandem',         desc:'Chat with native speakers',          url:'https://tandem.net',         tag:'Exchange', lang:'All' },
  { title:'Clozemaster',    desc:'Grammar in context practice',        url:'https://clozemaster.com',   tag:'Grammar',  lang:'All' },
]

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function generateHeatmapData() {
  const data: { date: string; count: number }[] = []
  const today = new Date()
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    const iso = d.toISOString().split('T')[0]
    // Simulate study sessions – real data would come from journal entries
    const seed = (d.getDate() * 13 + d.getMonth() * 7) % 17
    const count = seed < 5 ? 0 : seed < 9 ? 1 : seed < 13 ? 2 : seed < 15 ? 3 : 4
    data.push({ date: iso, count })
  }
  return data
}

function heatColor(count: number) {
  if (count === 0) return '#1e293b'
  if (count === 1) return '#1d4ed8'
  if (count === 2) return '#2563eb'
  if (count === 3) return '#3b82f6'
  return '#60a5fa'
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */

// 1. HEATMAP
function HeatmapTab() {
  const data = useMemo(() => generateHeatmapData(), [])
  const weeks: typeof data[] = []
  for (let i = 0; i < data.length; i += 7) weeks.push(data.slice(i, i + 7))
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const totalDays = data.filter(d => d.count > 0).length
  const maxStreak = 14 // computed from data in real app

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:'Days Studied', value: totalDays, color:'text-blue-400' },
          { label:'Best Streak',  value:`${maxStreak} days`, color:'text-orange-400' },
          { label:'This Month',   value: data.slice(-30).filter(d=>d.count>0).length, color:'text-green-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/60 rounded-2xl p-5 text-center border border-slate-700/40">
            <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-700/30">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Study Activity — Last 12 Months</h3>
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day, di) => (
                  <div
                    key={di}
                    title={`${day.date}: ${day.count} session${day.count!==1?'s':''}`}
                    style={{ background: heatColor(day.count) }}
                    className="w-3 h-3 rounded-sm cursor-pointer hover:ring-1 hover:ring-blue-400 transition-all"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
          <span>Less</span>
          {[0,1,2,3,4].map(n => (
            <div key={n} style={{background:heatColor(n)}} className="w-3 h-3 rounded-sm" />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-700/30">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Weekly Study Hours (Last 8 Weeks)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={[
            {week:'Wk1',hrs:3},{week:'Wk2',hrs:5},{week:'Wk3',hrs:2},{week:'Wk4',hrs:7},
            {week:'Wk5',hrs:4},{week:'Wk6',hrs:6},{week:'Wk7',hrs:8},{week:'Wk8',hrs:5},
          ]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="week" tick={{fill:'#94a3b8',fontSize:11}} />
            <YAxis tick={{fill:'#94a3b8',fontSize:11}} />
            <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',borderRadius:8}} />
            <Bar dataKey="hrs" radius={[4,4,0,0]}>
              {[0,1,2,3,4,5,6,7].map(i=><Cell key={i} fill={`hsl(${210+i*8},80%,${50+i*2}%)`}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// 2. ACHIEVEMENTS
function AchievementsTab({ xp }: { xp: number }) {
  const unlocked = ACHIEVEMENTS_DATA.filter(a=>a.unlocked)
  const locked   = ACHIEVEMENTS_DATA.filter(a=>!a.unlocked)
  const level = Math.floor(xp / 500) + 1
  const nextLevelXP = level * 500
  const pct = Math.round(((xp % 500) / 500) * 100)

  return (
    <div className="space-y-6">
      {/* XP Bar */}
      <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-2xl p-6 border border-yellow-500/20">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-2xl font-black text-yellow-400">Level {level}</div>
            <div className="text-xs text-slate-400">{xp} / {nextLevelXP} XP</div>
          </div>
          <div className="text-5xl">⭐</div>
        </div>
        <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            initial={{width:0}} animate={{width:`${pct}%`}}
            transition={{duration:1.2, ease:'easeOut'}}
            className="h-full bg-gradient-to-r from-yellow-500 to-orange-400 rounded-full"
          />
        </div>
        <div className="text-xs text-slate-400 mt-1.5 text-right">{pct}% to Level {level+1}</div>
      </div>

      {/* Unlocked */}
      <div>
        <h3 className="text-sm font-semibold text-green-400 uppercase tracking-widest mb-3">✓ Unlocked ({unlocked.length})</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {unlocked.map(a => (
            <motion.div key={a.id} whileHover={{scale:1.03}} className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 border border-green-500/20 text-center">
              <div className="text-3xl mb-2">{a.icon}</div>
              <div className="font-bold text-white text-sm">{a.title}</div>
              <div className="text-xs text-slate-400 mt-1">{a.desc}</div>
              <div className="mt-2 text-xs font-semibold text-yellow-400">+{a.xp} XP</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Locked */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">🔒 Locked ({locked.length})</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {locked.map(a => (
            <div key={a.id} className="bg-slate-800/30 rounded-2xl p-4 border border-slate-700/30 text-center opacity-50">
              <div className="text-3xl mb-2 grayscale">{a.icon}</div>
              <div className="font-bold text-slate-400 text-sm">{a.title}</div>
              <div className="text-xs text-slate-500 mt-1">{a.desc}</div>
              <div className="mt-2 text-xs font-semibold text-slate-500">+{a.xp} XP</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// 3. PROGRESS CHARTS
function ProgressTab({ languages }: { languages: LanguageProfile[] }) {
  const profMap: Record<string,number> = { native:100, fluent:85, intermediate:55, beginner:28 }
  const radarData = languages.map(l => ({
    language: l.name, Reading:profMap[l.proficiency]||30,
    Writing:Math.max(20,profMap[l.proficiency]-10),
    Speaking:Math.max(15,profMap[l.proficiency]-5),
    Listening:Math.max(25,profMap[l.proficiency]+5),
    Grammar:Math.max(20,profMap[l.proficiency]-15),
  }))
  const monthlyData = [
    {month:'Feb',German:20,Hindi:95},{month:'Mar',German:28,Hindi:95},
    {month:'Apr',German:35,Hindi:96},{month:'May',German:42,Hindi:97},
    {month:'Jun',German:50,Hindi:97},{month:'Jul',German:55,Hindi:98},
  ]
  return (
    <div className="space-y-6">
      {/* Language bars */}
      <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-700/30">
        <h3 className="text-sm font-semibold text-slate-300 mb-5">Overall Proficiency</h3>
        <div className="space-y-5">
          {languages.map(l => {
            const pct = profMap[l.proficiency] || 30
            return (
              <div key={l.id}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-white font-medium">{l.flag} {l.name}</span>
                  <span className="text-slate-400 capitalize">{l.proficiency} · {pct}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div initial={{width:0}} animate={{width:`${pct}%`}}
                    transition={{duration:1.2,ease:'easeOut'}}
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Radar chart for German */}
      {radarData.length > 0 && (
        <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-700/30">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Skill Breakdown — German</h3>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={[
              {skill:'Reading',val:55},{skill:'Writing',val:40},{skill:'Speaking',val:50},
              {skill:'Listening',val:60},{skill:'Grammar',val:45},{skill:'Vocab',val:52},
            ]}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="skill" tick={{fill:'#94a3b8',fontSize:11}} />
              <Radar dataKey="val" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Progress over time */}
      <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-700/30">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Progress Over Time (%)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={monthlyData}>
            <defs>
              <linearGradient id="gGerman" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" tick={{fill:'#94a3b8',fontSize:11}} />
            <YAxis tick={{fill:'#94a3b8',fontSize:11}} domain={[0,100]} />
            <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',borderRadius:8}} />
            <Area type="monotone" dataKey="German" stroke="#3b82f6" fill="url(#gGerman)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// 4. DAILY JOURNAL
function JournalTab() {
  const [entries, setEntries] = useState<JournalEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('lang_journal')||'[]') } catch { return [] }
  })
  const [form, setForm] = useState({ language:'German', content:'', mood:'😊' })
  const [adding, setAdding] = useState(false)
  const moods = ['😊','🤔','😤','🥳','😴','💪']

  const save = () => {
    if (!form.content.trim()) return
    const e: JournalEntry = { id:Date.now().toString(), date:new Date().toISOString().split('T')[0], ...form }
    const next = [e, ...entries]
    setEntries(next)
    localStorage.setItem('lang_journal', JSON.stringify(next))
    setForm({ language:'German', content:'', mood:'😊' })
    setAdding(false)
  }

  const del = (id:string) => {
    const next = entries.filter(e=>e.id!==id)
    setEntries(next); localStorage.setItem('lang_journal', JSON.stringify(next))
  }

  return (
    <div className="space-y-5">
      {!adding ? (
        <button onClick={()=>setAdding(true)}
          className="w-full py-3 rounded-2xl border border-dashed border-slate-600 text-slate-400 hover:border-blue-500 hover:text-blue-400 transition-colors flex items-center justify-center gap-2">
          <Plus className="w-4 h-4"/> Add Today's Entry
        </button>
      ) : (
        <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}}
          className="bg-slate-800/60 rounded-2xl p-5 border border-blue-500/30 space-y-4">
          <div className="flex gap-3">
            <select value={form.language} onChange={e=>setForm({...form,language:e.target.value})}
              className="bg-slate-700/60 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white flex-1">
              {['German','Hindi','English','Haryanvi'].map(l=><option key={l}>{l}</option>)}
            </select>
            <div className="flex gap-1">
              {moods.map(m=>(
                <button key={m} onClick={()=>setForm({...form,mood:m})}
                  className={`text-xl p-1.5 rounded-lg transition-all ${form.mood===m?'bg-blue-500/30 scale-125':''}`}>{m}</button>
              ))}
            </div>
          </div>
          <textarea value={form.content} onChange={e=>setForm({...form,content:e.target.value})}
            placeholder="What did you learn today? Write about your study session..."
            rows={4} className="w-full bg-slate-700/40 border border-slate-600 rounded-xl p-3 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500" />
          <div className="flex gap-2">
            <button onClick={()=>setAdding(false)} className="flex-1 py-2 rounded-xl border border-slate-600 text-slate-400 hover:text-white text-sm transition-colors">Cancel</button>
            <button onClick={save} className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors">Save Entry</button>
          </div>
        </motion.div>
      )}
      <div className="space-y-3">
        <AnimatePresence>
          {entries.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30"/>
              <p>Start your language learning journal. Write your first entry!</p>
            </div>
          )}
          {entries.map(e=>(
            <motion.div key={e.id} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} exit={{opacity:0,height:0}}
              className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/30">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{e.mood}</span>
                  <div>
                    <span className="text-xs font-semibold text-blue-400">{e.language}</span>
                    <span className="text-xs text-slate-500 ml-2">{e.date}</span>
                  </div>
                </div>
                <button onClick={()=>del(e.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4"/>
                </button>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{e.content}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

// 5. INTERACTIVE GLOBE (SVG-based)
function GlobeTab({ languages }: { languages: LanguageProfile[] }) {
  const [hovered, setHovered] = useState<string|null>(null)
  const LANG_POSITIONS: Record<string,{x:number;y:number;region:string}> = {
    'English':   {x:47, y:32, region:'United Kingdom'},
    'Hindi':     {x:72, y:43, region:'India'},
    'Haryanvi':  {x:71, y:42, region:'Haryana, India'},
    'German':    {x:52, y:30, region:'Germany'},
  }
  return (
    <div className="space-y-6">
      <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-700/30 relative overflow-hidden">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Your Language World Map</h3>
        <div className="relative">
          {/* SVG World Map simplified */}
          <svg viewBox="0 0 100 60" className="w-full rounded-xl" style={{background:'#0f172a'}}>
            {/* Ocean */}
            <rect width="100" height="60" fill="#0f172a"/>
            {/* Grid lines */}
            {[15,30,45].map(y=><line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#1e293b" strokeWidth="0.3"/>)}
            {[20,40,60,80].map(x=><line key={x} x1={x} y1="0" x2={x} y2="60" stroke="#1e293b" strokeWidth="0.3"/>)}
            {/* Continents (simplified shapes) */}
            {/* Europe */}
            <ellipse cx="51" cy="28" rx="8" ry="6" fill="#1e3a5f" opacity="0.8"/>
            {/* Asia */}
            <ellipse cx="72" cy="30" rx="16" ry="10" fill="#1e3a5f" opacity="0.8"/>
            {/* North America */}
            <ellipse cx="22" cy="28" rx="12" ry="10" fill="#1e3a5f" opacity="0.8"/>
            {/* South America */}
            <ellipse cx="28" cy="46" rx="7" ry="10" fill="#1e3a5f" opacity="0.8"/>
            {/* Africa */}
            <ellipse cx="53" cy="42" rx="8" ry="10" fill="#1e3a5f" opacity="0.8"/>
            {/* Australia */}
            <ellipse cx="82" cy="47" rx="7" ry="5" fill="#1e3a5f" opacity="0.8"/>
            {/* Language pins */}
            {languages.map(lang => {
              const pos = LANG_POSITIONS[lang.name]
              if (!pos) return null
              const isHov = hovered === lang.name
              return (
                <g key={lang.id} style={{cursor:'pointer'}}
                  onMouseEnter={()=>setHovered(lang.name)}
                  onMouseLeave={()=>setHovered(null)}>
                  <circle cx={pos.x} cy={pos.y} r={isHov?2.5:1.8}
                    fill={lang.status==='learning'?'#22c55e':'#3b82f6'}
                    className="transition-all duration-200"/>
                  <circle cx={pos.x} cy={pos.y} r={isHov?4:2.5}
                    fill={lang.status==='learning'?'#22c55e':'#3b82f6'}
                    opacity="0.3"/>
                  {isHov && (
                    <>
                      <rect x={pos.x-8} y={pos.y-8} width="16" height="6" rx="1.5" fill="#1e293b" opacity="0.95"/>
                      <text x={pos.x} y={pos.y-3.5} textAnchor="middle" fill="white" fontSize="2.2" fontWeight="600">{lang.name}</text>
                    </>
                  )}
                </g>
              )
            })}
          </svg>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4">
          {languages.map(lang => {
            const pos = LANG_POSITIONS[lang.name]
            return (
              <div key={lang.id}
                onMouseEnter={()=>setHovered(lang.name)} onMouseLeave={()=>setHovered(null)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${hovered===lang.name?'bg-slate-700':'bg-slate-800/60'}`}>
                <div className={`w-2.5 h-2.5 rounded-full ${lang.status==='learning'?'bg-green-400':'bg-blue-400'}`}/>
                <span className="text-sm text-white">{lang.flag} {lang.name}</span>
                <span className="text-xs text-slate-400">{pos?.region||''}</span>
              </div>
            )
          })}
        </div>
      </div>
      {/* Language family tree */}
      <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-700/30">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Language Family Tree</h3>
        <div className="space-y-3">
          {[
            { family:'Indo-European', branch:'Germanic',    langs:['English','German']   },
            { family:'Indo-European', branch:'Indo-Aryan',  langs:['Hindi','Haryanvi']   },
          ].map(f=>(
            <div key={f.branch} className="flex items-start gap-3">
              <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-400 flex-shrink-0"/>
              <div>
                <span className="text-xs text-slate-500">{f.family} → </span>
                <span className="text-sm font-semibold text-slate-300">{f.branch}</span>
                <div className="flex gap-2 mt-1">
                  {f.langs.map(l=>{
                    const found = languages.find(x=>x.name===l)
                    return found ? (
                      <span key={l} className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">{found.flag} {l}</span>
                    ) : null
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// 6. AI SPEAKING PRACTICE
function SpeakingTab() {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [prompt, setPrompt] = useState('Introduce yourself in German')
  const recognRef = useRef<any>(null)

  const PROMPTS = [
    'Introduce yourself in German',
    'Talk about your daily routine',
    'Describe your favourite food',
    'Count from 1 to 20 in German',
    'Say the days of the week in German',
  ]

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setFeedback('Speech recognition not supported in this browser. Try Chrome.'); return }
    const r = new SR()
    r.lang = 'de-DE'; r.interimResults = true; r.continuous = false
    r.onresult = (e: any) => {
      const t = Array.from(e.results).map((x:any)=>x[0].transcript).join('')
      setTranscript(t)
    }
    r.onend = () => setListening(false)
    r.start(); recognRef.current = r; setListening(true); setTranscript(''); setFeedback('')
  }

  const stopListening = () => { recognRef.current?.stop(); setListening(false) }

  const getAIFeedback = async () => {
    if (!transcript.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/anthropic', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ messages:[{
          role:'user',
          content:`You are a German language coach. The learner was asked to: "${prompt}"\nThey said: "${transcript}"\n\nGive brief, encouraging feedback in 2-3 sentences: what they did well, what to improve, and one tip. Be positive and concise.`
        }]})
      })
      const d = await res.json()
      setFeedback(d.content?.[0]?.text || 'Great effort! Keep practicing.')
    } catch { setFeedback('Great effort! Keep practicing your pronunciation.') }
    finally { setLoading(false) }
  }

  const speak = (text: string) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'de-DE'; u.rate = 0.8; window.speechSynthesis.speak(u)
  }

  return (
    <div className="space-y-5">
      <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-700/30">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Choose a Speaking Prompt</h3>
        <div className="flex flex-wrap gap-2">
          {PROMPTS.map(p=>(
            <button key={p} onClick={()=>setPrompt(p)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${prompt===p?'bg-blue-600 text-white':'bg-slate-700/60 text-slate-300 hover:bg-slate-700'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-700/30 text-center space-y-5">
        <div className="bg-slate-700/40 rounded-xl p-4 flex items-center justify-between">
          <p className="text-white font-medium text-sm text-left">{prompt}</p>
          <button onClick={()=>speak(prompt)} className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors ml-3 flex-shrink-0">
            <Volume2 className="w-4 h-4"/>
          </button>
        </div>

        <motion.button
          whileHover={{scale:1.05}} whileTap={{scale:0.95}}
          onClick={listening?stopListening:startListening}
          className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-white font-bold shadow-lg transition-all ${
            listening?'bg-red-500 shadow-red-500/30':'bg-blue-600 shadow-blue-500/30'
          }`}>
          {listening ? <><Square className="w-7 h-7"/></> : <><Mic className="w-7 h-7"/></>}
        </motion.button>
        <p className="text-xs text-slate-400">{listening?'🔴 Recording... click to stop':'Click to start speaking'}</p>

        {transcript && (
          <div className="bg-slate-700/40 rounded-xl p-4 text-left">
            <p className="text-xs text-slate-400 mb-1">You said:</p>
            <p className="text-white text-sm">{transcript}</p>
            <button onClick={getAIFeedback} disabled={loading}
              className="mt-3 w-full py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
              {loading?<><Loader2 className="w-3.5 h-3.5 animate-spin"/>Analyzing…</>:<><Sparkles className="w-3.5 h-3.5"/>Get AI Feedback</>}
            </button>
          </div>
        )}

        {feedback && (
          <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}}
            className="bg-green-900/30 rounded-xl p-4 border border-green-500/20 text-left">
            <p className="text-xs text-green-400 font-semibold mb-1">AI Coach Feedback</p>
            <p className="text-sm text-slate-200">{feedback}</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// 7. VOCABULARY EXPLORER
function VocabTab() {
  const [words, setWords] = useState<VocabWord[]>(() => {
    try { const s=localStorage.getItem('lang_vocab'); return s?JSON.parse(s):VOCAB_BANK } catch { return VOCAB_BANK }
  })
  const [filter, setFilter] = useState('All')
  const [flip, setFlip] = useState<Record<number,boolean>>({})
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({word:'',translation:'',example:'',language:'German'})
  const langs = ['All','German','Hindi','English']
  const visible = filter==='All'?words:words.filter(w=>w.language===filter)

  const toggleMaster = (i:number) => {
    const w=[...words]; const idx=words.indexOf(visible[i])
    w[idx]={...w[idx],mastered:!w[idx].mastered}
    setWords(w); localStorage.setItem('lang_vocab',JSON.stringify(w))
  }
  const addWord = () => {
    if(!form.word||!form.translation) return
    const next=[...words,{...form,mastered:false}]
    setWords(next); localStorage.setItem('lang_vocab',JSON.stringify(next))
    setForm({word:'',translation:'',example:'',language:'German'}); setAdding(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          {langs.map(l=>(
            <button key={l} onClick={()=>setFilter(l)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter===l?'bg-blue-600 text-white':'bg-slate-700/60 text-slate-300 hover:bg-slate-700'}`}>
              {l}
            </button>
          ))}
        </div>
        <button onClick={()=>setAdding(v=>!v)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600/20 border border-green-500/30 text-green-400 text-xs font-semibold hover:bg-green-600/30 transition-colors">
          <Plus className="w-3.5 h-3.5"/> Add Word
        </button>
      </div>
      <div className="text-xs text-slate-500">{visible.filter(w=>w.mastered).length}/{visible.length} mastered · Click a card to flip</div>

      {adding && (
        <motion.div initial={{opacity:0,y:-5}} animate={{opacity:1,y:0}}
          className="bg-slate-800/60 rounded-2xl p-5 border border-green-500/20 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={form.word} onChange={e=>setForm({...form,word:e.target.value})}
              placeholder="Word (e.g. Danke)" className="bg-slate-700/60 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"/>
            <input value={form.translation} onChange={e=>setForm({...form,translation:e.target.value})}
              placeholder="Translation" className="bg-slate-700/60 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"/>
          </div>
          <input value={form.example} onChange={e=>setForm({...form,example:e.target.value})}
            placeholder="Example sentence (optional)" className="w-full bg-slate-700/60 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"/>
          <div className="flex gap-3">
            <select value={form.language} onChange={e=>setForm({...form,language:e.target.value})}
              className="bg-slate-700/60 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white flex-1">
              {['German','Hindi','English'].map(l=><option key={l}>{l}</option>)}
            </select>
            <button onClick={()=>setAdding(false)} className="px-4 py-2 rounded-lg border border-slate-600 text-slate-400 text-sm hover:text-white transition-colors">Cancel</button>
            <button onClick={addWord} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors">Add</button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {visible.map((w,i)=>(
          <motion.div key={i} whileHover={{y:-3}} onClick={()=>setFlip(f=>({...f,[i]:!f[i]}))}
            style={{perspective:1000}} className="cursor-pointer h-28">
            <motion.div animate={{rotateY:flip[i]?180:0}} transition={{duration:0.4}}
              style={{transformStyle:'preserve-3d',position:'relative',width:'100%',height:'100%'}}>
              {/* Front */}
              <div style={{backfaceVisibility:'hidden',position:'absolute',inset:0}}
                className={`rounded-2xl p-4 border flex flex-col justify-between ${w.mastered?'bg-green-900/30 border-green-500/30':'bg-slate-800/60 border-slate-700/30'}`}>
                <div className="flex items-start justify-between">
                  <span className="text-xs text-blue-400 font-medium">{w.language}</span>
                  {w.mastered && <CheckCircle2 className="w-4 h-4 text-green-400"/>}
                </div>
                <div>
                  <p className="text-white font-bold text-lg">{w.word}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Tap to flip →</p>
                </div>
              </div>
              {/* Back */}
              <div style={{backfaceVisibility:'hidden',transform:'rotateY(180deg)',position:'absolute',inset:0}}
                className="rounded-2xl p-4 bg-blue-900/40 border border-blue-500/30 flex flex-col justify-between">
                <p className="text-green-300 font-bold">{w.translation}</p>
                {w.example && <p className="text-xs text-slate-300 italic">"{w.example}"</p>}
                <button onClick={e=>{e.stopPropagation();toggleMaster(i)}}
                  className={`text-xs px-2 py-1 rounded-lg font-semibold transition-colors ${w.mastered?'bg-green-600 text-white':'bg-slate-700 text-slate-300 hover:bg-green-600 hover:text-white'}`}>
                  {w.mastered?'✓ Mastered':'Mark Mastered'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// 8. CERTIFICATE TIMELINE
function CertsTab() {
  const certs = [
    { year:'2024', month:'Feb', lang:'German', level:'B1', score:'72/100', issuer:'Goethe Institut', status:'cleared', color:'from-yellow-600 to-orange-500' },
    { year:'2023', month:'Jun', lang:'English', level:'C1', score:'185/190', issuer:'Cambridge', status:'cleared', color:'from-blue-600 to-cyan-500' },
    { year:'2024', month:'Dec', lang:'German', level:'B2', score:'—', issuer:'Goethe Institut', status:'pending', color:'from-slate-600 to-slate-500' },
  ]
  return (
    <div className="space-y-4">
      <div className="relative pl-8">
        <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-slate-700"/>
        {certs.map((c,i)=>(
          <motion.div key={i} initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} transition={{delay:i*0.15}}
            className="relative mb-6">
            <div className={`absolute -left-5 w-3.5 h-3.5 rounded-full border-2 border-background bg-gradient-to-br ${c.color}`}/>
            <div className={`ml-4 rounded-2xl p-5 border ${c.status==='cleared'?'bg-slate-800/60 border-slate-700/40':'bg-slate-800/30 border-slate-700/20 opacity-70'}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-xs text-slate-400">{c.month} {c.year}</span>
                  <h4 className="font-bold text-white">{c.lang} — Level {c.level}</h4>
                  <p className="text-xs text-slate-400">{c.issuer}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${c.status==='cleared'?'bg-green-500/20 text-green-300 border border-green-500/30':'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'}`}>
                  {c.status==='cleared'?'✓ Cleared':'⏳ Pending'}
                </span>
              </div>
              {c.score!=='—'&&(
                <div className="mt-2 text-sm">
                  <span className="text-slate-400">Score: </span>
                  <span className="font-semibold text-white">{c.score}</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// 9. STREAK COUNTER
function StreakTab() {
  const streak = 14
  const best   = 21
  const todayDone = true
  const week = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const weekDone = [true,true,false,true,true,true,true]
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-orange-900/40 to-red-900/30 rounded-2xl p-8 border border-orange-500/20 text-center">
        <motion.div animate={{scale:[1,1.08,1]}} transition={{duration:2,repeat:Infinity}}>
          <div className="text-8xl mb-2">🔥</div>
        </motion.div>
        <div className="text-6xl font-black text-orange-400">{streak}</div>
        <div className="text-slate-300 font-semibold mt-1">Day Streak</div>
        <div className="text-sm text-slate-400 mt-1">Best: {best} days</div>
        {todayDone && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30 text-green-300 text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4"/> Today's session complete!
          </div>
        )}
      </div>

      <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-700/30">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">This Week</h3>
        <div className="flex gap-2 justify-between">
          {week.map((d,i)=>(
            <div key={d} className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${weekDone[i]?'bg-orange-500 text-white':'bg-slate-700/60 text-slate-500'}`}>
                {weekDone[i]?'🔥':'·'}
              </div>
              <span className="text-xs text-slate-400">{d}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          {label:'Total Study Days',val:'47',icon:'📅'},
          {label:'Total Hours',val:'94h',icon:'⏱️'},
          {label:'Words Learned',val:'320',icon:'📖'},
          {label:'Quizzes Passed',val:'18',icon:'✅'},
        ].map(s=>(
          <div key={s.label} className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/30 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-black text-white">{s.val}</div>
            <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 10. FUTURE GOALS
function GoalsTab() {
  const [goals, setGoals] = useState<GoalItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('lang_goals')||'[]') } catch { return [] }
  })
  const [form, setForm] = useState({text:'',language:'German',targetDate:''})
  const [adding, setAdding] = useState(false)

  const save = () => {
    if(!form.text.trim()) return
    const g:GoalItem={id:Date.now().toString(),done:false,...form}
    const next=[...goals,g]; setGoals(next); localStorage.setItem('lang_goals',JSON.stringify(next))
    setForm({text:'',language:'German',targetDate:''}); setAdding(false)
  }
  const toggle=(id:string)=>{
    const next=goals.map(g=>g.id===id?{...g,done:!g.done}:g)
    setGoals(next); localStorage.setItem('lang_goals',JSON.stringify(next))
  }
  const del=(id:string)=>{
    const next=goals.filter(g=>g.id!==id); setGoals(next); localStorage.setItem('lang_goals',JSON.stringify(next))
  }
  const done=goals.filter(g=>g.done).length
  const pct=goals.length?Math.round((done/goals.length)*100):0

  const SUGGESTED = [
    'Pass German B2 exam by December 2025',
    'Learn 500 German vocabulary words',
    'Watch a German movie without subtitles',
    'Hold a 5-minute German conversation',
    'Read a German newspaper article daily',
  ]

  return (
    <div className="space-y-5">
      {goals.length>0 && (
        <div className="bg-slate-800/40 rounded-2xl p-5 border border-slate-700/30">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-300">Goals completed</span>
            <span className="font-semibold text-white">{done}/{goals.length}</span>
          </div>
          <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
            <motion.div animate={{width:`${pct}%`}} transition={{duration:0.8}}
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"/>
          </div>
        </div>
      )}

      {!adding?(
        <button onClick={()=>setAdding(true)}
          className="w-full py-3 rounded-2xl border border-dashed border-slate-600 text-slate-400 hover:border-blue-500 hover:text-blue-400 transition-colors flex items-center justify-center gap-2">
          <Plus className="w-4 h-4"/> Add New Goal
        </button>
      ):(
        <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}}
          className="bg-slate-800/60 rounded-2xl p-5 border border-blue-500/30 space-y-3">
          <input value={form.text} onChange={e=>setForm({...form,text:e.target.value})}
            placeholder="Enter your language goal…" className="w-full bg-slate-700/60 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"/>
          <div className="grid grid-cols-2 gap-3">
            <select value={form.language} onChange={e=>setForm({...form,language:e.target.value})}
              className="bg-slate-700/60 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white">
              {['German','Hindi','English','Haryanvi'].map(l=><option key={l}>{l}</option>)}
            </select>
            <input type="date" value={form.targetDate} onChange={e=>setForm({...form,targetDate:e.target.value})}
              className="bg-slate-700/60 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"/>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>setAdding(false)} className="flex-1 py-2 rounded-xl border border-slate-600 text-slate-400 text-sm hover:text-white transition-colors">Cancel</button>
            <button onClick={save} className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors">Save Goal</button>
          </div>
        </motion.div>
      )}

      {/* Suggested goals */}
      <div className="bg-slate-800/30 rounded-2xl p-5 border border-slate-700/20">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">💡 Suggested Goals</p>
        <div className="space-y-2">
          {SUGGESTED.map(s=>(
            <button key={s} onClick={()=>{setForm(f=>({...f,text:s}));setAdding(true)}}
              className="w-full text-left text-xs text-slate-400 hover:text-blue-400 py-1.5 flex items-center gap-2 transition-colors">
              <ChevronRight className="w-3 h-3"/> {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {goals.map(g=>(
            <motion.div key={g.id} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} exit={{opacity:0,height:0}}
              className={`flex items-start gap-3 p-4 rounded-xl border ${g.done?'border-green-500/20 bg-green-900/10':'border-slate-700/30 bg-slate-800/40'}`}>
              <button onClick={()=>toggle(g.id)}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${g.done?'bg-green-500 border-green-500':'border-slate-500 hover:border-green-500'}`}>
                {g.done&&<Check className="w-3 h-3 text-white"/>}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${g.done?'line-through text-slate-500':'text-white'}`}>{g.text}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-[11px] text-blue-400">{g.language}</span>
                  {g.targetDate&&<span className="text-[11px] text-slate-500">Target: {g.targetDate}</span>}
                </div>
              </div>
              <button onClick={()=>del(g.id)} className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0">
                <X className="w-4 h-4"/>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {goals.length===0&&(
          <div className="text-center py-8 text-slate-500">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-30"/>
            <p className="text-sm">No goals yet. Set your first language learning goal!</p>
          </div>
        )}
      </div>
    </div>
  )
}

// 11. AI TRANSLATOR
function TranslatorTab() {
  const [text, setText] = useState('')
  const [from, setFrom] = useState('English')
  const [to, setTo]   = useState('German')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const LANGS = ['English','German','Hindi','Haryanvi','French','Spanish','Italian']

  const translate = async () => {
    if(!text.trim()) return
    setLoading(true); setResult('')
    try {
      const res = await fetch('/api/anthropic', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ messages:[{
          role:'user',
          content:`Translate the following text from ${from} to ${to}. Provide ONLY the translation, nothing else. If it's already in the target language, still provide the translation.\n\nText: ${text}`
        }]})
      })
      const d = await res.json()
      setResult(d.content?.[0]?.text || 'Translation unavailable')
    } catch { setResult('Translation service unavailable. Please try again.') }
    finally { setLoading(false) }
  }

  const speak = (t:string, lang:string) => {
    const langMap:Record<string,string>={German:'de-DE',Hindi:'hi-IN',English:'en-US',French:'fr-FR',Spanish:'es-ES',Italian:'it-IT'}
    const u = new SpeechSynthesisUtterance(t)
    u.lang = langMap[lang]||'en-US'; u.rate=0.85; window.speechSynthesis.speak(u)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <select value={from} onChange={e=>setFrom(e.target.value)}
          className="flex-1 bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
          {LANGS.map(l=><option key={l}>{l}</option>)}
        </select>
        <button onClick={()=>{const t=from;setFrom(to);setTo(t);setText(result);setResult(text)}}
          className="p-2.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-white transition-colors">
          ⇄
        </button>
        <select value={to} onChange={e=>setTo(e.target.value)}
          className="flex-1 bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
          {LANGS.map(l=><option key={l}>{l}</option>)}
        </select>
      </div>

      <div className="relative">
        <textarea value={text} onChange={e=>setText(e.target.value)}
          placeholder={`Type text in ${from}…`} rows={4}
          className="w-full bg-slate-800/60 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500"/>
        {text&&<button onClick={()=>speak(text,from)} className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-700/60 text-slate-400 hover:text-white transition-colors"><Volume2 className="w-4 h-4"/></button>}
      </div>

      <button onClick={translate} disabled={loading||!text.trim()}
        className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
        {loading?<><Loader2 className="w-4 h-4 animate-spin"/>Translating…</>:<><Languages className="w-4 h-4"/>Translate</>}
      </button>

      {result&&(
        <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}}
          className="relative bg-slate-800/60 border border-blue-500/20 rounded-2xl px-4 py-3">
          <p className="text-xs text-blue-400 font-semibold mb-2">{to} translation:</p>
          <p className="text-white text-sm leading-relaxed">{result}</p>
          <button onClick={()=>speak(result,to)} className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-700/60 text-slate-400 hover:text-white transition-colors"><Volume2 className="w-4 h-4"/></button>
        </motion.div>
      )}

      {/* Quick phrases */}
      <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-700/20">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Quick Phrases</p>
        <div className="flex flex-wrap gap-2">
          {['Hello','Thank you','How are you?','Where is…?','I don\'t understand','Goodbye'].map(p=>(
            <button key={p} onClick={()=>setText(p)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-700/60 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">{p}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

// 12. MINI QUIZ
function QuizTab() {
  const [idx, setIdx]   = useState(0)
  const [sel, setSel]   = useState<number|null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone]  = useState(false)
  const [results, setResults] = useState<{q:string;correct:boolean}[]>([])
  const q = QUIZ_QUESTIONS[idx]

  const choose = (i:number) => {
    if(sel!==null) return
    setSel(i)
    const correct = i===q.ans
    if(correct) setScore(s=>s+1)
    setResults(r=>[...r,{q:q.q,correct}])
    setTimeout(()=>{
      if(idx<QUIZ_QUESTIONS.length-1){ setIdx(i=>i+1); setSel(null) }
      else setDone(true)
    },1200)
  }

  const restart=()=>{setIdx(0);setSel(null);setScore(0);setDone(false);setResults([])}
  const pct = Math.round((score/QUIZ_QUESTIONS.length)*100)

  if(done) return (
    <div className="text-center space-y-6 py-4">
      <div className="text-6xl">{pct>=80?'🏆':pct>=60?'👍':'📚'}</div>
      <div>
        <div className="text-4xl font-black text-white">{score}/{QUIZ_QUESTIONS.length}</div>
        <div className={`text-lg font-semibold mt-1 ${pct>=80?'text-green-400':pct>=60?'text-yellow-400':'text-red-400'}`}>
          {pct>=80?'Excellent!':pct>=60?'Good job!':'Keep practicing!'}
        </div>
      </div>
      <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden max-w-xs mx-auto">
        <div style={{width:`${pct}%`}} className={`h-full rounded-full ${pct>=80?'bg-green-500':pct>=60?'bg-yellow-500':'bg-red-500'}`}/>
      </div>
      <div className="space-y-2 text-left max-w-sm mx-auto">
        {results.map((r,i)=>(
          <div key={i} className={`flex items-start gap-2 text-xs p-2.5 rounded-lg ${r.correct?'bg-green-900/30 text-green-300':'bg-red-900/30 text-red-300'}`}>
            {r.correct?<CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"/>:<XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"/>}
            <span>{r.q}</span>
          </div>
        ))}
      </div>
      <button onClick={restart} className="flex items-center gap-2 mx-auto px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors">
        <RotateCcw className="w-4 h-4"/> Try Again
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div style={{width:`${(idx/QUIZ_QUESTIONS.length)*100}%`}} className="h-full bg-blue-500 rounded-full transition-all duration-500"/>
        </div>
        <span className="text-xs text-slate-400 font-mono">{idx+1}/{QUIZ_QUESTIONS.length}</span>
      </div>

      <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-700/30">
        <div className="text-xs text-blue-400 font-semibold mb-2">{q.lang}</div>
        <h3 className="text-lg font-bold text-white mb-6">{q.q}</h3>
        <div className="space-y-3">
          {q.opts.map((opt,i)=>{
            let cls = 'bg-slate-700/60 border-slate-600 text-white hover:border-blue-500'
            if(sel!==null){
              if(i===q.ans) cls='bg-green-900/50 border-green-500 text-green-300'
              else if(i===sel&&sel!==q.ans) cls='bg-red-900/50 border-red-500 text-red-300'
              else cls='bg-slate-700/30 border-slate-700 text-slate-500'
            }
            return (
              <button key={i} onClick={()=>choose(i)} disabled={sel!==null}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${cls}`}>
                <span className="text-slate-500 mr-2">{String.fromCharCode(65+i)}.</span>{opt}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// 13. STUDY RESOURCES
function ResourcesTab() {
  const [filter, setFilter] = useState('All')
  const tags = ['All','App','Course','Official','Exchange','Grammar','Flashcards','Tutoring','News']
  const visible = filter==='All'?RESOURCES:RESOURCES.filter(r=>r.tag===filter||r.lang==='All')

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {tags.map(t=>(
          <button key={t} onClick={()=>setFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter===t?'bg-blue-600 text-white':'bg-slate-700/60 text-slate-300 hover:bg-slate-700'}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {visible.map((r,i)=>(
          <motion.a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
            whileHover={{y:-3}} className="group block">
            <div className="bg-slate-800/40 rounded-2xl p-5 border border-slate-700/30 hover:border-blue-500/40 transition-all h-full">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors">{r.title}</h4>
                <div className="flex gap-1.5 flex-shrink-0 ml-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/20">{r.tag}</span>
                  {r.lang!=='All'&&<span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">{r.lang}</span>}
                </div>
              </div>
              <p className="text-sm text-slate-400">{r.desc}</p>
              <div className="flex items-center gap-1 mt-3 text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Visit resource</span><ChevronRight className="w-3 h-3"/>
              </div>
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  )
}

// 14. AI MENTOR
function MentorTab() {
  const [msgs, setMsgs] = useState([
    { role:'assistant', text:'👋 Hallo! I\'m your AI language mentor. Ask me anything about German grammar, vocabulary, culture, or your learning journey. Ich helfe dir gerne!' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const QUICK = ['Explain German cases','What\'s the difference between du and Sie?','How to conjugate haben?','Give me 5 common German phrases','Tips to improve my German']

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}) },[msgs])

  const send = async (text=input) => {
    if(!text.trim()||loading) return
    const userMsg = {role:'user',text}
    setMsgs(m=>[...m,userMsg]); setInput(''); setLoading(true)
    try {
      const history = [...msgs,userMsg].map(m=>({role:m.role as 'user'|'assistant', content:m.text}))
      const res = await fetch('/api/anthropic', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          system:'You are an expert, encouraging language learning mentor specializing in German, Hindi, and Haryanvi. You help learners with grammar, vocabulary, culture, and motivation. Keep responses concise (2-4 sentences) but helpful. Use emojis sparingly.',
          messages: history
        })
      })
      const d = await res.json()
      const reply = d.content?.[0]?.text || 'I\'m here to help! Could you rephrase your question?'
      setMsgs(m=>[...m,{role:'assistant',text:reply}])
    } catch { setMsgs(m=>[...m,{role:'assistant',text:'Connection issue. Please try again!'}]) }
    finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col h-[520px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
        {msgs.map((m,i)=>(
          <div key={i} className={`flex ${m.role==='user'?'justify-end':''}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role==='user'?'bg-blue-600 text-white':'bg-slate-800/60 border border-slate-700/40 text-slate-200'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading&&(
          <div className="flex">
            <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl px-4 py-3">
              <div className="flex gap-1">{[0,1,2].map(i=><motion.div key={i} animate={{y:[0,-4,0]}} transition={{duration:0.8,repeat:Infinity,delay:i*0.15}} className="w-1.5 h-1.5 bg-blue-400 rounded-full"/>)}</div>
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>
      {/* Quick prompts */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        {QUICK.map(q=>(
          <button key={q} onClick={()=>send(q)}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg bg-slate-700/60 text-slate-300 hover:bg-blue-600/30 hover:text-blue-300 transition-colors border border-slate-700/40">
            {q}
          </button>
        ))}
      </div>
      {/* Input */}
      <div className="flex gap-2">
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
          placeholder="Ask your AI mentor anything…"
          className="flex-1 bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"/>
        <button onClick={()=>send()} disabled={loading||!input.trim()}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors">
          <Send className="w-4 h-4"/>
        </button>
      </div>
    </div>
  )
}

// 15. RECRUITER MODE
function RecruiterTab({ languages }: { languages: LanguageProfile[] }) {
  const profMap: Record<string,{label:string;cefr:string;color:string}> = {
    native:       {label:'Native Speaker',  cefr:'C2+', color:'text-purple-400'},
    fluent:       {label:'Professional',    cefr:'C1',  color:'text-green-400'},
    intermediate: {label:'Working Knowledge',cefr:'B1/B2', color:'text-blue-400'},
    beginner:     {label:'Elementary',      cefr:'A1/A2', color:'text-yellow-400'},
  }
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 rounded-2xl p-6 border border-blue-500/20">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="w-5 h-5 text-blue-400"/>
          <h3 className="font-bold text-white">Language Skills — Recruiter Summary</h3>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Multilingual professional with strong communication skills across 4 languages.
          Native proficiency in Hindi and Haryanvi, professional-level English, and
          actively developing German language skills (B1/B2 level).
        </p>
      </div>

      {/* Language cards */}
      <div className="space-y-3">
        {languages.map(lang=>{
          const info = profMap[lang.proficiency]||profMap.beginner
          return (
            <div key={lang.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/40 border border-slate-700/30">
              <span className="text-3xl">{lang.flag}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-white">{lang.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 font-mono">{info.cefr}</span>
                  {lang.status==='learning'&&<span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">Actively Learning</span>}
                </div>
                <span className={`text-sm font-semibold ${info.color}`}>{info.label}</span>
              </div>
              <div className="w-24">
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div style={{width:`${{native:100,fluent:85,intermediate:55,beginner:30}[lang.proficiency]}%`}}
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"/>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Use cases */}
      <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-700/30 space-y-3">
        <h4 className="text-sm font-semibold text-slate-300">Professional Use Cases</h4>
        {[
          {icon:'🌍', text:'Cross-cultural team communication (English + Hindi)'},
          {icon:'🇩🇪', text:'German-speaking client projects & documentation (B1 → B2)'},
          {icon:'📞', text:'Regional language support for Haryana-based stakeholders'},
          {icon:'✍️', text:'Technical documentation in English (native-level writing)'},
        ].map((u,i)=>(
          <div key={i} className="flex items-start gap-3 text-sm text-slate-300">
            <span>{u.icon}</span><span>{u.text}</span>
          </div>
        ))}
      </div>

      <div className="bg-green-900/20 rounded-2xl p-5 border border-green-500/20 text-center">
        <p className="text-green-300 text-sm font-semibold">✅ Available for roles requiring multilingual communication</p>
        <p className="text-slate-400 text-xs mt-1">English (professional) · Hindi (native) · German (learning, B1)</p>
      </div>
    </div>
  )
}

/* ─── Main Dashboard ──────────────────────────────────────────────────────── */
export function LanguagesDashboard() {
  const [activeTab, setActiveTab] = useState('heatmap')
  const [languages, setLanguages] = useState<LanguageProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    fetch('/api/languages/profile').then(r=>r.ok?r.json():[]).then(setLanguages).catch(()=>{}).finally(()=>setLoading(false))
  },[])

  if(loading) return (
    <div className="min-h-screen bg-[#080e1a] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-full border-2 border-blue-500/20"/>
          <div className="absolute inset-0 rounded-full border-t-2 border-blue-400 animate-spin"/>
          <Globe2 className="absolute inset-0 m-auto w-7 h-7 text-blue-400"/>
        </div>
        <p className="text-slate-500 text-sm">Loading dashboard…</p>
      </div>
    </div>
  )

  const ActiveIcon = TAB_LIST.find(t=>t.id===activeTab)?.icon||Globe2

  return (
    <div className="min-h-screen bg-[#080e1a]">
      {/* BG glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-700/6 rounded-full blur-3xl"/>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-700/6 rounded-full blur-3xl"/>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-6 pt-24 pb-20">

        {/* Header */}
        <motion.div initial={{opacity:0,y:-16}} animate={{opacity:1,y:0}} className="mb-8">
          <Link href="/">
            <button className="flex items-center gap-2 text-slate-500 hover:text-white text-sm mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4"/> Back to Portfolio
            </button>
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs font-semibold mb-3">
                <Globe2 className="w-3.5 h-3.5"/> Interactive Language Dashboard
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white">Language Learning Hub</h1>
              <p className="text-slate-400 mt-1 text-sm">Track progress · Practice · Achieve · Grow</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-2xl font-black text-orange-400">🔥 14</div>
                <div className="text-xs text-slate-500">Day streak</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-yellow-400">⭐ 1100</div>
                <div className="text-xs text-slate-500">Total XP</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tab navigation — scrollable */}
        <div className="relative mb-6">
          <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide" style={{scrollbarWidth:'none'}}>
            {TAB_LIST.map(tab=>{
              const Icon=tab.icon
              const active=activeTab===tab.id
              return (
                <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex-shrink-0 transition-all ${
                    active?'bg-blue-600 text-white shadow-lg shadow-blue-500/20':'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}>
                  <Icon className="w-3.5 h-3.5"/>
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              )
            })}
          </div>
          <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-[#080e1a] pointer-events-none"/>
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}
            transition={{duration:0.2}}>
            {activeTab==='heatmap'     && <HeatmapTab/>}
            {activeTab==='achievements'&& <AchievementsTab xp={1100}/>}
            {activeTab==='progress'    && <ProgressTab languages={languages}/>}
            {activeTab==='journal'     && <JournalTab/>}
            {activeTab==='globe'       && <GlobeTab languages={languages}/>}
            {activeTab==='speaking'    && <SpeakingTab/>}
            {activeTab==='vocab'       && <VocabTab/>}
            {activeTab==='certs'       && <CertsTab/>}
            {activeTab==='streak'      && <StreakTab/>}
            {activeTab==='goals'       && <GoalsTab/>}
            {activeTab==='translator'  && <TranslatorTab/>}
            {activeTab==='quiz'        && <QuizTab/>}
            {activeTab==='resources'   && <ResourcesTab/>}
            {activeTab==='mentor'      && <MentorTab/>}
            {activeTab==='recruiter'   && <RecruiterTab languages={languages}/>}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
