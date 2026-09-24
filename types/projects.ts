// ─── Project Intelligence Platform Types ─────────────────────────────────────

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  clone_url: string
  language: string | null
  stargazers_count: number
  forks_count: number
  watchers_count: number
  open_issues_count: number
  topics: string[]
  created_at: string
  updated_at: string
  pushed_at: string
  default_branch: string
  homepage: string | null
  size: number
  license: { name: string } | null
}

export interface GitHubAnalytics {
  stars: number
  forks: number
  watchers: number
  openIssues: number
  commitCount: number
  contributorCount: number
  languages: Record<string, number>
  languagePercentages: { name: string; percent: number; color: string }[]
  lastCommit: string
  weeklyCommits: number[]
  recentCommits: {
    sha: string
    message: string
    author: string
    date: string
  }[]
  contributors: {
    login: string
    avatar_url: string
    contributions: number
    html_url: string
  }[]
  releases: number
  branch: string
}

export interface ArchitectureAnalysis {
  frontend: {
    framework: string
    styling: string[]
    stateManagement: string
    testing: string[]
    buildTool: string
  }
  backend: {
    framework: string
    language: string
    runtime: string
    testing: string[]
  }
  database: {
    type: string
    name: string
    orm: string
    migrations: boolean
  }
  devops: {
    containerization: string
    cicd: string[]
    hosting: string
    monitoring: string[]
  }
  authentication: {
    strategy: string[]
    providers: string[]
    sessionManagement: string
  }
  apis: {
    style: string
    endpoints: APIEndpoint[]
    documentation: string
    versioning: boolean
  }
  patterns: string[]
  packageManager: string
}

export interface APIEndpoint {
  method: string
  path: string
  description: string
  auth: boolean
}

export interface DatabaseModel {
  name: string
  fields: {
    name: string
    type: string
    required: boolean
    unique: boolean
    relation?: string
  }[]
  relations: string[]
}

export interface DiagramData {
  systemArchitecture: string
  sequenceDiagram: string
  erDiagram: string
  componentDiagram: string
  deploymentDiagram: string
  dataFlowDiagram: string
  folderStructure: string
  dataDictionary: DatabaseModel[]
}

export interface ProjectAnalysis {
  id: string
  projectSlug: string
  repoUrl: string
  readme: string
  architecture: ArchitectureAnalysis
  diagrams: DiagramData
  githubAnalytics: GitHubAnalytics
  techStack: string[]
  keyFeatures: string[]
  fileTree: FileNode[]
  analyzedAt: string
  cached: boolean
}

export interface FileNode {
  name: string
  type: 'file' | 'directory'
  path: string
  children?: FileNode[]
  size?: number
  language?: string
}

export interface EnhancedProject {
  id: string
  slug: string
  name: string
  description: string
  longDescription?: string
  repoUrl?: string
  liveUrl?: string
  image?: string
  tags: string[]
  featured: boolean
  status: 'completed' | 'in-progress' | 'archived'
  startDate?: string
  endDate?: string
  analysis?: ProjectAnalysis
}
