# Contact Details in Library - Design Document

**Date:** 2026-01-16
**Status:** Approved

## Overview

Add contact details storage and management to the Library, enabling the agent to extract, store, and use contact information for resume generation without requiring manual input each time.

## Problem Statement

Currently, contact details (name, email, phone, location, LinkedIn) are:
- Not stored in the database
- Requested manually during each resume generation
- Not extracted from uploaded resumes

This creates friction in the resume generation workflow.

## Design Decisions

### Storage Location: Library (not User Profile)

**Rationale:**
- Contact details are "resume data" not "account data"
- Library should show everything that goes into a resume
- OAuth email/name may differ from desired resume contact info
- Consistent with agent-first architecture—agent manages all library data

**Profile page reserved for:**
- Connected OAuth providers
- Notification preferences
- Subscription/billing (future)
- Data export/deletion

### Population Method

Same as other library data:
1. Initial population via resume upload (auto-extract)
2. Initial population via discovery session (agent asks)
3. Later updates via agent prompts ("update my phone number")

No special confirmation step—treated like achievements, skills, education.

## Database Schema

```prisma
model ContactDetails {
  id                  String   @id @default(cuid())
  userId              String   @unique  // One contact record per user

  // Required fields
  fullName            String
  email               String

  // Optional fields
  phone               String?
  location            String?  // "City, State" or "City, Country"
  linkedinUrl         String?
  portfolioUrl        String?
  githubUrl           String?
  headline            String?  // "Senior Software Engineer"

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// Add to User model:
model User {
  // ... existing fields
  contactDetails  ContactDetails?
}
```

**Key decisions:**
- `@unique` on userId — one contact record per user (not multiple like achievements)
- Separate from User model — keeps OAuth identity separate from resume identity
- Cascade delete — if user is deleted, contact details go too

## Agent Tools

Add to `lib/agent/tools/library.ts`:

### getContactDetails

```typescript
getContactDetails: {
  description: "Retrieve user's contact details from the library",
  parameters: z.object({}),
  // Returns: ContactDetails | null
}
```

### updateContactDetails

```typescript
updateContactDetails: {
  description: "Create or update user's contact details",
  parameters: z.object({
    fullName: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    location: z.string().optional(),
    linkedinUrl: z.string().url().optional(),
    portfolioUrl: z.string().url().optional(),
    githubUrl: z.string().url().optional(),
    headline: z.string().optional(),
  }),
  // Upserts based on userId
}
```

### Integration Points

1. **Resume parsing** (`parseResumeIntoLibrary`) — Extract contact details from resume header, call `updateContactDetails`

2. **Resume generation** (`generateResume`) — Auto-fetch from `getContactDetails` instead of requiring params. Fall back to asking user if missing.

3. **Discovery session** — Agent asks for contact details, saves via `updateContactDetails`

## UI Design

### Library Page Layout

Contact details appear as hero card at top of Library page:

```
┌─────────────────────────────────────────────────────────┐
│  Marin Ljubas                                           │
│  Senior Software Engineer                               │
│                                                         │
│  📧 marin@email.com  📱 +385 99 123 4567               │
│  📍 Zagreb, Croatia                                     │
│                                                         │
│  🔗 LinkedIn  🌐 Portfolio  💻 GitHub                   │
└─────────────────────────────────────────────────────────┘

Skills
├── Programming Languages: TypeScript, Python...
...

Education
...

Work Experience
...
```

### Behavior

- Empty state if no contact details: "No contact details yet. Upload a resume or ask the agent to add them."
- URLs render as clickable links (open in new tab)
- No inline editing—all changes through agent (consistent with other library data)
- Same styling as other library section cards

### API Changes

Add `contactDetails` to `/api/library` GET response:

```typescript
{
  contactDetails: ContactDetails | null,
  skills: Skill[],
  education: Education[],
  achievements: Achievement[]
}
```

## Files to Modify

1. `prisma/schema.prisma` — Add ContactDetails model + User relation
2. `lib/agent/tools/library.ts` — Add getContactDetails, updateContactDetails tools
3. `lib/agent/schemas.ts` — Add Zod schemas for contact details
4. `lib/agent/instructions.ts` — Update agent instructions for contact extraction
5. `app/api/library/route.ts` — Include contactDetails in GET response
6. `app/(main)/library/page.tsx` — Add ContactDetailsCard hero component
7. `lib/agent/tools/generation.ts` — Fetch contact details from library instead of params

## Future Considerations (Deferred)

- Template preferences for which contact fields appear on generated resumes
- Multiple contact "profiles" (e.g., different email for different industries)
- Contact detail validation (phone format, URL reachability)
