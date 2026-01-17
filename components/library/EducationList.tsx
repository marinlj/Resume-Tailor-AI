'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { GraduationCap } from 'lucide-react';

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

interface EducationListProps {
  education: Education[];
}

function formatDate(date: Date | null): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric' });
}

export function EducationList({ education }: EducationListProps) {
  if (education.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No education entries in your library yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {education.map((edu, index) => {
        const startYear = formatDate(edu.startDate);
        const endYear = edu.endDate ? formatDate(edu.endDate) : edu.startDate ? 'Present' : '';
        const dateRange = startYear ? `${startYear} — ${endYear}` : '';

        return (
          <div
            key={edu.id}
            className={cn(
              "group relative pl-8 animate-in fade-in slide-in-from-bottom-1 duration-500",
              index < education.length - 1 && "pb-6 border-b border-editorial-line/50"
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Icon */}
            <div className={cn(
              "absolute left-0 top-1 p-1.5 rounded-lg transition-all duration-300",
              "bg-secondary/50 group-hover:bg-editorial-accent-muted",
              "text-muted-foreground group-hover:text-editorial-accent"
            )}>
              <GraduationCap className="h-4 w-4" />
            </div>

            {/* Content */}
            <div>
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-2">
                <div>
                  <h3 className="font-serif text-lg font-medium text-foreground leading-snug">
                    {edu.institution}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {edu.degree}
                    {edu.field && (
                      <span className="text-foreground/80"> in {edu.field}</span>
                    )}
                  </p>
                </div>
                {dateRange && (
                  <span className="text-xs text-muted-foreground font-medium tracking-wide uppercase shrink-0 mt-1 sm:mt-0">
                    {dateRange}
                  </span>
                )}
              </div>

              {/* Location */}
              {edu.location && (
                <p className="text-xs text-muted-foreground mb-3">
                  {edu.location}
                </p>
              )}

              {/* Badges - GPA and honors */}
              {(edu.gpa || edu.honors) && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {edu.gpa && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-normal",
                        "border-editorial-accent/30 text-editorial-accent bg-editorial-accent/5"
                      )}
                    >
                      GPA: {edu.gpa}
                    </Badge>
                  )}
                  {edu.honors && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs font-normal",
                        "bg-secondary/60 hover:bg-editorial-accent-muted",
                        "transition-colors duration-200"
                      )}
                    >
                      {edu.honors}
                    </Badge>
                  )}
                </div>
              )}

              {/* Activities */}
              {edu.activities.length > 0 && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {edu.activities.join(' · ')}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
