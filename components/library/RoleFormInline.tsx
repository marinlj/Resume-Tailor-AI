'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface RoleFormData {
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  isPresent: boolean;
}

interface RoleFormInlineProps {
  onSave: (data: {
    company: string;
    title: string;
    location: string | null;
    startDate: Date | null;
    endDate: Date | null;
  }) => Promise<void>;
  onCancel: () => void;
}

function parseDateFromInput(value: string): Date | null {
  if (!value) return null;
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

export function RoleFormInline({ onSave, onCancel }: RoleFormInlineProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<RoleFormData>({
    company: '',
    title: '',
    location: '',
    startDate: '',
    endDate: '',
    isPresent: true,
  });

  const handleSave = async () => {
    if (!formData.company.trim() || !formData.title.trim()) return;
    setSaving(true);
    try {
      await onSave({
        company: formData.company.trim(),
        title: formData.title.trim(),
        location: formData.location.trim() || null,
        startDate: parseDateFromInput(formData.startDate),
        endDate: formData.isPresent ? null : parseDateFromInput(formData.endDate),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-editorial-accent/30 bg-editorial-accent-muted/5 rounded-lg p-4 mb-4">
      <h3 className="font-serif text-lg font-medium mb-4">Add New Role</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="role-title" className="text-sm font-medium">
            Job Title *
          </Label>
          <Input
            id="role-title"
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="e.g., Software Engineer"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role-company" className="text-sm font-medium">
            Company *
          </Label>
          <Input
            id="role-company"
            value={formData.company}
            onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))}
            placeholder="e.g., Acme Corp"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role-location" className="text-sm font-medium">
            Location
          </Label>
          <Input
            id="role-location"
            value={formData.location}
            onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
            placeholder="e.g., San Francisco, CA"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role-start" className="text-sm font-medium">
            Start Date
          </Label>
          <Input
            id="role-start"
            type="month"
            value={formData.startDate}
            onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role-end" className="text-sm font-medium">
            End Date
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="role-end"
              type="month"
              value={formData.endDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
              disabled={formData.isPresent}
              className={formData.isPresent ? 'opacity-50' : ''}
            />
            <div className="flex items-center gap-2 shrink-0">
              <Checkbox
                id="role-present"
                checked={formData.isPresent}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    isPresent: !!checked,
                    endDate: checked ? '' : prev.endDate,
                  }))
                }
              />
              <Label htmlFor="role-present" className="text-sm cursor-pointer">
                Present
              </Label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-editorial-line/30">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          <X size={14} className="mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !formData.company.trim() || !formData.title.trim()}
        >
          <Check size={14} className="mr-1" />
          {saving ? 'Adding...' : 'Add Role'}
        </Button>
      </div>
    </div>
  );
}
