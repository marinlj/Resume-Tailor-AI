# Dynamic Resume Sections Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add skills and education to generated resumes, then add support for user-defined resume structure preferences and dynamic section types.

**Architecture:** The resume generation system will be extended to: (1) include skills/education from the library, (2) allow users to define their preferred resume structure, and (3) support arbitrary section types via a generic LibraryItem model.

**Tech Stack:** Next.js 16, Prisma, AI SDK 6, TypeScript, docx library

---

## Phase 1: Fix Immediate Bugs (Skills & Education in Resumes)

### Task 1.1: Update generateResume to Fetch Skills and Education

**Files:**
- Modify: `lib/agent/tools/generation.ts:85-95`

**Step 1: Verify current state**

The file already has the skills/education fetch added. Verify it's correct:

```typescript
// Fetch skills and education from library
const [skills, education] = await Promise.all([
  prisma.skill.findMany({
    where: { userId },
    orderBy: { category: 'asc' },
  }),
  prisma.education.findMany({
    where: { userId },
    orderBy: { endDate: 'desc' },
  }),
]);
```

**Step 2: Verify skills section rendering**

Confirm skills are grouped by category and rendered:

```typescript
// Skills section
if (skills.length > 0) {
  markdown += `## Skills\n\n`;
  const skillsByCategory = new Map<string, string[]>();
  for (const skill of skills) {
    const category = skill.category || 'Other';
    if (!skillsByCategory.has(category)) {
      skillsByCategory.set(category, []);
    }
    skillsByCategory.get(category)!.push(skill.name);
  }
  for (const [category, skillNames] of skillsByCategory) {
    markdown += `**${category}:** ${skillNames.join(', ')}\n\n`;
  }
}
```

**Step 3: Verify education section rendering**

Confirm education is rendered with degree, field, year, GPA, honors:

```typescript
// Education section
if (education.length > 0) {
  markdown += `## Education\n\n`;
  for (const edu of education) {
    markdown += `**${edu.institution}**${edu.location ? ` | ${edu.location}` : ''}\n`;
    let degreeLine = edu.degree;
    if (edu.field) degreeLine += ` in ${edu.field}`;
    if (edu.endDate) {
      const year = edu.endDate.getFullYear();
      degreeLine += `, ${year}`;
    }
    if (edu.gpa) degreeLine += ` | GPA: ${edu.gpa}`;
    if (edu.honors) degreeLine += ` | ${edu.honors}`;
    markdown += `${degreeLine}\n\n`;
  }
}
```

**Step 4: Run build to verify**

Run: `npm run build`
Expected: Build succeeds with no type errors

**Step 5: Commit if changes were made**

```bash
git add lib/agent/tools/generation.ts
git commit -m "feat: include skills and education in generated resumes

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 1.2: Add Education Parsing to parseMarkdownToResumeData

**Files:**
- Modify: `lib/docx/generator.ts:34-143`

**Step 1: Add education section parsing logic**

After the skills section parsing (around line 129), add education parsing:

```typescript
// Education section
if (currentSection.includes('education') && trimmed && !trimmed.startsWith('#')) {
  // Parse education entry - format: **Institution** | Location
  if (trimmed.startsWith('**')) {
    const institutionMatch = trimmed.match(/\*\*(.+?)\*\*/);
    const locationMatch = trimmed.match(/\|\s*(.+)/);
    // Start a new education entry
    const newEdu = {
      school: institutionMatch?.[1] || '',
      degree: '',
      year: undefined as string | undefined,
    };
    // Look for location in the match
    if (locationMatch) {
      // Location is after the pipe, but we store it differently
    }
    data.education?.push(newEdu);
  } else if (data.education && data.education.length > 0) {
    // This line is the degree line
    const lastEdu = data.education[data.education.length - 1];
    if (!lastEdu.degree) {
      // Parse: "Degree in Field, Year | GPA: X | Honors"
      const yearMatch = trimmed.match(/,\s*(\d{4})/);
      if (yearMatch) {
        lastEdu.year = yearMatch[1];
        lastEdu.degree = trimmed.split(',')[0];
      } else {
        lastEdu.degree = trimmed;
      }
    }
  }
  continue;
}
```

**Step 2: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add lib/docx/generator.ts
git commit -m "feat: add education parsing to parseMarkdownToResumeData

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 1.3: Add Education Rendering to generateDocx

**Files:**
- Modify: `lib/docx/generator.ts:290-320`

**Step 1: Add education section after skills section**

After the skills section (around line 318), add education rendering:

```typescript
// Education
if (data.education && data.education.length > 0) {
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'EDUCATION',
          bold: true,
          size: 22,
          font: 'Cambria',
        }),
      ],
      spacing: { before: 200, after: 100 },
    })
  );

  for (const edu of data.education) {
    // School name
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: edu.school,
            bold: true,
            size: 20,
            font: 'Cambria',
          }),
        ],
        spacing: { before: 100 },
      })
    );

    // Degree and year
    const degreeText = edu.year ? `${edu.degree}, ${edu.year}` : edu.degree;
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: degreeText,
            italics: true,
            size: 20,
            font: 'Cambria',
          }),
        ],
        spacing: { after: 50 },
      })
    );
  }
}
```

**Step 2: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add lib/docx/generator.ts
git commit -m "feat: add education section to DOCX output

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 1.4: Verify End-to-End Functionality

**Step 1: Start dev server**

Run: `npm run dev`
Expected: Server starts on localhost:3000

**Step 2: Manual test**

1. Log in to the app
2. Upload a resume with skills and education
3. Paste a job description
4. Generate a tailored resume
5. Verify the markdown includes Skills and Education sections
6. Download the DOCX and verify it includes Education section

**Step 3: Commit Phase 1 completion**

```bash
git add -A
git commit -m "feat: complete Phase 1 - skills and education in resumes

- Skills grouped by category in generated resumes
- Education with degree, year, GPA, honors
- DOCX includes education section

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: Add Resume Structure Preferences

### Task 2.1: Add ResumeStructure Model to Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add ResumeStructure model**

Add after the ContactDetails model:

```prisma
model ResumeStructure {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  contactFields String[]  // ["name", "email", "phone", "linkedin"]
  sections      Json      // [{ type: "experience", label: "Professional Experience" }, ...]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Step 2: Add relation to User model**

Add to User model relations:

```prisma
resumeStructure ResumeStructure?
```

**Step 3: Run migration**

Run: `npx prisma migrate dev --name add_resume_structure`
Expected: Migration succeeds

**Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add ResumeStructure model for user preferences

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2.2: Add ResumeStructure Tool Schemas

**Files:**
- Modify: `lib/agent/schemas.ts`

**Step 1: Add section schema**

```typescript
export const resumeSectionSchema = z.object({
  type: z.string().describe('Section type: "summary", "experience", "skill", "education", or custom type'),
  label: z.string().describe('Display label for this section'),
});

export const resumeStructureInputSchema = z.object({
  contactFields: z.array(z.string()).describe('Contact fields to include: "name", "email", "phone", "location", "linkedin", "portfolio", "github"'),
  sections: z.array(resumeSectionSchema).describe('Ordered list of sections to include'),
});
```

**Step 2: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add lib/agent/schemas.ts
git commit -m "feat: add ResumeStructure schemas

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2.3: Add getResumeStructure and saveResumeStructure Tools

**Files:**
- Create: `lib/agent/tools/structure.ts`
- Modify: `lib/agent/index.ts`

**Step 1: Create structure.ts with both tools**

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resumeStructureInputSchema } from '../schemas';
import { getTempUserId } from './utils';

export const getResumeStructure = tool({
  description: 'Get the user\'s saved resume structure preference',
  inputSchema: z.object({}),
  execute: async () => {
    const userId = getTempUserId();
    try {
      const structure = await prisma.resumeStructure.findUnique({
        where: { userId },
      });

      if (!structure) {
        return {
          success: true,
          structure: null,
          message: 'No saved structure. On first resume generation, present structure for confirmation.',
        };
      }

      return {
        success: true,
        structure: {
          contactFields: structure.contactFields,
          sections: structure.sections,
        },
      };
    } catch (error) {
      return { success: false, error: 'Failed to fetch resume structure' };
    }
  },
});

export const saveResumeStructure = tool({
  description: 'Save the user\'s preferred resume structure after confirmation',
  inputSchema: resumeStructureInputSchema,
  execute: async (input) => {
    const userId = getTempUserId();
    try {
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, email: `${userId}@temp.local` },
      });

      const structure = await prisma.resumeStructure.upsert({
        where: { userId },
        update: {
          contactFields: input.contactFields,
          sections: input.sections,
        },
        create: {
          userId,
          contactFields: input.contactFields,
          sections: input.sections,
        },
      });

      return {
        success: true,
        message: 'Resume structure saved. Future resumes will use this format.',
        structure: {
          contactFields: structure.contactFields,
          sections: structure.sections,
        },
      };
    } catch (error) {
      return { success: false, error: 'Failed to save resume structure' };
    }
  },
});
```

**Step 2: Register tools in agent index**

Add imports and register in tools object in `lib/agent/index.ts`:

```typescript
import {
  getResumeStructure,
  saveResumeStructure,
} from './tools/structure';

// In tools object:
getResumeStructure,
saveResumeStructure,
```

**Step 3: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add lib/agent/tools/structure.ts lib/agent/index.ts
git commit -m "feat: add getResumeStructure and saveResumeStructure tools

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2.4: Update Agent Instructions for Structure Confirmation

**Files:**
- Modify: `lib/agent/instructions.ts`

**Step 1: Add structure confirmation section**

Add after the "Important Rules" section:

```typescript
## Resume Structure Preference

When generating a resume:
1. Call \`getResumeStructure\` to check for saved preferences
2. If no structure exists (first generation):
   - Present the inferred structure for confirmation:
   \`\`\`
   I'll generate your resume with this structure:

   Contact: Name | Email | Phone | Location | LinkedIn

   Sections:
   1. Summary
   2. Professional Experience
   3. Skills (grouped by category)
   4. Education

   Does this look right? (Yes / adjust)
   \`\`\`
3. After confirmation, call \`saveResumeStructure\` to save preferences
4. If structure exists, use it automatically without asking
5. If user requests changes (e.g., "remove skills section"), update structure
```

**Step 2: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add lib/agent/instructions.ts
git commit -m "feat: add resume structure confirmation to agent instructions

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2.5: Update generateResume to Use Structure Preference

**Files:**
- Modify: `lib/agent/tools/generation.ts`

**Step 1: Fetch structure at start of execute**

After fetching contact details, add:

```typescript
// Fetch resume structure preference
const structure = await prisma.resumeStructure.findUnique({
  where: { userId },
});
```

**Step 2: Use structure for section ordering**

Replace hardcoded section generation with dynamic generation based on structure.sections. If no structure, use default order.

**Step 3: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add lib/agent/tools/generation.ts
git commit -m "feat: generateResume uses saved structure preference

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 3: Add Dynamic Sections (LibraryItem)

### Task 3.1: Add LibraryItem Model

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add LibraryItem model**

```prisma
model LibraryItem {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  type      String   // "project", "certification", "award", "publication", etc.
  title     String
  subtitle  String?  // Organization, issuer, etc.
  date      String?  // Date or date range
  location  String?
  bullets   String[]
  tags      String[]
  url       String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId, type])
}
```

**Step 2: Add relation to User**

```prisma
libraryItems LibraryItem[]
```

**Step 3: Run migration**

Run: `npx prisma migrate dev --name add_library_item`

**Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add LibraryItem model for dynamic sections

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 3.2: Add LibraryItem CRUD Tools

**Files:**
- Modify: `lib/agent/tools/library.ts`
- Modify: `lib/agent/schemas.ts`

**Step 1: Add schema for LibraryItem**

In schemas.ts:

```typescript
export const libraryItemInputSchema = z.object({
  type: z.string().describe('Section type: "project", "certification", "award", "publication", etc.'),
  title: z.string().describe('Item title'),
  subtitle: z.string().optional().describe('Organization, issuer, etc.'),
  date: z.string().optional().describe('Date or date range'),
  location: z.string().optional(),
  bullets: z.array(z.string()).optional().describe('Description bullet points'),
  tags: z.array(z.string()).optional().describe('Tags for matching'),
  url: z.string().optional().describe('Link if applicable'),
});
```

**Step 2: Add CRUD tools in library.ts**

```typescript
export const getLibraryItems = tool({
  description: 'Get library items, optionally filtered by type',
  inputSchema: z.object({
    type: z.string().optional().describe('Filter by type'),
  }),
  execute: async ({ type }) => {
    const userId = getTempUserId();
    const where: Record<string, unknown> = { userId };
    if (type) where.type = type;

    const items = await prisma.libraryItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, items };
  },
});

export const addLibraryItems = tool({
  description: 'Add multiple library items at once',
  inputSchema: z.object({
    items: z.array(libraryItemInputSchema),
  }),
  execute: async ({ items }) => {
    const userId = getTempUserId();
    // ... implementation
  },
});
```

**Step 3: Register tools in index.ts**

**Step 4: Run build and commit**

---

### Task 3.3: Update parseResumeIntoLibrary for Dynamic Sections

**Files:**
- Modify: `lib/agent/tools/library.ts`

**Step 1: Update instruction to extract projects, certifications, etc.**

Add to the parseResumeIntoLibrary instruction:

```
## 4. OTHER SECTIONS
Extract any additional sections (Projects, Certifications, Awards, Publications, Volunteer):
- Identify the section type from the header
- Extract each item with title, subtitle, date, bullets, tags

Call \`addLibraryItems\` with the extracted items.
```

**Step 2: Run build and commit**

---

### Task 3.4: Update generateResume for Dynamic Sections

**Files:**
- Modify: `lib/agent/tools/generation.ts`

**Step 1: Fetch LibraryItems for dynamic section types**

When iterating structure.sections, if type is not "experience", "skill", "education", or "summary", fetch from LibraryItem:

```typescript
default:
  const items = await prisma.libraryItem.findMany({
    where: { userId, type: section.type }
  });
  markdown += buildGenericSection(section.label, items);
```

**Step 2: Implement buildGenericSection helper**

**Step 3: Run build and commit**

---

## Phase 4: Improve Matching Algorithm

### Task 4.1: Refactor Scoring to Per-Theme Approach

**Files:**
- Modify: `lib/agent/tools/matching.ts`

**Step 1: Analyze current scoring logic**

Current: `score = (matched_tags / all_required_tags) * 100`
Problem: With 20 required tags, matching 2 gives only 10%

**Step 2: Implement per-theme scoring**

New approach:
1. Group required tags by theme
2. Score each achievement against each theme
3. Use best theme match as score

**Step 3: Run build and test**

**Step 4: Commit**

---

### Task 4.2: Extend Matching to Projects and Other Tagged Content

**Files:**
- Modify: `lib/agent/tools/matching.ts`

**Step 1: Include LibraryItems with tags in matching**

Fetch achievements AND libraryItems with tags, score all.

**Step 2: Return matched items with source type**

**Step 3: Run build and commit**

---

## Verification Checklist

After completing all tasks:

- [ ] `npm run build` passes with no errors
- [ ] Generated resumes include Skills section grouped by category
- [ ] Generated resumes include Education section with degree, year, GPA, honors
- [ ] DOCX files include Education section
- [ ] First-time resume generation prompts for structure confirmation
- [ ] Saved structure is used automatically on subsequent generations
- [ ] Projects/Certifications can be added to library and included in resumes
- [ ] Matching algorithm scores achievements reasonably (not all 0-10%)
