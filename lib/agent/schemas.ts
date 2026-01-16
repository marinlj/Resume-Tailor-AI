import { z } from 'zod';

// Library Status
export const libraryStatusOutputSchema = z.object({
  exists: z.boolean(),
  count: z.number(),
  lastUpdated: z.string().nullable(),
});

export type LibraryStatusOutput = z.infer<typeof libraryStatusOutputSchema>;

// Achievement
export const achievementInputSchema = z.object({
  company: z.string().describe('Company name'),
  title: z.string().describe('Job title'),
  location: z.string().optional().describe('Location (city, state/country)'),
  startDate: z.string().optional().describe('Start date (YYYY-MM format)'),
  endDate: z.string().optional().describe('End date (YYYY-MM format) or "present"'),
  text: z.string().describe('The achievement bullet text'),
  tags: z.array(z.string()).describe('Tags for matching (e.g., leadership, metrics, cost-reduction)'),
});

export type AchievementInput = z.infer<typeof achievementInputSchema>;

export const achievementOutputSchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  location: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  text: z.string(),
  tags: z.array(z.string()),
});

export type AchievementOutput = z.infer<typeof achievementOutputSchema>;

// Skill
export const skillInputSchema = z.object({
  name: z.string().describe('Skill name'),
  category: z.string().optional().describe('Category (e.g., "Programming Languages", "Frameworks", "Tools", "Soft Skills")'),
  level: z.string().optional().describe('Proficiency level (e.g., "Expert", "Advanced", "Intermediate", "Beginner")'),
});

export type SkillInput = z.infer<typeof skillInputSchema>;

export const skillOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string().nullable(),
  level: z.string().nullable(),
});

export type SkillOutput = z.infer<typeof skillOutputSchema>;

// Education
export const educationInputSchema = z.object({
  institution: z.string().describe('Name of the school/university'),
  degree: z.string().describe('Degree type (e.g., "Bachelor of Science", "Master of Arts")'),
  field: z.string().optional().describe('Field of study (e.g., "Computer Science")'),
  location: z.string().optional().describe('Location of the institution'),
  startDate: z.string().optional().describe('Start date (YYYY-MM format)'),
  endDate: z.string().optional().describe('End date (YYYY-MM format) or "present"'),
  gpa: z.string().optional().describe('GPA if notable'),
  honors: z.string().optional().describe('Honors or distinctions (e.g., "Magna Cum Laude")'),
  activities: z.array(z.string()).optional().describe('Relevant activities, clubs, coursework'),
});

export type EducationInput = z.infer<typeof educationInputSchema>;

export const educationOutputSchema = z.object({
  id: z.string(),
  institution: z.string(),
  degree: z.string(),
  field: z.string().nullable(),
  location: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  gpa: z.string().nullable(),
  honors: z.string().nullable(),
  activities: z.array(z.string()),
});

export type EducationOutput = z.infer<typeof educationOutputSchema>;

// Parse Resume
export const parseResumeInputSchema = z.object({
  text: z.string().describe('The full resume text to parse'),
});

export const parsedAchievementSchema = z.object({
  company: z.string(),
  title: z.string(),
  location: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  text: z.string(),
  suggestedTags: z.array(z.string()),
});

export type ParsedAchievement = z.infer<typeof parsedAchievementSchema>;

// Job Description
export const parseJDInputSchema = z.object({
  text: z.string().describe('The job description text'),
});

export const requirementSchema = z.object({
  text: z.string(),
  type: z.enum(['must_have', 'nice_to_have']),
  tags: z.array(z.string()),
});

export type Requirement = z.infer<typeof requirementSchema>;

export const parsedJDOutputSchema = z.object({
  company: z.string(),
  role: z.string(),
  location: z.string().nullable(),
  requirements: z.array(requirementSchema),
  keywords: z.array(z.string()),
  roleType: z.string(),
});

export type ParsedJDOutput = z.infer<typeof parsedJDOutputSchema>;

// Success Profile
export const successProfileSchema = z.object({
  company: z.string(),
  role: z.string(),
  mustHave: z.array(z.string()),
  niceToHave: z.array(z.string()),
  keyThemes: z.array(z.object({
    theme: z.string(),
    tags: z.array(z.string()),
  })),
  terminology: z.array(z.object({
    theirTerm: z.string(),
    yourTerm: z.string(),
  })),
});

export type SuccessProfile = z.infer<typeof successProfileSchema>;

// Matching
export const matchAchievementsInputSchema = z.object({
  profileJson: z.string().describe('JSON string of the success profile'),
});

export const rankedMatchSchema = z.object({
  achievementId: z.string(),
  achievementText: z.string(),
  company: z.string(),
  title: z.string(),
  score: z.number(),
  matchedRequirements: z.array(z.string()),
});

export type RankedMatch = z.infer<typeof rankedMatchSchema>;

export const gapSchema = z.object({
  requirement: z.string(),
  bestMatchScore: z.number(),
  bestMatchText: z.string().nullable(),
});

export type Gap = z.infer<typeof gapSchema>;

export const matchOutputSchema = z.object({
  matches: z.array(rankedMatchSchema),
  gaps: z.array(gapSchema),
});

export type MatchOutput = z.infer<typeof matchOutputSchema>;

// Resume Generation
export const generateResumeInputSchema = z.object({
  matchesJson: z.string().describe('JSON string of ranked matches to include'),
  targetCompany: z.string().describe('Target company name'),
  targetRole: z.string().describe('Target role title'),
  summary: z.string().optional().describe('Optional professional summary'),
});

export const generateResumeOutputSchema = z.object({
  id: z.string(),
  markdown: z.string(),
});

export type GenerateResumeOutput = z.infer<typeof generateResumeOutputSchema>;

// DOCX Generation
export const generateDocxInputSchema = z.object({
  resumeId: z.string().describe('ID of the generated resume'),
});

export const generateDocxOutputSchema = z.object({
  downloadUrl: z.string(),
});

export type GenerateDocxOutput = z.infer<typeof generateDocxOutputSchema>;

// Preferences
export const preferencesSchema = z.object({
  includeSummary: z.boolean(),
  includeRoleSummaries: z.boolean(),
  boldPattern: z.enum(['action_only', 'action_and_kpi']),
  format: z.enum(['company_location_dates', 'title_company_dates']),
});

export type Preferences = z.infer<typeof preferencesSchema>;

export const updatePreferencesInputSchema = preferencesSchema.partial();

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesInputSchema>;

// ============================================================================
// JSON Input Validation Schemas
// These schemas validate JSON strings passed as tool parameters
// ============================================================================

/**
 * Schema for success profile used in matching
 */
export const keyThemeSchema = z.object({
  theme: z.string(),
  tags: z.array(z.string()),
});

export const successProfileInputSchema = z.object({
  mustHave: z.array(z.string()),
  niceToHave: z.array(z.string()).optional(),
  keyThemes: z.array(keyThemeSchema).optional(),
});

export type KeyTheme = z.infer<typeof keyThemeSchema>;
export type SuccessProfileInput = z.infer<typeof successProfileInputSchema>;

/**
 * Schema for matched achievements array used in generation
 */
export const matchedAchievementSchema = z.object({
  achievementId: z.string(),
  achievementText: z.string(),
  company: z.string(),
  title: z.string(),
  score: z.number(),
  matchedRequirements: z.array(z.string()),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const matchedAchievementsArraySchema = z.array(matchedAchievementSchema);
export type MatchedAchievement = z.infer<typeof matchedAchievementSchema>;

/**
 * Schema for parsed requirements in research tools
 */
export const parsedRequirementSchema = z.object({
  text: z.string(),
  type: z.enum(['must_have', 'nice_to_have']),
  tags: z.array(z.string()).optional(),
});

export const parsedRequirementsArraySchema = z.array(parsedRequirementSchema);
export type ParsedRequirement = z.infer<typeof parsedRequirementSchema>;

// ============================================================================
// Contact Details
// ============================================================================

export const contactDetailsInputSchema = z.object({
  fullName: z.string().describe('Full name as it should appear on resume'),
  email: z.string().email().describe('Professional email address'),
  phone: z.string().optional().describe('Phone number'),
  location: z.string().optional().describe('Location (City, State/Country)'),
  linkedinUrl: z.string().optional().transform(v => v === '' ? undefined : v).describe('LinkedIn profile URL'),
  portfolioUrl: z.string().optional().transform(v => v === '' ? undefined : v).describe('Portfolio or personal website URL'),
  githubUrl: z.string().optional().transform(v => v === '' ? undefined : v).describe('GitHub profile URL'),
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
