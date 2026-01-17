import { tool } from 'ai';
import { z } from 'zod';
import { tavily } from '@tavily/core';
import { parseJDInputSchema, parsedRequirementsArraySchema } from '../schemas';
import { safeJsonParse } from './utils';

// Initialize Tavily client (uses TAVILY_API_KEY from environment)
const getTavilyClient = () => {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY environment variable is not set');
  }
  return tavily({ apiKey });
};

export const fetchJobFromUrl = tool({
  description: 'Fetch and extract the job description content from a URL. Call this when the user provides a job posting URL (contains http:// or https://).',
  inputSchema: z.object({
    url: z.string().url().describe('The URL of the job posting to fetch'),
  }),
  execute: async ({ url }) => {
    try {
      const client = getTavilyClient();
      const response = await client.extract([url], {
        extractDepth: 'advanced',
        format: 'markdown',
      });

      if (response.results.length > 0) {
        const result = response.results[0];
        return {
          success: true,
          url: result.url,
          content: result.rawContent,
        };
      }

      if (response.failedResults.length > 0) {
        const failed = response.failedResults[0];
        return {
          success: false,
          url: failed.url,
          error: failed.error || 'Failed to extract content from URL',
        };
      }

      return {
        success: false,
        url,
        error: 'No content returned from URL',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        url,
        error: message,
      };
    }
  },
});

export const parseJobDescription = tool({
  description: 'Parse a job description to extract requirements, keywords, and role information. Call this when user provides a job description.',
  inputSchema: parseJDInputSchema,
  execute: async ({ text }) => {
    // This tool returns structured data that the LLM will fill in
    // The actual parsing is done by the LLM's reasoning
    // We return a template that indicates what to extract
    return {
      instruction: 'Analyze the job description and extract the following. Return as JSON matching the schema.',
      schema: {
        company: 'string - company name',
        role: 'string - job title',
        location: 'string | null - work location',
        requirements: 'array of { text, type: "must_have" | "nice_to_have", tags: string[] }',
        keywords: 'string[] - technical terms, tools, methodologies',
        roleType: 'string - e.g., "IC", "Manager", "Technical", "Business"',
      },
      jobDescriptionText: text,
    };
  },
});

export const buildSuccessProfile = tool({
  description: 'Build a success profile from parsed job description. Call this after parseJobDescription to create a matching profile.',
  inputSchema: z.object({
    company: z.string().describe('Company name'),
    role: z.string().describe('Role title'),
    requirements: z.string().describe('JSON string of requirements array'),
    keywords: z.string().describe('JSON string of keywords array'),
    companyContext: z.string().optional().describe('Additional company context if available'),
  }),
  execute: async ({ company, role, requirements, keywords, companyContext }) => {
    // Validate requirements JSON
    const reqResult = safeJsonParse(requirements, parsedRequirementsArraySchema);
    if (!reqResult.data) {
      return {
        success: false,
        error: `Invalid requirements: ${reqResult.error}`,
      };
    }
    const parsedRequirements = reqResult.data;

    // Validate keywords JSON
    const keywordsResult = safeJsonParse(keywords, z.array(z.string()));
    if (!keywordsResult.data) {
      return {
        success: false,
        error: `Invalid keywords: ${keywordsResult.error}`,
      };
    }
    const parsedKeywords = keywordsResult.data;

    const mustHave = parsedRequirements
      .filter((r) => r.type === 'must_have')
      .map((r) => r.text);

    const niceToHave = parsedRequirements
      .filter((r) => r.type === 'nice_to_have')
      .map((r) => r.text);

    // Extract unique tags from requirements
    const allTags = parsedRequirements.flatMap((r) => r.tags || []);
    const uniqueTags = [...new Set(allTags)] as string[];

    // Group by theme
    const themes = groupTagsByTheme(uniqueTags);

    return {
      success: true,
      company,
      role,
      mustHave,
      niceToHave,
      keyThemes: themes,
      terminology: [],
      keywords: parsedKeywords,
      companyContext: companyContext || null,
    };
  },
});

function groupTagsByTheme(tags: string[]): Array<{ theme: string; tags: string[] }> {
  const themeMap: Record<string, string[]> = {
    'Technical Skills': [],
    'Leadership': [],
    'Data & Analytics': [],
    'Product Management': [],
    'Communication': [],
    'Other': [],
  };

  const tagToTheme: Record<string, string> = {
    // Technical
    'engineering': 'Technical Skills',
    'technical': 'Technical Skills',
    'architecture': 'Technical Skills',
    'api': 'Technical Skills',
    'database': 'Technical Skills',
    'cloud': 'Technical Skills',
    'infrastructure': 'Technical Skills',

    // Leadership
    'leadership': 'Leadership',
    'management': 'Leadership',
    'mentoring': 'Leadership',
    'team-building': 'Leadership',
    'cross-functional': 'Leadership',

    // Data
    'data': 'Data & Analytics',
    'analytics': 'Data & Analytics',
    'metrics': 'Data & Analytics',
    'reporting': 'Data & Analytics',
    'a/b-testing': 'Data & Analytics',

    // Product
    'product': 'Product Management',
    'roadmap': 'Product Management',
    'strategy': 'Product Management',
    'prioritization': 'Product Management',
    'user-research': 'Product Management',

    // Communication
    'communication': 'Communication',
    'stakeholder': 'Communication',
    'presentation': 'Communication',
    'documentation': 'Communication',
  };

  for (const tag of tags) {
    const theme = tagToTheme[tag.toLowerCase()] || 'Other';
    themeMap[theme].push(tag);
  }

  return Object.entries(themeMap)
    .filter(([_, tags]) => tags.length > 0)
    .map(([theme, tags]) => ({ theme, tags }));
}
