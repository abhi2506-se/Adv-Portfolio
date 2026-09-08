'use client'

import { useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { ArchitectureAnalysis } from '@/types/projects'

// ── Lightweight React Flow alternative using SVG + absolute positioning ───────
// We implement a simple node-graph without requiring @xyflow/react
// to avoid heavy bundle size. For full React Flow, install and import it.

interface ArchNode {
  id: string
  label: string
  sublabel?: string
  x: number
  y: number
  color: string
  icon: string
  type: 'primary' | 'secondary' | 'db' | 'auth' | 'cloud'
}

interface ArchEdge {
  from: string
  to: string
  label?: string
  dashed?: boolean
}

function useArchNodes(arch: ArchitectureAnalysis): { nodes: ArchNode[]; edges: ArchEdge[] } {
  return useMemo(() => {
    const nodes: ArchNode[] = [
      {
        id: 'client', label: 'Client', sublabel: 'Browser / Mobile',
        x: 60, y: 160, color: '#3b82f6', icon: '🌐', type: 'primary',
      },
      {
        id: 'cdn', label: 'CDN / Edge', sublabel: 'Vercel / Cloudflare',
        x: 220, y: 80, color: '#6366f1', icon: '⚡', type: 'secondary',
      },
      {
        id: 'frontend', label: arch.frontend.framework, sublabel: arch.frontend.styling[0],
        x: 400, y: 160, color: '#8b5cf6', icon: '🎨', type: 'primary',
      },
      {
        id: 'backend', label: arch.backend.framework, sublabel: arch.backend.language,
        x: 600, y: 160, color: '#10b981', icon: '⚙️', type: 'primary',
      },
    ]
    const edges: ArchEdge[] = [
      { from: 'client', to: 'cdn', label: 'HTTPS' },
      { from: 'cdn', to: 'frontend' },
      { from: 'frontend', to: 'backend', label: arch.apis.style },
    ]

    if (arch.authentication.strategy[0] !== 'None') {
      nodes.push({
        id: 'auth', label: arch.authentication.providers[0] || 'Auth',
        sublabel: arch.authentication.strategy[0],
        x: 600, y: 60, color: '#ef4444', icon: '🔐', type: 'auth',
      })
      edges.push({ from: 'backend', to: 'auth', label: 'verify', dashed: true })
    }

    if (arch.database.name !== 'None') {
      nodes.push({
        id: 'db', label: arch.database.name, sublabel: arch.database.orm !== 'None' ? arch.database.orm : '',
        x: 780, y: 160, color: '#f59e0b', icon: '🗄️', type: 'db',
      })
      edges.push({ from: 'backend', to: 'db', label: 'query' })
    }

    if (arch.devops.hosting !== 'Unknown') {
      nodes.push({
        id: 'deploy', label: arch.devops.hosting, sublabel: arch.devops.containerization !== 'None' ? arch.devops.containerization : 'Serverless',
        x: 400, y: 300, color: '#06b6d4', icon: '🚀', type: 'cloud',
      })
      edges.push({ from: 'deploy', to: 'frontend', dashed: true })
    }

    return { nodes, edges }
  }, [arch])
}

// Simple SVG arrow path between two node centers
function edgePath(from: ArchNode, to: ArchNode): string {
  const fx = from.x + 70
  const fy = from.y + 30
  const tx = to.x
  const ty = to.y + 30
  const mx = (fx + tx) / 2
  return `M ${fx} ${fy} C ${mx} ${fy}, ${mx} ${ty}, ${tx} ${ty}`
}

export function ReactFlowArchitecture({ arch }: { arch: ArchitectureAnalysis }) {
  const { nodes, edges } = useArchNodes(arch)

  const maxX = Math.max(...nodes.map(n => n.x)) + 160
  const maxY = Math.max(...nodes.map(n => n.y)) + 100

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]))

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[#0a0f1e] border border-border rounded-xl overflow-hidden"
    >
      <div className="p-3 border-b border-border flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-400" />
        <span className="text-xs text-muted-foreground font-medium">Architecture Overview</span>
        <span className="ml-auto text-xs text-muted-foreground/50">{nodes.length} nodes · {edges.length} edges</span>
      </div>

      <div className="overflow-auto">
        <svg
          viewBox={`0 0 ${maxX + 40} ${maxY + 40}`}
          className="w-full"
          style={{ minHeight: 360 }}
        >
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#475569" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((edge, i) => {
            const from = nodeMap[edge.from]
            const to = nodeMap[edge.to]
            if (!from || !to) return null
            const path = edgePath(from, to)
            const mx = (from.x + 70 + to.x) / 2
            const my = (from.y + 30 + to.y + 30) / 2 - 8
            return (
              <g key={i}>
                <motion.path
                  d={path}
                  fill="none"
                  stroke="#334155"
                  strokeWidth={1.5}
                  strokeDasharray={edge.dashed ? '5,3' : undefined}
                  markerEnd="url(#arrowhead)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                />
                {edge.label && (
                  <text x={mx} y={my} textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="monospace">
                    {edge.label}
                  </text>
                )}
              </g>
            )
          })}

          {/* Nodes */}
          {nodes.map((node, i) => (
            <motion.g
              key={node.id}
              initial={{ opacity: 0, scale: 0.5, originX: node.x + 70, originY: node.y + 30 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 300 }}
            >
              {/* Shadow */}
              <rect x={node.x + 2} y={node.y + 2} width={140} height={58} rx={10}
                fill="rgba(0,0,0,0.4)" />
              {/* Card */}
              <rect x={node.x} y={node.y} width={140} height={58} rx={10}
                fill="#1e293b" stroke={node.color} strokeWidth={1.5} />
              {/* Color bar */}
              <rect x={node.x} y={node.y} width={4} height={58} rx={2} fill={node.color} />
              {/* Icon */}
              <text x={node.x + 18} y={node.y + 26} fontSize={16}>{node.icon}</text>
              {/* Label */}
              <text x={node.x + 42} y={node.y + 22} fill="#f8fafc" fontSize={11} fontWeight="700" fontFamily="sans-serif">
                {node.label.length > 14 ? node.label.slice(0, 14) + '…' : node.label}
              </text>
              {/* Sublabel */}
              {node.sublabel && (
                <text x={node.x + 42} y={node.y + 36} fill="#64748b" fontSize={9} fontFamily="sans-serif">
                  {node.sublabel.length > 18 ? node.sublabel.slice(0, 18) + '…' : node.sublabel}
                </text>
              )}
            </motion.g>
          ))}
        </svg>
      </div>
    </motion.div>
  )
}
