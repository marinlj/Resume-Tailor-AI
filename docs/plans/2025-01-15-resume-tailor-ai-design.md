# Resume Tailor AI - Design Document

## Overview

A web application with a chat UI (similar to Claude) that helps users create tailored resumes. The agent automatically detects if a user has a master library of achievements, guides them through building one if not, and generates tailored resumes for specific job applications.

## Core Workflow

Based on the resume-tailoring-v2 skill architecture:

1. **LOAD** - Check if user has a master library
2. **RESEARCH** - Parse job description, research company, build success profile
3. **MATCH** - Filter achievements by tags, rank relevance, identify gaps
4. **DISCOVER** - Interview user for missing experiences (if gaps found)
5. **GENERATE** - Assemble resume, critical review, output MD/DOCX

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| UI | React 19 + shadcn/ui + Tailwind |
| AI | Vercel AI SDK 6 (`ToolLoopAgent` + `useChat`) |
| Database | PostgreSQL + Prisma |
| Auth | NextAuth.js (Google/GitHub OAuth) |
| Output | Markdown + DOCX (via `docx` library) |

## Agent Architecture

### Single ToolLoopAgent with Tools

We use AI SDK 6's `ToolLoopAgent` class - a single agent with multiple tools rather than multi-agent orchestration. The workflow is sequential (detect → parse → match → generate), making a single agent with rich tools the right choice.

```typescript
const resumeAgent = new ToolLoopAgent({
  model: anthropic('claude-3-5-sonnet'),
  instructions: `You are a resume tailoring assistant...`,
  tools: { /* see below */ },
  stopWhen: stepCountIs(15),
});
```

### Tool Definitions

**Library Management:**
- `getLibraryStatus()` → `{ exists: boolean, count: number, lastUpdated: Date }`
- `parseResumeIntoLibrary(text: string)` → `Achievement[]`
- `addAchievement(data: AchievementInput)` → `Achievement`
- `getAchievements(filters?: { tags?: string[], roleId?: string })` → `Achievement[]`
- `updateAchievement(id: string, data: Partial<AchievementInput>)` → `Achievement`

**Job Research:**
- `parseJobDescription(text: string)` → `{ requirements: Requirement[], keywords: string[], roleType: string }`
- `searchCompany(name: string)` → `{ description: string, culture: string, recentNews: string[] }`
- `buildSuccessProfile(jd: ParsedJD, company: CompanyInfo)` → `SuccessProfile`

**Matching:**
- `matchAchievements(profile: SuccessProfile)` → `{ matches: RankedMatch[], gaps: Gap[] }`

**Generation:**
- `generateResume(matches: RankedMatch[], preferences: Preferences)` → `{ markdown: string, id: string }`
- `generateDocx(resumeId: string)` → `{ filePath: string, downloadUrl: string }`

**User Preferences:**
- `getPreferences()` → `Preferences`
- `updatePreferences(prefs: Partial<Preferences>)` → `Preferences`

### Agent Instructions (System Prompt)

The system prompt encodes:
- When to checkpoint with the user (after building success profile)
- How to handle gaps (discovery interview)
- Formatting preferences
- Conversation style guidelines

## Database Schema

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  accounts      Account[]
  sessions      Session[]

  achievements  Achievement[]
  preferences   Preference?
  conversations Conversation[]
  resumes       GeneratedResume[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Achievement {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])

  company   String
  title     String
  location  String?
  startDate DateTime?
  endDate   DateTime?

  text      String   // The achievement bullet text
  tags      String[] // Array of tags for matching
  metrics   Json?    // Extracted metrics { type, value, unit }

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([tags])
}

model Preference {
  id                   String  @id @default(cuid())
  userId               String  @unique
  user                 User    @relation(fields: [userId], references: [id])

  includeSummary       Boolean @default(true)
  includeRoleSummaries Boolean @default(true)
  boldPattern          String  @default("action_and_kpi") // "action_only" | "action_and_kpi"
  format               String  @default("company_location_dates")

  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}

model Conversation {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])

  title     String?  // Auto-generated from first message or job title
  messages  Json     // Array of messages

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}

model GeneratedResume {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id])
  conversationId String?

  targetCompany  String
  targetRole     String
  markdown       String   // The generated markdown
  docxPath       String?  // Path to generated DOCX file

  createdAt      DateTime @default(now())

  @@index([userId])
}
```

## Interface Design

### Layout

Three-panel layout using shadcn blocks:

```
┌──────────────┬──────────────────────────────┬──────────────────┐
│ Sidebar      │  Chat                        │  Preview (v2)    │
│ (collapsible)│                              │                  │
├──────────────┤                              │                  │
│ [+ New Chat] │  [Messages...]               │  (Future)        │
│              │                              │                  │
│ Chat History │  [File card with download]   │                  │
│ ───────────  │                              │                  │
│ > Today      │                              │                  │
│ > Yesterday  │                              │                  │
│              │                              │                  │
│ ───────────  │                              │                  │
│ [📚 Library] │                              │                  │
│ [⚙ Settings] ├──────────────────────────────┤                  │
│ [👤 Profile] │ [Input + upload]      [Send] │                  │
└──────────────┴──────────────────────────────┴──────────────────┘
```

### UI Components Strategy

| Component | Approach |
|-----------|----------|
| Sidebar + layout | `npx shadcn@latest add sidebar-07` |
| Chat messages | Custom with shadcn primitives |
| Input area | shadcn `Textarea` + `Button` |
| File upload | Drag-drop zone or paste detection |
| File cards | Custom card with shadcn `Card` |
| Markdown | `react-markdown` with prose styling |

### Component Structure

```
components/
  ui/                    # shadcn primitives (auto-generated)

  layout/
    AppSidebar.tsx       # Customized from sidebar-07

  chat/
    ChatContainer.tsx    # Main chat area
    MessageList.tsx      # Scrollable message container
    MessageBubble.tsx    # User/assistant message
    ChatInput.tsx        # Input + file upload + send
    FileCard.tsx         # Resume download card
    MarkdownContent.tsx  # Renders assistant markdown
```

## API Routes

```
app/
  api/
    chat/
      route.ts           # POST - Main chat endpoint (streaming)
    upload/
      route.ts           # POST - Resume file upload
    library/
      route.ts           # GET, POST - Achievement CRUD
      [id]/
        route.ts         # GET, PUT, DELETE - Single achievement
    resumes/
      route.ts           # GET - List generated resumes
      [id]/
        route.ts         # GET - Resume details
        download/
          route.ts       # GET - Download DOCX
    preferences/
      route.ts           # GET, PUT - User preferences
```

## Key User Flows

### Flow 1: New User (No Library)

1. User sends first message (e.g., "I want to tailor my resume for...")
2. Agent calls `getLibraryStatus()` → `{ exists: false }`
3. Agent responds: "I don't see a resume library yet. Upload a resume or paste it here."
4. User uploads/pastes resume
5. Agent calls `parseResumeIntoLibrary(text)`
6. Agent shows parsed achievements, asks for confirmation
7. Proceeds to tailoring flow

### Flow 2: Returning User (Has Library)

1. User pastes job description
2. Agent calls `getLibraryStatus()` → `{ exists: true, count: 24 }`
3. Agent calls `parseJobDescription(text)`
4. Agent calls `searchCompany(name)` (if web search available)
5. Agent calls `buildSuccessProfile(...)`
6. **CHECKPOINT:** Agent shows success profile, asks for confirmation
7. User confirms
8. Agent calls `matchAchievements(profile)`
9. If gaps, agent conducts discovery interview (conversational)
10. Agent calls `generateResume(matches, preferences)`
11. Agent calls `generateDocx(resumeId)`
12. Agent responds with file card (download buttons)

### Flow 3: Library Management

1. User: "Add this achievement to my library: Led migration..."
2. Agent calls `addAchievement({ text, company, title, tags })`
3. Agent confirms addition

## Development Phases

### Phase 1: Agent Core
- Project setup (Next.js, Prisma, shadcn)
- Database schema and migrations
- Tool implementations
- ToolLoopAgent configuration
- API route for chat (streaming)
- Test via API/curl

### Phase 2: Chat UI
- shadcn sidebar block setup
- `useChat` hook integration
- Message rendering with markdown
- File upload (paste + drag-drop)
- File cards with download

### Phase 3: Auth + Persistence
- NextAuth.js setup (Google/GitHub)
- Chat history persistence
- Library view page
- Settings/preferences page

### Phase 4: Polish (v2)
- Preview pane for resumes
- Better mobile responsiveness
- Conversation search
- Billing integration (if needed)

## File Structure

```
resume-tailor-ai/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                 # Main chat page
│   ├── api/
│   │   ├── chat/route.ts
│   │   ├── upload/route.ts
│   │   ├── library/route.ts
│   │   ├── resumes/route.ts
│   │   └── preferences/route.ts
│   ├── library/
│   │   └── page.tsx             # Library management page
│   └── settings/
│       └── page.tsx             # User settings page
├── components/
│   ├── ui/                      # shadcn components
│   ├── layout/
│   │   └── AppSidebar.tsx
│   └── chat/
│       ├── ChatContainer.tsx
│       ├── MessageList.tsx
│       ├── MessageBubble.tsx
│       ├── ChatInput.tsx
│       ├── FileCard.tsx
│       └── MarkdownContent.tsx
├── lib/
│   ├── prisma.ts               # Prisma client
│   ├── agent/
│   │   ├── index.ts            # ToolLoopAgent setup
│   │   ├── tools/
│   │   │   ├── library.ts
│   │   │   ├── research.ts
│   │   │   ├── matching.ts
│   │   │   └── generation.ts
│   │   └── instructions.ts     # System prompt
│   └── docx/
│       └── generator.ts        # DOCX generation
├── prisma/
│   └── schema.prisma
├── docs/
│   └── plans/
└── package.json
```

## Open Questions (Resolved)

1. **Multi-agent vs single agent?** → Single ToolLoopAgent with tools
2. **Skills/progressive disclosure?** → Not needed; workflow is sequential
3. **Pre-built chat components?** → Use AI SDK UI hooks + custom shadcn components
4. **Layout?** → Collapsible sidebar + chat, preview pane in v2

## Dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "ai": "^6.0.0",
    "@ai-sdk/anthropic": "^1.0.0",
    "@ai-sdk/react": "^1.0.0",
    "@prisma/client": "^5.0.0",
    "next-auth": "^5.0.0",
    "docx": "^8.0.0",
    "react-markdown": "^9.0.0",
    "zod": "^3.0.0"
  }
}
```
