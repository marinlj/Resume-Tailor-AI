# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Resume Tailor AI is a chat-based application that helps users create tailored resumes for specific job applications. Users build a master library of achievements, skills, and education, then the AI matches relevant items to job descriptions and generates targeted resumes.

## Code Style

- TypeScript strict mode, no `any` types
- Use named exports, not default exports
- CSS: Tailwind utility classes, no custom CSS files

## Common Commands

```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Production build
npm run lint         # Run ESLint

# Database
npx prisma migrate dev      # Run migrations (creates/updates tables)
npx prisma generate         # Regenerate Prisma client after schema changes
npx prisma studio           # Visual database browser
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 with App Router
- **AI**: Vercel AI SDK 6 (`ToolLoopAgent` + `@ai-sdk/react`)
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: NextAuth.js v5 (Google/GitHub OAuth with JWT sessions)
- **UI**: React 19 + shadcn/ui + Tailwind CSS v4

### Agent System (`lib/agent/`)

The core of the application is a single `ToolLoopAgent` (from AI SDK 6) with multiple tools:

```
lib/agent/
├── index.ts          # Agent configuration with all tools
├── instructions.ts   # System prompt defining agent behavior
├── schemas.ts        # Zod schemas for tool inputs/outputs
└── tools/
    ├── library.ts    # CRUD for achievements, skills, education, contact details
    ├── research.ts   # Job description parsing, success profile building
    ├── matching.ts   # Match achievements to job requirements
    ├── generation.ts # Generate resume markdown and DOCX
    ├── preferences.ts # User formatting preferences
    └── utils.ts      # User context utilities (AsyncLocalStorage)
```

**User Context Flow**: The chat API route (`app/api/chat/route.ts`) uses `AsyncLocalStorage` via `runWithUserId()` to pass the authenticated user ID to all tool executions.

### Route Groups

- `app/(main)/` - Authenticated pages: chat, library, settings
- `app/(auth)/` - Auth pages: login
- `app/api/` - API routes

### Database Models

Key models in `prisma/schema.prisma`:
- **User** - Auth user with OAuth accounts
- **Achievement** - Work experience bullet points with tags
- **Skill** - Technical/soft skills with categories
- **Education** - Degrees and certifications
- **ContactDetails** - Name, email, links (one per user)
- **Preference** - Resume formatting preferences
- **Conversation** - Chat history (messages stored as JSON)
- **GeneratedResume** - Output resumes with markdown and DOCX path

### Agent Workflow

1. **LOAD** - Check if user has a library (`getLibraryStatus`)
2. **PARSE** - Extract achievements/skills/education from uploaded resume (`parseResumeIntoLibrary`)
3. **RESEARCH** - Parse job description (`parseJobDescription`, `buildSuccessProfile`)
4. **MATCH** - Find best achievements for requirements (`matchAchievements`)
5. **GENERATE** - Create resume (`generateResume`, `generateDocxFile`)

## Environment Variables

Required in `.env.local`:
```
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
AUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

Optional:
```
AUTH_DEBUG=true  # Enable NextAuth debug logging
```

## Key Files

- [app/api/chat/route.ts](app/api/chat/route.ts) - Main chat endpoint (streams agent responses)
- [lib/agent/index.ts](lib/agent/index.ts) - Agent configuration with all tools
- [lib/agent/instructions.ts](lib/agent/instructions.ts) - Agent system prompt
- [lib/agent/tools/library.ts](lib/agent/tools/library.ts) - Library CRUD tools
- [lib/auth.ts](lib/auth.ts) - NextAuth configuration with Prisma adapter
- [middleware.ts](middleware.ts) - Auth middleware (protects routes)

## Browser Automation

Use `agent-browser` for web automation. Run `agent-browser --help` for all commands.

Core workflow:
1. `agent-browser open <url>` - Navigate to page
2. `agent-browser snapshot -i` - Get interactive elements with refs (@e1, @e2)
3. `agent-browser click @e1` / `fill @e2 "text"` - Interact using refs
4. Re-snapshot after page changes

## Use Context7 by Default
Always use context7 when I need code generation, setup or configuration steps, or library/API documentation. This means you should automatically use the Context7 MCP tools to resolve library id and get library docs without me having to explicitly ask.

## Skills
When brainstorming features, designing features, coding, and reviewing bugs always use superpower skill.

## Important Notes

- NEVER commit .env files