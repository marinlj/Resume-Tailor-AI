# System Prompt Evaluation: Areas for Improvement

**Date:** 2026-01-21
**File Evaluated:** [lib/agent/instructions.ts](../lib/agent/instructions.ts)

---

## Executive Summary

The current system prompt provides a solid foundation for the resume tailoring workflow but has several gaps that may cause agent confusion, underutilization of features, and poor error handling. This document identifies 11 areas for improvement, prioritized by impact.

---

## 1. Missing Tool Documentation

**Issue:** The prompt mentions `buildSuccessProfile` but doesn't explain the workflow between `parseJobDescription` → `buildSuccessProfile`. The `parseJobDescription` tool returns a template/instruction that the agent should fill in itself, but this isn't documented.

**Current Behavior:** Agent may not understand it needs to extract structured data and pass it to the next tool.

**Recommendation:** Add explicit tool chaining documentation:

```markdown
## Tool Chaining: Job Parsing

After calling parseJobDescription, the tool returns an instruction template.
You must:
1. Extract structured data from the jobDescriptionText yourself
2. Identify company, role, location, requirements (must_have/nice_to_have), keywords, roleType
3. Call buildSuccessProfile with:
   - requirements as JSON string: '[{"text": "...", "type": "must_have", "tags": [...]}]'
   - keywords as JSON string: '["keyword1", "keyword2"]'
```

---

## 2. No Mention of LibraryItems

**Issue:** The schema supports `LibraryItem` (projects, certifications, awards, publications, volunteer work) via [schemas.ts:358-383](../lib/agent/schemas.ts), but the system prompt never mentions them. Users with certifications or notable projects won't have them utilized.

**Impact:** High - significant feature completely undocumented.

**Recommendation:** Add a new section:

```markdown
## Additional Library Content

Beyond work experience, users can store:
- **Projects**: Personal or professional projects with tech stack and impact
- **Certifications**: AWS, PMP, Google Cloud, etc.
- **Awards**: Industry recognition, internal awards
- **Publications**: Papers, blog posts, conference talks
- **Volunteer**: Relevant volunteer experience

### Workflow
1. When parsing resumes, extract these into LibraryItems using `addLibraryItem`
2. LibraryItems with tags are included in achievement matching
3. When generating resumes, add custom sections for matched LibraryItems
4. Update resume structure to include sections like "Projects", "Certifications"
```

---

## 3. Hidden Matching Thresholds

**Issue:** The matching tool ([matching.ts:9-13](../lib/agent/tools/matching.ts)) uses hardcoded thresholds that the agent doesn't know about:

```typescript
const MATCH_THRESHOLDS = {
  GAP_THRESHOLD: 60,      // Below this = gap
  MIN_INCLUDE_SCORE: 40,  // Below this = excluded
  MAX_MATCHES: 15,        // Maximum achievements included
}
```

**Impact:** Agent can't explain scoring to users or set expectations.

**Recommendation:** Add to system prompt:

```markdown
## Matching Behavior

The matching system uses these thresholds:
- **Included in resume**: Score ≥ 40
- **Good match**: Score ≥ 60
- **Strong match**: Score ≥ 80
- **Gap identified**: Requirement has no match ≥ 60
- **Maximum achievements**: 15 per resume

When explaining results to users:
- 80-100: Strong match - directly demonstrates the requirement
- 60-79: Good match - shows transferable experience
- 40-59: Partial match - related but indirect
- <40: Not included
```

---

## 4. Vague parseJobDescription Behavior

**Issue:** [research.ts:63-82](../lib/agent/tools/research.ts) shows `parseJobDescription` returns an instruction asking the LLM to parse—it doesn't actually parse anything. This is a "template tool" pattern that requires agent participation.

**Current Code:**
```typescript
return {
  instruction: 'Analyze the job description and extract the following...',
  schema: { company: 'string', role: 'string', ... },
  jobDescriptionText: text,
};
```

**Recommendation:** Document the expected behavior:

```markdown
## parseJobDescription Tool Behavior

This tool returns a parsing template, NOT parsed results. You must:

1. Read the returned `jobDescriptionText`
2. Extract these fields yourself:
   - company: Company name
   - role: Job title
   - location: Work location (or null)
   - requirements: Array of {text, type, tags}
   - keywords: Technical terms and tools
   - roleType: "IC", "Manager", "Technical", etc.
3. Pass extracted data to `buildSuccessProfile`
```

---

## 5. No Error Recovery Guidance

**Issue:** Tools can fail (database errors, LLM errors, URL fetch failures). The current "Recovery Behavior" section only covers regeneration preferences.

**Missing Scenarios:**
- `fetchJobFromUrl` returns `success: false`
- `matchAchievements` LLM call fails
- `generateDocxFile` file write fails
- Database connection issues

**Recommendation:** Add comprehensive error handling:

```markdown
## Error Handling

### URL Fetch Failures
If `fetchJobFromUrl` returns success: false:
- Say: "I couldn't access that job posting. Could you paste the job description text directly?"
- Do NOT retry the same URL repeatedly

### Matching Failures
If `matchAchievements` returns success: false:
- Check the error message
- If database error: "I'm having trouble accessing your library. Let me try again."
- If LLM error: "The matching service is temporarily unavailable. Let me retry."
- Retry once, then escalate to user

### Generation Failures
If `generateDocxFile` fails:
- Offer the markdown version: "I couldn't create the Word document, but here's your resume in markdown format you can copy."
- Suggest retry: "Would you like me to try generating the document again?"

### General Principle
- Never expose raw error messages to users
- Summarize issues in plain language
- Always offer an alternative path forward
```

---

## 6. Missing Score Explanation for Users

**Issue:** When presenting matched achievements, users see scores like "73" without context. They don't know if that's good or bad.

**Recommendation:** Add presentation guidelines:

```markdown
## Presenting Match Results

When showing matches to users, always contextualize scores:

### Format
```
**Strong Matches (80+)**
- [Achievement text] → Matches: [requirements]

**Good Matches (60-79)**
- [Achievement text] → Matches: [requirements]

**Partial Matches (40-59)**
- [Achievement text] → Partial fit for: [requirements]
```

### Explain Gaps
"I found gaps in these areas - do you have experience you haven't added to your library?"
- [Requirement]: Best match scored 45 (needs stronger evidence)
```

---

## 7. No Guidance on Achievement Quantity per Role

**Issue:** Should the agent include all matched achievements from a role, or limit them? Resumes could end up with 10 bullets under one job and 1 under another.

**Recommendation:** Add balancing guidance:

```markdown
## Achievement Selection Strategy

When selecting achievements for the resume:

1. **Quantity per role:**
   - Most recent role: 4-6 achievements
   - Previous roles: 3-4 achievements
   - Older roles (5+ years): 2-3 achievements

2. **Balancing criteria:**
   - Cover all must-have requirements across roles
   - Don't put all top matches under one role
   - Prefer variety over clustering

3. **Selection order:**
   - First: Highest scoring matches for must-haves
   - Second: Fill requirement gaps with good matches
   - Third: Add nice-to-have coverage
```

---

## 8. Incomplete Resume Structure Handling

**Issue:** The structure preference section doesn't explain how custom sections (projects, certifications) from LibraryItems integrate with the resume structure.

**Current Gap:** User adds certifications, but they never appear in generated resumes.

**Recommendation:** Expand structure documentation:

```markdown
## Dynamic Resume Sections

### Standard Sections
- summary, experience, skill, education

### Custom Sections from LibraryItems
When user has LibraryItems, add matching sections to structure:

```javascript
// If user has projects with high match scores
sections.push({ type: 'project', label: 'Projects' });

// If user has certifications relevant to role
sections.push({ type: 'certification', label: 'Certifications' });
```

### Section Ordering
1. Contact (always first)
2. Summary (if enabled)
3. Experience (primary content)
4. Custom sections (ordered by relevance to job)
5. Skills
6. Education
```

---

## 9. Tag Guidelines are Shallow

**Issue:** Current tag guidelines are basic categories with no practical guidance on:
- How many tags per achievement
- Naming conventions
- Compound vs separate tags

**Recommendation:** Expand tag documentation:

```markdown
## Tag Guidelines

### Quantity
- Use 2-5 tags per achievement
- More specific achievements = fewer, precise tags
- Broader achievements = more tags to capture facets

### Naming Conventions
- Lowercase with hyphens: `cross-functional`, not `CrossFunctional`
- Singular form: `api`, not `apis`
- Specific over generic: `react` over `frontend` when appropriate

### Tag Types
Combine skill tags with impact tags:
- Skill: `python`, `aws`, `sql`, `leadership`
- Impact: `cost-reduction`, `revenue-growth`, `efficiency`
- Domain: `fintech`, `healthcare`, `e-commerce`

### Examples
Achievement: "Led migration of monolith to microservices, reducing deployment time by 60%"
Tags: `architecture`, `microservices`, `devops`, `efficiency`, `leadership`
```

---

## 10. No Conversation State Management

**Issue:** What if a user returns mid-workflow? The prompt doesn't address detecting and resuming partial states.

**Recommendation:** Add continuity guidance:

```markdown
## Conversation Continuity

### On Every New Conversation
1. Call `getLibraryStatus` first
2. If library exists, acknowledge: "Welcome back! I see you have X achievements in your library."

### Detecting Partial Work
Check for recent activity:
- Recent GeneratedResume? → "I see you recently created a resume for [Company]. Would you like to revise it or start fresh?"
- Incomplete library? → "Your library has achievements but no skills/education. Want to add those?"

### Resume Requests
- Ask: "Is this for a new job, or revising a previous resume?"
- If revision: Load previous resume context
```

---

## 11. Missing Terminology Mapping Guidance

**Issue:** The `successProfile` schema includes `terminology: { theirTerm, yourTerm }[]` but it's never populated or used. This feature could optimize resume language to match company style.

**Schema Definition:**
```typescript
terminology: z.array(z.object({
  theirTerm: z.string(),
  yourTerm: z.string(),
})),
```

**Recommendation:** Either implement or remove:

```markdown
## Terminology Mapping (Optional Enhancement)

When building success profile, identify company-specific language:

| Their Term | Common Equivalent |
|------------|-------------------|
| "associates" | "team members" |
| "stakeholder alignment" | "cross-functional collaboration" |
| "velocity" | "delivery speed" |

When generating resumes, adapt achievement language to match their terminology where natural.

Note: Don't force awkward replacements. Only map when it improves clarity.
```

---

## Priority Matrix

| Priority | Issue | Impact | Effort |
|----------|-------|--------|--------|
| **High** | #2 Missing LibraryItems | Users' projects/certs unused | Medium |
| **High** | #4 parseJobDescription unclear | Tool chaining breaks | Low |
| **High** | #5 No error recovery | Agent stuck on failures | Medium |
| **Medium** | #3 Hidden thresholds | Users confused by scoring | Low |
| **Medium** | #7 Achievement quantity | Resume length issues | Low |
| **Medium** | #1 Tool chaining docs | Workflow confusion | Low |
| **Medium** | #6 Score explanation | Poor UX | Low |
| **Low** | #8 Custom sections | Feature incomplete | Medium |
| **Low** | #9 Tag guidelines | Suboptimal matching | Low |
| **Low** | #10 State management | Continuity issues | Medium |
| **Low** | #11 Terminology mapping | Unused feature | Low |

---

## Recommended Implementation Order

1. **Phase 1 - Critical Fixes**
   - #4: Document parseJobDescription behavior
   - #5: Add error handling guidance
   - #2: Document LibraryItems workflow

2. **Phase 2 - UX Improvements**
   - #3: Expose matching thresholds
   - #6: Add score presentation guidelines
   - #7: Add achievement quantity guidance

3. **Phase 3 - Polish**
   - #1: Complete tool chaining documentation
   - #8: Document custom sections
   - #9: Expand tag guidelines
   - #10: Add state management
   - #11: Decide on terminology feature
