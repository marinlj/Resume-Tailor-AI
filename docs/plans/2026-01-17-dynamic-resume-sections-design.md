# Dynamic Resume Sections Design

**Date:** 2026-01-17
**Status:** Approved

## Problem Statement

The current resume generation system has several issues:

1. **Skills and Education are missing** from generated resumes - the `generateResume` tool doesn't fetch or include them
2. **No support for dynamic sections** - users with Projects, Certifications, Awards, Publications, etc. can't include them
3. **Matching algorithm is too strict** - scores against ALL tags, making most achievements appear as poor matches
4. **No structure persistence** - users can't save their preferred resume format

## Design Goals

- Store ALL content from a user's resume (any section type)
- Let users confirm their preferred resume structure once, then reuse it
- Support any section type without code changes
- Fix the immediate bugs (skills/education missing)

## Architecture

### Data Model

**Keep existing models (no migration):**
- `ContactDetails` - name, email, phone, etc.
- `Achievement` - work experience bullets with tags
- `Skill` - technical/soft skills with categories
- `Education` - degrees and certifications

**Add new models:**

```prisma
// Generic storage for any additional section type
model LibraryItem {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])

  type      String   // "project", "certification", "award", "publication", etc.
  title     String   // Item name
  subtitle  String?  // Organization, issuer, etc.
  date      String?  // Date or date range
  location  String?  // If applicable
  bullets   String[] // Description points
  tags      String[] // For matching against job requirements
  url       String?  // Link if applicable

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId, type])
}

// User's preferred resume structure
model ResumeStructure {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id])

  contactFields String[]  // ["name", "email", "phone", "linkedin"]
  sections      Json      // [{ type: "experience", label: "Professional Experience" }, ...]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Resume Structure Schema

```json
{
  "contactFields": ["name", "email", "phone", "location", "linkedin"],
  "sections": [
    { "type": "summary", "label": "Summary" },
    { "type": "experience", "label": "Professional Experience" },
    { "type": "project", "label": "Projects" },
    { "type": "skill", "label": "Skills" },
    { "type": "education", "label": "Education" }
  ]
}
```

- `contactFields`: Which contact details to include on resume (subset of what's in library)
- `sections`: Ordered list of sections with display labels
- `type` maps to either a core model (`experience` → Achievement, `skill` → Skill, `education` → Education) or `LibraryItem.type`

## User Flows

### First-Time User (Upload Resume)

```
1. User uploads resume
2. parseResumeIntoLibrary extracts ALL content:
   - Contact → ContactDetails
   - Experience → Achievement (with tags)
   - Skills → Skill
   - Education → Education
   - Projects, Certs, Awards, etc. → LibraryItem
3. Present extracted content for confirmation
4. User confirms
5. Content saved to library
```

### First Resume Generation

```
1. User pastes job description
2. Agent parses JD, builds success profile
3. Agent matches library content against requirements
4. Agent checks for ResumeStructure → none exists
5. Agent infers structure from library content:

   "I'm about to generate your resume:

    Contact: Marin Ljubas | email | phone | location | linkedin

    Sections:
      1. Summary
      2. Professional Experience
      3. Projects
      4. Skills
      5. Education

    Look good?"

6. User confirms (or adjusts)
7. Structure saved to ResumeStructure
8. Resume generated using confirmed structure
```

### Returning User

```
1. User pastes job description
2. Agent parses JD, matches content
3. Agent checks for ResumeStructure → exists
4. Resume generated using saved structure (no confirmation needed)
```

### Modifying Structure

User can say:
- "Remove projects from my resume" → Agent updates structure
- "Add certifications section" → Agent updates structure
- "Move skills above experience" → Agent updates structure

Changes persist for future generations.

## Tool Changes

### Updated Tools

| Tool | Changes |
|------|---------|
| `parseResumeIntoLibrary` | Extract `otherSections` → store as `LibraryItem` |
| `getLibraryStatus` | Return counts for ALL section types |
| `generateResume` | Use structure preference, include all sections |
| `matchAchievements` | Rename to `matchLibraryContent`, match projects/certs too |

### New Tools

| Tool | Purpose |
|------|---------|
| `addLibraryItem` | Add items to dynamic sections |
| `getLibraryItems` | Fetch items by type |
| `getResumeStructure` | Fetch saved structure preference |
| `saveResumeStructure` | Save/update structure after confirmation |

## Generation Logic

```typescript
async function generateResume({ targetCompany, targetRole, matchedContent, summary }) {
  const structure = await prisma.resumeStructure.findUnique({ where: { userId } });
  const contact = await prisma.contactDetails.findUnique({ where: { userId } });

  // Build contact header with only preferred fields
  let markdown = buildContactHeader(contact, structure.contactFields);

  // Build sections in user's preferred order
  for (const section of structure.sections) {
    switch (section.type) {
      case "summary":
        markdown += buildSummary(summary);
        break;
      case "experience":
        markdown += buildExperience(matchedContent.achievements);
        break;
      case "skill":
        const skills = await prisma.skill.findMany({ where: { userId } });
        markdown += buildSkills(skills);
        break;
      case "education":
        const education = await prisma.education.findMany({ where: { userId } });
        markdown += buildEducation(education);
        break;
      default:
        // Dynamic sections
        const items = await prisma.libraryItem.findMany({
          where: { userId, type: section.type }
        });
        markdown += buildGenericSection(section.label, items);
    }
  }

  return markdown;
}
```

## Matching Algorithm Fix

Current issue: Score = `(matched tags / ALL required tags) * 100`

With 20 required tags, an achievement matching 2 tags scores only 10%.

**Fix options:**
1. Score per-theme (best theme match)
2. Cumulative scoring (reward matching multiple themes)
3. Lower thresholds

Recommend: Score per-theme, then aggregate. An achievement that strongly matches ONE theme should score well.

## Agent Instructions Update

Add to system prompt:

```markdown
### Resume Structure Preference

- On FIRST resume generation, present the structure for confirmation:
  "I'll generate your resume with: [Contact fields] + [Sections in order]"
- After confirmation, save with `saveResumeStructure`
- On subsequent generations, use saved structure automatically
- If user requests changes, update structure and confirm
```

## Implementation Order

1. **Phase 1: Fix immediate bugs**
   - Update `generateResume` to fetch and include skills/education
   - Fix date format consistency
   - Add education parsing to `parseMarkdownToResumeData`

2. **Phase 2: Add structure preference**
   - Add `ResumeStructure` model
   - Add `getResumeStructure` / `saveResumeStructure` tools
   - Add confirmation checkpoint to agent workflow
   - Update `generateResume` to use structure

3. **Phase 3: Add dynamic sections**
   - Add `LibraryItem` model
   - Update `parseResumeIntoLibrary` to detect and store any section
   - Add `addLibraryItem` / `getLibraryItems` tools
   - Update generation to handle dynamic sections

4. **Phase 4: Improve matching**
   - Refactor scoring algorithm
   - Extend matching to projects and other tagged content

## Open Questions

None - design approved.
