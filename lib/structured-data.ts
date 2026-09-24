// ─── Structured Data Helpers (JSON-LD / Schema.org) ──────────────────────────

export interface ProjectStructuredData {
  name: string
  description: string
  url: string
  repoUrl?: string
  tags?: string[]
  dateCreated?: string
  dateModified?: string
  authorName?: string
  authorUrl?: string
}

export function generateProjectStructuredData(p: ProjectStructuredData): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: p.name,
    description: p.description,
    url: p.url,
    ...(p.repoUrl ? { codeRepository: p.repoUrl } : {}),
    applicationCategory: 'WebApplication',
    operatingSystem: 'Web Browser',
    programmingLanguage: p.tags?.filter(t =>
      ['TypeScript', 'JavaScript', 'Python', 'Rust', 'Go', 'Java', 'Swift', 'Kotlin'].includes(t)
    ),
    ...(p.dateCreated ? { dateCreated: p.dateCreated } : {}),
    ...(p.dateModified ? { dateModified: p.dateModified } : {}),
    creator: {
      '@type': 'Person',
      name: p.authorName || 'Portfolio Owner',
      ...(p.authorUrl ? { url: p.authorUrl } : {}),
    },
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  })
}

export function generatePersonStructuredData({
  name,
  title,
  email,
  url,
  github,
  linkedin,
  location,
}: {
  name: string
  title: string
  email?: string
  url: string
  github?: string
  linkedin?: string
  location?: string
}): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    jobTitle: title,
    url,
    ...(email ? { email } : {}),
    ...(location ? { address: { '@type': 'PostalAddress', addressLocality: location } } : {}),
    sameAs: [github, linkedin].filter(Boolean),
  })
}

export function generateWebsiteStructuredData({
  name,
  url,
  description,
}: {
  name: string
  url: string
  description: string
}): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    description,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${url}/?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  })
}
