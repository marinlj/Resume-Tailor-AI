'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Briefcase,
  Award,
  FileText,
  FolderKanban,
  Lightbulb,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react';

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
  onAdd?: (data: Omit<LibraryItem, 'id'>) => Promise<void>;
  onUpdate?: (id: string, data: Partial<LibraryItem>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

interface FormData {
  title: string;
  subtitle: string;
  date: string;
  location: string;
  url: string;
  bullets: string;
  tags: string;
}

const emptyFormData: FormData = {
  title: '',
  subtitle: '',
  date: '',
  location: '',
  url: '',
  bullets: '',
  tags: '',
};

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

function getSingularLabel(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

function itemToFormData(item: LibraryItem): FormData {
  return {
    title: item.title,
    subtitle: item.subtitle || '',
    date: item.date || '',
    location: item.location || '',
    url: item.url || '',
    bullets: item.bullets.join('\n'),
    tags: item.tags.join(', '),
  };
}

function formDataToItem(formData: FormData, type: string): Omit<LibraryItem, 'id'> {
  return {
    type,
    title: formData.title,
    subtitle: formData.subtitle || null,
    date: formData.date || null,
    location: formData.location || null,
    url: formData.url || null,
    bullets: formData.bullets
      .split('\n')
      .map((b) => b.trim())
      .filter((b) => b.length > 0),
    tags: formData.tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0),
  };
}

interface InlineFormProps {
  formData: FormData;
  onChange: (data: FormData) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isNew?: boolean;
}

function InlineForm({
  formData,
  onChange,
  onSave,
  onCancel,
  saving,
  isNew,
}: InlineFormProps) {
  const handleChange = (field: keyof FormData, value: string) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <div className="border border-editorial-accent/30 bg-editorial-accent-muted/5 rounded-lg p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title */}
        <div className="space-y-1.5">
          <Label htmlFor="title" className="text-sm font-medium">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Project name, certification title, etc."
            required
          />
        </div>

        {/* Subtitle */}
        <div className="space-y-1.5">
          <Label htmlFor="subtitle" className="text-sm font-medium">
            Subtitle
          </Label>
          <Input
            id="subtitle"
            value={formData.subtitle}
            onChange={(e) => handleChange('subtitle', e.target.value)}
            placeholder="Organization, role, issuer..."
          />
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <Label htmlFor="date" className="text-sm font-medium">
            Date
          </Label>
          <Input
            id="date"
            value={formData.date}
            onChange={(e) => handleChange('date', e.target.value)}
            placeholder="e.g., 2024, Jan 2024, 2022-2024"
          />
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          <Label htmlFor="location" className="text-sm font-medium">
            Location
          </Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="City, State or Remote"
          />
        </div>

        {/* URL */}
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="url" className="text-sm font-medium">
            URL
          </Label>
          <Input
            id="url"
            type="url"
            value={formData.url}
            onChange={(e) => handleChange('url', e.target.value)}
            placeholder="https://..."
          />
        </div>

        {/* Bullets */}
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="bullets" className="text-sm font-medium">
            Description (one bullet per line)
          </Label>
          <Textarea
            id="bullets"
            value={formData.bullets}
            onChange={(e) => handleChange('bullets', e.target.value)}
            placeholder="Describe key achievements or details..."
            rows={4}
          />
        </div>

        {/* Tags */}
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="tags" className="text-sm font-medium">
            Tags (comma-separated)
          </Label>
          <Input
            id="tags"
            value={formData.tags}
            onChange={(e) => handleChange('tags', e.target.value)}
            placeholder="React, TypeScript, Leadership..."
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={saving || !formData.title.trim()}
        >
          <Check className="h-4 w-4 mr-1" />
          {saving ? 'Saving...' : isNew ? 'Add' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

export function LibraryItemsList({
  items,
  type,
  onAdd,
  onUpdate,
  onDelete,
}: LibraryItemsListProps) {
  const Icon = getTypeIcon(type);
  const singularLabel = getSingularLabel(type);

  const [addingNew, setAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyFormData);
  const [saving, setSaving] = useState(false);

  const handleStartAdd = () => {
    setAddingNew(true);
    setEditingId(null);
    setFormData(emptyFormData);
  };

  const handleStartEdit = (item: LibraryItem) => {
    setEditingId(item.id);
    setAddingNew(false);
    setFormData(itemToFormData(item));
  };

  const handleCancel = () => {
    setAddingNew(false);
    setEditingId(null);
    setFormData(emptyFormData);
  };

  const handleSaveNew = async () => {
    if (!onAdd || !formData.title.trim()) return;
    setSaving(true);
    try {
      await onAdd(formDataToItem(formData, type));
      setAddingNew(false);
      setFormData(emptyFormData);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!onUpdate || !editingId || !formData.title.trim()) return;
    setSaving(true);
    try {
      const data = formDataToItem(formData, type);
      await onUpdate(editingId, data);
      setEditingId(null);
      setFormData(emptyFormData);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!onDelete || !deleteId) return;
    setSaving(true);
    try {
      await onDelete(deleteId);
      setDeleteId(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Button */}
      {onAdd && !addingNew && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleStartAdd}
          className="mb-4"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add {singularLabel}
        </Button>
      )}

      {/* Add Form */}
      {addingNew && (
        <InlineForm
          formData={formData}
          onChange={setFormData}
          onSave={handleSaveNew}
          onCancel={handleCancel}
          saving={saving}
          isNew
        />
      )}

      {/* Empty State */}
      {items.length === 0 && !addingNew && (
        <p className="text-sm text-muted-foreground italic">
          No {type.toLowerCase()} entries in your library yet.
        </p>
      )}

      {/* Items List */}
      {items.map((item, index) => (
        <div key={item.id}>
          {editingId === item.id ? (
            <InlineForm
              formData={formData}
              onChange={setFormData}
              onSave={handleSaveEdit}
              onCancel={handleCancel}
              saving={saving}
            />
          ) : (
            <div
              className={cn(
                'group relative pl-8 animate-in fade-in slide-in-from-bottom-1 duration-500',
                index < items.length - 1 &&
                  'pb-6 border-b border-editorial-line/50'
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
                <Icon className="h-4 w-4" />
              </div>

              {/* Content */}
              <div>
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
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
                      {/* Edit/Delete Actions */}
                      {(onUpdate || onDelete) && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onUpdate && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleStartEdit(item)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="sr-only">Edit</span>
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
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
                          'text-xs font-normal px-2 py-0.5',
                          'bg-secondary/60 hover:bg-editorial-accent-muted',
                          'transition-colors duration-200'
                        )}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {singularLabel}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this{' '}
              {singularLabel.toLowerCase()} from your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export { getTypeLabel };
