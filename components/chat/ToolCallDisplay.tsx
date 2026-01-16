'use client';

import { Card } from '@/components/ui/card';
import { CheckCircle, Loader2 } from 'lucide-react';

interface ToolCallDisplayProps {
  toolName: string;
  state: string;
  input?: unknown;
  output?: unknown;
}

const toolLabels: Record<string, string> = {
  getLibraryStatus: 'Checking library status',
  getAchievements: 'Fetching achievements',
  addAchievement: 'Adding achievement',
  addMultipleAchievements: 'Adding achievements',
  parseJobDescription: 'Analyzing job description',
  buildSuccessProfile: 'Building success profile',
  matchAchievements: 'Matching achievements',
  generateResume: 'Generating resume',
  generateDocxFile: 'Creating DOCX file',
  getPreferences: 'Loading preferences',
  updatePreferences: 'Updating preferences',
};

export function ToolCallDisplay({ toolName, state, input, output }: ToolCallDisplayProps) {
  const label = toolLabels[toolName] || toolName;
  const isComplete = state === 'output-available';

  return (
    <Card className="p-3 my-2 bg-muted/50">
      <div className="flex items-center gap-2 text-sm">
        {isComplete ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        <span className={isComplete ? 'text-muted-foreground' : ''}>
          {label}
          {isComplete && ' - Done'}
        </span>
      </div>
    </Card>
  );
}
