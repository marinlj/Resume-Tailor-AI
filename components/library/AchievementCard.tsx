'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AchievementCardProps {
  achievement: {
    id: string;
    company: string;
    title: string;
    location: string | null;
    startDate: Date | null;
    endDate: Date | null;
    text: string;
    tags: string[];
  };
  isFirst?: boolean;
  isLast?: boolean;
}

export function AchievementCard({ achievement, isFirst = false, isLast = false }: AchievementCardProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const startFormatted = formatDate(achievement.startDate);
  const endFormatted = formatDate(achievement.endDate) || 'Present';
  const dateRange = startFormatted ? `${startFormatted} — ${endFormatted}` : null;

  return (
    <div className="group relative pl-8 pb-8 last:pb-0">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[7px] top-3 bottom-0 w-px bg-gradient-to-b from-editorial-line via-editorial-line to-transparent" />
      )}

      {/* Timeline dot */}
      <div className={cn(
        "absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full border-2 transition-all duration-300",
        "border-editorial-line bg-background",
        "group-hover:border-editorial-accent group-hover:bg-editorial-accent-muted"
      )} />

      {/* Content */}
      <div className={cn(
        "relative rounded-lg p-5 -ml-1 transition-all duration-300",
        "bg-transparent hover:bg-card",
        "border border-transparent hover:border-border hover:shadow-sm"
      )}>
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
          <div>
            <h4 className="font-medium text-foreground leading-snug">
              {achievement.title}
            </h4>
            {achievement.location && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {achievement.location}
              </p>
            )}
          </div>
          {dateRange && (
            <span className="text-xs text-muted-foreground font-medium tracking-wide uppercase shrink-0">
              {dateRange}
            </span>
          )}
        </div>

        {/* Achievement text */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {achievement.text}
        </p>

        {/* Tags */}
        {achievement.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {achievement.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className={cn(
                  "text-xs font-normal px-2.5 py-0.5",
                  "bg-secondary/60 hover:bg-editorial-accent-muted",
                  "border border-transparent hover:border-editorial-accent/20",
                  "transition-all duration-200"
                )}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
