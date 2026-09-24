'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Database, ChevronDown, ChevronRight, Key, Link2, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { DatabaseModel } from '@/types/projects'

interface DataDictionaryProps {
  models: DatabaseModel[]
}

export function DataDictionary({ models }: DataDictionaryProps) {
  const [expandedModel, setExpandedModel] = useState<string | null>(
    models[0]?.name ?? null
  )

  if (!models.length) {
    return (
      <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
        <Database className="w-10 h-10 opacity-30" />
        <p className="text-sm">No database models detected.</p>
        <p className="text-xs opacity-60">Add a Prisma schema to enable auto-detection.</p>
      </div>
    )
  }

  const TYPE_COLORS: Record<string, string> = {
    String: 'text-green-400',
    Int: 'text-blue-400',
    Float: 'text-cyan-400',
    Boolean: 'text-orange-400',
    DateTime: 'text-purple-400',
    Json: 'text-yellow-400',
    BigInt: 'text-blue-300',
    Bytes: 'text-pink-400',
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-5 h-5 text-amber-400" />
        <h3 className="font-semibold">Data Dictionary</h3>
        <Badge variant="secondary" className="text-xs">{models.length} models</Badge>
      </div>

      {models.map((model, mi) => (
        <motion.div
          key={model.name}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: mi * 0.07 }}
          className="bg-secondary/30 border border-border rounded-xl overflow-hidden"
        >
          {/* Model header */}
          <button
            onClick={() => setExpandedModel(prev => prev === model.name ? null : model.name)}
            className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors text-left"
          >
            <motion.div animate={{ rotate: expandedModel === model.name ? 90 : 0 }}>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </motion.div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Database className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold font-mono">{model.name}</p>
              <p className="text-xs text-muted-foreground">{model.fields.length} fields</p>
            </div>
            {model.relations.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-blue-400">
                <Link2 className="w-3 h-3" />
                {model.relations.length} relation{model.relations.length > 1 ? 's' : ''}
              </div>
            )}
          </button>

          {/* Fields table */}
          <AnimatePresence>
            {expandedModel === model.name && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="border-t border-border">
                  {/* Table header */}
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-secondary/40 text-xs font-semibold text-muted-foreground">
                    <span className="col-span-4">Field</span>
                    <span className="col-span-3">Type</span>
                    <span className="col-span-2">Required</span>
                    <span className="col-span-3">Notes</span>
                  </div>

                  {model.fields.map((field, fi) => (
                    <motion.div
                      key={field.name}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: fi * 0.04 }}
                      className="grid grid-cols-12 gap-2 px-4 py-2.5 border-t border-border/50 hover:bg-secondary/20 transition-colors text-sm"
                    >
                      {/* Field name */}
                      <div className="col-span-4 flex items-center gap-2">
                        {field.name === 'id' && (
                          <Key className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                        )}
                        {field.relation && (
                          <Link2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        )}
                        <span className="font-mono text-xs truncate">{field.name}</span>
                      </div>

                      {/* Type */}
                      <div className="col-span-3">
                        <code className={`text-xs font-mono ${TYPE_COLORS[field.type] || 'text-muted-foreground'}`}>
                          {field.type}
                        </code>
                      </div>

                      {/* Required */}
                      <div className="col-span-2">
                        {field.required ? (
                          <span className="text-xs text-green-400">Yes</span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">Optional</span>
                        )}
                      </div>

                      {/* Notes */}
                      <div className="col-span-3 flex flex-wrap gap-1">
                        {field.unique && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-purple-500/20 text-purple-400 border-purple-500/30">
                            unique
                          </Badge>
                        )}
                        {field.relation && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-blue-500/20 text-blue-400 border-blue-500/30">
                            → {field.relation}
                          </Badge>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Relations */}
                {model.relations.length > 0 && (
                  <div className="px-4 py-3 bg-secondary/20 border-t border-border flex flex-wrap gap-2 items-center">
                    <span className="text-xs text-muted-foreground">Relations:</span>
                    {model.relations.map(rel => (
                      <Badge key={rel} variant="outline" className="text-xs border-blue-500/30 text-blue-400">
                        <Link2 className="w-3 h-3 mr-1" />{rel}
                      </Badge>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  )
}
