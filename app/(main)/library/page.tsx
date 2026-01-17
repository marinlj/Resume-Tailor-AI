'use client';

import { useEffect, useState } from 'react';
import { AchievementCard } from '@/components/library/AchievementCard';
import { ContactDetailsCard } from '@/components/library/ContactDetailsCard';
import { SkillsList } from '@/components/library/SkillsList';
import { EducationList } from '@/components/library/EducationList';
import { cn } from '@/lib/utils';

interface Achievement {
  id: string;
  company: string;
  title: string;
  location: string | null;
  startDate: Date | null;
  endDate: Date | null;
  text: string;
  tags: string[];
}

interface Skill {
  id: string;
  name: string;
  category: string | null;
  level: string | null;
}

interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string | null;
  location: string | null;
  startDate: Date | null;
  endDate: Date | null;
  gpa: string | null;
  honors: string | null;
  activities: string[];
}

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

interface LibraryData {
  contactDetails: ContactDetails | null;
  achievements: Achievement[];
  skills: Skill[];
  education: Education[];
}

function SectionHeader({
  title,
  count,
  className,
}: {
  title: string;
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-4 mb-6", className)}>
      <h2 className="font-serif text-2xl font-medium text-foreground">
        {title}
        {count !== undefined && (
          <span className="ml-2 text-sm font-sans font-normal text-muted-foreground">
            ({count})
          </span>
        )}
      </h2>
      <div className="h-px flex-1 bg-gradient-to-r from-editorial-line to-transparent" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex-1 p-8 overflow-auto">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Hero skeleton */}
        <div className="space-y-4 pb-12">
          <div className="h-14 w-72 bg-muted/50 rounded animate-pulse" />
          <div className="h-6 w-96 bg-muted/30 rounded animate-pulse" />
          <div className="flex gap-4 mt-8">
            <div className="h-4 w-32 bg-muted/30 rounded animate-pulse" />
            <div className="h-4 w-28 bg-muted/30 rounded animate-pulse" />
          </div>
        </div>

        {/* Section skeletons */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-4">
            <div className="h-8 w-48 bg-muted/40 rounded animate-pulse" />
            <div className="h-32 w-full bg-muted/20 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const [data, setData] = useState<LibraryData>({
    contactDetails: null,
    achievements: [],
    skills: [],
    education: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/library')
      .then((res) => {
        console.log('[LibraryPage] API response status:', res.status);
        if (!res.ok) {
          throw new Error(`API returned ${res.status}`);
        }
        return res.json();
      })
      .then((result) => {
        console.log('[LibraryPage] API response:', {
          hasContactDetails: !!result.contactDetails,
          achievementsCount: result.achievements?.length ?? 0,
          skillsCount: result.skills?.length ?? 0,
          educationCount: result.education?.length ?? 0,
          error: result.error,
        });

        if (result.error) {
          setError(result.error);
          setLoading(false);
          return;
        }

        setData({
          contactDetails: result.contactDetails || null,
          achievements: result.achievements || [],
          skills: result.skills || [],
          education: result.education || [],
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error('[LibraryPage] Error fetching library:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-serif text-3xl font-semibold mb-8">Your Library</h1>
          <div className="text-center py-16 border border-dashed border-editorial-line rounded-lg">
            <p className="text-destructive mb-2 font-medium">Error loading library</p>
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const isEmpty =
    !data.contactDetails &&
    data.achievements.length === 0 &&
    data.skills.length === 0 &&
    data.education.length === 0;

  if (isEmpty) {
    return (
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-serif text-3xl font-semibold mb-8">Your Library</h1>
          <div className="text-center py-20 border border-dashed border-editorial-line rounded-lg bg-gradient-to-b from-editorial-accent-muted/10 to-transparent">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-editorial-accent-muted flex items-center justify-center">
              <svg
                className="w-8 h-8 text-editorial-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <p className="text-muted-foreground font-serif italic text-lg">
              Your library is empty
            </p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Start a chat to upload your resume and populate your professional library with achievements, skills, and education.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Group achievements by company
  const groupedAchievements = data.achievements.reduce<
    Record<string, Achievement[]>
  >((acc, ach) => {
    if (!acc[ach.company]) acc[ach.company] = [];
    acc[ach.company].push(ach);
    return acc;
  }, {});

  return (
    <div className="flex-1 p-6 md:p-8 overflow-auto">
      <div className="max-w-4xl mx-auto">
        {/* Contact Details Hero */}
        <ContactDetailsCard contactDetails={data.contactDetails} />

        {/* Main Content Grid */}
        <div className="space-y-12">
          {/* Skills Section */}
          {data.skills.length > 0 && (
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100">
              <SectionHeader title="Skills" count={data.skills.length} />
              <SkillsList skills={data.skills} />
            </section>
          )}

          {/* Education Section */}
          {data.education.length > 0 && (
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200">
              <SectionHeader title="Education" count={data.education.length} />
              <EducationList education={data.education} />
            </section>
          )}

          {/* Work Experience Section */}
          {data.achievements.length > 0 && (
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
              <SectionHeader
                title="Experience"
                count={data.achievements.length}
              />

              <div className="space-y-10">
                {Object.entries(groupedAchievements).map(
                  ([company, items], companyIndex) => (
                    <div
                      key={company}
                      className="animate-in fade-in slide-in-from-bottom-1 duration-500"
                      style={{ animationDelay: `${400 + companyIndex * 100}ms` }}
                    >
                      {/* Company header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-8 w-1 rounded-full bg-editorial-accent" />
                        <h3 className="font-serif text-xl font-medium text-foreground">
                          {company}
                        </h3>
                      </div>

                      {/* Achievements timeline */}
                      <div className="ml-2">
                        {items.map((achievement, index) => (
                          <AchievementCard
                            key={achievement.id}
                            achievement={achievement}
                            isFirst={index === 0}
                            isLast={index === items.length - 1}
                          />
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
