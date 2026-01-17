import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  TabStopPosition,
  TabStopType,
  convertInchesToTwip,
} from 'docx';

interface ResumeData {
  name: string;
  email: string;
  phone?: string;
  linkedin?: string;
  location?: string;
  summary?: string;
  experience: Array<{
    company: string;
    title: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    bullets: string[];
  }>;
  skills?: string[];
  education?: Array<{
    school: string;
    degree: string;
    year?: string;
  }>;
}

export function parseMarkdownToResumeData(markdown: string): ResumeData {
  const lines = markdown.split('\n');

  const data: ResumeData = {
    name: '',
    email: '',
    experience: [],
    skills: [],
    education: [],
  };

  let currentSection = '';
  let currentExperience: {
    company: string;
    title: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    bullets: string[];
  } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Name (h1)
    if (trimmed.startsWith('# ')) {
      data.name = trimmed.slice(2);
      continue;
    }

    // Contact info line
    if (trimmed.includes('@') && trimmed.includes('|')) {
      const parts = trimmed.split('|').map((p) => p.trim());
      for (const part of parts) {
        if (part.includes('@')) data.email = part;
        else if (part.match(/\(\d{3}\)/)) data.phone = part;
        else if (part.includes('linkedin')) data.linkedin = part;
        else if (part.match(/[A-Z][a-z]+,\s*[A-Z]{2}/)) data.location = part;
      }
      continue;
    }

    // Section headers (h2)
    if (trimmed.startsWith('## ')) {
      currentSection = trimmed.slice(3).toLowerCase();
      if (currentExperience) {
        data.experience.push(currentExperience);
        currentExperience = null;
      }
      continue;
    }

    // Experience entry (bold company/title line)
    if (currentSection.includes('experience') && trimmed.startsWith('**')) {
      if (currentExperience) {
        data.experience.push(currentExperience);
      }

      // Parse: **Company** | Location
      const companyMatch = trimmed.match(/\*\*(.+?)\*\*/);
      const locationMatch = trimmed.match(/\|\s*(.+)/);

      currentExperience = {
        company: companyMatch?.[1] || '',
        title: '',
        location: locationMatch?.[1] || '',
        bullets: [],
      };
      continue;
    }

    // Title and dates line
    if (currentExperience && !currentExperience.title && trimmed && !trimmed.startsWith('-')) {
      const dateMatch = trimmed.match(/,\s*(\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{4}|Present)/i);
      if (dateMatch) {
        currentExperience.title = trimmed.split(',')[0];
        currentExperience.startDate = dateMatch[1];
        currentExperience.endDate = dateMatch[2];
      } else {
        currentExperience.title = trimmed;
      }
      continue;
    }

    // Bullet points
    if (trimmed.startsWith('- ') && currentExperience) {
      currentExperience.bullets.push(trimmed.slice(2));
      continue;
    }

    // Skills section
    if (currentSection.includes('skill') && trimmed && !trimmed.startsWith('#')) {
      const skills = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
      data.skills?.push(...skills);
      continue;
    }

    // Education section
    if (currentSection.includes('education') && trimmed && !trimmed.startsWith('#')) {
      // Institution line: **Institution Name** | Location
      if (trimmed.startsWith('**')) {
        const institutionMatch = trimmed.match(/\*\*(.+?)\*\*/);
        const school = institutionMatch?.[1] || '';

        // Create education entry - degree will be parsed on next line
        data.education?.push({
          school,
          degree: '',
        });
        continue;
      }

      // Degree line: Degree in Field, Year | GPA: X.XX | Honors
      // This line follows the institution line
      if (data.education && data.education.length > 0) {
        const lastEducation = data.education[data.education.length - 1];
        if (lastEducation && !lastEducation.degree) {
          // Extract year from format like "2020" or ", 2020"
          const yearMatch = trimmed.match(/,?\s*(\d{4})/);
          const year = yearMatch?.[1];

          // The degree is everything before the year (or before GPA/Honors indicators)
          let degree = trimmed;
          if (yearMatch) {
            degree = trimmed.slice(0, yearMatch.index).trim();
          } else {
            // If no year, strip GPA and honors
            degree = trimmed.split('|')[0].trim();
          }

          lastEducation.degree = degree;
          lastEducation.year = year;
          continue;
        }
      }
    }

    // Summary
    if (currentSection.includes('summary') && trimmed && !trimmed.startsWith('#')) {
      data.summary = (data.summary || '') + trimmed + ' ';
      continue;
    }
  }

  // Don't forget last experience
  if (currentExperience) {
    data.experience.push(currentExperience);
  }

  return data;
}

export function generateDocx(data: ResumeData): Document {
  const children: Paragraph[] = [];

  // Name
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: data.name,
          bold: true,
          size: 28,
          font: 'Cambria',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  );

  // Contact info
  const contactParts = [data.email, data.phone, data.location, data.linkedin].filter(Boolean);
  if (contactParts.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: contactParts.join(' | '),
            size: 20,
            font: 'Cambria',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );
  }

  // Summary
  if (data.summary) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'SUMMARY',
            bold: true,
            size: 22,
            font: 'Cambria',
          }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: data.summary.trim(),
            size: 20,
            font: 'Cambria',
          }),
        ],
        spacing: { after: 200 },
      })
    );
  }

  // Professional Experience
  if (data.experience.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'PROFESSIONAL EXPERIENCE',
            bold: true,
            size: 22,
            font: 'Cambria',
          }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );

    for (const exp of data.experience) {
      // Company and location
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: exp.company,
              bold: true,
              size: 20,
              font: 'Cambria',
            }),
            new TextRun({
              text: exp.location ? ` | ${exp.location}` : '',
              size: 20,
              font: 'Cambria',
            }),
          ],
          spacing: { before: 150 },
        })
      );

      // Title and dates
      const dateStr = exp.startDate && exp.endDate
        ? `${exp.startDate} - ${exp.endDate}`
        : '';
      children.push(
        new Paragraph({
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: TabStopPosition.MAX,
            },
          ],
          children: [
            new TextRun({
              text: exp.title,
              italics: true,
              size: 20,
              font: 'Cambria',
            }),
            new TextRun({
              text: `\t${dateStr}`,
              size: 20,
              font: 'Cambria',
            }),
          ],
          spacing: { after: 50 },
        })
      );

      // Bullets
      for (const bullet of exp.bullets) {
        const parts = parseBoldText(bullet);
        children.push(
          new Paragraph({
            children: parts,
            bullet: { level: 0 },
            spacing: { after: 50 },
            indent: { left: convertInchesToTwip(0.25) },
          })
        );
      }
    }
  }

  // Skills
  if (data.skills && data.skills.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'SKILLS',
            bold: true,
            size: 22,
            font: 'Cambria',
          }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: data.skills.join(', '),
            size: 20,
            font: 'Cambria',
          }),
        ],
      })
    );
  }

  // Education
  if (data.education && data.education.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'EDUCATION',
            bold: true,
            size: 22,
            font: 'Cambria',
          }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );

    for (const edu of data.education) {
      // School name
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: edu.school,
              bold: true,
              size: 20,
              font: 'Cambria',
            }),
          ],
          spacing: { before: 100 },
        })
      );

      // Degree and year
      const degreeText = edu.year ? `${edu.degree}, ${edu.year}` : edu.degree;
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: degreeText,
              italics: true,
              size: 20,
              font: 'Cambria',
            }),
          ],
          spacing: { after: 50 },
        })
      );
    }
  }

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(0.75),
              right: convertInchesToTwip(0.75),
            },
          },
        },
        children,
      },
    ],
  });
}

function parseBoldText(text: string): TextRun[] {
  const parts: TextRun[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        new TextRun({
          text: text.slice(lastIndex, match.index),
          size: 20,
          font: 'Cambria',
        })
      );
    }
    parts.push(
      new TextRun({
        text: match[1],
        bold: true,
        size: 20,
        font: 'Cambria',
      })
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(
      new TextRun({
        text: text.slice(lastIndex),
        size: 20,
        font: 'Cambria',
      })
    );
  }

  return parts.length > 0 ? parts : [
    new TextRun({
      text,
      size: 20,
      font: 'Cambria',
    }),
  ];
}
