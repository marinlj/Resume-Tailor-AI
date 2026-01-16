# Contact Details Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add contact details storage to the Library so users don't have to re-enter contact info for each resume generation.

**Architecture:** New ContactDetails model with 1:1 user relation. Two agent tools (get/update) following existing library tool patterns. Hero card UI at top of Library page. Resume generation auto-fetches from library.

**Tech Stack:** Prisma, Zod, Next.js API routes, React components, Tailwind CSS

---

## Task 1: Add ContactDetails to Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma:10-28` (User model) and end of file

**Step 1: Add ContactDetails model to schema**

Add after line 165 in `prisma/schema.prisma`:

```prisma
model ContactDetails {
  id           String  @id @default(cuid())
  userId       String  @unique
  user         User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Required fields
  fullName     String
  email        String

  // Optional fields
  phone        String?
  location     String?
  linkedinUrl  String?
  portfolioUrl String?
  githubUrl    String?
  headline     String?

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

**Step 2: Add relation to User model**

In the User model (around line 22-24), add:

```prisma
  contactDetails ContactDetails?
```

**Step 3: Generate and apply migration**

Run:
```bash
npx prisma migrate dev --name add_contact_details
```

Expected: Migration created and applied successfully.

**Step 4: Verify schema**

Run:
```bash
npx prisma generate
```

Expected: Prisma client regenerated with ContactDetails model.

**Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add ContactDetails model for library"
```

---

## Task 2: Add Zod Schemas for Contact Details

**Files:**
- Modify: `lib/agent/schemas.ts` (add at end)

**Step 1: Add contact details schemas**

Add at end of `lib/agent/schemas.ts`:

```typescript
// ============================================================================
// Contact Details
// ============================================================================

export const contactDetailsInputSchema = z.object({
  fullName: z.string().describe('Full name as it should appear on resume'),
  email: z.string().email().describe('Professional email address'),
  phone: z.string().optional().describe('Phone number'),
  location: z.string().optional().describe('Location (City, State/Country)'),
  linkedinUrl: z.string().url().optional().describe('LinkedIn profile URL'),
  portfolioUrl: z.string().url().optional().describe('Portfolio or personal website URL'),
  githubUrl: z.string().url().optional().describe('GitHub profile URL'),
  headline: z.string().optional().describe('Professional headline (e.g., "Senior Software Engineer")'),
});

export type ContactDetailsInput = z.infer<typeof contactDetailsInputSchema>;

export const contactDetailsOutputSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  portfolioUrl: z.string().nullable(),
  githubUrl: z.string().nullable(),
  headline: z.string().nullable(),
});

export type ContactDetailsOutput = z.infer<typeof contactDetailsOutputSchema>;
```

**Step 2: Commit**

```bash
git add lib/agent/schemas.ts
git commit -m "feat(schemas): add contact details Zod schemas"
```

---

## Task 3: Add Contact Details Agent Tools

**Files:**
- Modify: `lib/agent/tools/library.ts` (add after education tools section)

**Step 1: Add import for contactDetailsInputSchema**

Update the import at line 3:

```typescript
import { achievementInputSchema, skillInputSchema, educationInputSchema, contactDetailsInputSchema } from '../schemas';
```

**Step 2: Add getContactDetails tool**

Add after the `addEducation` tool (after line 390):

```typescript
// ============================================================================
// Contact Details Tools
// ============================================================================

export const getContactDetails = tool({
  description: 'Get the user\'s contact details from the library',
  inputSchema: z.object({}),
  execute: async () => {
    const userId = getTempUserId();
    try {
      const contactDetails = await prisma.contactDetails.findUnique({
        where: { userId },
      });

      if (!contactDetails) {
        return {
          success: true,
          contactDetails: null,
          message: 'No contact details found. Ask the user for their contact information or extract from their resume.',
        };
      }

      return {
        success: true,
        contactDetails: {
          id: contactDetails.id,
          fullName: contactDetails.fullName,
          email: contactDetails.email,
          phone: contactDetails.phone,
          location: contactDetails.location,
          linkedinUrl: contactDetails.linkedinUrl,
          portfolioUrl: contactDetails.portfolioUrl,
          githubUrl: contactDetails.githubUrl,
          headline: contactDetails.headline,
        },
      };
    } catch (error) {
      return { success: false, error: 'Failed to fetch contact details' };
    }
  },
});
```

**Step 3: Add updateContactDetails tool**

Add immediately after `getContactDetails`:

```typescript
export const updateContactDetails = tool({
  description: 'Create or update the user\'s contact details in the library',
  inputSchema: contactDetailsInputSchema,
  execute: async (input) => {
    const userId = getTempUserId();
    try {
      // Ensure user exists
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, email: `${userId}@temp.local` },
      });

      const contactDetails = await prisma.contactDetails.upsert({
        where: { userId },
        update: {
          fullName: input.fullName,
          email: input.email,
          phone: input.phone ?? null,
          location: input.location ?? null,
          linkedinUrl: input.linkedinUrl ?? null,
          portfolioUrl: input.portfolioUrl ?? null,
          githubUrl: input.githubUrl ?? null,
          headline: input.headline ?? null,
        },
        create: {
          userId,
          fullName: input.fullName,
          email: input.email,
          phone: input.phone ?? null,
          location: input.location ?? null,
          linkedinUrl: input.linkedinUrl ?? null,
          portfolioUrl: input.portfolioUrl ?? null,
          githubUrl: input.githubUrl ?? null,
          headline: input.headline ?? null,
        },
      });

      return {
        success: true,
        contactDetails: {
          id: contactDetails.id,
          fullName: contactDetails.fullName,
          email: contactDetails.email,
          phone: contactDetails.phone,
          location: contactDetails.location,
          linkedinUrl: contactDetails.linkedinUrl,
          portfolioUrl: contactDetails.portfolioUrl,
          githubUrl: contactDetails.githubUrl,
          headline: contactDetails.headline,
        },
        message: 'Contact details saved to library.',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to save contact details: ${errorMessage}` };
    }
  },
});
```

**Step 4: Commit**

```bash
git add lib/agent/tools/library.ts
git commit -m "feat(tools): add getContactDetails and updateContactDetails"
```

---

## Task 4: Register Tools in Agent Index

**Files:**
- Modify: `lib/agent/index.ts`

**Step 1: Add imports**

Update the import from `./tools/library` (around line 6-18) to include the new tools:

```typescript
import {
  getLibraryStatus,
  getAchievements,
  addAchievement,
  addMultipleAchievements,
  updateAchievement,
  deleteAchievement,
  getSkills,
  addSkills,
  getEducation,
  addEducation,
  parseResumeIntoLibrary,
  getContactDetails,
  updateContactDetails,
} from './tools/library';
```

**Step 2: Register tools in agent**

Add to the tools object (around line 60, after `addEducation`):

```typescript
    // Library management - Contact Details
    getContactDetails,
    updateContactDetails,
```

**Step 3: Commit**

```bash
git add lib/agent/index.ts
git commit -m "feat(agent): register contact details tools"
```

---

## Task 5: Update Agent Instructions

**Files:**
- Modify: `lib/agent/instructions.ts`

**Step 1: Update capabilities section**

Around line 6, update the capabilities list to include contact details:

```typescript
You have access to tools for:
- Managing a master library of achievements, skills, education, and contact details
- Parsing job descriptions
- Matching achievements to job requirements
- Generating tailored resumes in markdown and DOCX format
```

**Step 2: Update resume parsing section**

Update the "For New Users" section (around lines 15-28) to include contact details extraction:

```typescript
### For New Users (No Library)

1. When a user first interacts, call \`getLibraryStatus\` to check if they have achievements
2. If no library exists, ask them to:
   - Upload their resume (they can paste text or upload a file)
   - Or manually describe their experience
3. Parse their resume using \`parseResumeIntoLibrary\` to extract:
   - **Contact Details**: Name, email, phone, location, LinkedIn, portfolio, GitHub, headline
   - **Work Experience**: Each bullet point as an achievement with tags
   - **Skills**: All technical and soft skills with categories
   - **Education**: Degrees, institutions, honors, and activities
4. Present ALL extracted data to the user for review
5. After confirmation, call the appropriate tools:
   - \`updateContactDetails\` for contact information
   - \`addMultipleAchievements\` for work experience
   - \`addSkills\` for skills
   - \`addEducation\` for education entries
```

**Step 3: Add contact details rule to Important Rules**

Add a new rule around line 78:

```typescript
8. For resume generation, ALWAYS call \`getContactDetails\` first. If contact details are missing, ask the user before generating.
```

**Step 4: Commit**

```bash
git add lib/agent/instructions.ts
git commit -m "feat(instructions): add contact details to agent workflow"
```

---

## Task 6: Update parseResumeIntoLibrary Tool

**Files:**
- Modify: `lib/agent/tools/library.ts` (parseResumeIntoLibrary function around line 392)

**Step 1: Update instruction text**

In the `parseResumeIntoLibrary` tool, update the returned instruction to include contact details extraction. Replace the entire instruction string (lines 408-459) with:

```typescript
    return {
      success: true,
      instruction: `Parse the following resume text and extract ALL information into the library.

## 0. CONTACT DETAILS (Header)
Extract from the resume header:
- Full name
- Email address
- Phone number (if present)
- Location (City, State/Country if present)
- LinkedIn URL (if present)
- Portfolio/website URL (if present)
- GitHub URL (if present)
- Professional headline (if present, e.g., "Senior Software Engineer")

Call \`updateContactDetails\` with the extracted contact information.

## 1. WORK EXPERIENCE (Achievements)
For each work experience section:
- Identify the company, title, location, and dates
- Extract each bullet point as a separate achievement
- Suggest 2-5 tags for each achievement from this list:
  - Technical: engineering, technical, architecture, api, database, cloud, infrastructure, ai, ml, llm
  - Leadership: leadership, management, mentoring, team-building, cross-functional, hiring
  - Data: data, analytics, metrics, reporting, a/b-testing, data-driven
  - Product: product, roadmap, strategy, prioritization, user-research, mvp
  - Communication: communication, stakeholder, presentation, documentation
  - Impact: cost-reduction, revenue, efficiency, automation, scale, growth
  - Process: agile, scrum, process-improvement, optimization

Call \`addMultipleAchievements\` with the extracted work experience data.

## 2. SKILLS
Extract ALL skills from the skills/technical skills section:
- Identify the skill name
- Categorize each skill (e.g., "Programming Languages", "Frameworks", "Cloud/DevOps", "Databases", "Tools", "Soft Skills")
- Optionally note the proficiency level if mentioned

Call \`addSkills\` with the extracted skills data.

## 3. EDUCATION
Extract ALL education entries:
- Institution name
- Degree type (e.g., "Bachelor of Science", "Master of Arts", "PhD")
- Field of study (e.g., "Computer Science", "Business Administration")
- Location (if mentioned)
- Start and end dates
- GPA (if mentioned and notable)
- Honors or distinctions (e.g., "Magna Cum Laude", "Dean's List")
- Relevant activities, clubs, or coursework

Call \`addEducation\` with the extracted education data.

## IMPORTANT
- Extract EVERYTHING from the resume - don't skip any sections
- Contact details are typically at the very top of the resume
- If a section is not present in the resume, that's fine - just skip that tool call
- Present ALL extracted data to the user for confirmation before calling the add tools

Resume text to parse:
---
${resumeText}
---`,
      schema: {
        contactDetails: '{ fullName, email, phone?, location?, linkedinUrl?, portfolioUrl?, githubUrl?, headline? }',
        achievements: 'array of { company, title, location?, startDate (YYYY-MM), endDate (YYYY-MM or "present"), text, tags[] }',
        skills: 'array of { name, category?, level? }',
        education: 'array of { institution, degree, field?, location?, startDate?, endDate?, gpa?, honors?, activities[]? }',
      },
    };
```

**Step 2: Commit**

```bash
git add lib/agent/tools/library.ts
git commit -m "feat(tools): add contact details to parseResumeIntoLibrary"
```

---

## Task 7: Update API Route to Include Contact Details

**Files:**
- Modify: `app/api/library/route.ts`

**Step 1: Add contactDetails to query**

Replace the entire file content:

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [contactDetails, achievements, skills, education] = await Promise.all([
    prisma.contactDetails.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.achievement.findMany({
      where: { userId: session.user.id },
      orderBy: [{ company: 'asc' }, { startDate: 'desc' }],
    }),
    prisma.skill.findMany({
      where: { userId: session.user.id },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    }),
    prisma.education.findMany({
      where: { userId: session.user.id },
      orderBy: { endDate: 'desc' },
    }),
  ]);

  return NextResponse.json({ contactDetails, achievements, skills, education });
}
```

**Step 2: Commit**

```bash
git add app/api/library/route.ts
git commit -m "feat(api): include contactDetails in library endpoint"
```

---

## Task 8: Create ContactDetailsCard Component

**Files:**
- Create: `components/library/ContactDetailsCard.tsx`

**Step 1: Create the component file**

Create `components/library/ContactDetailsCard.tsx`:

```typescript
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone, MapPin, Linkedin, Globe, Github } from 'lucide-react';

interface ContactDetails {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  location: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  githubUrl: string | null;
  headline: string | null;
}

interface ContactDetailsCardProps {
  contactDetails: ContactDetails | null;
}

export function ContactDetailsCard({ contactDetails }: ContactDetailsCardProps) {
  if (!contactDetails) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="py-6 text-center">
          <p className="text-muted-foreground">
            No contact details yet. Upload a resume or ask the agent to add them.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-6">
        <div className="space-y-2">
          {/* Name and headline */}
          <div>
            <h2 className="text-2xl font-bold">{contactDetails.fullName}</h2>
            {contactDetails.headline && (
              <p className="text-muted-foreground">{contactDetails.headline}</p>
            )}
          </div>

          {/* Contact info row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="flex items-center gap-1">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${contactDetails.email}`} className="hover:underline">
                {contactDetails.email}
              </a>
            </span>

            {contactDetails.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${contactDetails.phone}`} className="hover:underline">
                  {contactDetails.phone}
                </a>
              </span>
            )}

            {contactDetails.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {contactDetails.location}
              </span>
            )}
          </div>

          {/* Links row */}
          {(contactDetails.linkedinUrl || contactDetails.portfolioUrl || contactDetails.githubUrl) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {contactDetails.linkedinUrl && (
                <a
                  href={contactDetails.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </a>
              )}

              {contactDetails.portfolioUrl && (
                <a
                  href={contactDetails.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  Portfolio
                </a>
              )}

              {contactDetails.githubUrl && (
                <a
                  href={contactDetails.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add components/library/ContactDetailsCard.tsx
git commit -m "feat(ui): add ContactDetailsCard component"
```

---

## Task 9: Update Library Page

**Files:**
- Modify: `app/(main)/library/page.tsx`

**Step 1: Add import for ContactDetailsCard**

Add import at line 5:

```typescript
import { ContactDetailsCard } from '@/components/library/ContactDetailsCard';
```

**Step 2: Add ContactDetails interface**

Add after the Education interface (around line 40):

```typescript
interface ContactDetails {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  location: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  githubUrl: string | null;
  headline: string | null;
}
```

**Step 3: Update LibraryData interface**

Update the LibraryData interface (around line 42-46):

```typescript
interface LibraryData {
  contactDetails: ContactDetails | null;
  achievements: Achievement[];
  skills: Skill[];
  education: Education[];
}
```

**Step 4: Update initial state**

Update useState (around line 49):

```typescript
const [data, setData] = useState<LibraryData>({
  contactDetails: null,
  achievements: [],
  skills: [],
  education: []
});
```

**Step 5: Update data fetching**

Update the setData call in useEffect (around line 55-60):

```typescript
setData({
  contactDetails: result.contactDetails || null,
  achievements: result.achievements || [],
  skills: result.skills || [],
  education: result.education || [],
});
```

**Step 6: Update isEmpty check**

Update the isEmpty check (around line 81):

```typescript
const isEmpty = !data.contactDetails && data.achievements.length === 0 && data.skills.length === 0 && data.education.length === 0;
```

**Step 7: Add ContactDetailsCard to render**

After the h1 "Your Library" (around line 108), add:

```typescript
        {/* Contact Details Hero */}
        <ContactDetailsCard contactDetails={data.contactDetails} />
```

**Step 8: Commit**

```bash
git add app/(main)/library/page.tsx
git commit -m "feat(ui): add contact details hero card to library page"
```

---

## Task 10: Update generateResume to Auto-Fetch Contact Details

**Files:**
- Modify: `lib/agent/tools/generation.ts`

**Step 1: Update inputSchema**

Replace the inputSchema (lines 13-23) to make contact params optional with library fallback:

```typescript
  inputSchema: z.object({
    targetCompany: z.string().describe('Target company name'),
    targetRole: z.string().describe('Target role title'),
    matchedAchievementsJson: z.string().describe('JSON string of matched achievements to include'),
    summary: z.string().optional().describe('Professional summary paragraph'),
    // Contact details - optional, will fetch from library if not provided
    userName: z.string().optional().describe('User full name (optional - fetched from library if not provided)'),
    userEmail: z.string().optional().describe('User email (optional - fetched from library if not provided)'),
    userPhone: z.string().optional().describe('User phone number'),
    userLocation: z.string().optional().describe('User location (City, State)'),
    userLinkedin: z.string().optional().describe('User LinkedIn URL'),
    userPortfolio: z.string().optional().describe('User portfolio URL'),
    userGithub: z.string().optional().describe('User GitHub URL'),
  }),
```

**Step 2: Update execute function to fetch from library**

Replace the execute function parameters and add library fetch (around lines 24-45):

```typescript
  execute: async ({
    targetCompany,
    targetRole,
    matchedAchievementsJson,
    summary,
    userName,
    userEmail,
    userPhone,
    userLocation,
    userLinkedin,
    userPortfolio,
    userGithub,
  }) => {
    const userId = getTempUserId();

    // Fetch contact details from library if not provided
    let contactName = userName;
    let contactEmail = userEmail;
    let contactPhone = userPhone;
    let contactLocation = userLocation;
    let contactLinkedin = userLinkedin;
    let contactPortfolio = userPortfolio;
    let contactGithub = userGithub;

    if (!contactName || !contactEmail) {
      const libraryContact = await prisma.contactDetails.findUnique({
        where: { userId },
      });

      if (libraryContact) {
        contactName = contactName || libraryContact.fullName;
        contactEmail = contactEmail || libraryContact.email;
        contactPhone = contactPhone || libraryContact.phone || undefined;
        contactLocation = contactLocation || libraryContact.location || undefined;
        contactLinkedin = contactLinkedin || libraryContact.linkedinUrl || undefined;
        contactPortfolio = contactPortfolio || libraryContact.portfolioUrl || undefined;
        contactGithub = contactGithub || libraryContact.githubUrl || undefined;
      }
    }

    // Validate required contact details
    if (!contactName || !contactEmail) {
      return {
        success: false,
        error: 'Missing contact details. Please provide userName and userEmail, or save contact details to your library first using updateContactDetails.',
      };
    }

    // Validate JSON input
    const parseResult = safeJsonParse(matchedAchievementsJson, matchedAchievementsArraySchema);
    // ... rest of function continues
```

**Step 3: Update markdown generation**

Update the markdown generation section (around line 58-62) to use the contact* variables:

```typescript
    // Build markdown
    let markdown = `# ${contactName}\n\n`;

    const contactParts = [contactEmail, contactPhone, contactLocation].filter(Boolean);
    if (contactLinkedin) contactParts.push(contactLinkedin);
    if (contactPortfolio) contactParts.push(contactPortfolio);
    if (contactGithub) contactParts.push(contactGithub);
    markdown += `${contactParts.join(' | ')}\n\n`;
```

**Step 4: Commit**

```bash
git add lib/agent/tools/generation.ts
git commit -m "feat(generation): auto-fetch contact details from library"
```

---

## Task 11: Test the Implementation

**Step 1: Start the dev server**

Run:
```bash
npm run dev
```

**Step 2: Test scenarios**

1. Visit `/library` - should show empty contact details card
2. Use chat to upload a resume - contact details should be extracted and saved
3. Visit `/library` again - should show populated contact details hero card
4. Generate a resume - should auto-fetch contact details without asking

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete contact details implementation

- Add ContactDetails model to database
- Add getContactDetails and updateContactDetails agent tools
- Update parseResumeIntoLibrary to extract contact info
- Add ContactDetailsCard hero component to library page
- Update generateResume to auto-fetch from library

Closes #contact-details"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Database schema | `prisma/schema.prisma` |
| 2 | Zod schemas | `lib/agent/schemas.ts` |
| 3 | Agent tools | `lib/agent/tools/library.ts` |
| 4 | Register tools | `lib/agent/index.ts` |
| 5 | Agent instructions | `lib/agent/instructions.ts` |
| 6 | Update parseResumeIntoLibrary | `lib/agent/tools/library.ts` |
| 7 | API route | `app/api/library/route.ts` |
| 8 | UI component | `components/library/ContactDetailsCard.tsx` |
| 9 | Library page | `app/(main)/library/page.tsx` |
| 10 | Resume generation | `lib/agent/tools/generation.ts` |
| 11 | Testing | Manual verification |
