'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function PrivacyPolicyPage() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch('/api/legal')
      .then(r => r.json())
      .then(d => {
        if (d.privacy_policy?.trim()) {
          setContent(d.privacy_policy.trim())
        } else {
          setNotFound(true)
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Background glows matching portfolio theme */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyan-500/4 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-blue-600/3 rounded-full blur-3xl" />
      </div>

      {/* Subtle dot-grid background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-10 md:py-16">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-blue-500 transition-colors mb-10 group"
          >
            <motion.span whileHover={{ x: -3 }} transition={{ type: 'spring', stiffness: 400 }}>
              <ArrowLeft className="w-4 h-4" />
            </motion.span>
            Back to Portfolio
          </Link>
        </motion.div>

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32 gap-4"
            >
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-muted-foreground text-sm">Loading Privacy Policy…</p>
            </motion.div>
          )}

          {!loading && notFound && (
            <motion.div
              key="notfound"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32 gap-4 text-center"
            >
              <div className="p-4 rounded-2xl bg-secondary/60 border border-border">
                <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-1">Privacy Policy Not Available</h2>
                <p className="text-muted-foreground text-sm">This page hasn't been set up yet.</p>
              </div>
              <Link href="/" className="text-sm text-blue-500 hover:underline">← Return home</Link>
            </motion.div>
          )}

          {!loading && !notFound && (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-10"
              >
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                    className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-600/20"
                  >
                    <Shield className="w-5 h-5 text-white" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="h-px flex-1 bg-gradient-to-r from-blue-600/30 to-transparent"
                  />
                </div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.25 }}
                  className="text-3xl md:text-4xl font-extrabold mb-3"
                >
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
                    Privacy
                  </span>{' '}
                  Policy
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="text-muted-foreground text-sm"
                >
                  Last updated by site owner
                </motion.p>
              </motion.div>

              {/* Content card */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="bg-secondary/30 border border-border rounded-2xl overflow-hidden backdrop-blur-sm"
              >
                {/* Top accent bar */}
                <div className="h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-[length:200%_100%] animate-[shimmer_3s_linear_infinite]" />

                <div className="p-6 md:p-10">
                  {/* Render content — support both plain text and markdown-style headings */}
                  <div className="prose-legal">
                    {content.split('\n').map((line, i) => {
                      if (line.startsWith('## ')) {
                        return (
                          <motion.h2
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + i * 0.01 }}
                            className="text-lg font-bold mt-8 mb-3 first:mt-0 text-foreground flex items-center gap-2"
                          >
                            <span className="w-1.5 h-5 rounded bg-gradient-to-b from-blue-600 to-cyan-500 inline-block shrink-0" />
                            {line.replace('## ', '')}
                          </motion.h2>
                        )
                      }
                      if (line.startsWith('# ')) {
                        return (
                          <motion.h1
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + i * 0.01 }}
                            className="text-xl font-extrabold mt-8 mb-4 first:mt-0 text-foreground"
                          >
                            {line.replace('# ', '')}
                          </motion.h1>
                        )
                      }
                      if (line.startsWith('### ')) {
                        return (
                          <motion.h3
                            key={i}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 + i * 0.01 }}
                            className="text-base font-semibold mt-5 mb-2 text-foreground"
                          >
                            {line.replace('### ', '')}
                          </motion.h3>
                        )
                      }
                      if (line.startsWith('- ') || line.startsWith('* ')) {
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + i * 0.005 }}
                            className="flex items-start gap-2 my-1 ml-2"
                          >
                            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            <span className="text-sm text-muted-foreground leading-relaxed">{line.replace(/^[-*] /, '')}</span>
                          </motion.div>
                        )
                      }
                      if (line.trim() === '') {
                        return <div key={i} className="my-3" />
                      }
                      return (
                        <motion.p
                          key={i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 + i * 0.005 }}
                          className="text-sm text-muted-foreground leading-relaxed my-1"
                        >
                          {line}
                        </motion.p>
                      )
                    })}
                  </div>
                </div>
              </motion.div>

              {/* Footer note */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-center text-xs text-muted-foreground mt-10"
              >
                Questions? Reach out via the{' '}
                <Link href="/#contact" className="text-blue-500 hover:underline">contact form</Link>.
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
      `}</style>
    </div>
  )
}
