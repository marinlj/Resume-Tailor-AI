'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  count?: number;
  className?: string;
  onAdd?: () => void;
  addLabel?: string;
}

export function SectionHeader({
  title,
  count,
  className,
  onAdd,
  addLabel = 'Add',
}: SectionHeaderProps) {
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
      {onAdd && (
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus size={14} className="mr-1" />
          {addLabel}
        </Button>
      )}
    </div>
  );
}
