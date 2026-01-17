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
  getSkills,
  addSkills,
  updateSkill,
  deleteSkill,
  getEducation,
  addEducation,
  updateEducation,
  deleteEducation,
  parseResumeIntoLibrary,
  getContactDetails,
  updateContactDetails,
} from './tools/library';

// Research tools
import {
  fetchJobFromUrl,
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

// Resume Structure tools
import {
  getResumeStructure,
  saveResumeStructure,
} from './tools/structure';

export const resumeAgent = new ToolLoopAgent({
  model: anthropic('claude-opus-4-5-20251101'),
  instructions: RESUME_AGENT_INSTRUCTIONS,
  experimental_telemetry: {
    isEnabled: true,
    functionId: 'resume-agent',
  },
  tools: {
    // Library management - Achievements
    getLibraryStatus,
    getAchievements,
    addAchievement,
    addMultipleAchievements,
    updateAchievement,
    deleteAchievement,

    // Library management - Skills
    getSkills,
    addSkills,
    updateSkill,
    deleteSkill,

    // Library management - Education
    getEducation,
    addEducation,
    updateEducation,
    deleteEducation,

    // Library management - Contact Details
    getContactDetails,
    updateContactDetails,

    // Library management - Parsing
    parseResumeIntoLibrary,

    // Research
    fetchJobFromUrl,
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

    // Resume Structure
    getResumeStructure,
    saveResumeStructure,
  },
  stopWhen: stepCountIs(15),
});

export type ResumeAgent = typeof resumeAgent;
