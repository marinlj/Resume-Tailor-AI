import { ToolLoopAgent, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { RESUME_AGENT_INSTRUCTIONS } from './instructions';

// Library tools
import {
  getLibraryStatus,
  getAchievements,
  addAchievement,
  addMultipleAchievements,
  updateAchievement,
  deleteAchievement,
} from './tools/library';

// Research tools
import {
  parseJobDescription,
  buildSuccessProfile,
} from './tools/research';

// Matching tools
import { matchAchievements } from './tools/matching';

// Generation tools
import {
  generateResume,
  generateDocxFile,
} from './tools/generation';

// Preferences tools
import {
  getPreferences,
  updatePreferences,
} from './tools/preferences';

export const resumeAgent = new ToolLoopAgent({
  model: anthropic('claude-sonnet-4-20250514'),
  instructions: RESUME_AGENT_INSTRUCTIONS,
  tools: {
    // Library management
    getLibraryStatus,
    getAchievements,
    addAchievement,
    addMultipleAchievements,
    updateAchievement,
    deleteAchievement,

    // Research
    parseJobDescription,
    buildSuccessProfile,

    // Matching
    matchAchievements,

    // Generation
    generateResume,
    generateDocxFile,

    // Preferences
    getPreferences,
    updatePreferences,
  },
  stopWhen: stepCountIs(15),
});

export type ResumeAgent = typeof resumeAgent;
