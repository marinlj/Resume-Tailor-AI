# Agent Architecture Guide

This document explains how the Resume Tailor AI agent architecture works and how to evaluate and experiment with each step.

## Overview

The system uses Vercel AI SDK 6's **ToolLoopAgent** - a pattern where the LLM orchestrates a workflow by deciding which tools to call and when.

### How It Works (Conceptually)

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Message                            │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Claude (claude-opus-4.5)                     │
│  - Has system instructions (instructions.ts)                    │
│  - Has access to ~30 tools                                      │
│  - Decides what tool to call next based on context              │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
              ┌────────────────────────────────┐
              │     Tool Execution Loop        │
              │   (max 15 steps per turn)      │
              └────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
   ┌─────────┐          ┌──────────┐          ┌──────────┐
   │ Library │          │ Research │          │ Matching │
   │  Tools  │          │  Tools   │          │  Tool    │
   └─────────┘          └──────────┘          └──────────┘
        │                      │                      │
        ▼                      ▼                      ▼
   ┌─────────┐          ┌──────────┐          ┌──────────┐
   │ Database│          │ Tavily   │          │ Claude   │
   │ (Prisma)│          │   API    │          │ Sonnet   │
   └─────────┘          └──────────┘          └──────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `lib/agent/index.ts` | Agent configuration, tool registration |
| `lib/agent/instructions.ts` | System prompt defining agent behavior |
| `lib/agent/schemas.ts` | Zod schemas for tool inputs/outputs |
| `lib/agent/tools/library.ts` | CRUD operations for achievements, skills, education |
| `lib/agent/tools/research.ts` | Job description parsing, success profile building |
| `lib/agent/tools/matching.ts` | Achievement-to-requirement matching |
| `lib/agent/tools/generation.ts` | Resume markdown and DOCX generation |
| `app/api/chat/route.ts` | Chat endpoint, user context injection |

---

## The 5 Workflow Stages

Each stage corresponds to specific tools. Think of them as discrete, evaluable steps.

### Stage 1: LOAD - Check Library Status

**Tool:** `getLibraryStatus`

**What it does:** Queries database to see if user has achievements

**Input:** None (uses user context from AsyncLocalStorage)

**Output:**
```typescript
{
  exists: boolean,
  count: number,
  lastUpdated: string | null
}
```

**Evaluation:** This is a deterministic database query. Nothing to evaluate.

---

### Stage 2: PARSE - Extract from Resume

**Tool:** `parseResumeIntoLibrary`

**What it does:** Takes resume text and extracts structured data

**Input:** Raw resume text (pasted or from file upload)

**Output:** Achievements, skills, education, contact details

**How it works:** The tool returns a schema template, and Claude fills it in based on the resume content. The actual parsing logic lives in the LLM's reasoning, not in code.

**Evaluation opportunities:**
- How accurately are achievements extracted?
- Are the suggested tags relevant?
- Is contact info captured correctly?
- Are role boundaries (company/title) detected properly?

---

### Stage 3: RESEARCH - Parse Job Description

**Tools:** `fetchJobFromUrl`, `parseJobDescription`, `buildSuccessProfile`

**What it does:** Extracts requirements from a job description and builds a "success profile"

**Flow:**
```
URL → fetchJobFromUrl (Tavily API) → raw text
              ↓
       parseJobDescription → Claude extracts requirements
              ↓
       buildSuccessProfile → groups into must-have/nice-to-have/themes
```

**Output (Success Profile):**
```typescript
{
  company: string,
  role: string,
  mustHave: string[],       // Critical requirements
  niceToHave: string[],     // Bonus qualifications
  keyThemes: [{             // Grouped tags for matching
    theme: string,
    tags: string[]
  }],
  keywords: string[]        // Technical terms, tools
}
```

**Evaluation opportunities:**
- Are requirements correctly categorized as must-have vs nice-to-have?
- Are the right tags assigned to requirements?
- Do the "key themes" capture what matters for the role?
- Is company/role context extracted accurately?

---

### Stage 4: MATCH - Find Best Achievements

**Tool:** `matchAchievements`

**What it does:** Uses a **second LLM call** (Claude Sonnet) to score each achievement against job requirements

**This is the most important step to evaluate.**

**How it works:**

1. Fetches all achievements from the user's library (with role context)
2. Builds a prompt combining requirements + achievements
3. Calls `generateObject()` with Claude Sonnet to get structured scores
4. Identifies gaps (requirements with no strong matches)

**The Matching Prompt** (from `lib/agent/tools/matching.ts`):

```
Score these achievements against the job requirements.

## Job Requirements

### Must Have:
1. [requirement 1]
2. [requirement 2]
...

### Nice to Have:
1. [requirement 1]
...

### Key Themes:
- Technical Skills: Looking for engineering, api, cloud
- Leadership: Looking for management, mentoring
...

## Achievements to Score

1. [ID: abc123] "Led team of 8 engineers..." (Tags: leadership, engineering)
2. [ID: def456] "Reduced costs by 40%..." (Tags: cost-reduction, metrics)
...

## Instructions

For each achievement, provide:
- score (0-100): How relevant is this achievement to the job? Consider:
  - Direct experience match
  - Transferable skills
  - Semantic similarity (AI ≈ LLM ≈ machine-learning, SaaS ≈ cloud platform, etc.)
  - Impact relevance
- matchedRequirements: Which must-have or nice-to-have requirements does it address?
- reasoning: Brief explanation (1 sentence)
```

**Thresholds** (configured in `matching.ts`):
```typescript
const MATCH_THRESHOLDS = {
  GAP_THRESHOLD: 60,      // Below this = gap identified
  MIN_INCLUDE_SCORE: 40,  // Below this = not included in results
  MAX_MATCHES: 15,        // Max achievements returned
};
```

**Output:**
```typescript
{
  success: true,
  matches: [{
    achievementId: string,
    achievementText: string,
    company: string,
    title: string,
    score: number,
    matchedRequirements: string[],
    roleSummary?: string
  }],
  gaps: [{
    requirement: string,
    bestMatchScore: number,
    bestMatchText: string | null
  }],
  summary: {
    totalItems: number,
    strongMatches: number,  // score >= 80
    goodMatches: number,    // 60 <= score < 80
    gapCount: number
  }
}
```

**Evaluation opportunities:**
- Are scores calibrated? (Does 80 feel like a strong match?)
- Is semantic similarity working? (AI ≈ ML ≈ machine learning)
- Are gaps identified correctly?
- Are the right achievements surfacing for each requirement?

---

### Stage 5: GENERATE - Create Resume

**Tools:** `generateResume`, `generateDocxFile`

**What it does:** Takes matched achievements + user preferences → markdown → DOCX file

**Flow:**
```
matchedAchievements + preferences + contactDetails
              ↓
       generateResume → markdown string
              ↓
       generateDocxFile → .docx file saved to disk
              ↓
       FileCard component → download link in chat
```

**Evaluation opportunities:**
- Does the final resume read well?
- Are achievements ordered effectively by role/date?
- Does formatting match user preferences?
- Are role summaries included when requested?

---

## Evaluation Strategies

### Option 1: Manual Spot Checks (Quick)

Create test fixtures - known inputs with expected outputs:

| Test Case | Input | Expected Output | Check |
|-----------|-------|-----------------|-------|
| Parse PM resume | Resume text | 8 achievements, "product" tag | Did it extract all? |
| Parse JD for SWE | JD text | 5 must-haves, "python" keyword | Correct categorization? |
| Match leadership achievement | Achievement + requirements | Score > 70 for leadership req | Reasonable score? |

### Option 2: Build an Eval Dataset

1. Collect 20-50 real examples (resumes, JDs, expected outputs)
2. Run each tool in isolation with test inputs
3. Compare outputs to "gold standard" human labels

**Example test case for matching:**
```typescript
const testCases = [
  {
    achievement: "Led team of 8 engineers shipping ML platform",
    requirement: "Experience leading engineering teams",
    expectedScore: { min: 75, max: 95 }  // Human judgment
  },
  {
    achievement: "Implemented CI/CD pipeline reducing deploy time by 60%",
    requirement: "Experience with DevOps practices",
    expectedScore: { min: 70, max: 90 }
  }
];
```

### Option 3: Use Telemetry (Already Enabled)

The agent has telemetry enabled in `lib/agent/index.ts`:

```typescript
experimental_telemetry: {
  isEnabled: true,
  functionId: 'resume-agent',
}
```

This logs every tool call. You can analyze patterns like:
- Which tools are called most frequently?
- Where does the agent get stuck or loop?
- What inputs cause failures?
- How many steps does a typical resume generation take?

---

## Running Experiments

### Experiment: Improve Matching Accuracy

**Hypothesis:** Adding more context to the matching prompt improves scores

**Current state:** The prompt includes achievements + requirements + tags

**Experiment:** Add role context (company reputation, industry, seniority level)

**Steps:**
1. Create a test dataset of 30 achievement-requirement pairs with human-labeled scores
2. Run current matching → record scores and correlation with human labels
3. Modify the prompt to include additional context
4. Run modified matching → record scores
5. Compare: Did correlation with human labels improve?

### Experiment: Test Different Models

The matching currently uses `claude-sonnet-4-20250514`. You could A/B test:

| Model | Tradeoffs |
|-------|-----------|
| Sonnet (current) | Good balance of speed/cost/accuracy |
| Opus | More accurate? Higher cost, slower |
| Haiku | Faster, cheaper - good enough for matching? |

### Experiment: Improve Tag Suggestions

**Hypothesis:** Few-shot examples improve tag suggestions during parsing

**Current:** The parsing tool returns a schema template, Claude fills it

**Experiment:** Add 2-3 example achievement-to-tag mappings in the instructions

### Experiment: Threshold Tuning

**Current thresholds:**
- Gap threshold: 60
- Min include score: 40
- Max matches: 15

**Questions to test:**
- Does raising gap threshold catch more meaningful gaps?
- Does lowering min include score surface useful "stretch" matches?
- Does reducing max matches force better prioritization?

---

## Key Metrics to Track

| Step | Metric | How to Measure |
|------|--------|----------------|
| Parse | Extraction recall | % of achievements human would extract that AI extracted |
| Parse | Tag relevance | % of suggested tags human agrees with |
| Research | Requirement accuracy | % of requirements correctly categorized (must-have vs nice-to-have) |
| Match | Score calibration | Correlation between AI scores and human scores |
| Match | Gap detection | Precision/recall of identified gaps |
| Generate | Resume quality | User satisfaction rating (1-5), or A/B testing click-through rates |

---

## Architecture Decisions & Tradeoffs

### Why Two LLM Calls?

The system uses Opus for orchestration and Sonnet for matching:

- **Opus (orchestration):** Better at complex reasoning, following multi-step instructions, knowing when to checkpoint with user
- **Sonnet (matching):** Fast, good at structured scoring tasks, cheaper for the N×M comparisons

### Why Tools Instead of One Big Prompt?

Separating into tools provides:
1. **Observability:** Each tool call is logged, making debugging easier
2. **Testability:** Each tool can be unit tested in isolation
3. **Flexibility:** Tools can be swapped/improved independently
4. **Cost control:** Only call expensive operations when needed

### Why AsyncLocalStorage for User Context?

The chat API uses `runWithUserId()` to inject user context:

```typescript
return runWithUserId(userId, () => {
  return createAgentUIStreamResponse({
    agent: resumeAgent,
    uiMessages: messages,
  });
});
```

This allows tools to access the user ID without passing it through every function call, keeping the tool signatures clean.

---

## Next Steps for Evaluation

1. **Start with matching** - It has the biggest impact on output quality
2. **Build a small test dataset** - 10-20 examples with human labels
3. **Instrument key decision points** - Log scores, gaps, final selections
4. **Run A/B tests** - Compare prompt variations, model choices, thresholds
