import React from "react"
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
import './globals.css'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || ''

import { ThemeProvider } from '@/components/theme-provider'
import { LanguageProvider } from '@/lib/language-context'
import { ConditionalAIAssistant } from '@/components/conditional-ai-assistant'
import { ConditionalNavbar } from '@/components/conditional-navbar'
import { CodeProtection } from '@/components/code-protection'
import { FirstVisitTerms } from '@/components/first-visit-terms'
import { PageLoader } from '@/components/page-loader'
import { ToastProvider } from '@/components/toast-provider'
import { PageTransition } from '@/components/page-transition'
import { CustomCursor } from '@/components/custom-cursor'
import { MaintenanceGuard } from '@/components/maintenance-guard'
import { SuspiciousActivityDetector } from '@/components/suspicious-activity-detector'
import { PwaRegister } from '@/components/pwa-register'
import { VisitorNotifications } from '@/components/visitor-notifications'


const _inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Abhishek Singh | Software Engineer & DevOps Engineer — Amazon Intern',
  description: 'Software Engineer & DevOps Engineer with 3+ internships including Amazon. Expert in React, Next.js, Node.js, Docker, GitHub Actions, CI/CD. Based in New Delhi, India. Available for full-time & contract roles.',
  generator: 'Next.js',
  manifest: '/manifest.json',
  keywords: [
    'Abhishek Singh', 'Software Engineer', 'DevOps Engineer', 'Full Stack Developer',
    'Frontend Engineer', 'React Developer', 'Next.js', 'TypeScript', 'Node.js',
    'Docker', 'Kubernetes', 'GitHub Actions', 'CI/CD', 'AWS', 'Portfolio',
    'Amazon intern', 'New Delhi', 'India', 'Hire Software Engineer India',
    'React developer India', 'DevOps engineer India'
  ],
  authors: [{ name: 'Abhishek Singh', url: 'https://github.com/abhi2506-se' }],
  creator: 'Abhishek Singh',
  publisher: 'Abhishek Singh',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 } },
  alternates: { canonical: BASE_URL },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Abhishek',
  },
  openGraph: {
    title: 'Abhishek Singh | Software Engineer & DevOps Engineer',
    description: 'Software Engineer & DevOps Engineer. Amazon intern. React, Next.js, Node.js, Docker, GitHub Actions, CI/CD. Available for full-time roles.',
    url: BASE_URL,
    siteName: 'Abhishek Singh — Portfolio',
    type: 'website',
    locale: 'en_IN',
    images: [{ url: `${BASE_URL}/image.png`, width: 1200, height: 630, alt: 'Abhishek Singh — Software Engineer & DevOps Engineer' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Abhishek Singh | Software Engineer & DevOps Engineer',
    description: 'Amazon intern. React, Next.js, Docker, CI/CD. Available for full-time SWE / DevOps roles.',
    images: [`${BASE_URL}/image.png`],
    creator: '@abhi_singh2506',
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || '',
  },
  icons: {
    icon: [{ url: '/api/favicon', type: 'image/png' }],
    apple: [
      { url: '/apple-touch-icon.png',       sizes: '180x180', type: 'image/png' },
      { url: '/icons/icon-152x152.png',     sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-144x144.png',     sizes: '144x144', type: 'image/png' },
      { url: '/icons/icon-128x128.png',     sizes: '128x128', type: 'image/png' },
    ],
  },
}

// JSON-LD structured data for Person + WebSite + BreadcrumbList
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person',
      '@id': `${BASE_URL}/#person`,
      name: 'Abhishek Singh',
      url: BASE_URL,
      image: `${BASE_URL}/image.png`,
      jobTitle: ['Software Engineer', 'DevOps Engineer', 'Full Stack Developer'],
      description: 'Software Engineer & DevOps Engineer with 3+ internships including Amazon. Expert in React, Next.js, Node.js, Docker, GitHub Actions, CI/CD. Available for full-time roles.',
      email: 'abhisheksingh89208@gmail.com',
      nationality: 'Indian',
      sameAs: [
        'https://github.com/abhi2506-se',
        'https://www.linkedin.com/in/abhishek-singh-494a86270/',
        'https://www.instagram.com/_abhiiisheksingh/',
      ],
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'New Delhi',
        addressRegion: 'Delhi',
        addressCountry: 'IN',
      },
      alumniOf: [
        { '@type': 'CollegeOrUniversity', name: 'J.C. Bose University of Science & Technology, YMCA Faridabad' },
        { '@type': 'EducationalOrganization', name: 'IIT Guwahati (Masai) — Full Stack with Generative AI' },
      ],
      worksFor: { '@type': 'Organization', name: 'Amazon Development Center India Pvt Ltd' },
      knowsAbout: [
        'React.js', 'Next.js', 'TypeScript', 'Node.js', 'PostgreSQL', 'MongoDB',
        'Docker', 'Kubernetes', 'GitHub Actions', 'CI/CD', 'AWS', 'Linux', 'Nginx',
        'Full Stack Development', 'DevOps Engineering', 'Tailwind CSS', 'Framer Motion'
      ],
      hasOccupation: {
        '@type': 'Occupation',
        name: 'Software Engineer',
        occupationLocation: { '@type': 'Country', name: 'India' },
        skills: 'React.js, Next.js, TypeScript, Node.js, Docker, GitHub Actions, AWS'
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${BASE_URL}/#website`,
      url: BASE_URL,
      name: 'Abhishek Singh — Software Engineer & DevOps Portfolio',
      description: 'Portfolio showcasing software engineering & DevOps projects, certifications, and professional experience.',
      author: { '@id': `${BASE_URL}/#person` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${BASE_URL}/?q={search_term_string}` },
        'query-input': 'required name=search_term_string'
      }
    },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
         * ── PWA / iOS head tags ─────────────────────────────────────────────
         *
         * IMPORTANT: Do NOT add any of these here directly:
         *   • <link rel="manifest">
         *   • <meta apple-mobile-web-app-*>
         *   • <link rel="apple-touch-icon">
         *
         * These are all declared via the `metadata` export above (and in
         * child layout metadata exports, e.g. app/admin/layout.tsx).
         * Next.js injects them into <head> automatically from metadata.
         *
         * Hardcoding them here creates DUPLICATE tags. iOS Safari always picks
         * the FIRST matching tag it encounters. The hardcoded /manifest.json
         * appears BEFORE the admin layout's /admin-manifest.json injection,
         * so the admin PWA gets start_url:"/" instead of start_url:"/admin"
         * → admin PWA opens the main portfolio page instead of admin panel.
         *
         * Only non-standard tags that Next.js metadata cannot inject stay here:
         */}
        <meta name="mobile-web-app-capable"  content="yes" />
        <meta name="apple-touch-fullscreen"  content="yes" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="font-sans antialiased">
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', { page_path: window.location.pathname });
            `}} />
          </>
        )}
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <LanguageProvider>
          <ToastProvider>
            {/* MaintenanceGuard: runs on ALL pages, polls every 4s, shows overlay instantly */}
            <MaintenanceGuard />
            {/* SuspiciousActivityDetector: runs on ALL pages, detects screenshots/abuse */}
            <SuspiciousActivityDetector />
            <PageLoader />
            {/* ConditionalNavbar: fixed navbar on all pages except /admin/* */}
            <ConditionalNavbar />
            <PageTransition>
              {children}
            </PageTransition>
            <ConditionalAIAssistant />
            <CodeProtection />
            <FirstVisitTerms />
            <CustomCursor />
            <Analytics />
            <VisitorNotifications />
          </ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
        <PwaRegister />
      </body>
    </html>
  )
}
