'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Folder, FolderOpen, File, FileCode, FileText, Image, Package } from 'lucide-react'
import type { FileNode } from '@/types/projects'

const EXT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ts: FileCode, tsx: FileCode, js: FileCode, jsx: FileCode,
  json: FileText, md: FileText, txt: FileText, yaml: FileText, yml: FileText,
  png: Image, jpg: Image, svg: Image, gif: Image,
  lock: Package, toml: FileText, env: FileText,
}

function getFileIcon(name: string): React.ComponentType<{ className?: string }> {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  return EXT_ICONS[ext] || File
}

function getFileColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (['ts', 'tsx'].includes(ext)) return 'text-blue-400'
  if (['js', 'jsx'].includes(ext)) return 'text-yellow-400'
  if (['json', 'yaml', 'yml', 'toml'].includes(ext)) return 'text-orange-400'
  if (['md', 'txt'].includes(ext)) return 'text-green-400'
  if (['png', 'jpg', 'svg', 'gif'].includes(ext)) return 'text-purple-400'
  if (ext === 'env') return 'text-red-400'
  return 'text-muted-foreground'
}

function TreeNode({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2)
  const isDir = node.type === 'directory'
  const FileIcon = isDir ? (open ? FolderOpen : Folder) : getFileIcon(node.name)
  const iconColor = isDir ? 'text-yellow-400' : getFileColor(node.name)

  return (
    <div>
      <motion.div
        className="flex items-center gap-1.5 py-0.5 px-2 rounded hover:bg-secondary/60 cursor-pointer group transition-colors"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => isDir && setOpen(o => !o)}
        whileHover={{ x: 2 }}
      >
        {isDir && (
          <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.15 }}>
            <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
          </motion.div>
        )}
        {!isDir && <span className="w-3" />}
        <FileIcon className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />
        <span className={`text-xs font-mono truncate ${isDir ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
          {node.name}
        </span>
        {isDir && node.children && (
          <span className="ml-auto text-[10px] text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity">
            {node.children.length}
          </span>
        )}
      </motion.div>

      <AnimatePresence>
        {isDir && open && node.children && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {node.children.map(child => (
              <TreeNode key={child.path} node={child} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function FolderTree({ nodes }: { nodes: FileNode[] }) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground/40">
        <p className="text-sm">No file structure available</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-[#0a0f1e] border border-border rounded-xl p-4 font-mono"
    >
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
        <FolderOpen className="w-4 h-4 text-yellow-400" />
        <span className="text-sm font-semibold text-muted-foreground">Project Structure</span>
        <span className="ml-auto text-xs text-muted-foreground/40">{nodes.length} items</span>
      </div>
      <div className="space-y-0.5 max-h-[600px] overflow-y-auto">
        {nodes.map(node => (
          <TreeNode key={node.path} node={node} depth={0} />
        ))}
      </div>
    </motion.div>
  )
}
