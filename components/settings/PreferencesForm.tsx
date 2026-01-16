'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface Preferences {
  includeSummary: boolean;
  includeRoleSummaries: boolean;
  boldPattern: string;
  format: string;
}

export function PreferencesForm() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/preferences')
      .then((res) => res.json())
      .then((data) => {
        setPreferences(data.preferences);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!preferences) return;
    setSaving(true);
    await fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences),
    });
    setSaving(false);
  };

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!preferences) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resume Preferences</CardTitle>
        <CardDescription>Customize how your resumes are generated</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Include Summary</Label>
            <p className="text-sm text-muted-foreground">
              Add a professional summary section at the top
            </p>
          </div>
          <Switch
            checked={preferences.includeSummary}
            onCheckedChange={(checked) =>
              setPreferences({ ...preferences, includeSummary: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Include Role Summaries</Label>
            <p className="text-sm text-muted-foreground">
              Add a one-line summary under each role
            </p>
          </div>
          <Switch
            checked={preferences.includeRoleSummaries}
            onCheckedChange={(checked) =>
              setPreferences({ ...preferences, includeRoleSummaries: checked })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Bold Pattern</Label>
          <Select
            value={preferences.boldPattern}
            onValueChange={(value) =>
              setPreferences({ ...preferences, boldPattern: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="action_only">Action only</SelectItem>
              <SelectItem value="action_and_kpi">Action and KPI</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            How to bold achievement bullets
          </p>
        </div>

        <div className="space-y-2">
          <Label>Header Format</Label>
          <Select
            value={preferences.format}
            onValueChange={(value) =>
              setPreferences({ ...preferences, format: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="company_location_dates">Company | Location | Dates</SelectItem>
              <SelectItem value="title_company_dates">Title | Company | Dates</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            How role headers are formatted
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
}
