'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Achievement {
  id: string;
  text: string;
  tags: string[];
}

interface Role {
  id: string;
  company: string;
  title: string;
  location: string | null;
  startDate: Date | null;
  endDate: Date | null;
  summary: string | null;
  achievements: Achievement[];
}

interface RoleCardProps {
  role: Role;
}

export function RoleCard({ role }: RoleCardProps) {
  const [expanded, setExpanded] = useState(true);

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  const dateRange = role.startDate
    ? `${formatDate(role.startDate)} - ${role.endDate ? formatDate(role.endDate) : 'Present'}`
    : '';

  return (
    <div className="border-l-2 border-editorial-line pl-4 py-2">
      <div
        className="flex items-start justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-2">
          <button className="mt-1 text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <div>
            <h4 className="font-medium text-foreground">{role.title}</h4>
            <p className="text-sm text-muted-foreground">
              {role.company}
              {role.location && ` \u00B7 ${role.location}`}
              {dateRange && ` \u00B7 ${dateRange}`}
            </p>
            {role.summary && (
              <p className="text-sm italic text-muted-foreground mt-1">{role.summary}</p>
            )}
          </div>
        </div>
      </div>

      {expanded && role.achievements.length > 0 && (
        <div className="mt-3 ml-6 space-y-3">
          {role.achievements.map((achievement) => (
            <div key={achievement.id} className="group">
              <p className="text-sm text-foreground leading-relaxed">
                <span className="text-muted-foreground mr-1">&bull;</span>
                {achievement.text}
              </p>
              {achievement.tags.length > 0 && (
                <div className="flex gap-1.5 mt-1.5 flex-wrap ml-3">
                  {achievement.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className={cn(
                        'text-xs font-normal px-2 py-0.5',
                        'bg-secondary/60 hover:bg-editorial-accent-muted',
                        'border border-transparent hover:border-editorial-accent/20',
                        'transition-all duration-200'
                      )}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
