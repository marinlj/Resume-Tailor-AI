import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Packer } from 'docx';
import { generateDocx, parseMarkdownToResumeData } from '@/lib/docx/generator';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const getTempUserId = () => process.env.TEMP_USER_ID || 'temp-user-id';

export const generateResume = tool({
  description: 'Generate a tailored resume markdown from matched achievements. Call this after matchAchievements.',
  inputSchema: z.object({
    targetCompany: z.string().describe('Target company name'),
    targetRole: z.string().describe('Target role title'),
    matchedAchievementsJson: z.string().describe('JSON string of matched achievements to include'),
    summary: z.string().optional().describe('Professional summary paragraph'),
    userName: z.string().describe('User full name'),
    userEmail: z.string().describe('User email'),
    userPhone: z.string().optional().describe('User phone number'),
    userLocation: z.string().optional().describe('User location (City, State)'),
    userLinkedin: z.string().optional().describe('User LinkedIn URL'),
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
  }) => {
    const userId = getTempUserId();
    const matches = JSON.parse(matchedAchievementsJson);

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
    let markdown = `# ${userName}\n\n`;

    // Contact line
    const contactParts = [userEmail, userPhone, userLocation, userLinkedin].filter(Boolean);
    markdown += `${contactParts.join(' | ')}\n\n`;

    // Summary
    if (summary) {
      markdown += `## Summary\n\n${summary}\n\n`;
    }

    // Experience
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

    // Save to database
    const resume = await prisma.generatedResume.create({
      data: {
        userId,
        targetCompany,
        targetRole,
        markdown,
      },
    });

    return {
      id: resume.id,
      markdown,
      message: `Resume generated for ${targetRole} at ${targetCompany}. Use generateDocxFile to create a downloadable Word document.`,
    };
  },
});

export const generateDocxFile = tool({
  description: 'Generate a DOCX file from a previously generated resume. Returns a download URL.',
  inputSchema: z.object({
    resumeId: z.string().describe('ID of the generated resume'),
  }),
  execute: async ({ resumeId }) => {
    const userId = getTempUserId();

    const resume = await prisma.generatedResume.findFirst({
      where: { id: resumeId, userId },
    });

    if (!resume) {
      return { error: 'Resume not found' };
    }

    // Parse markdown to structured data
    const resumeData = parseMarkdownToResumeData(resume.markdown);

    // Generate DOCX
    const doc = generateDocx(resumeData);
    const buffer = await Packer.toBuffer(doc);

    // Save file
    const uploadsDir = path.join(process.cwd(), 'public', 'resumes');
    await mkdir(uploadsDir, { recursive: true });

    const filename = `${resumeData.name.replace(/\s+/g, '_')}_${resume.targetCompany.replace(/\s+/g, '_')}_${resume.targetRole.replace(/\s+/g, '_')}_Resume.docx`;
    const filepath = path.join(uploadsDir, filename);

    await writeFile(filepath, buffer);

    // Update database with file path
    const downloadUrl = `/resumes/${filename}`;
    await prisma.generatedResume.update({
      where: { id: resumeId },
      data: { docxUrl: downloadUrl },
    });

    return {
      downloadUrl,
      filename,
      message: `DOCX file generated: ${filename}`,
    };
  },
});
