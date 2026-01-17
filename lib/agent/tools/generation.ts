import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Packer } from 'docx';
import { generateDocx, parseMarkdownToResumeData } from '@/lib/docx/generator';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { matchedAchievementsArraySchema } from '../schemas';
import { getTempUserId, safeJsonParse, sanitizeFilename } from './utils';

export const generateResume = tool({
  description: 'Generate a tailored resume markdown from matched achievements. Call this after matchAchievements.',
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
    if (!parseResult.data) {
      return {
        success: false,
        error: parseResult.error,
      };
    }
    const matches = parseResult.data;

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

    // Group matches by company/role
    const groupedByRole = new Map<string, typeof matches>();
    for (const match of matches) {
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

    if (summary) {
      markdown += `## Summary\n\n${summary}\n\n`;
    }

    markdown += `## Professional Experience\n\n`;

    for (const [key, roleMatches] of groupedByRole) {
      const [company, title] = key.split('|');
      const firstMatch = roleMatches[0];

      markdown += `**${company}**${firstMatch.location ? ` | ${firstMatch.location}` : ''}\n`;
      markdown += `${title}${firstMatch.startDate ? `, ${firstMatch.startDate} - ${firstMatch.endDate || 'Present'}` : ''}\n\n`;

      for (const match of roleMatches) {
        markdown += `- ${match.achievementText}\n`;
      }
      markdown += '\n';
    }

    // Skills section
    if (skills.length > 0) {
      markdown += `## Skills\n\n`;

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
        markdown += `**${category}:** ${skillNames.join(', ')}\n\n`;
      }
    }

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
      return {
        success: false,
        error: 'Failed to save resume to database',
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
    const userId = getTempUserId();

    let resume;
    try {
      resume = await prisma.generatedResume.findFirst({
        where: { id: resumeId, userId },
      });
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch resume from database',
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
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate DOCX file',
      };
    }
  },
});
