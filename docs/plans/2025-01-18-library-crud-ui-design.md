# Library CRUD UI Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add full CRUD (Create, Read, Update, Delete) functionality to the Library page so users can directly edit their professional information without relying solely on the AI chat.

**Architecture:** Inline editing pattern (edit/save/cancel) consistent with the existing `ProfessionalSummaryCard` component. Each section header gets an "+ Add" button. Each item gets edit/delete buttons that appear on hover.

**Tech Stack:** React 19, shadcn/ui (Button, Input, Textarea, Select, Dialog), Tailwind CSS, Next.js App Router API routes, Prisma ORM

---

## Design Overview

### UX Pattern: Inline Editing

Following the existing `ProfessionalSummaryCard` pattern:
1. **View mode** (default): Display data with subtle Edit/Delete icons on hover
2. **Edit mode**: Replace display with form inputs, show Save/Cancel buttons
3. **Add mode**: Section header "+ Add" button opens inline form at top of section

This approach:
- Keeps users in context (no modal popups breaking flow)
- Matches existing Professional Summary behavior
- Provides immediate visual feedback
- Is mobile-friendly (no small modal targets)

### Visual Design

**Hover actions:**
- Edit icon (Pencil) and Delete icon (Trash2) appear on far right of each item on hover
- Icons use `text-muted-foreground hover:text-foreground` styling
- Delete icon uses `hover:text-destructive` for visual warning

**Section headers:**
- Current: `<h2>Section Name (count)</h2> <decorative-line>`
- New: `<h2>Section Name (count)</h2> <decorative-line> <+ Add button>`
- Button uses `variant="outline" size="sm"` with Plus icon

**Edit mode styling:**
- Bordered container with `border-editorial-accent/30 bg-editorial-accent-muted/5`
- Input fields match shadcn/ui defaults
- Save (primary) and Cancel (outline) buttons at bottom

---

## Section-by-Section Design

### 1. Contact Details

**Current state:** Hero section displaying name, headline, email, phone, location, social links.

**Add CRUD:**
- Single "Edit" button (no Add/Delete since it's one record per user)
- Edit mode shows form with all fields

**Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| fullName | Input | Yes | |
| headline | Input | No | Professional tagline |
| email | Input (email) | Yes | |
| phone | Input (tel) | No | |
| location | Input | No | City, State or City, Country |
| linkedinUrl | Input (url) | No | |
| portfolioUrl | Input (url) | No | |
| githubUrl | Input (url) | No | |

**API Route needed:** `PUT /api/contact-details`

---

### 2. Skills

**Current state:** Skills displayed as colored badges grouped by category.

**Add CRUD:**
- "+ Add Skill" button in section header
- Each skill badge shows edit/delete on hover
- Click badge to edit (inline popover or expand to form)

**Add/Edit form fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | Input | Yes | Skill name |
| category | Select/Input | No | Technical, Soft Skills, Languages, Tools, Other |
| level | Select | No | Expert, Advanced, Intermediate, Beginner |

**UX consideration:** Since skills are displayed as compact badges, use a small inline form that appears below the section header for Add, and a popover for Edit.

**API Routes needed:**
- `POST /api/skills` - Create skill
- `PUT /api/skills/[id]` - Update skill
- `DELETE /api/skills/[id]` - Delete skill

---

### 3. Education

**Current state:** List of education entries with institution, degree, field, dates, GPA, honors, activities.

**Add CRUD:**
- "+ Add Education" button in section header
- Each entry shows edit/delete icons on hover (right side of header row)

**Add/Edit form fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| institution | Input | Yes | School/University name |
| degree | Input | Yes | e.g., "Bachelor of Science" |
| field | Input | No | e.g., "Computer Science" |
| location | Input | No | |
| startDate | Input (month picker) | No | |
| endDate | Input (month picker) | No | Leave blank for "Present" |
| gpa | Input | No | |
| honors | Input | No | e.g., "Magna Cum Laude" |
| activities | Textarea | No | Comma-separated or line-separated |

**API Routes needed:**
- `POST /api/education` - Create education
- `PUT /api/education/[id]` - Update education
- `DELETE /api/education/[id]` - Delete education

---

### 4. Experience (Roles + Achievements)

**Current state:** Collapsible role cards with nested achievement bullets and tags. Role summary is displayed as italic text below the role header.

**Add CRUD:**

**For Roles:**
- "+ Add Role" button in section header
- Each role header shows edit/delete icons on hover
- **Role Summary** gets its own quick-edit button (pencil icon) next to the summary text, similar to ProfessionalSummaryCard pattern

**Role form fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| company | Input | Yes | |
| title | Input | Yes | Job title |
| location | Input | No | |
| startDate | Input (month picker) | No | |
| endDate | Input (month picker) | No | Leave blank for "Present" |
| summary | Textarea | No | **Role summary/description** - 1-2 sentences describing your role and key responsibilities |

**Role Summary UX:**
- Displayed below role header as italic text
- Shows "Edit summary" pencil icon on hover (or always visible if no summary exists)
- Clicking opens inline Textarea with Save/Cancel buttons
- Placeholder: "Add a brief description of your role and responsibilities..."
- Can also be edited via the full role edit form

**For Achievements (nested under role):**
- "+ Add Achievement" button at bottom of each role's achievement list
- Each achievement bullet shows edit/delete icons on hover

**Achievement form fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| text | Textarea | Yes | Achievement description |
| tags | Input | No | Comma-separated tags |

**API Routes needed:**
- Roles: Already exist (`/api/roles`, `/api/roles/[id]`)
- Achievements:
  - `POST /api/roles/[roleId]/achievements` - Create achievement
  - `PUT /api/achievements/[id]` - Update achievement
  - `DELETE /api/achievements/[id]` - Delete achievement

---

### 5. Projects, Publications, Certifications (LibraryItems)

**Current state:** Dynamic sections based on item type, displaying title, subtitle, date, location, bullets, tags.

**Add CRUD:**
- "+ Add Project/Publication/etc" button in each section header
- Each item shows edit/delete icons on hover

**Form fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| type | Select | Yes | project, publication, certification, award, volunteer |
| title | Input | Yes | |
| subtitle | Input | No | e.g., organization name or role |
| date | Input | No | Free-form date string |
| location | Input | No | |
| url | Input (url) | No | Link to project/publication |
| bullets | Textarea | No | Line-separated bullet points |
| tags | Input | No | Comma-separated tags |

**API Routes needed:**
- `POST /api/library-items` - Create item
- `PUT /api/library-items/[id]` - Update item
- `DELETE /api/library-items/[id]` - Delete item

---

## Delete Confirmation

All delete actions require confirmation:
- Use shadcn/ui `AlertDialog` component
- Title: "Delete [Item Type]?"
- Description: "This action cannot be undone. This will permanently delete [item name/preview]."
- Actions: "Cancel" (outline) | "Delete" (destructive)

---

## Implementation Tasks

### Task 1: API Routes for Contact Details

**Files:**
- Create: `app/api/contact-details/route.ts`

**Step 1:** Create PUT handler for updating contact details

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  const contactDetails = await prisma.contactDetails.upsert({
    where: { userId: session.user.id },
    update: {
      fullName: body.fullName,
      email: body.email,
      phone: body.phone || null,
      location: body.location || null,
      linkedinUrl: body.linkedinUrl || null,
      portfolioUrl: body.portfolioUrl || null,
      githubUrl: body.githubUrl || null,
      headline: body.headline || null,
    },
    create: {
      userId: session.user.id,
      fullName: body.fullName,
      email: body.email,
      phone: body.phone || null,
      location: body.location || null,
      linkedinUrl: body.linkedinUrl || null,
      portfolioUrl: body.portfolioUrl || null,
      githubUrl: body.githubUrl || null,
      headline: body.headline || null,
    },
  });

  return NextResponse.json({ contactDetails });
}
```

---

### Task 2: API Routes for Skills

**Files:**
- Create: `app/api/skills/route.ts`
- Create: `app/api/skills/[id]/route.ts`

**Step 1:** Create GET and POST handlers

```typescript
// app/api/skills/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const skills = await prisma.skill.findMany({
    where: { userId: session.user.id },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  return NextResponse.json({ skills });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  const skill = await prisma.skill.create({
    data: {
      userId: session.user.id,
      name: body.name,
      category: body.category || null,
      level: body.level || null,
    },
  });

  return NextResponse.json({ skill });
}
```

**Step 2:** Create PUT and DELETE handlers

```typescript
// app/api/skills/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const skill = await prisma.skill.update({
    where: { id, userId: session.user.id },
    data: {
      name: body.name,
      category: body.category || null,
      level: body.level || null,
    },
  });

  return NextResponse.json({ skill });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  await prisma.skill.delete({
    where: { id, userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}
```

---

### Task 3: API Routes for Education

**Files:**
- Create: `app/api/education/route.ts`
- Create: `app/api/education/[id]/route.ts`

Pattern follows Skills API routes.

---

### Task 4: API Routes for Achievements

**Files:**
- Create: `app/api/roles/[roleId]/achievements/route.ts`
- Create: `app/api/achievements/[id]/route.ts`

**Key consideration:** When creating achievement, validate that the roleId belongs to the user.

---

### Task 5: API Routes for Library Items

**Files:**
- Create: `app/api/library-items/route.ts`
- Create: `app/api/library-items/[id]/route.ts`

Pattern follows Skills API routes.

---

### Task 6: ContactDetailsCard with Edit

**Files:**
- Modify: `components/library/ContactDetailsCard.tsx`

**Changes:**
- Add `editing` state and form state
- Add Edit button in header
- Add inline form with all fields
- Add Save/Cancel buttons
- Add `onSave` prop for API call
- Update parent `page.tsx` to pass handler

---

### Task 7: SkillsList with Full CRUD

**Files:**
- Modify: `components/library/SkillsList.tsx`
- Modify: `app/(main)/library/page.tsx`

**Changes:**
- Add edit/delete icons to each skill badge (visible on hover)
- Add "+ Add Skill" form (small inline form below header)
- Add edit form (inline or popover)
- Add delete confirmation dialog
- Lift state to page.tsx, pass CRUD handlers as props

---

### Task 8: EducationList with Full CRUD

**Files:**
- Modify: `components/library/EducationList.tsx`
- Modify: `app/(main)/library/page.tsx`

**Changes:**
- Add edit/delete icons to each education entry
- Add "+ Add Education" form (inline form at top)
- Add inline edit form
- Add delete confirmation dialog
- Pass CRUD handlers from page.tsx

---

### Task 9: RoleCard with Full CRUD

**Files:**
- Modify: `components/library/RoleCard.tsx`
- Modify: `app/(main)/library/page.tsx`

**Changes:**

**Role Header:**
- Add edit/delete icons to role header (right side, visible on hover)
- Add "+ Add Role" button in Experience section header (page.tsx)
- Add inline role edit form (company, title, location, dates)

**Role Summary/Description (key feature):**
- Add quick-edit pencil icon next to summary text (or "Add summary" link if empty)
- Clicking pencil icon expands inline Textarea below role header
- Save/Cancel buttons appear below Textarea
- Uses same pattern as ProfessionalSummaryCard
- API: `PUT /api/roles/[id]` with `{ summary: "..." }`

**Achievements:**
- Add "+ Add Achievement" button at bottom of achievements list
- Add edit/delete icons to each achievement (visible on hover)
- Add inline achievement edit form (text + tags)
- Add delete confirmation dialogs for roles and achievements

---

### Task 10: LibraryItemsList with Full CRUD

**Files:**
- Modify: `components/library/LibraryItemsList.tsx`
- Modify: `app/(main)/library/page.tsx`

**Changes:**
- Add edit/delete icons to each library item
- Add "+ Add [Type]" button in section headers
- Add inline add/edit forms
- Add delete confirmation dialog
- Pass CRUD handlers from page.tsx

---

### Task 11: SectionHeader Component with Add Button

**Files:**
- Extract to: `components/library/SectionHeader.tsx`
- Modify: `app/(main)/library/page.tsx`

**Changes:**
- Extract existing `SectionHeader` to separate component
- Add optional `onAdd` prop that shows "+ Add" button
- Style button consistently across all sections

---

### Task 12: Delete Confirmation Dialog Component

**Files:**
- Create: `components/library/DeleteConfirmDialog.tsx`

**Reusable component:**
```tsx
interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  loading?: boolean;
}
```

Use shadcn/ui AlertDialog internally.

---

## Summary

**API Routes to Create (6 new files):**
1. `app/api/contact-details/route.ts`
2. `app/api/skills/route.ts`
3. `app/api/skills/[id]/route.ts`
4. `app/api/education/route.ts`
5. `app/api/education/[id]/route.ts`
6. `app/api/roles/[roleId]/achievements/route.ts`
7. `app/api/achievements/[id]/route.ts`
8. `app/api/library-items/route.ts`
9. `app/api/library-items/[id]/route.ts`

**Components to Modify (5 files):**
1. `components/library/ContactDetailsCard.tsx`
2. `components/library/SkillsList.tsx`
3. `components/library/EducationList.tsx`
4. `components/library/RoleCard.tsx`
5. `components/library/LibraryItemsList.tsx`

**New Components (2 files):**
1. `components/library/SectionHeader.tsx`
2. `components/library/DeleteConfirmDialog.tsx`

**Page Updates (1 file):**
1. `app/(main)/library/page.tsx` - Add state management and CRUD handlers

---

## Testing Checklist

After implementation, verify:

- [ ] Contact details can be edited and saved
- [ ] Skills can be added, edited, and deleted
- [ ] Education entries can be added, edited, and deleted
- [ ] Roles can be added, edited, and deleted
- [ ] Achievements can be added to roles, edited, and deleted
- [ ] Library items (projects, publications, etc.) can be added, edited, and deleted
- [ ] Delete confirmations appear before deletion
- [ ] Forms validate required fields
- [ ] Loading states show during API calls
- [ ] Error states display when API fails
- [ ] Mobile responsive (touch-friendly edit/delete targets)
