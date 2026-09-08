'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Scale, Shield, Mail, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TermsConditionsProps {
  open: boolean
  onClose: () => void
}

export function TermsConditions({ open, onClose }: TermsConditionsProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-background border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/10 rounded-lg">
                  <Scale className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Terms & Conditions</h2>
                  <p className="text-xs text-muted-foreground">Last updated: April 2026</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">1. Acceptance of Terms</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  By accessing and using this portfolio website, you agree to be bound by these Terms & Conditions.
                  If you do not agree with any part of these terms, please do not use this website.
                </p>
              </section>

              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">2. Purpose of Website</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This portfolio website is maintained by <strong>Abhishek Singh</strong> for professional showcase purposes.
                  The site displays information about services, projects, skills, experience, and provides a contact mechanism
                  for potential employers, clients, and collaborators.
                </p>
              </section>

              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">3. Contact & Communication</h3>
                <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                  <p>When you submit a message through the contact form:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>You agree to provide accurate and truthful information</li>
                    <li>You must not submit spam, promotional content, or unsolicited marketing</li>
                    <li>All communications should be professional and respectful</li>
                    <li>Responses are provided at the discretion of the website owner</li>
                  </ul>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">4. Prohibited Conduct</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                  You agree NOT to use this website for:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Transmitting any unlawful, threatening, abusive, defamatory, or obscene material</li>
                  <li>Sending spam, chain letters, or any form of automated requests</li>
                  <li>Attempting to gain unauthorized access to any systems or networks</li>
                  <li>Interfering with the proper functioning of the website</li>
                  <li>Impersonating any person or entity</li>
                  <li>Collecting or storing personal information of other users without consent</li>
                  <li>Using any automated tools, bots, or scrapers without explicit permission</li>
                </ul>
              </section>

              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">5. Content & Intellectual Property</h3>
                <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                  <p>All content on this website including but not limited to:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Text, images, code, and design elements are the property of Abhishek Singh</li>
                    <li>You may not copy, reproduce, distribute, or create derivative works without permission</li>
                    <li>You may share links to this website for non-commercial purposes with proper attribution</li>
                  </ul>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">6. AI Chatbot</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The AI chatbot on this website is provided as a convenience feature to help visitors learn about
                  Abhishek Singh's background. Responses generated by the chatbot are for informational purposes only
                  and should not be considered as formal communications or binding agreements.
                </p>
              </section>

              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">7. External Links</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This website may contain links to external websites. These links are provided for convenience only.
                  The inclusion of any links does not imply endorsement or association with those websites.
                  Visiting external links is at your own risk.
                </p>
              </section>

              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">8. Privacy</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your use of this website is also governed by our Privacy Policy. Any personal information collected
                  through the contact form is used solely for communication purposes and is never sold to third parties.
                </p>
              </section>

              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">9. Disclaimer</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This website is provided "as is" without warranties of any kind, either express or implied.
                  While efforts are made to keep information accurate and up-to-date, no guarantee is made
                  regarding the accuracy, completeness, or reliability of any content.
                </p>
              </section>

              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">10. Limitation of Liability</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Under no circumstances shall Abhishek Singh be liable for any direct, indirect, incidental,
                  special, or consequential damages arising from your use of or inability to use this website.
                </p>
              </section>

              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">11. Modifications</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  These Terms & Conditions may be updated at any time without prior notice. Continued use of the
                  website after any changes constitutes acceptance of the modified terms.
                </p>
              </section>

              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">12. Governing Law</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  These terms shall be governed by and construed in accordance with applicable laws. Any disputes
                  shall be resolved through good-faith negotiation before any legal action.
                </p>
              </section>

              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">13. Contact</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>For questions about these Terms & Conditions, please contact via the portfolio contact form.</span>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-secondary/30">
              <Button onClick={onClose} className="w-full">
                I Understand
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
