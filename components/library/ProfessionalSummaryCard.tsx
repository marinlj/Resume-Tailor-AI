'use client';

import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ProfessionalSummaryCardProps {
  summary: string | null;
  onSave: (summary: string) => Promise<void>;
}

export function ProfessionalSummaryCard({ summary, onSave }: ProfessionalSummaryCardProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(summary || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(value);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(summary || '');
    setEditing(false);
  };

  return (
    <div className="mb-8 p-4 border border-editorial-line rounded-lg bg-gradient-to-b from-editorial-accent-muted/5 to-transparent">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-serif text-lg font-medium">Professional Summary</h3>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil size={14} className="mr-1" />
            Edit
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Write a 2-4 sentence professional summary that highlights your key expertise and career focus..."
            rows={4}
            className="resize-none"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Check size={14} className="mr-1" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X size={14} className="mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {summary || 'No professional summary yet. Click edit to add one.'}
        </p>
      )}
    </div>
  );
}
