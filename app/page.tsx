import { Hero } from '@/components/hero'
import { About } from '@/components/about'
import { Skills } from '@/components/skills'
import { Experience } from '@/components/experience'
import { Projects } from '@/components/projects'
import { DevOpsSection } from '@/components/devops-section'
import { ThinkingProcess } from '@/components/thinking-process'
import { Contact } from '@/components/contact'
import { Footer } from '@/components/footer'
import { WhyHireMe } from '@/components/why-hire-me'
import { AdminToggle } from '@/components/admin-toggle'
import { CursorSpotlight } from '@/components/cursor-spotlight'
import { TerminalWidget } from '@/components/terminal-mode'
import { LiveStatusWidget } from '@/components/live-status-widget'
import { VisitorAnalytics } from '@/components/visitor-analytics'
import { Testimonials } from '@/components/testimonials'
import { Certifications } from '@/components/certifications'
import { Blog } from '@/components/blog'
import { GithubStats } from '@/components/github-stats'
import { PowerBIDashboard } from '@/components/powerbi-dashboard'
import { SocialFollowers } from '@/components/social-followers'
import { ClientPortalAnalytics } from '@/components/portal/client-portal-analytics'
import { WebsiteAudit } from '@/components/website-audit'

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground relative overflow-x-hidden neural-grid">
      <CursorSpotlight />
      <AdminToggle />
      <TerminalWidget />
      <LiveStatusWidget />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <Hero />

      {/* ── ABOUT ─────────────────────────────────────────────────────────── */}
      <section className="border-t border-border" id="about">
        <About />
      </section>

      {/* ── SKILLS ────────────────────────────────────────────────────────── */}
      <section className="border-t border-border" id="skills">
        <Skills />
      </section>

      {/* ── EXPERIENCE & EDUCATION ────────────────────────────────────────── */}
      <section className="border-t border-border" id="experience">
        <Experience />
      </section>

      {/* ── PROJECTS ──────────────────────────────────────────────────────── */}
      <section className="border-t border-border" id="projects">
        <Projects />
      </section>

      {/* ── DEVOPS & CLOUD ────────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <DevOpsSection />
      </section>

      {/* ── CERTIFICATIONS ────────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <Certifications />
      </section>

      {/* ── THINKING PROCESS ──────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <ThinkingProcess />
      </section>

      {/* ── GITHUB STATS ──────────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <GithubStats />
      </section>

      {/* ── BLOG ──────────────────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <Blog />
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <Testimonials />
      </section>

      {/* ── FREE WEBSITE AUDIT / BUILD SOFTWARE — replaces the old direct
           "Client Portal" navbar link. Paste a URL, get a score + suggestions,
           then "Connect" routes into the portal to sign up/sign in. ────── */}
      <section className="border-t border-border" id="audit">
        <WebsiteAudit />
      </section>

      {/* ── CLIENT PORTAL — LIVE STATS (real DB data, hides itself until
           there is at least one real project) ─────────────────────────── */}
      <section className="border-t border-border container mx-auto px-4">
        <ClientPortalAnalytics />
      </section>

      {/* ── WHY HIRE ME ───────────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <WhyHireMe />
      </section>

      {/* ── POWERBI DASHBOARD + SOCIAL ────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-16 space-y-12">

          {/* Social Followers */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-widest">Social Media</h2>
              <span className="text-[10px] text-muted-foreground bg-secondary/60 border border-border/50 rounded-full px-2 py-0.5">Live</span>
            </div>
            <p className="text-xs text-muted-foreground">Real-time follower counts across platforms</p>
            <SocialFollowers />
          </div>

          {/* PowerBI Dashboard */}
          <PowerBIDashboard />
        </div>
      </section>

      {/* ── CONTACT ───────────────────────────────────────────────────────── */}
      <section className="border-t border-border" id="contact">
        <Contact />
      </section>

      <Footer />
    </main>
  )
}
