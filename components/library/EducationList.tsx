'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { GraduationCap, Plus, Pencil, Trash2, Check, X } from 'lucide-react';

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
  onAdd?: (data: Omit<Education, 'id'>) => Promise<void>;
  onUpdate?: (id: string, data: Partial<Education>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

interface FormData {
  institution: string;
  degree: string;
  field: string;
  location: string;
  startDate: string;
  endDate: string;
  isPresent: boolean;
  gpa: string;
  honors: string;
  activities: string;
}

const emptyFormData: FormData = {
  institution: '',
  degree: '',
  field: '',
  location: '',
  startDate: '',
  endDate: '',
  isPresent: false,
  gpa: '',
  honors: '',
  activities: '',
};

function formatDate(date: Date | null): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric' });
}

function dateToMonthInput(date: Date | null): string {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function monthInputToDate(monthStr: string): Date | null {
  if (!monthStr) return null;
  const [year, month] = monthStr.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

function activitiesToString(activities: string[]): string {
  return activities.join(', ');
}

function stringToActivities(str: string): string[] {
  if (!str.trim()) return [];
  // Split by comma or newline
  return str
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function EducationList({ education, onAdd, onUpdate, onDelete }: EducationListProps) {
  const [addingNew, setAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyFormData);
  const [saving, setSaving] = useState(false);

  const startAdding = () => {
    setAddingNew(true);
    setFormData(emptyFormData);
  };

  const cancelAdding = () => {
    setAddingNew(false);
    setFormData(emptyFormData);
  };

  const startEditing = (edu: Education) => {
    setEditingId(edu.id);
    setFormData({
      institution: edu.institution,
      degree: edu.degree,
      field: edu.field || '',
      location: edu.location || '',
      startDate: dateToMonthInput(edu.startDate),
      endDate: dateToMonthInput(edu.endDate),
      isPresent: edu.startDate !== null && edu.endDate === null,
      gpa: edu.gpa || '',
      honors: edu.honors || '',
      activities: activitiesToString(edu.activities),
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setFormData(emptyFormData);
  };

  const handleAdd = async () => {
    if (!onAdd || !formData.institution.trim() || !formData.degree.trim()) return;
    setSaving(true);
    try {
      await onAdd({
        institution: formData.institution.trim(),
        degree: formData.degree.trim(),
        field: formData.field.trim() || null,
        location: formData.location.trim() || null,
        startDate: monthInputToDate(formData.startDate),
        endDate: formData.isPresent ? null : monthInputToDate(formData.endDate),
        gpa: formData.gpa.trim() || null,
        honors: formData.honors.trim() || null,
        activities: stringToActivities(formData.activities),
      });
      setFormData(emptyFormData);
      setAddingNew(false);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!onUpdate || !editingId || !formData.institution.trim() || !formData.degree.trim()) return;
    setSaving(true);
    try {
      await onUpdate(editingId, {
        institution: formData.institution.trim(),
        degree: formData.degree.trim(),
        field: formData.field.trim() || null,
        location: formData.location.trim() || null,
        startDate: monthInputToDate(formData.startDate),
        endDate: formData.isPresent ? null : monthInputToDate(formData.endDate),
        gpa: formData.gpa.trim() || null,
        honors: formData.honors.trim() || null,
        activities: stringToActivities(formData.activities),
      });
      setEditingId(null);
      setFormData(emptyFormData);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !deleteId) return;
    setSaving(true);
    try {
      await onDelete(deleteId);
      setDeleteId(null);
    } finally {
      setSaving(false);
    }
  };

  const educationToDelete = deleteId ? education.find((e) => e.id === deleteId) : null;

  // Inline form component for add/edit
  const EducationForm = ({
    onSave,
    onCancel,
    isNew = false,
  }: {
    onSave: () => void;
    onCancel: () => void;
    isNew?: boolean;
  }) => (
    <div className="border border-editorial-accent/30 bg-editorial-accent-muted/5 rounded-lg p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Institution */}
        <div className="space-y-1.5">
          <Label htmlFor="institution" className="text-sm font-medium">
            Institution *
          </Label>
          <Input
            id="institution"
            placeholder="e.g., Stanford University"
            value={formData.institution}
            onChange={(e) => setFormData((prev) => ({ ...prev, institution: e.target.value }))}
            autoFocus
          />
        </div>

        {/* Degree */}
        <div className="space-y-1.5">
          <Label htmlFor="degree" className="text-sm font-medium">
            Degree *
          </Label>
          <Input
            id="degree"
            placeholder="e.g., Bachelor of Science"
            value={formData.degree}
            onChange={(e) => setFormData((prev) => ({ ...prev, degree: e.target.value }))}
          />
        </div>

        {/* Field */}
        <div className="space-y-1.5">
          <Label htmlFor="field" className="text-sm font-medium">
            Field of Study
          </Label>
          <Input
            id="field"
            placeholder="e.g., Computer Science"
            value={formData.field}
            onChange={(e) => setFormData((prev) => ({ ...prev, field: e.target.value }))}
          />
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          <Label htmlFor="location" className="text-sm font-medium">
            Location
          </Label>
          <Input
            id="location"
            placeholder="e.g., Stanford, CA"
            value={formData.location}
            onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
          />
        </div>

        {/* Start Date */}
        <div className="space-y-1.5">
          <Label htmlFor="startDate" className="text-sm font-medium">
            Start Date
          </Label>
          <Input
            id="startDate"
            type="month"
            value={formData.startDate}
            onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
          />
        </div>

        {/* End Date */}
        <div className="space-y-1.5">
          <Label htmlFor="endDate" className="text-sm font-medium">
            End Date
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="endDate"
              type="month"
              value={formData.endDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
              disabled={formData.isPresent}
              className={cn(formData.isPresent && 'opacity-50')}
            />
            <div className="flex items-center gap-2 shrink-0">
              <Checkbox
                id="isPresent"
                checked={formData.isPresent}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    isPresent: !!checked,
                    endDate: checked ? '' : prev.endDate,
                  }))
                }
              />
              <Label htmlFor="isPresent" className="text-sm cursor-pointer">
                Present
              </Label>
            </div>
          </div>
        </div>

        {/* GPA */}
        <div className="space-y-1.5">
          <Label htmlFor="gpa" className="text-sm font-medium">
            GPA
          </Label>
          <Input
            id="gpa"
            placeholder="e.g., 3.8/4.0"
            value={formData.gpa}
            onChange={(e) => setFormData((prev) => ({ ...prev, gpa: e.target.value }))}
          />
        </div>

        {/* Honors */}
        <div className="space-y-1.5">
          <Label htmlFor="honors" className="text-sm font-medium">
            Honors
          </Label>
          <Input
            id="honors"
            placeholder="e.g., Cum Laude"
            value={formData.honors}
            onChange={(e) => setFormData((prev) => ({ ...prev, honors: e.target.value }))}
          />
        </div>

        {/* Activities - full width */}
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="activities" className="text-sm font-medium">
            Activities & Achievements
          </Label>
          <Textarea
            id="activities"
            placeholder="Enter activities separated by commas or new lines&#10;e.g., Dean's List, Computer Science Club President, Teaching Assistant"
            value={formData.activities}
            onChange={(e) => setFormData((prev) => ({ ...prev, activities: e.target.value }))}
            rows={3}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-editorial-line/30">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          <X size={14} className="mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={saving || !formData.institution.trim() || !formData.degree.trim()}
        >
          <Check size={14} className="mr-1" />
          {isNew ? 'Add Education' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Add button */}
      {onAdd && !addingNew && (
        <Button variant="outline" size="sm" onClick={startAdding}>
          <Plus size={14} className="mr-1" />
          Add Education
        </Button>
      )}

      {/* Add form */}
      {addingNew && <EducationForm onSave={handleAdd} onCancel={cancelAdding} isNew />}

      {education.length === 0 && !addingNew ? (
        <p className="text-sm text-muted-foreground italic">
          No education entries in your library yet.
        </p>
      ) : (
        education.map((edu, index) => {
          if (editingId === edu.id) {
            return <EducationForm key={edu.id} onSave={handleUpdate} onCancel={cancelEditing} />;
          }

          const startYear = formatDate(edu.startDate);
          const endYear = edu.endDate
            ? formatDate(edu.endDate)
            : edu.startDate
              ? 'Present'
              : '';
          const dateRange = startYear ? `${startYear} — ${endYear}` : '';

          return (
            <div
              key={edu.id}
              className={cn(
                'group relative pl-8 animate-in fade-in slide-in-from-bottom-1 duration-500',
                index < education.length - 1 && 'pb-6 border-b border-editorial-line/50'
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Icon */}
              <div
                className={cn(
                  'absolute left-0 top-1 p-1.5 rounded-lg transition-all duration-300',
                  'bg-secondary/50 group-hover:bg-editorial-accent-muted',
                  'text-muted-foreground group-hover:text-editorial-accent'
                )}
              >
                <GraduationCap className="h-4 w-4" />
              </div>

              {/* Content */}
              <div>
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-2">
                  <div className="flex-1">
                    <h3 className="font-serif text-lg font-medium text-foreground leading-snug">
                      {edu.institution}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {edu.degree}
                      {edu.field && <span className="text-foreground/80"> in {edu.field}</span>}
                    </p>
                  </div>
                  <div className="flex items-start gap-2 shrink-0">
                    {dateRange && (
                      <span className="text-xs text-muted-foreground font-medium tracking-wide uppercase mt-1 sm:mt-0">
                        {dateRange}
                      </span>
                    )}

                    {/* Edit/Delete actions - appear on hover */}
                    {(onUpdate || onDelete) && (
                      <div className="hidden group-hover:flex items-center gap-1 ml-2">
                        {onUpdate && (
                          <button
                            onClick={() => startEditing(edu)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => setDeleteId(edu.id)}
                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Location */}
                {edu.location && (
                  <p className="text-xs text-muted-foreground mb-3">{edu.location}</p>
                )}

                {/* Badges - GPA and honors */}
                {(edu.gpa || edu.honors) && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {edu.gpa && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs font-normal',
                          'border-editorial-accent/30 text-editorial-accent bg-editorial-accent/5'
                        )}
                      >
                        GPA: {edu.gpa}
                      </Badge>
                    )}
                    {edu.honors && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-xs font-normal',
                          'bg-secondary/60 hover:bg-editorial-accent-muted',
                          'transition-colors duration-200'
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
        })
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Education</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete your education entry from &quot;
              {educationToDelete?.institution}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
