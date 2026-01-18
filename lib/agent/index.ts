import { ToolLoopAgent, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { RESUME_AGENT_INSTRUCTIONS } from './instructions';

// Library tools
import {
  getLibraryStatus,
  // Role tools
  getRoles,
  addRole,
  updateRole,
  deleteRole,
  addRolesWithAchievements,
  // Achievement tools
  getAchievements,
  addAchievement,
  addMultipleAchievements,
  updateAchievement,
  deleteAchievement,
  // Skills tools
  getSkills,
  addSkills,
  updateSkill,
  deleteSkill,
  // Education tools
  getEducation,
  addEducation,
  updateEducation,
  deleteEducation,
  // Contact details tools
  getContactDetails,
  updateContactDetails,
  // Library items tools
  getLibraryItems,
  addLibraryItems,
  updateLibraryItem,
  deleteLibraryItem,
  // Professional summary tools
  getProfessionalSummary,
  updateProfessionalSummary,
  // Parsing tools
  parseResumeIntoLibrary,
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
    // Library management - Status
    getLibraryStatus,

    // Library management - Roles
    getRoles,
    addRole,
    updateRole,
    deleteRole,
    addRolesWithAchievements,

    // Library management - Achievements
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

    // Library management - Library Items (Projects, Certifications, Awards, etc.)
    getLibraryItems,
    addLibraryItems,
    updateLibraryItem,
    deleteLibraryItem,

    // Library management - Professional Summary
    getProfessionalSummary,
    updateProfessionalSummary,

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
