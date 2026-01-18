# Design: Matching Algorithm & Library Improvements

**Date**: 2026-01-17
**Status**: Draft
**Authors**: Marin Ljubas, Claude

## Overview

This document outlines improvements to the Resume Tailor AI agent based on issues identified during user testing. The two primary areas of focus are:

1. **Matching Algorithm** - Current tag-based matching misses semantically relevant achievements
2. **Library Structure** - Adding role summaries and improving the data model

## Problem Statement

### Issue 1: Matching Algorithm Misses Relevant Achievements

**Observed behavior**: The agent failed to match existing achievements against job requirements, then asked the user for experience they already had in their library.

**Root cause**: The matching algorithm (`lib/agent/tools/matching.ts`) uses pure tag-based substring matching:

```javascript
const tagOverlap = achievement.tags.filter((tag) =>
  theme.tags.some((themeTag) =>
    tag.toLowerCase().includes(themeTag.toLowerCase())
  )
);
```

Problems:
- "AI" tagged achievements don't match "LLM" or "machine-learning" themed requirements
- Algorithm never looks at achievement text content, only tags
- No semantic understanding of related concepts

**Additional failure**: When user mentioned existing experience, the agent added a duplicate weaker bullet instead of finding the existing strong one in the library.

### Issue 2: Role Summaries Not Implemented

**Observed behavior**: User requested role descriptions at the beginning of each role instead of a top-level summary. Agent acknowledged the preference but generated resume without role summaries.

**Root cause**:
- `Preferences.includeRoleSummaries` exists in schema but `generateResume` never reads it
- No place to store role-level data (summaries) in current schema
- Current schema is denormalized - achievements repeat company/title/dates

## Solution Design

### 1. LLM-Based Semantic Matching

Replace tag-based matching with LLM-powered semantic scoring.

**New flow**:
```
matchAchievements(profileJson)
  → fetch all achievements (with role data)
  → batch achievements and send to LLM for scoring
  → LLM returns relevance scores per achievement per requirement
  → rank and return matches
```

**Batch scoring prompt**:
```
Score these achievements against the job requirements.

Job Requirements:
- Must have: [list]
- Nice to have: [list]
- Key themes: [list with descriptions]

Achievements:
1. "{text}" [tags: ...]
2. "{text}" [tags: ...]
...

For each achievement, return:
- score (0-100): How relevant is this achievement to the job?
- matchedRequirements: Which requirements does it address?
- reasoning: Brief explanation

Consider:
- Direct experience match
- Transferable skills
- Semantic similarity (AI ≈ LLM ≈ machine-learning)
- Impact relevance

Return JSON array.
```

**Benefits**:
- Understands semantic relationships (AI ≈ LLM ≈ ML)
- Considers achievement text, not just tags
- Can identify transferable skills
- Single batched API call (not N calls)

**Before adding new achievements**: Agent must search library for similar existing achievements to prevent duplicates.

### 2. New Role Model (Schema Change)

Normalize the data model by introducing a `Role` entity.

**Current schema** (denormalized):
```prisma
model Achievement {
  id        String   @id
  userId    String
  company   String   // Repeated
  title     String   // Repeated
  location  String?  // Repeated
  startDate DateTime? // Repeated
  endDate   DateTime? // Repeated
  text      String
  tags      String[]
}
```

**New schema** (normalized):
```prisma
model Role {
  id           String        @id @default(cuid())
  userId       String
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  company      String
  title        String
  location     String?
  startDate    DateTime?
  endDate      DateTime?
  summary      String?       // NEW: Role summary for resume
  achievements Achievement[]
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@unique([userId, company, title, startDate])
  @@index([userId])
}

model Achievement {
  id        String   @id @default(cuid())
  roleId    String
  role      Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)
  text      String
  tags      String[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([roleId])
}
```

**Migration strategy**:
1. Create `Role` table
2. Extract unique (userId, company, title, startDate) combinations from existing achievements
3. Create Role records for each unique combination
4. Add `roleId` to Achievement, populate from matching Role
5. Drop redundant columns from Achievement (company, title, location, startDate, endDate, userId)

### 3. Professional Summary

Add a stored professional summary that can be adjusted per job.

**Schema addition**:
```prisma
model User {
  // ... existing fields
  professionalSummary String?  // Generic summary, adjusted per job
}
```

**Generation behavior**:
- If user wants professional summary included → fetch from library, adjust for job keywords
- Adjustment is light (emphasis, keyword insertion) - no fabrication

### 4. Role Summary in Resume Generation

**Updated ResumeStructure**:
```typescript
type ResumeStructure = {
  contactFields: string[];
  sections: ResumeSection[];
  includeRoleSummaries: boolean;  // NEW
};
```

**Generation output when `includeRoleSummaries: true`**:
```markdown
## Professional Experience

**UVeye** | New York, NY
Product Manager, AI | 2022 - Present

_AI product manager driving LLM-powered solutions and multi-tenant SaaS products for 300+ enterprise clients._

- Reduced operational costs by $1,200 per vehicle...
- Built internal agentic AI tools...
```

**Agent behavior**:
1. Fetch `Role.summary` from library
2. If job emphasizes certain keywords, lightly adjust summary
3. If summary is missing, skip (don't block generation)

### 5. Role Summary Entry Points

How summaries get into the library:

1. **Resume parsing**: Extract role summary if present (line between job title and first bullet)
2. **Library UI**: Editable summary field on each role
3. **Discovery interview**: Agent asks for summary when adding new roles via chat
4. **Bulk generation** (nice-to-have): "Generate missing summaries" feature

### 6. Library UI Updates

The library UI must support full CRUD for all entities.

**Visual structure**:
```
┌─────────────────────────────────────────────────────┐
│ My Library                                          │
├─────────────────────────────────────────────────────┤
│ 👤 Contact Details                         [Edit]   │
├─────────────────────────────────────────────────────┤
│ 📝 Professional Summary                    [Edit]   │
│ "Product manager with 5+ years..."                  │
├─────────────────────────────────────────────────────┤
│ 💼 Roles                                            │
│                                                     │
│ ▼ UVeye · Product Manager, AI · 2022-Present        │
│   [Edit Role] [Delete Role]                         │
│   Summary: "Led AI product initiatives..."   [Edit] │
│   ├─ • Reduced operational costs...    [Edit] [Del] │
│   ├─ • Built internal agentic AI...    [Edit] [Del] │
│   └─ [+ Add Achievement]                            │
│                                                     │
│ ▶ B-works · Product Manager · 2020-2022             │
│ ▶ Mercedes-Benz · Design Thinking Coach             │
│                                                     │
│ [+ Add Role]                                        │
├─────────────────────────────────────────────────────┤
│ 🎓 Education                              [+ Add]   │
│   ▼ University of Applied Sciences · M.Sc. [Edit]   │
├─────────────────────────────────────────────────────┤
│ 🛠️ Skills                                 [Edit]    │
│   AI & Product: Applied AI, LLM Pipelines...        │
├─────────────────────────────────────────────────────┤
│ 📁 Projects                               [+ Add]   │
│ 📜 Certifications                         [+ Add]   │
│ 🏆 Awards                                 [+ Add]   │
│ 📄 Publications                           [+ Add]   │
└─────────────────────────────────────────────────────┘
```

**CRUD capabilities**:

| Entity | Create | Read | Update | Delete |
|--------|--------|------|--------|--------|
| Contact Details | ✅ | ✅ | ✅ | ✅ |
| Professional Summary | ✅ | ✅ | ✅ | ✅ |
| Role | ✅ | ✅ | ✅ (company, title, dates, location, summary) | ✅ (cascades to achievements) |
| Achievement | ✅ | ✅ | ✅ (text, tags) | ✅ |
| Education | ✅ | ✅ | ✅ (all fields) | ✅ |
| Skill | ✅ | ✅ | ✅ (name, category, level) | ✅ |
| Library Item | ✅ | ✅ | ✅ (all fields) | ✅ |

### 7. Library Items (Flexible Approach)

Keep the current flexible `LibraryItem` model for projects, certifications, awards, publications, volunteer work, etc.

```prisma
model LibraryItem {
  id        String   @id @default(cuid())
  userId    String
  type      String   // "project", "certification", "award", "publication", "volunteer"
  title     String
  subtitle  String?
  date      String?
  location  String?
  bullets   String[]
  tags      String[]
  url       String?
  // ...
}
```

**Rationale**: Flexible approach allows users to create any section type without schema changes. Type-specific fields can be added later as optional columns if needed.

## Implementation Plan

### Phase 1: Schema Migration
1. Create `Role` model
2. Write migration script to extract roles from achievements
3. Update Achievement model (remove redundant fields, add roleId)
4. Add `professionalSummary` to User model
5. Add `includeRoleSummaries` to ResumeStructure

### Phase 2: Agent Tools
1. Update `matchAchievements` with LLM-based scoring
2. Add library search before adding new achievements
3. Update `generateResume` to use role summaries
4. Update `parseResumeIntoLibrary` to extract role summaries
5. Update all library CRUD tools for new Role model

### Phase 3: Library UI
1. Restructure library page around Role hierarchy
2. Add inline editing for all entities
3. Add professional summary section
4. Ensure full CRUD for education, skills, library items

### Phase 4: Agent Instructions
1. Update instructions to probe for KPIs during discovery
2. Add instruction to preview bullets before adding
3. Add instruction to search library before adding duplicates
4. Add recovery behavior (regenerate if output doesn't match preferences)

## Open Questions

1. **Matching cache**: Should we cache LLM matching scores? For how long?
2. **Summary generation**: Should agent offer to generate missing role summaries automatically?
3. **Migration**: How do we handle existing users during schema migration?

## Appendix: Issues Not Addressed in This Design

These issues were identified but deprioritized:

- **Two disconnected preference systems** (ResumeStructure vs Preferences) - can be merged later
- **No recovery after failure** - agent should regenerate instead of asking permission to fix

---

*This document was generated through collaborative design session.*
