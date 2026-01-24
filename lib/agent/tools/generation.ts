import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Packer } from 'docx';
import { generateDocx, parseMarkdownToResumeData } from '@/lib/docx/generator';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { matchedAchievementsArraySchema, ResumeSection } from '../schemas';
import { getCurrentUserId, sanitizeFilename } from './utils';

export const generateResume = tool({
  description: 'Generate a tailored resume markdown from matched achievements. Call this after matchAchievements.',
  inputSchema: z.object({
    targetCompany: z.string().describe('Target company name'),
    targetRole: z.string().describe('Target role title'),
    matchedAchievements: matchedAchievementsArraySchema.describe('Array of matched achievements to include'),
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
  execute: async ({
    targetCompany,
    targetRole,
    matchedAchievements,
    summary,
    userName,
    userEmail,
    userPhone,
    userLocation,
    userLinkedin,
    userPortfolio,
    userGithub,
  }) => {
    const userId = getCurrentUserId();

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

    // Fetch resume structure preference
    const structure = await prisma.resumeStructure.findUnique({
      where: { userId },
    });

    // Parse sections from structure if it exists
    const sections: ResumeSection[] = structure?.sections
      ? (structure.sections as ResumeSection[])
      : [
          { type: 'summary', label: 'Summary' },
          { type: 'experience', label: 'Professional Experience' },
          { type: 'skill', label: 'Skills' },
          { type: 'education', label: 'Education' },
        ];

    // Use the typed array directly (no JSON parsing needed)
    const matches = matchedAchievements;

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

    // Separate achievements from library items
    const achievementMatches = matches.filter((m) => !m.isLibraryItem);
    const libraryItemMatches = matches.filter((m) => m.isLibraryItem);

    // Group achievements by company/role (exclude library items)
    const groupedByRole = new Map<string, typeof achievementMatches>();
    for (const match of achievementMatches) {
      const key = `${match.company}|${match.title}`;
      if (!groupedByRole.has(key)) {
        groupedByRole.set(key, []);
      }
      groupedByRole.get(key)!.push(match);
    }

    // Build markdown
    let markdown = `# ${contactName}\n\n`;

    const contactParts = [contactEmail, contactPhone, contactLocation].filter(Boolean);
    if (contactLinkedin) contactParts.push(contactLinkedin);
    if (contactPortfolio) contactParts.push(contactPortfolio);
    if (contactGithub) contactParts.push(contactGithub);
    markdown += `${contactParts.join(' | ')}\n\n`;

    // Helper function to generate summary section
    const generateSummarySection = (label: string) => {
      if (summary) {
        return `## ${label}\n\n${summary}\n\n`;
      }
      return '';
    };

    // Helper function to generate experience section
    const generateExperienceSection = (label: string) => {
      if (groupedByRole.size === 0) return '';

      let sectionMarkdown = `## ${label}\n\n`;
      for (const [key, roleMatches] of groupedByRole) {
        const [company, title] = key.split('|');
        const firstMatch = roleMatches[0];

        sectionMarkdown += `**${company}**${firstMatch.location ? ` | ${firstMatch.location}` : ''}\n`;
        sectionMarkdown += `${title}${firstMatch.startDate ? `, ${firstMatch.startDate} - ${firstMatch.endDate || 'Present'}` : ''}\n\n`;

        // Add role summary if enabled and available
        if (structure?.includeRoleSummaries && firstMatch.roleSummary) {
          sectionMarkdown += `_${firstMatch.roleSummary}_\n\n`;
        }

        for (const match of roleMatches) {
          sectionMarkdown += `- ${match.achievementText}\n`;
        }
        sectionMarkdown += '\n';
      }
      return sectionMarkdown;
    };

    // Helper function to generate skills section
    const generateSkillsSection = (label: string) => {
      if (skills.length === 0) return '';

      let sectionMarkdown = `## ${label}\n\n`;

      // Group skills by category
      const skillsByCategory = new Map<string, string[]>();
      for (const skill of skills) {
        const category = skill.category || 'Other';
        if (!skillsByCategory.has(category)) {
          skillsByCategory.set(category, []);
        }
        skillsByCategory.get(category)!.push(skill.name);
      }

      for (const [category, skillNames] of skillsByCategory) {
        sectionMarkdown += `**${category}:** ${skillNames.join(', ')}\n\n`;
      }
      return sectionMarkdown;
    };

    // Helper function to generate education section
    const generateEducationSection = (label: string) => {
      if (education.length === 0) return '';

      let sectionMarkdown = `## ${label}\n\n`;

      for (const edu of education) {
        sectionMarkdown += `**${edu.institution}**${edu.location ? ` | ${edu.location}` : ''}\n`;

        let degreeLine = edu.degree;
        if (edu.field) degreeLine += ` in ${edu.field}`;
        if (edu.endDate) {
          const year = edu.endDate.getFullYear();
          degreeLine += `, ${year}`;
        }
        if (edu.gpa) degreeLine += ` | GPA: ${edu.gpa}`;
        if (edu.honors) degreeLine += ` | ${edu.honors}`;
        sectionMarkdown += `${degreeLine}\n\n`;
      }
      return sectionMarkdown;
    };

    // Helper function to generate generic sections from matched LibraryItems
    const generateGenericSection = (type: string, label: string): string => {
      // Filter matched library items by type (only include items that were matched)
      const matchedItems = libraryItemMatches.filter((m) => m.itemType === type);

      if (matchedItems.length === 0) return '';

      let sectionMarkdown = `## ${label}\n\n`;
      for (const match of matchedItems) {
        // Use the match data which includes title, company (as subtitle), etc.
        sectionMarkdown += `**${match.title}**`;
        if (match.company && match.company !== match.title) {
          sectionMarkdown += ` | ${match.company}`;
        }
        if (match.startDate) {
          sectionMarkdown += ` | ${match.startDate}`;
          if (match.endDate) sectionMarkdown += ` - ${match.endDate}`;
        }
        sectionMarkdown += '\n';

        // The achievementText contains the formatted description
        sectionMarkdown += `- ${match.achievementText}\n`;
        sectionMarkdown += '\n';
      }
      return sectionMarkdown;
    };

    // Generate sections based on structure preference (or default order)
    for (const section of sections) {
      switch (section.type) {
        case 'summary':
          markdown += generateSummarySection(section.label);
          break;
        case 'experience':
          markdown += generateExperienceSection(section.label);
          break;
        case 'skill':
          markdown += generateSkillsSection(section.label);
          break;
        case 'education':
          markdown += generateEducationSection(section.label);
          break;
        default:
          // Handle dynamic section types from matched LibraryItems
          markdown += generateGenericSection(section.type, section.label);
          break;
      }
    }

    // Ensure user exists in database (required for foreign key constraint)
    try {
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, email: `${userId}@temp.local` },
      });
    } catch (userError) {
      console.error('[generateResume] Failed to ensure user exists:', userError);
      // Continue anyway - the user might exist with a different mechanism
    }

    // Save to database
    try {
      const resume = await prisma.generatedResume.create({
        data: {
          userId,
          targetCompany,
          targetRole,
          markdown,
        },
      });

      return {
        success: true,
        id: resume.id,
        markdown,
        message: `Resume generated for ${targetRole} at ${targetCompany}. Use generateDocxFile to create a downloadable Word document.`,
      };
    } catch (error) {
      // Log full error for debugging but don't expose database internals to user
      console.error('[generateResume] Database error:', error);
      return {
        success: false,
        error: 'Failed to save resume. Please try again or contact support if the issue persists.',
      };
    }
  },
});

export const generateDocxFile = tool({
  description: 'Generate a DOCX file from a previously generated resume. Returns a download URL.',
  inputSchema: z.object({
    resumeId: z.string().describe('ID of the generated resume'),
  }),
  execute: async ({ resumeId }) => {
    const userId = getCurrentUserId();

    let resume;
    try {
      resume = await prisma.generatedResume.findFirst({
        where: { id: resumeId, userId },
      });
    } catch (error) {
      // Log full error for debugging but don't expose database internals to user
      console.error('[generateDocxFile] Database fetch error:', error);
      return {
        success: false,
        error: 'Failed to fetch resume. Please try again.',
      };
    }

    if (!resume) {
      return {
        success: false,
        error: 'Resume not found',
      };
    }

    try {
      // Parse markdown to structured data
      const resumeData = parseMarkdownToResumeData(resume.markdown);

      // Generate DOCX
      const doc = generateDocx(resumeData);
      const buffer = await Packer.toBuffer(doc);

      // Save file with sanitized filename
      const uploadsDir = path.join(process.cwd(), 'public', 'resumes');
      await mkdir(uploadsDir, { recursive: true });

      const filename = `${sanitizeFilename(resumeData.name)}_${sanitizeFilename(resume.targetCompany)}_${sanitizeFilename(resume.targetRole)}_Resume.docx`;
      const filepath = path.join(uploadsDir, filename);

      await writeFile(filepath, buffer);

      // Update database with file path
      const downloadUrl = `/resumes/${filename}`;
      await prisma.generatedResume.update({
        where: { id: resumeId },
        data: { docxUrl: downloadUrl },
      });

      return {
        success: true,
        downloadUrl,
        filename,
        message: `DOCX file generated: ${filename}`,
      };
    } catch (error) {
      // Log full error for debugging but don't expose internal details to user
      console.error('[generateDocxFile] Error:', error);
      return {
        success: false,
        error: 'Failed to generate DOCX file. Please try again.',
      };
    }
  },
});
