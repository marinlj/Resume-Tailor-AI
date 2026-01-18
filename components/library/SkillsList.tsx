'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface Skill {
  id: string;
  name: string;
  category: string | null;
  level: string | null;
}

interface SkillsListProps {
  skills: Skill[];
  onAdd?: (skill: { name: string; category?: string; level?: string }) => Promise<void>;
  onUpdate?: (id: string, skill: { name: string; category?: string; level?: string }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const levelColors: Record<string, string> = {
  expert: 'bg-editorial-accent/20 text-editorial-accent border-editorial-accent/30',
  advanced: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  intermediate: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  beginner: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
};

const categoryOptions = ['Technical', 'Soft Skills', 'Languages', 'Tools', 'Other'];
const levelOptions = ['Expert', 'Advanced', 'Intermediate', 'Beginner'];

function getLevelColor(level: string | null): string {
  if (!level) return 'bg-secondary/60 text-muted-foreground border-border';
  return levelColors[level.toLowerCase()] || 'bg-secondary/60 text-muted-foreground border-border';
}

export function SkillsList({ skills, onAdd, onUpdate, onDelete }: SkillsListProps) {
  const [addingSkill, setAddingSkill] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', category: '', level: '' });
  const [saving, setSaving] = useState(false);

  const startEditing = (skill: Skill) => {
    setEditingId(skill.id);
    setFormData({
      name: skill.name,
      category: skill.category || '',
      level: skill.level || '',
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setFormData({ name: '', category: '', level: '' });
  };

  const cancelAdding = () => {
    setAddingSkill(false);
    setFormData({ name: '', category: '', level: '' });
  };

  const handleAdd = async () => {
    if (!onAdd || !formData.name.trim()) return;
    setSaving(true);
    try {
      await onAdd({
        name: formData.name.trim(),
        category: formData.category || undefined,
        level: formData.level || undefined,
      });
      setFormData({ name: '', category: '', level: '' });
      setAddingSkill(false);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!onUpdate || !editingId || !formData.name.trim()) return;
    setSaving(true);
    try {
      await onUpdate(editingId, {
        name: formData.name.trim(),
        category: formData.category || undefined,
        level: formData.level || undefined,
      });
      setEditingId(null);
      setFormData({ name: '', category: '', level: '' });
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

  const skillToDelete = deleteId ? skills.find((s) => s.id === deleteId) : null;

  // Inline form component for add/edit
  const SkillForm = ({
    onSave,
    onCancel,
    isNew = false,
  }: {
    onSave: () => void;
    onCancel: () => void;
    isNew?: boolean;
  }) => (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border bg-muted/30">
      <Input
        placeholder="Skill name *"
        value={formData.name}
        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
        className="w-40 h-8 text-sm"
        autoFocus
      />
      <Select
        value={formData.category}
        onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
      >
        <SelectTrigger className="w-32 h-8 text-sm">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {categoryOptions.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={formData.level}
        onValueChange={(value) => setFormData((prev) => ({ ...prev, level: value }))}
      >
        <SelectTrigger className="w-32 h-8 text-sm">
          <SelectValue placeholder="Level" />
        </SelectTrigger>
        <SelectContent>
          {levelOptions.map((lvl) => (
            <SelectItem key={lvl} value={lvl}>
              {lvl}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={onSave}
          disabled={saving || !formData.name.trim()}
          className="h-8 px-2"
        >
          <Check size={14} className="mr-1" />
          {isNew ? 'Add' : 'Save'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving} className="h-8 px-2">
          <X size={14} className="mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  );

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
      {/* Add button */}
      {onAdd && !addingSkill && (
        <Button variant="outline" size="sm" onClick={() => setAddingSkill(true)}>
          <Plus size={14} className="mr-1" />
          Add Skill
        </Button>
      )}

      {/* Add form */}
      {addingSkill && <SkillForm onSave={handleAdd} onCancel={cancelAdding} isNew />}

      {skills.length === 0 && !addingSkill ? (
        <p className="text-sm text-muted-foreground italic">No skills in your library yet.</p>
      ) : (
        sortedCategories.map((category, categoryIndex) => (
          <div
            key={category}
            className="animate-in fade-in slide-in-from-bottom-1 duration-500"
            style={{ animationDelay: `${categoryIndex * 100}ms` }}
          >
            {/* Category header with decorative line */}
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-sm font-medium text-foreground tracking-wide">{category}</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-editorial-line to-transparent" />
            </div>

            {/* Skills grid */}
            <div className="flex flex-wrap gap-2">
              {grouped[category].map((skill, skillIndex) =>
                editingId === skill.id ? (
                  <SkillForm key={skill.id} onSave={handleUpdate} onCancel={cancelEditing} />
                ) : (
                  <div
                    key={skill.id}
                    className={cn(
                      'group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm',
                      'border transition-all duration-200',
                      'hover:shadow-sm hover:scale-[1.02]',
                      getLevelColor(skill.level)
                    )}
                    style={{ animationDelay: `${categoryIndex * 100 + skillIndex * 30}ms` }}
                  >
                    <span className="font-medium">{skill.name}</span>
                    {skill.level && (
                      <span className="text-xs opacity-70 font-normal">· {skill.level}</span>
                    )}

                    {(onUpdate || onDelete) && (
                      <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-0.5 bg-background rounded-full shadow-sm border p-0.5">
                        {onUpdate && (
                          <button
                            onClick={() => startEditing(skill)}
                            className="p-1 hover:text-foreground text-muted-foreground transition-colors"
                          >
                            <Pencil size={12} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => setDeleteId(skill.id)}
                            className="p-1 hover:text-destructive text-muted-foreground transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        ))
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Skill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{skillToDelete?.name}&quot;? This action cannot
              be undone.
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
