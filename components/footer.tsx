'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Github, Linkedin, Mail, ArrowUp, Instagram, Heart, Shield, FileText, Facebook } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePortfolioData } from '@/hooks/usePortfolioData'
import { useLanguage } from '@/lib/language-context'

export function Footer() {
  const { hero } = usePortfolioData()
  const { t } = useLanguage()
  const year = new Date().getFullYear()
  const [hasPrivacy, setHasPrivacy] = useState(false)
  const [hasTerms, setHasTerms] = useState(false)
  const [versionInfo, setVersionInfo] = useState<{ version: string; changes: string } | null>(null)

  useEffect(() => {
    fetch('/api/legal')
      .then(r => r.json())
      .then(d => {
        setHasPrivacy(!!d.privacy_policy?.trim())
        setHasTerms(!!d.terms_of_service?.trim())
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => {
        const s = d.settings || {}
        if (s.site_version) {
          setVersionInfo({ version: s.site_version, changes: s.site_changes || '' })
        }
      })
      .catch(() => {})
  }, [])

  const LeetCodeIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z"/>
    </svg>
  )
  const h = hero as typeof hero & { facebook?: string; leetcode?: string }
  const socialLinks = [
    hero.github    && { icon: Github,       href: hero.github,              label: 'GitHub' },
    hero.linkedin  && { icon: Linkedin,     href: hero.linkedin,            label: 'LinkedIn' },
    hero.email     && { icon: Mail,         href: `mailto:${hero.email}`,   label: 'Email' },
    hero.instagram && { icon: Instagram,    href: hero.instagram,           label: 'Instagram' },
    h.facebook     && { icon: Facebook,     href: h.facebook,               label: 'Facebook' },
    h.leetcode     && { icon: LeetCodeIcon, href: h.leetcode,               label: 'LeetCode' },
  ].filter(Boolean) as { icon: React.ComponentType<{ className?: string }>; href: string; label: string }[]

  const quickLinks = [
    [t('footer.nav.home'),'#'], [t('footer.nav.about'),'#about'], [t('footer.nav.skills'),'#skills'],
    [t('footer.nav.projects'),'#projects'], [t('footer.nav.devops'),'#devops'], [t('footer.nav.contact'),'#contact'], [t('footer.nav.journey'),'/journey']
  ]

  return (
    <footer className="border-t border-border bg-secondary/20 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-10 mb-12">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="col-span-2 md:col-span-1"
          >
            <div className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 mb-3">
              AS
            </div>
            <h3 className="font-bold text-lg mb-2">{hero.name}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{hero.title}</p>
            {hero.available && (
              <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-600 font-medium">{t('footer.open_to_opportunities')}</span>
              </div>
            )}
          </motion.div>

          {/* Quick links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">{t('footer.nav_heading')}</h3>
            <ul className="space-y-2">
              {quickLinks.map(([label, href]) => (
                <li key={label}>
                  <motion.a href={href} whileHover={{ x: 4 }} transition={{ type: 'spring', stiffness: 300 }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 group">
                    <span className="w-1 h-1 rounded-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {label}
                  </motion.a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Social */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">{t('footer.connect_heading')}</h3>
            <div className="flex flex-wrap gap-3">
              {socialLinks.map((s, i) => {
                const Icon = s.icon
                return (
                  <motion.a key={i} href={s.href}
                    target={s.href.startsWith('mailto') ? undefined : '_blank'}
                    rel="noopener noreferrer" aria-label={s.label}
                    whileHover={{ scale: 1.15, y: -3 }} whileTap={{ scale: 0.9 }}
                    className="p-2.5 bg-secondary rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-blue-600/30 hover:shadow-md transition-all">
                    <Icon className="w-4 h-4" />
                  </motion.a>
                )
              })}
            </div>
          </motion.div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border pt-8 flex flex-col items-center gap-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 text-center">
            © {year} {hero.name}. {t('footer.made_with')} <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> {t('footer.rights')}
          </p>

          {/* Legal links — only shown when content is set by admin */}
          {(hasPrivacy || hasTerms) && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-4"
            >
              {hasPrivacy && (
                <motion.a
                  href="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -2 }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-blue-500 transition-colors group"
                >
                  <Shield className="w-3 h-3 group-hover:text-blue-500 transition-colors" />
                  {t('footer.privacy_policy')}
                </motion.a>
              )}
              {hasPrivacy && hasTerms && (
                <span className="w-1 h-1 rounded-full bg-border" />
              )}
              {hasTerms && (
                <motion.a
                  href="/terms-of-service"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -2 }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-blue-500 transition-colors group"
                >
                  <FileText className="w-3 h-3 group-hover:text-blue-500 transition-colors" />
                  {t('footer.terms_of_service')}
                </motion.a>
              )}
            </motion.div>
          )}

          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button size="sm" variant="outline"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label="Scroll to top" className="gap-2 text-xs">
              <ArrowUp className="w-3.5 h-3.5" />{t('footer.back_to_top')}
            </Button>
          </motion.div>

          {/* Version info — fixed to absolute bottom-right corner */}
          {versionInfo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute bottom-4 right-6 flex flex-col items-end gap-0.5"
            >
              <span className="text-xs font-semibold text-foreground font-mono tracking-wide">
                v{versionInfo.version}
              </span>
              {versionInfo.changes && (
                <span className="text-[11px] font-medium text-foreground/70 max-w-[220px] text-right leading-tight" title={versionInfo.changes}>
                  {versionInfo.changes}
                </span>
              )}
            </motion.div>
          )}
        </div>
      </div>

    </footer>
  )
}
