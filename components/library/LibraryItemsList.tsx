'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Briefcase, Award, FileText, FolderKanban, Lightbulb } from 'lucide-react';

interface LibraryItem {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  date: string | null;
  location: string | null;
  bullets: string[];
  tags: string[];
  url: string | null;
}

interface LibraryItemsListProps {
  items: LibraryItem[];
  type: string;
}

function getTypeIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'project':
      return FolderKanban;
    case 'publication':
      return FileText;
    case 'certification':
      return Award;
    case 'award':
      return Award;
    case 'volunteer':
      return Lightbulb;
    default:
      return Briefcase;
  }
}

function getTypeLabel(type: string): string {
  // Capitalize and pluralize
  const singular = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  if (singular.endsWith('s')) return singular;
  return singular + 's';
}

export function LibraryItemsList({ items, type }: LibraryItemsListProps) {
  const Icon = getTypeIcon(type);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No {type.toLowerCase()} entries in your library yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {items.map((item, index) => (
        <div
          key={item.id}
          className={cn(
            "group relative pl-8 animate-in fade-in slide-in-from-bottom-1 duration-500",
            index < items.length - 1 && "pb-6 border-b border-editorial-line/50"
          )}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {/* Icon */}
          <div className={cn(
            "absolute left-0 top-1 p-1.5 rounded-lg transition-all duration-300",
            "bg-secondary/50 group-hover:bg-editorial-accent-muted",
            "text-muted-foreground group-hover:text-editorial-accent"
          )}>
            <Icon className="h-4 w-4" />
          </div>

          {/* Content */}
          <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-2">
              <div>
                <h3 className="font-serif text-lg font-medium text-foreground leading-snug">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-editorial-accent transition-colors"
                    >
                      {item.title}
                    </a>
                  ) : (
                    item.title
                  )}
                </h3>
                {item.subtitle && (
                  <p className="text-sm text-muted-foreground">
                    {item.subtitle}
                  </p>
                )}
              </div>
              {item.date && (
                <span className="text-xs text-muted-foreground font-medium tracking-wide uppercase shrink-0 mt-1 sm:mt-0">
                  {item.date}
                </span>
              )}
            </div>

            {/* Location */}
            {item.location && (
              <p className="text-xs text-muted-foreground mb-3">
                {item.location}
              </p>
            )}

            {/* Bullets */}
            {item.bullets.length > 0 && (
              <ul className="text-sm text-muted-foreground space-y-1 mb-3">
                {item.bullets.map((bullet, i) => (
                  <li key={i} className="leading-relaxed">
                    {bullet}
                  </li>
                ))}
              </ul>
            )}

            {/* Tags */}
            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className={cn(
                      "text-xs font-normal px-2 py-0.5",
                      "bg-secondary/60 hover:bg-editorial-accent-muted",
                      "transition-colors duration-200"
                    )}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export { getTypeLabel };
