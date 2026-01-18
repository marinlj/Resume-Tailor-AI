'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Pencil, Trash2, Plus, Check, X } from 'lucide-react';
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
  onUpdateRole?: (id: string, data: Partial<Role>) => Promise<void>;
  onDeleteRole?: (id: string) => Promise<void>;
  onAddAchievement?: (roleId: string, data: { text: string; tags: string[] }) => Promise<void>;
  onUpdateAchievement?: (id: string, data: { text: string; tags: string[] }) => Promise<void>;
  onDeleteAchievement?: (id: string) => Promise<void>;
}

export function RoleCard({
  role,
  onUpdateRole,
  onDeleteRole,
  onAddAchievement,
  onUpdateAchievement,
  onDeleteAchievement,
}: RoleCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [editingRole, setEditingRole] = useState(false);
  const [editingSummary, setEditingSummary] = useState(false);
  const [addingAchievement, setAddingAchievement] = useState(false);
  const [editingAchievementId, setEditingAchievementId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'role' | 'achievement'; id: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Role edit form state
  const [roleFormData, setRoleFormData] = useState({
    company: role.company,
    title: role.title,
    location: role.location || '',
    startDate: role.startDate ? formatDateForInput(role.startDate) : '',
    endDate: role.endDate ? formatDateForInput(role.endDate) : '',
    isPresent: !role.endDate,
  });

  // Summary edit state
  const [summaryValue, setSummaryValue] = useState(role.summary || '');

  // Achievement form state
  const [achievementFormData, setAchievementFormData] = useState({ text: '', tags: '' });

  function formatDateForInput(date: Date | null): string {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function parseDateFromInput(value: string): Date | null {
    if (!value) return null;
    const [year, month] = value.split('-').map(Number);
    return new Date(year, month - 1, 1);
  }

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  const dateRange = role.startDate
    ? `${formatDate(role.startDate)} - ${role.endDate ? formatDate(role.endDate) : 'Present'}`
    : '';

  // Handlers
  const handleSaveRole = async () => {
    if (!onUpdateRole || !roleFormData.company.trim() || !roleFormData.title.trim()) return;
    setSaving(true);
    try {
      await onUpdateRole(role.id, {
        company: roleFormData.company.trim(),
        title: roleFormData.title.trim(),
        location: roleFormData.location.trim() || null,
        startDate: parseDateFromInput(roleFormData.startDate),
        endDate: roleFormData.isPresent ? null : parseDateFromInput(roleFormData.endDate),
      });
      setEditingRole(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelRoleEdit = () => {
    setRoleFormData({
      company: role.company,
      title: role.title,
      location: role.location || '',
      startDate: role.startDate ? formatDateForInput(role.startDate) : '',
      endDate: role.endDate ? formatDateForInput(role.endDate) : '',
      isPresent: !role.endDate,
    });
    setEditingRole(false);
  };

  const handleSaveSummary = async () => {
    if (!onUpdateRole) return;
    setSaving(true);
    try {
      await onUpdateRole(role.id, { summary: summaryValue.trim() || null });
      setEditingSummary(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAchievement = async () => {
    if (!onAddAchievement || !achievementFormData.text.trim()) return;
    setSaving(true);
    try {
      const tags = achievementFormData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      await onAddAchievement(role.id, { text: achievementFormData.text.trim(), tags });
      setAchievementFormData({ text: '', tags: '' });
      setAddingAchievement(false);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAchievement = async () => {
    if (!onUpdateAchievement || !editingAchievementId || !achievementFormData.text.trim()) return;
    setSaving(true);
    try {
      const tags = achievementFormData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      await onUpdateAchievement(editingAchievementId, { text: achievementFormData.text.trim(), tags });
      setAchievementFormData({ text: '', tags: '' });
      setEditingAchievementId(null);
    } finally {
      setSaving(false);
    }
  };

  const startEditingAchievement = (achievement: Achievement) => {
    setEditingAchievementId(achievement.id);
    setAchievementFormData({
      text: achievement.text,
      tags: achievement.tags.join(', '),
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      if (deleteTarget.type === 'role' && onDeleteRole) {
        await onDeleteRole(deleteTarget.id);
      } else if (deleteTarget.type === 'achievement' && onDeleteAchievement) {
        await onDeleteAchievement(deleteTarget.id);
      }
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  const getDeleteMessage = () => {
    if (!deleteTarget) return { title: '', description: '' };
    if (deleteTarget.type === 'role') {
      return {
        title: 'Delete Role',
        description: `Are you sure you want to delete "${role.title} at ${role.company}"? This will also delete all ${role.achievements.length} achievement(s) associated with this role.`,
      };
    }
    const achievement = role.achievements.find((a) => a.id === deleteTarget.id);
    return {
      title: 'Delete Achievement',
      description: `Are you sure you want to delete this achievement? "${achievement?.text.slice(0, 60)}..."`,
    };
  };

  // Achievement form component
  const AchievementForm = ({
    onSave,
    onCancel,
    isNew = false,
  }: {
    onSave: () => void;
    onCancel: () => void;
    isNew?: boolean;
  }) => (
    <div className="ml-6 p-3 rounded-lg border bg-muted/30 space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="achievement-text" className="text-xs">
          Achievement *
        </Label>
        <Textarea
          id="achievement-text"
          value={achievementFormData.text}
          onChange={(e) => setAchievementFormData((prev) => ({ ...prev, text: e.target.value }))}
          placeholder="Describe the achievement, impact, or accomplishment..."
          rows={2}
          className="resize-none text-sm"
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="achievement-tags" className="text-xs">
          Tags (comma-separated)
        </Label>
        <Input
          id="achievement-tags"
          value={achievementFormData.tags}
          onChange={(e) => setAchievementFormData((prev) => ({ ...prev, tags: e.target.value }))}
          placeholder="e.g., leadership, python, data analysis"
          className="h-8 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} disabled={saving || !achievementFormData.text.trim()}>
          <Check size={14} className="mr-1" />
          {isNew ? 'Add' : 'Save'}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
          <X size={14} className="mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <div className="border-l-2 border-editorial-line pl-4 py-2 group/role">
      {/* Role Header */}
      {editingRole ? (
        // Role Edit Form
        <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="role-title" className="text-xs">
                Job Title *
              </Label>
              <Input
                id="role-title"
                value={roleFormData.title}
                onChange={(e) => setRoleFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Software Engineer"
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-company" className="text-xs">
                Company *
              </Label>
              <Input
                id="role-company"
                value={roleFormData.company}
                onChange={(e) => setRoleFormData((prev) => ({ ...prev, company: e.target.value }))}
                placeholder="Acme Corp"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="role-location" className="text-xs">
                Location
              </Label>
              <Input
                id="role-location"
                value={roleFormData.location}
                onChange={(e) => setRoleFormData((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="San Francisco, CA"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-start" className="text-xs">
                Start Date
              </Label>
              <Input
                id="role-start"
                type="month"
                value={roleFormData.startDate}
                onChange={(e) => setRoleFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-end" className="text-xs">
                End Date
              </Label>
              <div className="flex items-center gap-2">
                {roleFormData.isPresent ? (
                  <span className="text-sm text-muted-foreground flex-1">Present</span>
                ) : (
                  <Input
                    id="role-end"
                    type="month"
                    value={roleFormData.endDate}
                    onChange={(e) => setRoleFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="h-8 text-sm flex-1"
                  />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() =>
                    setRoleFormData((prev) => ({
                      ...prev,
                      isPresent: !prev.isPresent,
                      endDate: !prev.isPresent ? '' : prev.endDate,
                    }))
                  }
                >
                  {roleFormData.isPresent ? 'Set Date' : 'Present'}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveRole} disabled={saving || !roleFormData.company.trim() || !roleFormData.title.trim()}>
              <Check size={14} className="mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancelRoleEdit} disabled={saving}>
              <X size={14} className="mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        // Role Display
        <>
          <div
            className="flex items-start justify-between cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="flex items-start gap-2 flex-1">
              <button className="mt-1 text-muted-foreground hover:text-foreground">
                {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              <div className="flex-1">
                <h4 className="font-medium text-foreground">{role.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {role.company}
                  {role.location && ` \u00B7 ${role.location}`}
                  {dateRange && ` \u00B7 ${dateRange}`}
                </p>
              </div>
            </div>

            {/* Role Edit/Delete Buttons */}
            {(onUpdateRole || onDeleteRole) && (
              <div className="flex gap-1 opacity-0 group-hover/role:opacity-100 transition-opacity">
                {onUpdateRole && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingRole(true);
                    }}
                    className="p-1.5 hover:text-foreground text-muted-foreground transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                )}
                {onDeleteRole && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({ type: 'role', id: role.id });
                    }}
                    className="p-1.5 hover:text-destructive text-muted-foreground transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Summary Section */}
          <div className="mt-2 ml-6 group/summary">
            {editingSummary ? (
              <div className="space-y-2">
                <Textarea
                  value={summaryValue}
                  onChange={(e) => setSummaryValue(e.target.value)}
                  placeholder="Add a brief description of your role and responsibilities..."
                  rows={2}
                  className="resize-none text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveSummary} disabled={saving}>
                    <Check size={14} className="mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingSummary(false);
                      setSummaryValue(role.summary || '');
                    }}
                  >
                    <X size={14} className="mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <p className="text-sm italic text-muted-foreground flex-1">
                  {role.summary || <span className="text-muted-foreground/60">Add a role summary...</span>}
                </p>
                {onUpdateRole && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSummary(true);
                    }}
                    className={cn(
                      'p-1 hover:text-foreground text-muted-foreground transition-opacity',
                      role.summary ? 'opacity-0 group-hover/summary:opacity-100' : 'opacity-100'
                    )}
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Achievements List */}
      {expanded && !editingRole && (
        <div className="mt-3 ml-6 space-y-3">
          {role.achievements.map((achievement) =>
            editingAchievementId === achievement.id ? (
              <AchievementForm
                key={achievement.id}
                onSave={handleUpdateAchievement}
                onCancel={() => {
                  setEditingAchievementId(null);
                  setAchievementFormData({ text: '', tags: '' });
                }}
              />
            ) : (
              <div key={achievement.id} className="group/achievement">
                <div className="flex items-start gap-2">
                  <p className="text-sm text-foreground leading-relaxed flex-1">
                    <span className="text-muted-foreground mr-1">&bull;</span>
                    {achievement.text}
                  </p>
                  {/* Achievement Edit/Delete Buttons */}
                  {(onUpdateAchievement || onDeleteAchievement) && (
                    <div className="flex gap-0.5 opacity-0 group-hover/achievement:opacity-100 transition-opacity">
                      {onUpdateAchievement && (
                        <button
                          onClick={() => startEditingAchievement(achievement)}
                          className="p-1 hover:text-foreground text-muted-foreground transition-colors"
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                      {onDeleteAchievement && (
                        <button
                          onClick={() => setDeleteTarget({ type: 'achievement', id: achievement.id })}
                          className="p-1 hover:text-destructive text-muted-foreground transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
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
            )
          )}

          {/* Add Achievement Form */}
          {addingAchievement && (
            <AchievementForm
              onSave={handleAddAchievement}
              onCancel={() => {
                setAddingAchievement(false);
                setAchievementFormData({ text: '', tags: '' });
              }}
              isNew
            />
          )}

          {/* Add Achievement Button */}
          {onAddAchievement && !addingAchievement && !editingAchievementId && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setAddingAchievement(true)}
            >
              <Plus size={14} className="mr-1" />
              Add Achievement
            </Button>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getDeleteMessage().title}</AlertDialogTitle>
            <AlertDialogDescription>{getDeleteMessage().description}</AlertDialogDescription>
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
