import { Metadata } from 'next'
import { LanguagesDashboard } from '@/components/languages-dashboard'

export const metadata: Metadata = {
  title: 'Language Dashboard | Portfolio',
  description: 'Interactive language learning dashboard — heatmap, achievements, AI mentor, quizzes and more.'
}

export default function LanguagesPage() {
  return <LanguagesDashboard />
}
