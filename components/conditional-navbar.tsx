'use client'

/**
 * ConditionalNavbar
 * Renders the Navbar + its spacer on every page EXCEPT /admin/* routes.
 * This component lives in the root layout so the navbar is globally accessible
 * (fixed position) regardless of which page the user is on.
 */

import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/navbar'

export function ConditionalNavbar() {
  const pathname = usePathname()

  // Hide on admin panel — it has its own sidebar navigation
  const isAdminRoute = pathname?.startsWith('/admin')
  if (isAdminRoute) return null

  return (
    <>
      <Navbar />
      {/* Spacer so page content isn't hidden under the fixed navbar (h-16 = 64px) */}
      <div className="h-16" aria-hidden="true" />
    </>
  )
}
