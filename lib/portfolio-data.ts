// ─── Default data (fallback when DB has nothing) ──────────────────────────────
export const defaultPortfolioData = {
  hero: {
    name: 'Abhishek Singh',
    title: 'Full Stack & Frontend Engineer',
    subtitle:
      'Crafting responsive, dynamic web experiences with React, JavaScript, and modern technologies.',
    description:
      'Experienced in internships project-based learning and remote collaboration. Strong leadership with proven communication skills and a continuous learner currently expanding into full stack development.',
    available: true,
    github: 'https://github.com/abhi2506-se',
    linkedin: 'https://www.linkedin.com/in/abhishek-singh-494a86270/',
    email: 'abhisheksingh89208@gmail.com',
    instagram: 'https://www.instagram.com/_abhiiisheksingh/',
    facebook: '',
    leetcode: '',
    locationCountry: '',
    locationState: '',
    locationCity: '',
    location: 'Najafgarh, New Delhi, India',
    resumeUrl: '/Cv.pdf',
    currentJob: 'Amazon Intern',
    currentJobCompany: 'Amazon Development Center India Pvt Ltd',
    education: 'J.C. Bose University',
    educationDegree: 'B.Tech CSE',
    currentLocation: 'New Delhi, India',
  },
  about: {
    bio1:
      "I'm a passionate Frontend Developer with hands-on experience in building responsive, user-centric web applications. With expertise in React, JavaScript, and modern web technologies, I've successfully delivered projects during my internship at Ksolves India Limited.",
    bio2:
      "I believe in writing clean, maintainable code and staying current with industry trends. Whether it's optimizing performance, implementing complex UI components, or integrating APIs, I approach each challenge with dedication and creativity.",
    bio3:
      "When I'm not coding, I enjoy contributing to open-source projects, exploring new technologies, and mentoring junior developers. I'm passionate about creating digital experiences that are both beautiful and functional.",
    stats: [
      { label: 'Projects Completed', value: '15+' },
      { label: 'Technologies', value: '20+' },
      { label: 'Internships', value: '3' },
      { label: 'Certifications', value: '5+' },
    ],
  },
  skills: [
    {
      title: 'Frontend',
      icon: 'Code2',
      skills: ['HTML5', 'CSS3', 'JavaScript (ES7)', 'React.js', 'Redux'],
      color: 'from-blue-600 to-cyan-500',
    },
    {
      title: 'Backend & Databases',
      icon: 'Database',
      skills: ['Node.js', 'Express.js', 'MongoDB', 'REST APIs', 'Java'],
      color: 'from-purple-600 to-pink-500',
    },
    {
      title: 'Design & Styling',
      icon: 'Palette',
      skills: ['Responsive Design', 'Tailwind CSS', 'UI/UX Principles', 'Component Architecture'],
      color: 'from-orange-600 to-red-500',
    },
    {
      title: 'Tools & Workflow',
      icon: 'GitBranch',
      skills: ['Git', 'GitHub', 'VS Code', 'Figma', 'DevTools'],
      color: 'from-green-600 to-teal-500',
    },
    {
      title: 'Soft Skills',
      icon: 'Brain',
      skills: ['Problem Solving', 'Team Collaboration', 'Communication', 'Leadership'],
      color: 'from-indigo-600 to-blue-500',
    },
    {
      title: 'Additional',
      icon: 'Zap',
      skills: ['SEO Optimization', 'Performance Optimization', 'API Integration', 'Redux Toolkit'],
      color: 'from-yellow-600 to-orange-500',
    },
  ],
  experience: [
    {
      title: 'Software Engineer Intern',
      company: 'Amazon Development Center India Pvt Ltd',
      period: 'Oct 2025 - Present',
      type: 'work',
      description: [
        'Developed and optimized 5+ dynamic UI components using React.js',
        'Achieved 98% design accuracy and boosted data rendering efficiency by 35%',
        'Collaborated in a team of 4 to deliver 3 real-time projects with 100% on-time delivery',
        'Resolved 25+ front-end issues during QA and ensured seamless backend integration',
        'Managed global application state using Redux Toolkit',
        'Worked with REST APIs to fetch, display, and update dynamic data',
      ],
    },
    {
      title: 'Frontend Developer Intern',
      company: 'Ksolves India Limited',
      period: 'May 2024 - Aug 2024',
      type: 'work',
      description: [
        'Built 8+ reusable React.js components adopted across 3 internal products',
        'Integrated REST APIs and reduced average page load time by 28% through code splitting',
        'Collaborated with UI/UX designers to implement pixel-perfect Figma designs',
        'Wrote unit tests with Jest achieving 82% code coverage on new components',
        'Participated in daily standups and bi-weekly sprint planning meetings',
      ],
    },
    {
      title: 'Web Development Intern',
      company: 'Slash Mark IT Startup',
      period: 'Dec 2023 - Feb 2024',
      type: 'work',
      description: [
        'Developed responsive web pages using HTML5, CSS3, and vanilla JavaScript',
        'Contributed to a Django-based internal project management tool',
        'Improved existing codebase by refactoring 15+ legacy JavaScript modules to ES6+',
        'Gained hands-on experience with Git workflows in a collaborative team environment',
        'Assisted in migrating static HTML pages to a component-based React architecture',
      ],
    },
  ],
  education: [
    {
      title: 'Full Stack Development with Generative AI (Java & MERN Stack)',
      institution: 'IIT Guwahati (Masai)',
      period: 'Expected: 07/2026',
      type: 'education',
      description: 'Software Development (Java & MERN)',
      achievements: [
        'Offline, instructor-led weekend program',
        'Learning backend development using Java, Spring Boot, and RESTful APIs',
        'Building frontend with HTML, CSS, JavaScript, React.js',
        'MERN stack: MongoDB, Express.js, React.js, Node.js',
      ],
    },
    {
      title: 'Bachelor of Technology (B.Tech) in Computer Science & Engineering',
      institution: 'J.C. BOSE UNIVERSITY OF SCIENCE & TECHNOLOGY, YMCA FARIDABAD',
      period: 'Completed',
      type: 'education',
      description: 'AI & Data Science',
      achievements: [
        'Head of Sponsorship committee',
        'Multiple internships in Software development & DevOps',
        'Certifications in Web Development and Programming',
        'Hands-on experience with C++, HTML, CSS, JavaScript, React.js',
      ],
    },
  ],
  projects: [
    {
      title: 'AI Resume Analyser',
      description:
        'A full-stack AI-powered resume analyser that extracts key information and provides actionable feedback.',
      tech: ['Python', 'HTML', 'JavaScript', 'CSS3', 'Express', 'MongoDB'],
      github: 'https://github.com/abhi2506-se',
      live: '#',
      image: 'from-blue-600 to-cyan-500',
      coverImage: '',
      features: [
        '📄 Automated resume parsing with NLP extraction',
        '🤖 AI-powered feedback and scoring',
        '📊 Skill gap analysis with recommendations',
        '🔍 ATS compatibility checker',
        '📁 Supports PDF and DOCX formats',
      ],
      synopsisUrl:  '',
      pptUrl:       '',
      reportUrl:    '',
      caseStudy: {
        problem: 'Job seekers wasted hours manually tailoring resumes without knowing what ATS systems and recruiters actually look for. There was no fast, free tool that gave specific, actionable feedback on resume quality.',
        solution: 'Built an NLP-powered pipeline that parses PDF/DOCX resumes, extracts key entities (skills, experience, education), scores each section against role-specific rubrics, and surfaces a prioritized action list. Integrated an ATS simulation layer that checks for common formatting pitfalls.',
        results: [
          '⚡ 90% reduction in resume review time (30 min → 3 min)',
          '📈 Users reported 40% higher callback rate after acting on suggestions',
          '🎯 ATS pass-rate checker identifies issues in 8 out of 10 uploaded resumes',
          '👥 Tested with 50+ beta users, achieved 4.7/5 satisfaction score',
        ],
        metrics: {
          users: '50+ beta users',
          improvement: '40% higher callback rate',
          timeSaved: '90% faster review',
        },
      },
    },
    {
      title: 'Alumni Portal — Full-Stack System',
      description:
        'Production-ready Alumni Portal connecting Students, Alumni & Admin with AI-powered career guidance, realtime chat, OTP-based auth, complaint classification, job board, and event management.',
      tech: ['Next.js', 'TypeScript', 'PostgreSQL', 'Prisma', 'NextAuth', 'Pusher', 'OpenAI', 'Tailwind CSS'],
      github: 'https://github.com/abhi2506-se/alumni-portal',
      live: '#',
      image: 'from-orange-600 to-red-500',
      featured: true,
      coverImage: '',
      features: [
        '🔐 OTP-based 2-step authentication with email notifications',
        '🤖 OpenAI chatbot for career guidance + AI complaint classification',
        '💬 Realtime 1-on-1 chat via Pusher (unlocked after connection)',
        '👥 Role-based: Admin · Students · Alumni',
        '📋 Job board, Events, Courses, Gallery management',
        '🔔 Live notifications system',
      ],
      synopsisUrl:  '',
      pptUrl:       '',
      reportUrl:    '',
      livePreview: {
        badge: 'Full-Stack · AI · Realtime',
        highlights: [
          '🔐 OTP-based 2-step authentication with email notifications',
          '🤖 OpenAI chatbot for career guidance + AI complaint classification',
          '💬 Realtime 1-on-1 chat via Pusher (unlocked after connection)',
          '👥 Role-based: Admin · Students · Alumni',
          '📋 Job board, Events, Courses, Gallery management',
          '🔔 Live notifications system',
        ],
        demoUrl: 'https://github.com/abhi2506-se/alumni-portal',
      },
      caseStudy: {
        problem: 'Universities lacked a unified platform for alumni and students to connect, find mentors, post jobs, and get career guidance. Existing tools were siloed — LinkedIn for jobs, email for announcements, WhatsApp for informal chat.',
        solution: 'Architected a multi-role Next.js platform with PostgreSQL + Prisma, featuring OTP authentication, Pusher-powered real-time chat, OpenAI complaint classification, a job board, event management, and a live notification system — all under a single, role-gated interface.',
        results: [
          '🔐 OTP auth flow reduced fake account creation to zero in testing',
          '🤖 AI complaint classifier achieved 87% categorization accuracy',
          '💬 Real-time chat latency under 120ms across tested connections',
          '📋 Full admin CMS controlling all content without code changes',
          '🏗️ Production-ready with role-based access for 3 user tiers',
        ],
        metrics: {
          users: '3 role tiers',
          improvement: '87% AI accuracy',
          timeSaved: '<120ms chat latency',
        },
      },
    },
    {
      title: 'Portfolio Website',
      description:
        'A personal portfolio website to showcase projects, skills, and experience as a developer.',
      tech: ['Next.js', 'React', 'Tailwind CSS', 'Framer Motion'],
      github: 'https://github.com/abhi2506-se',
      live: process.env.NEXT_PUBLIC_BASE_URL || '',
      image: 'from-green-600 to-teal-500',
      coverImage: '',
      features: [
        '🎨 Responsive, animated UI with Framer Motion',
        '🌙 Dark / Light theme with system preference sync',
        '🤖 AI chatbot assistant with voice support',
        '🔐 Admin panel with real-time CMS',
        '📊 Visitor analytics dashboard',
        '🛡️ Maintenance mode with real-time broadcast',
      ],
      synopsisUrl:  '',
      pptUrl:       '',
      reportUrl:    '',
      caseStudy: {
        problem: 'Standard portfolio templates lacked real-time admin control, analytics, and intelligent visitor interaction. Every update required a code deploy, and there was no way to track how recruiters actually engaged with the content.',
        solution: 'Built a Next.js portfolio with a full CMS admin panel backed by Neon PostgreSQL — zero-redeploy content updates. Added an AI chatbot (Anthropic Claude) for visitor questions, real-time visitor analytics, push notifications, and dark/light theme with system sync.',
        results: [
          '🔄 Content updates in under 10 seconds — no redeployment needed',
          '📊 Real-time visitor analytics with geographic and device breakdown',
          '🤖 AI chatbot handles 80% of recruiter questions automatically',
          '⚡ Lighthouse performance score: 96/100 on desktop',
          '🔔 Push notification system for new contact messages',
        ],
        metrics: {
          users: 'Live production app',
          improvement: '96/100 Lighthouse score',
          timeSaved: '10s content updates',
        },
      },
    },
    {
      title: 'Time-Table Management System',
      description:
        'A flexible application built to help teams and institutions manage timetables intuitively.',
      tech: ['Django', 'Jasmine', 'Sqlite3', 'HTML', 'CSS', 'JavaScript'],
      github: 'https://github.com/abhi2506-se',
      live: '#',
      image: 'from-indigo-600 to-blue-500',
      coverImage: '',
      features: [
        '📅 Drag-and-drop timetable builder',
        '👩‍🏫 Teacher and room conflict detection',
        '🔄 Auto-scheduling algorithm',
        '📤 Export to PDF and Excel',
        '🔒 Role-based access (Admin / Teacher / Student)',
      ],
      synopsisUrl:  '',
      pptUrl:       '',
      reportUrl:    '',
      caseStudy: {
        problem: 'University departments manually created timetables in spreadsheets, leading to room double-bookings, teacher conflicts, and hours of re-work each semester. A typical semester schedule took 2–3 days to finalize.',
        solution: 'Developed a Django-based web app with an auto-scheduling algorithm that detects room and teacher conflicts in real time. Added drag-and-drop rescheduling, role-based access for Admin/Teacher/Student, and PDF/Excel export.',
        results: [
          '⏱️ Timetable generation time reduced from 3 days to under 2 hours',
          '🚫 Zero double-booking conflicts in pilot semester run',
          '📤 One-click export to PDF and Excel adopted by 3 departments',
          '👥 Role-based system used by 120+ students and 15 faculty in pilot',
        ],
        metrics: {
          users: '120+ pilot users',
          improvement: '95% faster scheduling',
          timeSaved: '3 days → 2 hours',
        },
      },
    },
  ],
  testimonials: [] as Array<{
    id: string; name: string; role: string; company: string; avatar: string;
    avatarColor: string; rating: number; text: string; linkedinUrl: string; relation: string;
  }>,
  measurableImpact: [
    { metric: '35%', label: 'Data rendering efficiency boost @ Amazon' },
    { metric: '98%', label: 'Design accuracy on delivered components' },
    { metric: '25+', label: 'Front-end issues resolved during QA' },
    { metric: '100%', label: 'On-time project delivery rate' },
  ] as Array<{ metric: string; label: string }>,
  skillDetails: {
    'React':        { level: 95, lastUsed: 'This month',  note: 'Primary frontend framework for all major projects' },
    'Next.js':      { level: 90, lastUsed: 'This month',  note: 'Full-stack React framework used in production apps' },
    'TypeScript':   { level: 88, lastUsed: 'This month',  note: 'Preferred over JS for all new projects' },
    'JavaScript':   { level: 95, lastUsed: 'This month',  note: 'Core language, 3+ years of daily use' },
    'JavaScript (ES7)': { level: 93, lastUsed: 'This month', note: 'ES7+ features daily in React/Node projects' },
    'Node.js':      { level: 85, lastUsed: 'This week',   note: 'Backend runtime for REST APIs and serverless functions' },
    'MongoDB':      { level: 78, lastUsed: 'Last month',  note: 'NoSQL for flexible document storage' },
    'Tailwind CSS': { level: 92, lastUsed: 'This month',  note: 'Utility-first CSS for rapid UI development' },
    'Git':          { level: 90, lastUsed: 'Daily',       note: 'Version control for all projects' },
    'HTML5':        { level: 96, lastUsed: 'This month',  note: 'Semantic HTML5 markup in every project' },
    'CSS3':         { level: 90, lastUsed: 'This month',  note: 'Advanced CSS3 animations and layout techniques' },
    'React.js':     { level: 95, lastUsed: 'This month',  note: 'Primary frontend framework for all major projects' },
    'Redux':        { level: 85, lastUsed: 'This month',  note: 'Global state management with Redux Toolkit' },
    'Express.js':   { level: 80, lastUsed: 'Last month',  note: 'RESTful API development with Express' },
    'REST APIs':    { level: 88, lastUsed: 'This week',   note: 'Integration and development of REST APIs' },
    'Java':         { level: 75, lastUsed: 'Last month',  note: 'Backend development in Spring Boot projects' },
    'GitHub':       { level: 90, lastUsed: 'Daily',       note: 'Pull requests, code reviews, CI/CD workflows' },
    'Figma':        { level: 78, lastUsed: 'This month',  note: 'UI design collaboration with design teams' },
  } as Record<string, { level: number; lastUsed: string; note: string }>,
  certifications: [] as Array<{
    id: string; name: string; issuer: string; date: string;
    credentialUrl: string; credentialPdfUrl: string; badgeColor: string; skills: string[]; expiry: string;
  }>,
  blogs: [] as Array<{
    id: string; title: string; summary: string; tags: string[];
    readTime: string; date: string; url: string; color: string; icon: string; trending: boolean;
  }>,
}

export type PortfolioData = typeof defaultPortfolioData

// ─── Kept for backward compat (no longer used for storage) ───────────────────
export const STORAGE_KEY = 'portfolio_admin_data'

/** Load portfolio data from DB (server-side cache).  */
export async function fetchPortfolioData(): Promise<PortfolioData> {
  try {
    const res = await fetch('/api/portfolio', { cache: 'no-store' })
    if (!res.ok) return defaultPortfolioData
    const json = await res.json()
    if (!json) return defaultPortfolioData
    // Deep-merge so nested objects (hero, about, etc.) properly pick up new default keys
    return {
      ...defaultPortfolioData,
      ...json,
      hero: { ...defaultPortfolioData.hero, ...(json.hero || {}) },
      about: { ...defaultPortfolioData.about, ...(json.about || {}) },
    } as PortfolioData
  } catch {
    return defaultPortfolioData
  }
}

/** Save portfolio data to DB (called by admin dashboard). */
export async function savePortfolioData(data: Partial<PortfolioData>): Promise<void> {
  try {
    const current = await fetchPortfolioData()
    const merged = { ...current, ...data }
    await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    })
    // Broadcast so same-page components re-fetch
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('portfolio-data-updated'))
    }
  } catch (e) {
    console.error('Failed to save portfolio data', e)
    throw e
  }
}

/** @deprecated localStorage fallback — kept so old imports don't break */
export function getPortfolioData(): PortfolioData {
  return defaultPortfolioData
}

/** Canonical slug generator — used everywhere to map project title → ID */
export function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}
