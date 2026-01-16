'use client';

import { useEffect, useState } from 'react';
import { AchievementCard } from '@/components/library/AchievementCard';
import { ContactDetailsCard } from '@/components/library/ContactDetailsCard';
import { SkillsList } from '@/components/library/SkillsList';
import { EducationList } from '@/components/library/EducationList';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, GraduationCap, Wrench } from 'lucide-react';

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

export default function LibraryPage() {
  const [data, setData] = useState<LibraryData>({
    contactDetails: null,
    achievements: [],
    skills: [],
    education: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/library')
      .then((res) => res.json())
      .then((result) => {
        setData({
          contactDetails: result.contactDetails || null,
          achievements: result.achievements || [],
          skills: result.skills || [],
          education: result.education || [],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isEmpty = !data.contactDetails && data.achievements.length === 0 && data.skills.length === 0 && data.education.length === 0;

  if (isEmpty) {
    return (
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Your Library</h1>
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Your library is empty. Start a chat to upload your resume and populate your library.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Group achievements by company
  const groupedAchievements = data.achievements.reduce<Record<string, Achievement[]>>((acc, ach) => {
    if (!acc[ach.company]) acc[ach.company] = [];
    acc[ach.company].push(ach);
    return acc;
  }, {});

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold">Your Library</h1>

        {/* Contact Details Hero */}
        <ContactDetailsCard contactDetails={data.contactDetails} />

        {/* Skills Section */}
        {data.skills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wrench className="h-5 w-5" />
                Skills ({data.skills.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SkillsList skills={data.skills} />
            </CardContent>
          </Card>
        )}

        {/* Education Section */}
        {data.education.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="h-5 w-5" />
                Education ({data.education.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EducationList education={data.education} />
            </CardContent>
          </Card>
        )}

        {/* Achievements Section */}
        {data.achievements.length > 0 && (
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
              <Briefcase className="h-5 w-5" />
              Work Experience ({data.achievements.length} achievements)
            </h2>
            <div className="space-y-8">
              {Object.entries(groupedAchievements).map(([company, items]) => (
                <div key={company}>
                  <h3 className="text-md font-medium mb-4">{company}</h3>
                  <div className="space-y-4">
                    {items.map((achievement) => (
                      <AchievementCard key={achievement.id} achievement={achievement} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
