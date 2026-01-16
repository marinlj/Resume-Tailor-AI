'use client';

import { useEffect, useState } from 'react';
import { AchievementCard } from './AchievementCard';
import { Skeleton } from '@/components/ui/skeleton';

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

export function AchievementList() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/library')
      .then((res) => res.json())
      .then((data) => {
        setAchievements(data.achievements || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No achievements in your library yet. Start a chat to add your resume.
        </p>
      </div>
    );
  }

  // Group by company
  const grouped = achievements.reduce<Record<string, Achievement[]>>((acc, ach) => {
    if (!acc[ach.company]) acc[ach.company] = [];
    acc[ach.company].push(ach);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([company, items]) => (
        <div key={company}>
          <h2 className="text-lg font-semibold mb-4">{company}</h2>
          <div className="space-y-4">
            {items.map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
