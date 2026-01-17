'use client';

import { cn } from '@/lib/utils';

interface Skill {
  id: string;
  name: string;
  category: string | null;
  level: string | null;
}

interface SkillsListProps {
  skills: Skill[];
}

const levelColors: Record<string, string> = {
  expert: 'bg-editorial-accent/20 text-editorial-accent border-editorial-accent/30',
  advanced: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  intermediate: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  beginner: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
};

function getLevelColor(level: string | null): string {
  if (!level) return 'bg-secondary/60 text-muted-foreground border-border';
  return levelColors[level.toLowerCase()] || 'bg-secondary/60 text-muted-foreground border-border';
}

export function SkillsList({ skills }: SkillsListProps) {
  if (skills.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No skills in your library yet.
      </p>
    );
  }

  // Group by category
  const grouped = skills.reduce<Record<string, Skill[]>>((acc, skill) => {
    const category = skill.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(skill);
    return acc;
  }, {});

  // Sort categories to put "Other" last
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6">
      {sortedCategories.map((category, categoryIndex) => (
        <div
          key={category}
          className="animate-in fade-in slide-in-from-bottom-1 duration-500"
          style={{ animationDelay: `${categoryIndex * 100}ms` }}
        >
          {/* Category header with decorative line */}
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-sm font-medium text-foreground tracking-wide">
              {category}
            </h3>
            <div className="h-px flex-1 bg-gradient-to-r from-editorial-line to-transparent" />
          </div>

          {/* Skills grid */}
          <div className="flex flex-wrap gap-2">
            {grouped[category].map((skill, skillIndex) => (
              <div
                key={skill.id}
                className={cn(
                  "group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm",
                  "border transition-all duration-200",
                  "hover:shadow-sm hover:scale-[1.02]",
                  getLevelColor(skill.level)
                )}
                style={{ animationDelay: `${(categoryIndex * 100) + (skillIndex * 30)}ms` }}
              >
                <span className="font-medium">{skill.name}</span>
                {skill.level && (
                  <span className="text-xs opacity-70 font-normal">
                    · {skill.level}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
