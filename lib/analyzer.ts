// ─── Project Analysis Engine ──────────────────────────────────────────────────
import type { ArchitectureAnalysis, APIEndpoint, DatabaseModel, FileNode, DiagramData } from '@/types/projects'

// ── Stack Detection ──────────────────────────────────────────────────────────

export function detectArchitecture(
  files: string[],
  packageJson: Record<string, unknown>,
  readme: string
): ArchitectureAnalysis {
  const deps = {
    ...(packageJson.dependencies as Record<string, string> || {}),
    ...(packageJson.devDependencies as Record<string, string> || {}),
  }
  const depKeys = Object.keys(deps)
  const allText = [readme, ...files].join(' ').toLowerCase()

  // Frontend framework
  let frontendFramework = 'Unknown'
  if (depKeys.includes('next')) frontendFramework = 'Next.js'
  else if (depKeys.includes('react')) frontendFramework = 'React'
  else if (depKeys.includes('vue')) frontendFramework = 'Vue.js'
  else if (depKeys.includes('@angular/core')) frontendFramework = 'Angular'
  else if (depKeys.includes('svelte')) frontendFramework = 'Svelte'
  else if (depKeys.includes('nuxt')) frontendFramework = 'Nuxt.js'

  // Styling
  const styling: string[] = []
  if (depKeys.includes('tailwindcss')) styling.push('Tailwind CSS')
  if (depKeys.some(d => d.includes('styled-components'))) styling.push('Styled Components')
  if (depKeys.includes('sass') || depKeys.includes('node-sass')) styling.push('Sass/SCSS')
  if (depKeys.includes('@emotion/react')) styling.push('Emotion')
  if (depKeys.includes('@mui/material')) styling.push('Material UI')
  if (depKeys.includes('@chakra-ui/react')) styling.push('Chakra UI')
  if (depKeys.some(d => d.startsWith('@shadcn'))) styling.push('shadcn/ui')

  // State management
  let stateManagement = 'React State'
  if (depKeys.includes('redux') || depKeys.includes('@reduxjs/toolkit')) stateManagement = 'Redux'
  else if (depKeys.includes('zustand')) stateManagement = 'Zustand'
  else if (depKeys.includes('jotai')) stateManagement = 'Jotai'
  else if (depKeys.includes('recoil')) stateManagement = 'Recoil'
  else if (depKeys.includes('mobx')) stateManagement = 'MobX'

  // Backend
  let backendFramework = 'None'
  if (depKeys.includes('express')) backendFramework = 'Express.js'
  else if (depKeys.includes('fastify')) backendFramework = 'Fastify'
  else if (depKeys.includes('hono')) backendFramework = 'Hono'
  else if (depKeys.includes('nestjs') || depKeys.some(d => d.startsWith('@nestjs'))) backendFramework = 'NestJS'
  else if (depKeys.includes('koa')) backendFramework = 'Koa'
  else if (frontendFramework === 'Next.js') backendFramework = 'Next.js API Routes'

  // Database
  let dbType = 'None', dbName = 'None', orm = 'None'
  if (depKeys.includes('prisma') || depKeys.includes('@prisma/client')) {
    orm = 'Prisma'; dbType = 'SQL'
  }
  if (depKeys.includes('mongoose') || depKeys.includes('mongodb')) {
    dbName = 'MongoDB'; dbType = 'NoSQL'; if (depKeys.includes('mongoose')) orm = 'Mongoose'
  }
  if (depKeys.includes('pg') || depKeys.includes('postgres') || depKeys.includes('@neondatabase/serverless')) {
    dbName = 'PostgreSQL'; dbType = 'SQL'
  }
  if (depKeys.includes('mysql2') || depKeys.includes('mysql')) {
    dbName = 'MySQL'; dbType = 'SQL'
  }
  if (depKeys.includes('drizzle-orm')) { orm = 'Drizzle'; dbType = 'SQL' }
  if (depKeys.includes('typeorm')) { orm = 'TypeORM' }
  if (depKeys.includes('sqlite3') || depKeys.includes('better-sqlite3')) {
    dbName = 'SQLite'; dbType = 'SQL'
  }
  if (depKeys.some(d => d.includes('firebase'))) { dbName = 'Firebase'; dbType = 'NoSQL' }
  if (depKeys.some(d => d.includes('supabase'))) { dbName = 'Supabase'; dbType = 'SQL' }

  // Auth
  const authStrategies: string[] = []
  const authProviders: string[] = []
  if (depKeys.includes('next-auth') || depKeys.includes('@auth/core')) {
    authStrategies.push('OAuth'); authProviders.push('NextAuth')
  }
  if (depKeys.includes('jsonwebtoken') || depKeys.includes('jose')) {
    authStrategies.push('JWT')
  }
  if (depKeys.includes('@clerk/nextjs') || depKeys.includes('@clerk/clerk-sdk-node')) {
    authProviders.push('Clerk'); authStrategies.push('OAuth')
  }
  if (depKeys.some(d => d.includes('passport'))) {
    authStrategies.push('Passport.js')
  }
  if (allText.includes('bcrypt')) authStrategies.push('Password Hash')

  // DevOps
  const cicd: string[] = []
  if (files.some(f => f.includes('.github/workflows'))) cicd.push('GitHub Actions')
  if (files.some(f => f.includes('.gitlab-ci'))) cicd.push('GitLab CI')
  if (files.some(f => f.includes('Jenkinsfile'))) cicd.push('Jenkins')
  if (files.some(f => f.includes('.circleci'))) cicd.push('CircleCI')
  let hosting = 'Unknown'
  if (files.some(f => f.includes('vercel.json')) || allText.includes('vercel')) hosting = 'Vercel'
  else if (files.some(f => f.includes('netlify.toml')) || allText.includes('netlify')) hosting = 'Netlify'
  else if (files.some(f => f.includes('fly.toml'))) hosting = 'Fly.io'
  else if (allText.includes('railway')) hosting = 'Railway'
  else if (allText.includes('heroku')) hosting = 'Heroku'
  else if (allText.includes('aws')) hosting = 'AWS'
  let containerization = 'None'
  if (files.some(f => f.includes('Dockerfile') || f.includes('docker-compose'))) containerization = 'Docker'
  if (files.some(f => f.includes('kubernetes') || f.includes('k8s'))) containerization = 'Kubernetes'

  // Patterns
  const patterns: string[] = []
  if (frontendFramework === 'Next.js') patterns.push('SSR/SSG')
  if (depKeys.includes('@tanstack/react-query') || depKeys.includes('react-query')) patterns.push('React Query')
  if (depKeys.includes('zod')) patterns.push('Schema Validation (Zod)')
  if (depKeys.includes('trpc') || depKeys.some(d => d.includes('@trpc'))) patterns.push('tRPC')
  if (depKeys.includes('graphql') || depKeys.some(d => d.includes('apollo'))) patterns.push('GraphQL')
  if (depKeys.includes('socket.io') || depKeys.includes('ws')) patterns.push('WebSockets')

  // Package manager
  let packageManager = 'npm'
  if (files.includes('pnpm-lock.yaml')) packageManager = 'pnpm'
  else if (files.includes('yarn.lock')) packageManager = 'yarn'
  else if (files.includes('bun.lockb')) packageManager = 'bun'

  return {
    frontend: {
      framework: frontendFramework,
      styling: styling.length ? styling : ['CSS'],
      stateManagement,
      testing: depKeys.filter(d => ['jest', 'vitest', 'cypress', 'playwright', '@testing-library/react'].includes(d)),
      buildTool: depKeys.includes('vite') ? 'Vite' : depKeys.includes('webpack') ? 'Webpack' : frontendFramework === 'Next.js' ? 'Turbopack' : 'Unknown',
    },
    backend: {
      framework: backendFramework,
      language: depKeys.some(d => d.includes('typescript')) || files.some(f => f.endsWith('.ts')) ? 'TypeScript' : 'JavaScript',
      runtime: depKeys.includes('bun') ? 'Bun' : 'Node.js',
      testing: depKeys.filter(d => ['jest', 'vitest', 'supertest', 'mocha'].includes(d)),
    },
    database: { type: dbType, name: dbName, orm, migrations: depKeys.includes('prisma') },
    devops: { containerization, cicd, hosting, monitoring: [] },
    authentication: {
      strategy: authStrategies.length ? authStrategies : ['None'],
      providers: authProviders,
      sessionManagement: depKeys.includes('iron-session') ? 'Iron Session' : depKeys.includes('express-session') ? 'Express Session' : 'Cookie-based',
    },
    apis: {
      style: depKeys.includes('graphql') ? 'GraphQL' : depKeys.some(d => d.includes('@trpc')) ? 'tRPC' : 'REST',
      endpoints: [],
      documentation: depKeys.some(d => d.includes('swagger') || d.includes('openapi')) ? 'OpenAPI/Swagger' : 'None',
      versioning: false,
    },
    patterns,
    packageManager,
  }
}

// ── File Tree Builder ─────────────────────────────────────────────────────────

export function buildFileTree(paths: string[]): FileNode[] {
  const root: FileNode[] = []
  const map = new Map<string, FileNode>()

  const IGNORE = ['node_modules', '.next', '.git', 'dist', 'build', '.turbo', 'coverage']

  for (const path of paths) {
    const parts = path.split('/')
    if (parts.some(p => IGNORE.includes(p))) continue

    let current = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const fullPath = parts.slice(0, i + 1).join('/')
      const isLast = i === parts.length - 1

      if (!map.has(fullPath)) {
        const node: FileNode = {
          name: part,
          type: isLast ? 'file' : 'directory',
          path: fullPath,
          children: isLast ? undefined : [],
        }
        map.set(fullPath, node)
        current.push(node)
      }

      if (!isLast) {
        const node = map.get(fullPath)!
        current = node.children!
      }
    }
  }

  // Sort: directories first, then files
  const sortNodes = (nodes: FileNode[]): FileNode[] => {
    return nodes
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      .map(n => n.children ? { ...n, children: sortNodes(n.children) } : n)
  }

  return sortNodes(root).slice(0, 200) // limit for performance
}

// ── Mermaid Diagram Generators ────────────────────────────────────────────────

export function generateSystemArchDiagram(arch: ArchitectureAnalysis, projectName: string): string {
  const { frontend, backend, database, devops, authentication } = arch
  const hasDB = database.name !== 'None'
  const hasAuth = authentication.strategy[0] !== 'None'

  return `graph TD
    Client["🌐 Client Browser"]
    CDN["⚡ CDN / Edge Network"]
    Frontend["🎨 Frontend\\n${frontend.framework}\\n${frontend.styling[0] || 'CSS'}"]
    Backend["⚙️ Backend\\n${backend.framework}\\n${backend.language}"]
    ${hasAuth ? `Auth["🔐 Authentication\\n${authentication.providers[0] || authentication.strategy[0]}"]` : ''}
    ${hasDB ? `DB["🗄️ Database\\n${database.name}\\n${database.orm !== 'None' ? database.orm : ''}"]` : ''}
    ${devops.hosting !== 'Unknown' ? `Deploy["🚀 Hosting\\n${devops.hosting}"]` : ''}
    ${devops.containerization !== 'None' ? `Container["🐳 ${devops.containerization}"]` : ''}

    Client --> CDN
    CDN --> Frontend
    Frontend --> Backend
    ${hasAuth ? `Backend --> Auth` : ''}
    ${hasDB ? `Backend --> DB` : ''}
    ${devops.hosting !== 'Unknown' ? `Deploy --> Frontend` : ''}

    style Client fill:#3b82f6,color:#fff,stroke:#2563eb
    style Frontend fill:#8b5cf6,color:#fff,stroke:#7c3aed
    style Backend fill:#10b981,color:#fff,stroke:#059669
    ${hasDB ? `style DB fill:#f59e0b,color:#fff,stroke:#d97706` : ''}
    ${hasAuth ? `style Auth fill:#ef4444,color:#fff,stroke:#dc2626` : ''}
    style CDN fill:#6366f1,color:#fff,stroke:#4f46e5`
}

export function generateSequenceDiagram(arch: ArchitectureAnalysis): string {
  const hasAuth = arch.authentication.strategy[0] !== 'None'
  const hasDB = arch.database.name !== 'None'

  return `sequenceDiagram
    participant U as 👤 User
    participant C as 🌐 Client
    participant S as ⚙️ Server
    ${hasAuth ? 'participant A as 🔐 Auth' : ''}
    ${hasDB ? `participant D as 🗄️ ${arch.database.name}` : ''}

    U->>C: Navigate to page
    C->>S: HTTP Request
    ${hasAuth ? `S->>A: Validate token\nA-->>S: User identity` : ''}
    ${hasDB ? `S->>D: Query data\nD-->>S: Return results` : ''}
    S-->>C: JSON Response
    C-->>U: Render UI

    Note over U,C: User Interaction
    U->>C: Submit form
    C->>C: Validate input (Zod)
    C->>S: POST /api/data
    ${hasAuth ? `S->>A: Check permissions` : ''}
    ${hasDB ? `S->>D: Write to database` : ''}
    S-->>C: Success response
    C-->>U: Show confirmation`
}

export function generateERDiagram(models: DatabaseModel[]): string {
  if (!models.length) {
    return `erDiagram
    USER {
      string id PK
      string email
      string name
      datetime createdAt
    }
    PROFILE {
      string id PK
      string userId FK
      string bio
      string avatar
    }
    POST {
      string id PK
      string userId FK
      string title
      string content
      datetime publishedAt
    }
    USER ||--o{ POST : "creates"
    USER ||--|| PROFILE : "has"`
  }

  const lines: string[] = ['erDiagram']
  for (const model of models.slice(0, 8)) {
    lines.push(`    ${model.name.toUpperCase()} {`)
    for (const field of model.fields.slice(0, 8)) {
      const pk = field.name === 'id' ? 'PK' : ''
      const fk = field.relation ? 'FK' : ''
      lines.push(`      ${field.type} ${field.name}${pk ? ' ' + pk : ''}${fk ? ' ' + fk : ''}`)
    }
    lines.push('    }')
  }

  for (const model of models.slice(0, 8)) {
    for (const rel of model.relations) {
      lines.push(`    ${model.name.toUpperCase()} ||--o{ ${rel.toUpperCase()} : "has"`)
    }
  }

  return lines.join('\n')
}

export function generateComponentDiagram(arch: ArchitectureAnalysis): string {
  return `graph LR
    subgraph "Frontend Layer"
      Pages["📄 Pages\\n/app router"]
      Components["🧩 Components\\nReusable UI"]
      Hooks["🪝 Hooks\\nCustom Logic"]
      State["📦 State\\n${arch.frontend.stateManagement}"]
    end

    subgraph "API Layer"
      Routes["🛣️ API Routes\\n${arch.apis.style}"]
      Middleware["🔧 Middleware\\nValidation"]
      Services["⚙️ Services\\nBusiness Logic"]
    end

    subgraph "Data Layer"
      ${arch.database.orm !== 'None' ? `ORM["🗺️ ${arch.database.orm}\\nORM"]` : ''}
      DB["🗄️ ${arch.database.name}\\nDatabase"]
    end

    Pages --> Components
    Components --> Hooks
    Hooks --> State
    Pages --> Routes
    Routes --> Middleware
    Middleware --> Services
    ${arch.database.orm !== 'None' ? 'Services --> ORM\nORM --> DB' : 'Services --> DB'}

    style Pages fill:#3b82f6,color:#fff
    style Components fill:#8b5cf6,color:#fff
    style Routes fill:#10b981,color:#fff
    style DB fill:#f59e0b,color:#fff`
}

export function generateDeploymentDiagram(arch: ArchitectureAnalysis): string {
  const hosting = arch.devops.hosting !== 'Unknown' ? arch.devops.hosting : 'Cloud'
  const hasDocker = arch.devops.containerization !== 'None'
  const hasCI = arch.devops.cicd.length > 0

  return `graph TD
    Dev["💻 Developer\\nLocal Machine"]
    ${hasCI ? `CI["⚙️ CI/CD\\n${arch.devops.cicd[0]}"]` : ''}
    Registry["📦 Container Registry\\nGitHub/DockerHub"]
    ${hasDocker ? `Container["🐳 ${arch.devops.containerization}\\nContainer"]` : ''}
    CDN["⚡ CDN\\nEdge Network"]
    Prod["🌐 Production\\n${hosting}"]
    Monitor["📊 Monitoring\\nLogs & Metrics"]
    DB["🗄️ Database\\n${arch.database.name}"]

    Dev -->|git push| ${hasCI ? 'CI' : 'Registry'}
    ${hasCI ? `CI -->|build & test| Registry\nCI -->|deploy| Prod` : `Registry --> Prod`}
    ${hasDocker ? `Registry --> Container\nContainer --> Prod` : ''}
    CDN --> Prod
    Prod --> DB
    Prod --> Monitor

    style Dev fill:#6366f1,color:#fff
    style Prod fill:#10b981,color:#fff
    style CDN fill:#3b82f6,color:#fff
    style DB fill:#f59e0b,color:#fff`
}

export function generateDFDiagram(arch: ArchitectureAnalysis): string {
  const hasAuth = arch.authentication.strategy[0] !== 'None'
  const hasDB = arch.database.name !== 'None'

  return `flowchart LR
    User(["👤 User"])
    Input[/"📥 Input Data"/]
    Validate["✅ Validate\\nSchema"]
    Process["⚙️ Process\\nBusiness Logic"]
    ${hasAuth ? `AuthCheck{"🔐 Auth\\nCheck"}` : ''}
    ${hasDB ? `Store[("🗄️ Store\\n${arch.database.name}")]` : ''}
    Transform["🔄 Transform\\nResponse"]
    Output[/"📤 Output Data"/]
    Log["📝 Audit Log"]

    User --> Input
    Input --> Validate
    Validate -->|Valid| ${hasAuth ? 'AuthCheck' : 'Process'}
    Validate -->|Invalid| Output
    ${hasAuth ? `AuthCheck -->|Authorized| Process\nAuthCheck -->|Denied| Output` : ''}
    Process --> Transform
    ${hasDB ? `Process --> Store\nStore --> Process` : ''}
    Transform --> Output
    Process --> Log
    Output --> User

    style User fill:#3b82f6,color:#fff
    style Process fill:#8b5cf6,color:#fff
    style Validate fill:#10b981,color:#fff
    ${hasDB ? `style Store fill:#f59e0b,color:#fff` : ''}
    ${hasAuth ? `style AuthCheck fill:#ef4444,color:#fff` : ''}`
}

export function generateFolderStructure(files: string[]): string {
  const IGNORE = ['node_modules', '.next', '.git', 'dist', 'build']
  const filtered = files
    .filter(f => !IGNORE.some(ig => f.includes(ig)))
    .slice(0, 60)

  // Group by top-level directories
  const structure: Record<string, string[]> = {}
  for (const f of filtered) {
    const parts = f.split('/')
    const top = parts[0]
    if (!structure[top]) structure[top] = []
    if (parts.length > 1) structure[top].push(parts.slice(1).join('/'))
  }

  let result = '```\n📁 project-root/\n'
  for (const [dir, contents] of Object.entries(structure).slice(0, 15)) {
    if (contents.length === 0) {
      result += `├── ${dir}\n`
    } else {
      result += `├── 📁 ${dir}/\n`
      for (const item of contents.slice(0, 5)) {
        result += `│   ├── ${item}\n`
      }
      if (contents.length > 5) result += `│   └── ... (${contents.length - 5} more)\n`
    }
  }
  result += '```'
  return result
}

// ── Parse Prisma Schema for DB Models ────────────────────────────────────────

export function parsePrismaSchema(schema: string): DatabaseModel[] {
  const models: DatabaseModel[] = []
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g
  let match

  while ((match = modelRegex.exec(schema)) !== null) {
    const name = match[1]
    const body = match[2]
    const fields: DatabaseModel['fields'] = []
    const relations: string[] = []

    const lines = body.split('\n').map(l => l.trim()).filter(Boolean)
    for (const line of lines) {
      if (line.startsWith('//') || line.startsWith('@')) continue
      const parts = line.split(/\s+/)
      if (parts.length < 2) continue
      const fieldName = parts[0]
      const fieldType = parts[1].replace('?', '').replace('[]', '')
      const isRequired = !parts[1].includes('?')
      const isUnique = line.includes('@unique')
      const relation = line.includes('@relation') ? fieldType : undefined
      if (relation && /^[A-Z]/.test(fieldType)) relations.push(fieldType)
      fields.push({ name: fieldName, type: fieldType, required: isRequired, unique: isUnique, relation })
    }

    models.push({ name, fields, relations: [...new Set(relations)] })
  }

  return models
}

// ── Main Diagram Builder ──────────────────────────────────────────────────────

export function buildAllDiagrams(
  arch: ArchitectureAnalysis,
  models: DatabaseModel[],
  filePaths: string[],
  projectName: string
): DiagramData {
  return {
    systemArchitecture: generateSystemArchDiagram(arch, projectName),
    sequenceDiagram: generateSequenceDiagram(arch),
    erDiagram: generateERDiagram(models),
    componentDiagram: generateComponentDiagram(arch),
    deploymentDiagram: generateDeploymentDiagram(arch),
    dataFlowDiagram: generateDFDiagram(arch),
    folderStructure: generateFolderStructure(filePaths),
    dataDictionary: models,
  }
}
