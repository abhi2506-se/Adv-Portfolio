'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Loader2, CheckCircle, AlertCircle, FileText, X, TrendingUp, Target, Zap, ChevronDown, Building2 } from 'lucide-react'

// ── MNC Company profiles with keyword requirements ─────────────────────────
const MNC_COMPANIES = [
  {
    id: 'amazon', name: 'Amazon', tier: 'FAANG',
    color: '#FF9900', bg: 'from-orange-500/20 to-yellow-500/10', border: 'border-orange-500/30',
    requiredKeywords: ['aws', 'cloud', 'distributed systems', 'scalability', 'microservices', 'python', 'java', 'sql', 'nosql', 'kafka', 'leadership', 'ownership', 'customer obsession', 'data structures', 'algorithms', 'system design'],
    preferredKeywords: ['dynamodb', 'lambda', 's3', 'ec2', 'sqs', 'kinesis', 'terraform', 'ci/cd', 'agile', 'restful'],
    sectionWeight: { technical: 0.45, leadership: 0.25, projects: 0.20, education: 0.10 },
    jobLevels: ['SDE-1', 'SDE-2', 'SDE-3', 'Senior SDE'],
  },
  {
    id: 'google', name: 'Google', tier: 'FAANG',
    color: '#4285F4', bg: 'from-blue-500/20 to-cyan-500/10', border: 'border-blue-500/30',
    requiredKeywords: ['algorithms', 'data structures', 'system design', 'scalability', 'python', 'java', 'c++', 'distributed systems', 'machine learning', 'open source'],
    preferredKeywords: ['golang', 'kubernetes', 'big data', 'ml', 'tensorflow', 'mapreduce', 'bigtable', 'spanner', 'android', 'chrome'],
    sectionWeight: { technical: 0.50, leadership: 0.15, projects: 0.25, education: 0.10 },
    jobLevels: ['L3', 'L4', 'L5', 'L6', 'L7'],
  },
  {
    id: 'microsoft', name: 'Microsoft', tier: 'FAANG',
    color: '#00A4EF', bg: 'from-cyan-500/20 to-blue-500/10', border: 'border-cyan-500/30',
    requiredKeywords: ['azure', 'cloud', 'c#', '.net', 'python', 'sql', 'system design', 'oop', 'agile', 'api', 'rest', 'microservices'],
    preferredKeywords: ['typescript', 'react', 'angular', 'devops', 'kubernetes', 'power platform', 'sharepoint', 'teams', 'office 365', 'cosmos db'],
    sectionWeight: { technical: 0.40, leadership: 0.20, projects: 0.25, education: 0.15 },
    jobLevels: ['SDE-1', 'SDE-2', 'Principal', 'Partner'],
  },
  {
    id: 'meta', name: 'Meta', tier: 'FAANG',
    color: '#0082FB', bg: 'from-blue-600/20 to-indigo-500/10', border: 'border-blue-600/30',
    requiredKeywords: ['react', 'javascript', 'python', 'php', 'hack', 'data structures', 'algorithms', 'distributed systems', 'system design', 'social graph'],
    preferredKeywords: ['graphql', 'relay', 'pytorch', 'opencv', 'ar/vr', 'instagram', 'whatsapp', 'memcache', 'cassandra', 'presto'],
    sectionWeight: { technical: 0.45, leadership: 0.15, projects: 0.30, education: 0.10 },
    jobLevels: ['E3', 'E4', 'E5', 'E6', 'E7'],
  },
  {
    id: 'netflix', name: 'Netflix', tier: 'FAANG',
    color: '#E50914', bg: 'from-red-500/20 to-rose-500/10', border: 'border-red-500/30',
    requiredKeywords: ['java', 'python', 'scala', 'microservices', 'cloud', 'aws', 'system design', 'streaming', 'data engineering', 'chaos engineering'],
    preferredKeywords: ['spring', 'cassandra', 'kafka', 'spark', 'gradle', 'devops', 'monitoring', 'grafana', 'ab testing', 'recommendation'],
    sectionWeight: { technical: 0.50, leadership: 0.20, projects: 0.20, education: 0.10 },
    jobLevels: ['IC3', 'IC4', 'IC5', 'IC6'],
  },
  {
    id: 'linkedin', name: 'LinkedIn', tier: 'Top Tech',
    color: '#0A66C2', bg: 'from-blue-700/20 to-blue-500/10', border: 'border-blue-700/30',
    requiredKeywords: ['java', 'python', 'hadoop', 'spark', 'kafka', 'rest api', 'microservices', 'sql', 'nosql', 'system design'],
    preferredKeywords: ['scala', 'voldemort', 'espresso', 'pinot', 'venice', 'datastream', 'recruiter', 'talent solutions', 'machine learning'],
    sectionWeight: { technical: 0.40, leadership: 0.20, projects: 0.25, education: 0.15 },
    jobLevels: ['SE-1', 'SE-2', 'SE-3', 'Staff', 'Principal'],
  },
  {
    id: 'apple', name: 'Apple', tier: 'FAANG',
    color: '#A2AAAD', bg: 'from-slate-400/20 to-gray-500/10', border: 'border-slate-400/30',
    requiredKeywords: ['swift', 'objective-c', 'ios', 'macos', 'xcode', 'python', 'c++', 'system design', 'algorithms', 'privacy'],
    preferredKeywords: ['swiftui', 'core ml', 'metal', 'arkit', 'watchos', 'tvos', 'cocoa', 'instruments', 'siri', 'homekit'],
    sectionWeight: { technical: 0.45, leadership: 0.15, projects: 0.30, education: 0.10 },
    jobLevels: ['ICT2', 'ICT3', 'ICT4', 'ICT5', 'ICT6'],
  },
  {
    id: 'infosys', name: 'Infosys', tier: 'Top MNC',
    color: '#007CC3', bg: 'from-blue-500/20 to-teal-500/10', border: 'border-blue-500/30',
    requiredKeywords: ['java', 'python', 'sql', 'agile', 'testing', 'restful api', 'spring boot', 'git', 'communication', 'teamwork'],
    preferredKeywords: ['angular', 'react', 'microservices', 'aws', 'azure', 'docker', 'jenkins', 'selenium', 'quality assurance', 'client management'],
    sectionWeight: { technical: 0.35, leadership: 0.20, projects: 0.25, education: 0.20 },
    jobLevels: ['SE', 'SSE', 'Tech Lead', 'Principal Architect'],
  },
  {
    id: 'techmahindra', name: 'TechMahindra', tier: 'Top MNC',
    color: '#C8102E', bg: 'from-red-600/20 to-orange-500/10', border: 'border-red-600/30',
    requiredKeywords: ['java', 'python', 'sql', 'testing', 'agile', 'scrum', 'communication', 'networking', 'cloud', 'api'],
    preferredKeywords: ['5g', 'telecom', 'bss/oss', 'salesforce', 'sap', 'blockchain', 'iot', 'devops', 'automation', 'client management'],
    sectionWeight: { technical: 0.35, leadership: 0.20, projects: 0.25, education: 0.20 },
    jobLevels: ['Associate', 'SE', 'SSE', 'Tech Lead', 'Architect'],
  },
  {
    id: 'wipro', name: 'Wipro', tier: 'Top MNC',
    color: '#341C56', bg: 'from-purple-700/20 to-indigo-500/10', border: 'border-purple-700/30',
    requiredKeywords: ['java', 'python', 'sql', 'testing', 'agile', 'communication', 'cloud', 'devops', 'rest api'],
    preferredKeywords: ['salesforce', 'sap', 'servicenow', 'aws', 'azure', 'digital transformation', 'consulting', 'bpm', 'erp'],
    sectionWeight: { technical: 0.35, leadership: 0.20, projects: 0.25, education: 0.20 },
    jobLevels: ['Project Engineer', 'Engineer', 'Senior Engineer', 'Lead'],
  },
  {
    id: 'tcs', name: 'TCS', tier: 'Top MNC',
    color: '#5B2D8E', bg: 'from-purple-600/20 to-violet-500/10', border: 'border-purple-600/30',
    requiredKeywords: ['java', 'python', 'sql', 'testing', 'agile', 'communication', 'teamwork', 'cloud', 'api'],
    preferredKeywords: ['cobol', 'mainframe', 'sap', 'oracle', 'salesforce', 'aws', 'machine learning', 'rpa', 'digital'],
    sectionWeight: { technical: 0.35, leadership: 0.20, projects: 0.25, education: 0.20 },
    jobLevels: ['DT', 'ASE', 'SE', 'IT Analyst', 'Lead'],
  },
  {
    id: 'accenture', name: 'Accenture', tier: 'Top MNC',
    color: '#A100FF', bg: 'from-purple-500/20 to-pink-500/10', border: 'border-purple-500/30',
    requiredKeywords: ['consulting', 'cloud', 'python', 'java', 'sql', 'agile', 'communication', 'problem solving', 'client management'],
    preferredKeywords: ['salesforce', 'sap', 'azure', 'aws', 'google cloud', 'data analytics', 'ai', 'blockchain', 'iot', 'strategy'],
    sectionWeight: { technical: 0.30, leadership: 0.30, projects: 0.25, education: 0.15 },
    jobLevels: ['Analyst', 'Associate', 'Senior Analyst', 'Manager', 'Senior Manager'],
  },
  {
    id: 'ibm', name: 'IBM', tier: 'Top MNC',
    color: '#006CB0', bg: 'from-blue-600/20 to-sky-500/10', border: 'border-blue-600/30',
    requiredKeywords: ['cloud', 'ai', 'python', 'java', 'sql', 'devops', 'kubernetes', 'openshift', 'watson', 'consulting'],
    preferredKeywords: ['z/os', 'mainframe', 'blockchain', 'quantum', 'power systems', 'red hat', 'ansible', 'security', 'data science'],
    sectionWeight: { technical: 0.40, leadership: 0.20, projects: 0.25, education: 0.15 },
    jobLevels: ['Associate', 'Specialist', 'Senior Specialist', 'Managing Consultant'],
  },
  {
    id: 'uber', name: 'Uber', tier: 'Top Tech',
    color: '#000000', bg: 'from-gray-800/40 to-slate-700/20', border: 'border-gray-700/40',
    requiredKeywords: ['golang', 'python', 'java', 'microservices', 'distributed systems', 'real-time', 'sql', 'nosql', 'system design', 'scalability'],
    preferredKeywords: ['kafka', 'presto', 'cassandra', 'riak', 'maps', 'geolocation', 'machine learning', 'data engineering', 'payments'],
    sectionWeight: { technical: 0.50, leadership: 0.15, projects: 0.25, education: 0.10 },
    jobLevels: ['SE-1', 'SE-2', 'Staff', 'Principal'],
  },
  {
    id: 'adobe', name: 'Adobe', tier: 'Top Tech',
    color: '#FF0000', bg: 'from-red-500/20 to-rose-500/10', border: 'border-red-500/30',
    requiredKeywords: ['java', 'python', 'javascript', 'cloud', 'aws', 'microservices', 'system design', 'creative', 'api', 'analytics'],
    preferredKeywords: ['creative cloud', 'experience cloud', 'document cloud', 'machine learning', 'computer vision', 'adobe xd', 'photoshop api'],
    sectionWeight: { technical: 0.40, leadership: 0.20, projects: 0.30, education: 0.10 },
    jobLevels: ['MTS-1', 'MTS-2', 'MTS-3', 'Principal', 'Architect'],
  },
]

// ── Score calculator based on actual resume content ─────────────────────────
function calculateCompanyScore(content: string, company: typeof MNC_COMPANIES[0], fileType: { isPdf: boolean; isDocx: boolean }) {
  const lower = content.toLowerCase()
  const words = content.split(/\s+/).length

  // Required keyword match
  const reqFound = company.requiredKeywords.filter(k => lower.includes(k.toLowerCase()))
  const prefFound = company.preferredKeywords.filter(k => lower.includes(k.toLowerCase()))

  const reqScore = Math.round((reqFound.length / company.requiredKeywords.length) * 100)
  const prefScore = Math.round((prefFound.length / company.preferredKeywords.length) * 100)
  const keywordScore = Math.round(reqScore * 0.7 + prefScore * 0.3)

  // Section presence
  const sectionKeywords = ['experience', 'education', 'skills', 'projects', 'summary', 'objective', 'achievements', 'certifications']
  const foundSections = sectionKeywords.filter(k => lower.includes(k))
  const sectionsScore = Math.min(100, Math.round((foundSections.length / sectionKeywords.length) * 100))

  // Formatting
  const formatScore = fileType.isPdf ? 90 : fileType.isDocx ? 78 : 62

  // Content depth
  const contentScore = Math.min(100, Math.round((words / 600) * 100))

  // Weighted total
  const total = Math.round(
    keywordScore * 0.50 +
    sectionsScore * 0.20 +
    formatScore * 0.15 +
    contentScore * 0.15
  )

  return {
    score: Math.min(99, Math.max(25, total)),
    keywordScore,
    reqFound,
    prefFound,
    missingRequired: company.requiredKeywords.filter(k => !lower.includes(k.toLowerCase())).slice(0, 5),
  }
}

interface ATSResult {
  companyId: string
  overallScore: number
  breakdown: { keywords: number; formatting: number; readability: number; sections: number; atsCompatibility: number }
  strengths: string[]
  improvements: string[]
  foundKeywords: string[]
  missingKeywords: string[]
}

function ScoreRing({ score, size = 80, color }: { score: number; size?: number; color?: string }) {
  const r = (size / 2) - 8
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const c = color || (score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444')

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={6} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={c} strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        className="rotate-90" transform={`rotate(90, ${size / 2}, ${size / 2})`}
        fill={c} fontSize={size > 60 ? 18 : 13} fontWeight="bold">
        {score}%
      </text>
    </svg>
  )
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-semibold text-white">{value}%</span>
      </div>
      <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.5 }}
        />
      </div>
    </div>
  )
}

interface ATSScoreWidgetProps { compact?: boolean }

export function ATSScoreWidget({ compact = false }: ATSScoreWidgetProps) {
  const [result, setResult] = useState<ATSResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<string>('google')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const company = MNC_COMPANIES.find(c => c.id === selectedCompany) || MNC_COMPANIES[1]

  const handleFile = async (file: File) => {
    setLoading(true)
    setError(null)
    setFileName(file.name)
    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsText(file)
      }).catch(() => '')

      const content = text || file.name
      const lower = content.toLowerCase()
      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf')
      const isDocx = file.name.endsWith('.docx') || file.name.endsWith('.doc')
      const words = content.split(/\s+/).length

      const { score, keywordScore, reqFound, prefFound, missingRequired } = calculateCompanyScore(content, company, { isPdf, isDocx })

      const sectionKeywords = ['experience', 'education', 'skills', 'projects', 'summary', 'achievements']
      const foundSections = sectionKeywords.filter(k => lower.includes(k))
      const sectionsScore = Math.min(100, Math.round((foundSections.length / sectionKeywords.length) * 100))
      const formatScore = isPdf ? 90 : isDocx ? 78 : 62
      const readabilityScore = Math.min(95, Math.round((words / 600) * 100))

      const allFound = [...reqFound, ...prefFound.slice(0, 4)]

      setResult({
        companyId: company.id,
        overallScore: score,
        breakdown: {
          keywords: keywordScore,
          formatting: formatScore,
          readability: Math.max(40, readabilityScore),
          sections: sectionsScore,
          atsCompatibility: Math.round((keywordScore * 0.4 + formatScore * 0.3 + sectionsScore * 0.3)),
        },
        strengths: [
          ...(reqFound.length >= 5 ? [`Matches ${reqFound.length} of ${company.requiredKeywords.length} required ${company.name} skills`] : []),
          ...(isPdf ? ['PDF format is preferred by most ATS systems'] : []),
          ...(words > 400 ? ['Resume has adequate content depth'] : []),
          ...(prefFound.length > 3 ? [`Bonus: ${prefFound.slice(0, 2).join(', ')} preferred at ${company.name}`] : []),
        ].filter(Boolean).slice(0, 3),
        improvements: [
          ...(missingRequired.length > 0 ? [`Add ${company.name}-required skills: ${missingRequired.slice(0, 3).join(', ')}`] : []),
          ...(sectionsScore < 80 ? ['Include all key sections: Summary, Experience, Skills, Projects'] : []),
          ...(!isPdf ? ['Convert to PDF for better ATS compatibility'] : []),
          `Tailor keywords to ${company.name}'s ${company.jobLevels[1]} role requirements`,
        ].slice(0, 3),
        foundKeywords: allFound.slice(0, 8),
        missingKeywords: missingRequired,
      })
    } catch {
      setError('Failed to analyze resume. Please try a PDF or DOCX file.')
    } finally {
      setLoading(false)
    }
  }

  const tierColors: Record<string, string> = { FAANG: 'text-amber-400', 'Top Tech': 'text-blue-400', 'Top MNC': 'text-emerald-400' }

  return (
    <div className={`bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden`}>
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700/40 bg-slate-800/30">
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-500">
          <Target className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-white text-sm">ATS Resume Score</p>
          <p className="text-xs text-slate-400">Match your resume to top MNCs & tech companies</p>
        </div>
        {result && (
          <button onClick={() => { setResult(null); setFileName(null) }}
            className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Company Selector */}
        <div className="relative">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Select Company</p>
          <button
            onClick={() => setDropdownOpen(v => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-700/60 bg-slate-800/60 hover:border-slate-600 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-white">{company.name}</span>
              <span className={`text-xs font-medium ${tierColors[company.tier] || 'text-slate-400'}`}>{company.tier}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute z-50 top-full mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto"
              >
                {['FAANG', 'Top Tech', 'Top MNC'].map(tier => (
                  <div key={tier}>
                    <div className="px-3 py-1.5 bg-slate-800/60">
                      <span className={`text-xs font-bold uppercase tracking-wider ${tierColors[tier]}`}>{tier}</span>
                    </div>
                    {MNC_COMPANIES.filter(c => c.tier === tier).map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedCompany(c.id); setDropdownOpen(false); setResult(null); setFileName(null) }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-800 transition-colors ${selectedCompany === c.id ? 'bg-slate-800/80' : ''}`}
                      >
                        <span className="text-sm font-medium text-white">{c.name}</span>
                        {selectedCompany === c.id && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 ml-auto" />}
                      </button>
                    ))}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Upload */}
        {!result && !loading && (
          <>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <button onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center gap-3 py-6 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl text-slate-400 hover:text-emerald-400 transition-all group">
              <div className="p-3 rounded-full bg-slate-800 group-hover:bg-emerald-500/10 transition-colors">
                <FileText className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Upload Resume / CV</p>
                <p className="text-xs text-slate-500 mt-0.5">Check score vs <span className="font-semibold" style={{ color: company.color }}>{company.name}</span></p>
              </div>
            </button>
          </>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="relative">
              <Loader2 className="w-10 h-10 animate-spin" style={{ color: company.color }} />
              <div className="absolute inset-0 rounded-full border-2 border-current animate-ping opacity-20" />
            </div>
            <div className="text-center">
              <p className="text-sm text-white font-medium">Analyzing against {company.name} ATS…</p>
              <p className="text-xs text-slate-400 mt-0.5">Matching keywords & scoring resume</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Score header */}
              <div className={`flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r ${company.bg} border ${company.border}`}>
                <ScoreRing score={result.overallScore} size={72} color={company.color} />
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">ATS Match Score</p>
                  <p className="text-2xl font-black text-white">{result.overallScore}%</p>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: company.color }}>{company.name} — {company.tier}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {result.overallScore >= 80 ? '🟢 Strong match — likely to pass ATS' :
                     result.overallScore >= 60 ? '🟡 Moderate match — improve keywords' :
                     '🔴 Weak match — tailor resume for this company'}
                  </p>
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Score Breakdown</p>
                <Bar label="Keyword Match" value={result.breakdown.keywords} color={company.color} />
                <Bar label="Formatting" value={result.breakdown.formatting} color="#3b82f6" />
                <Bar label="Readability" value={result.breakdown.readability} color="#8b5cf6" />
                <Bar label="Sections" value={result.breakdown.sections} color="#f59e0b" />
                <Bar label="ATS Compatibility" value={result.breakdown.atsCompatibility} color="#ec4899" />
              </div>

              {/* Found keywords */}
              {result.foundKeywords.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Matched Keywords</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.foundKeywords.map(k => (
                      <span key={k} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                        <CheckCircle className="w-2.5 h-2.5" />{k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing */}
              {result.missingKeywords.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Missing {company.name} Keywords</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.missingKeywords.map(k => (
                      <span key={k} className="text-xs px-2.5 py-1 bg-red-500/10 text-red-400 rounded-full border border-red-500/20">{k}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick wins */}
              {result.improvements.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    <Zap className="w-3 h-3 inline mr-1 text-amber-400" />Quick Wins for {company.name}
                  </p>
                  <div className="space-y-1.5">
                    {result.improvements.map((imp, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <TrendingUp className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                        {imp}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-xs transition-all">
                <Upload className="w-3.5 h-3.5" />Analyze another resume
              </button>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
