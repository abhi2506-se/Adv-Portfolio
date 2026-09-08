'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, Download,
  GitBranch, Database, Network, Layers, Server, ArrowRightLeft, FolderTree
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { DiagramData } from '@/types/projects'

interface DiagramViewerProps {
  diagrams: DiagramData
  projectName: string
}

const DIAGRAM_TABS = [
  { key: 'systemArchitecture', label: 'System Architecture', icon: Network },
  { key: 'sequenceDiagram', label: 'Sequence Flow', icon: ArrowRightLeft },
  { key: 'erDiagram', label: 'ER Diagram', icon: Database },
  { key: 'componentDiagram', label: 'Component Map', icon: Layers },
  { key: 'deploymentDiagram', label: 'Deployment', icon: Server },
  { key: 'dataFlowDiagram', label: 'Data Flow', icon: GitBranch },
]

export function DiagramViewer({ diagrams, projectName }: DiagramViewerProps) {
  const [activeKey, setActiveKey] = useState<keyof DiagramData>('systemArchitecture')
  const [fullscreen, setFullscreen] = useState(false)
  const [scale, setScale] = useState(1)
  const [rendered, setRendered] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const renderMermaid = useCallback(async (key: string, code: string) => {
    if (rendered[key]) return
    setLoading(true)
    try {
      const mermaid = (await import('mermaid')).default
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          primaryColor: '#3b82f6',
          primaryTextColor: '#f1f5f9',
          primaryBorderColor: '#60a5fa',
          lineColor: '#64748b',
          secondaryColor: '#1e293b',
          tertiaryColor: '#0f172a',
          background: '#0f172a',
          mainBkg: '#1e293b',
          nodeBorder: '#475569',
          clusterBkg: '#1e293b',
          titleColor: '#f1f5f9',
          edgeLabelBackground: '#1e293b',
          actorBkg: '#1e293b',
          actorBorder: '#3b82f6',
          actorTextColor: '#f1f5f9',
          noteBkgColor: '#1e293b',
          noteTextColor: '#94a3b8',
        },
        securityLevel: 'loose',
        flowchart: { useMaxWidth: true, htmlLabels: true },
        sequence: { useMaxWidth: true },
      })
      const id = `mermaid-${key}-${Date.now()}`
      const { svg } = await mermaid.render(id, code)
      setRendered(prev => ({ ...prev, [key]: svg }))
    } catch (err) {
      console.error('Mermaid render error', err)
      setRendered(prev => ({ ...prev, [key]: `<div class="text-red-400 p-4 text-sm">Diagram render error. See console.</div>` }))
    } finally {
      setLoading(false)
    }
  }, [rendered])

  useEffect(() => {
    const code = diagrams[activeKey as keyof DiagramData]
    if (typeof code === 'string' && code) {
      renderMermaid(activeKey as string, code)
    }
  }, [activeKey, diagrams])

  const handleZoom = (dir: 'in' | 'out' | 'reset') => {
    setScale(s => dir === 'in' ? Math.min(s + 0.25, 3) : dir === 'out' ? Math.max(s - 0.25, 0.25) : 1)
  }

  const downloadSVG = () => {
    const svg = rendered[activeKey as string]
    if (!svg) return
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectName}-${activeKey}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  const currentDiagram = diagrams[activeKey as keyof DiagramData]
  const isFolderTree = activeKey === 'folderStructure'

  return (
    <div className={`${fullscreen ? 'fixed inset-0 z-50 bg-background p-4 flex flex-col' : ''}`}>
      <div className="flex flex-col h-full">
        {/* Diagram tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {DIAGRAM_TABS.map(({ key, label, icon: Icon }) => (
            <motion.button
              key={key}
              onClick={() => setActiveKey(key as keyof DiagramData)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${activeKey === key
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </motion.button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {DIAGRAM_TABS.find(t => t.key === activeKey)?.label}
            </Badge>
            {rendered[activeKey as string] && (
              <Badge variant="secondary" className="text-xs text-green-400 border-green-500/20">
                ✓ Generated
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => handleZoom('out')} disabled={scale <= 0.25}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="sm" onClick={() => handleZoom('in')} disabled={scale >= 3}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleZoom('reset')}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={downloadSVG} disabled={!rendered[activeKey as string]}>
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setFullscreen(f => !f)}>
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Diagram canvas */}
        <div
          ref={containerRef}
          className="flex-1 bg-[#0a0f1e] border border-border rounded-xl overflow-auto relative min-h-[500px]"
          style={{ cursor: 'grab' }}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                <p className="text-sm text-muted-foreground">Rendering diagram…</p>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {isFolderTree ? (
              <motion.div
                key="folder"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-6"
              >
                <pre className="text-xs text-green-400 font-mono leading-relaxed whitespace-pre">
                  {typeof currentDiagram === 'string' ? currentDiagram : ''}
                </pre>
              </motion.div>
            ) : rendered[activeKey as string] ? (
              <motion.div
                key={activeKey}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-center min-h-full p-6"
                style={{ transform: `scale(${scale})`, transformOrigin: 'center top' }}
              >
                <div
                  className="mermaid-output max-w-full"
                  dangerouslySetInnerHTML={{ __html: rendered[activeKey as string] }}
                />
              </motion.div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground/40">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center mx-auto mb-3">
                    {(() => {
                      const tab = DIAGRAM_TABS.find(t => t.key === activeKey)
                      const Icon = tab?.icon || Network
                      return <Icon className="w-5 h-5" />
                    })()}
                  </div>
                  <p className="text-sm">Loading diagram…</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Mermaid source */}
        <details className="mt-3">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            View Mermaid source
          </summary>
          <pre className="mt-2 text-xs bg-secondary/50 rounded-lg p-4 overflow-auto max-h-48 font-mono text-muted-foreground">
            {typeof currentDiagram === 'string' ? currentDiagram : ''}
          </pre>
        </details>
      </div>
    </div>
  )
}
