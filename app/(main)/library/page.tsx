'use client';

import { useEffect, useState, useCallback } from 'react';
import { ContactDetailsCard } from '@/components/library/ContactDetailsCard';
import { ProfessionalSummaryCard } from '@/components/library/ProfessionalSummaryCard';
import { SkillsList } from '@/components/library/SkillsList';
import { EducationList } from '@/components/library/EducationList';
import { LibraryItemsList, getTypeLabel } from '@/components/library/LibraryItemsList';
import { RoleCard } from '@/components/library/RoleCard';
import { SectionHeader } from '@/components/library/SectionHeader';
import { RoleFormInline } from '@/components/library/RoleFormInline';

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

interface Skill {
  id: string;
  name: string;
  category: string | null;
  level: string | null;
}

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

interface ContactDetails {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  location: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  githubUrl: string | null;
  headline: string | null;
}

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

interface LibraryData {
  contactDetails: ContactDetails | null;
  roles: Role[];
  skills: Skill[];
  education: Education[];
  libraryItems: LibraryItem[];
  professionalSummary: string | null;
}

function LoadingSkeleton() {
  return (
    <div className="flex-1 p-8 overflow-auto">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Hero skeleton */}
        <div className="space-y-4 pb-12">
          <div className="h-14 w-72 bg-muted/50 rounded animate-pulse" />
          <div className="h-6 w-96 bg-muted/30 rounded animate-pulse" />
          <div className="flex gap-4 mt-8">
            <div className="h-4 w-32 bg-muted/30 rounded animate-pulse" />
            <div className="h-4 w-28 bg-muted/30 rounded animate-pulse" />
          </div>
        </div>

        {/* Section skeletons */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-4">
            <div className="h-8 w-48 bg-muted/40 rounded animate-pulse" />
            <div className="h-32 w-full bg-muted/20 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const [data, setData] = useState<LibraryData>({
    contactDetails: null,
    roles: [],
    skills: [],
    education: [],
    libraryItems: [],
    professionalSummary: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingRole, setAddingRole] = useState(false);

  // ========== CONTACT DETAILS HANDLER ==========
  const handleSaveContactDetails = useCallback(async (formData: Partial<ContactDetails>) => {
    const res = await fetch('/api/contact-details', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (!res.ok) throw new Error('Failed to save contact details');
    const { contactDetails } = await res.json();
    setData((prev) => ({ ...prev, contactDetails }));
  }, []);

  // ========== SKILLS HANDLERS ==========
  const handleAddSkill = useCallback(async (skill: { name: string; category?: string; level?: string }) => {
    const res = await fetch('/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(skill),
    });
    if (!res.ok) throw new Error('Failed to add skill');
    const { skill: newSkill } = await res.json();
    setData((prev) => ({ ...prev, skills: [...prev.skills, newSkill] }));
  }, []);

  const handleUpdateSkill = useCallback(async (id: string, skill: { name: string; category?: string; level?: string }) => {
    const res = await fetch(`/api/skills/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(skill),
    });
    if (!res.ok) throw new Error('Failed to update skill');
    const { skill: updated } = await res.json();
    setData((prev) => ({
      ...prev,
      skills: prev.skills.map((s) => (s.id === id ? updated : s)),
    }));
  }, []);

  const handleDeleteSkill = useCallback(async (id: string) => {
    const res = await fetch(`/api/skills/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete skill');
    setData((prev) => ({ ...prev, skills: prev.skills.filter((s) => s.id !== id) }));
  }, []);

  // ========== EDUCATION HANDLERS ==========
  const handleAddEducation = useCallback(async (edu: Omit<Education, 'id'>) => {
    const res = await fetch('/api/education', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(edu),
    });
    if (!res.ok) throw new Error('Failed to add education');
    const { education: newEdu } = await res.json();
    setData((prev) => ({ ...prev, education: [...prev.education, newEdu] }));
  }, []);

  const handleUpdateEducation = useCallback(async (id: string, edu: Partial<Education>) => {
    const res = await fetch(`/api/education/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(edu),
    });
    if (!res.ok) throw new Error('Failed to update education');
    const { education: updated } = await res.json();
    setData((prev) => ({
      ...prev,
      education: prev.education.map((e) => (e.id === id ? updated : e)),
    }));
  }, []);

  const handleDeleteEducation = useCallback(async (id: string) => {
    const res = await fetch(`/api/education/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete education');
    setData((prev) => ({ ...prev, education: prev.education.filter((e) => e.id !== id) }));
  }, []);

  // ========== ROLES HANDLERS ==========
  const handleAddRole = useCallback(async (role: {
    company: string;
    title: string;
    location: string | null;
    startDate: Date | null;
    endDate: Date | null;
  }) => {
    const res = await fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(role),
    });
    if (!res.ok) throw new Error('Failed to add role');
    const { role: newRole } = await res.json();
    // Ensure achievements array exists
    const roleWithAchievements = { ...newRole, achievements: newRole.achievements || [] };
    setData((prev) => ({ ...prev, roles: [...prev.roles, roleWithAchievements] }));
    setAddingRole(false);
  }, []);

  const handleUpdateRole = useCallback(async (id: string, roleData: Partial<Role>) => {
    const res = await fetch(`/api/roles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roleData),
    });
    if (!res.ok) throw new Error('Failed to update role');
    const { role: updated } = await res.json();
    setData((prev) => ({
      ...prev,
      roles: prev.roles.map((r) => (r.id === id ? { ...r, ...updated } : r)),
    }));
  }, []);

  const handleDeleteRole = useCallback(async (id: string) => {
    const res = await fetch(`/api/roles/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete role');
    setData((prev) => ({ ...prev, roles: prev.roles.filter((r) => r.id !== id) }));
  }, []);

  // ========== ACHIEVEMENTS HANDLERS ==========
  const handleAddAchievement = useCallback(async (roleId: string, achievement: { text: string; tags: string[] }) => {
    const res = await fetch(`/api/roles/${roleId}/achievements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(achievement),
    });
    if (!res.ok) throw new Error('Failed to add achievement');
    const { achievement: newAchievement } = await res.json();
    setData((prev) => ({
      ...prev,
      roles: prev.roles.map((role) =>
        role.id === roleId
          ? { ...role, achievements: [...role.achievements, newAchievement] }
          : role
      ),
    }));
  }, []);

  const handleUpdateAchievement = useCallback(async (id: string, achievement: { text: string; tags: string[] }) => {
    const res = await fetch(`/api/achievements/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(achievement),
    });
    if (!res.ok) throw new Error('Failed to update achievement');
    const { achievement: updated } = await res.json();
    setData((prev) => ({
      ...prev,
      roles: prev.roles.map((role) => ({
        ...role,
        achievements: role.achievements.map((a) => (a.id === id ? updated : a)),
      })),
    }));
  }, []);

  const handleDeleteAchievement = useCallback(async (id: string) => {
    const res = await fetch(`/api/achievements/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete achievement');
    setData((prev) => ({
      ...prev,
      roles: prev.roles.map((role) => ({
        ...role,
        achievements: role.achievements.filter((a) => a.id !== id),
      })),
    }));
  }, []);

  // ========== LIBRARY ITEMS HANDLERS ==========
  const handleAddLibraryItem = useCallback(async (item: Omit<LibraryItem, 'id'>) => {
    const res = await fetch('/api/library-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error('Failed to add library item');
    const { libraryItem } = await res.json();
    setData((prev) => ({ ...prev, libraryItems: [...prev.libraryItems, libraryItem] }));
  }, []);

  const handleUpdateLibraryItem = useCallback(async (id: string, item: Partial<LibraryItem>) => {
    const res = await fetch(`/api/library-items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error('Failed to update library item');
    const { libraryItem: updated } = await res.json();
    setData((prev) => ({
      ...prev,
      libraryItems: prev.libraryItems.map((li) => (li.id === id ? updated : li)),
    }));
  }, []);

  const handleDeleteLibraryItem = useCallback(async (id: string) => {
    const res = await fetch(`/api/library-items/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete library item');
    setData((prev) => ({ ...prev, libraryItems: prev.libraryItems.filter((li) => li.id !== id) }));
  }, []);

  useEffect(() => {
    fetch('/api/library')
      .then((res) => {
        console.log('[LibraryPage] API response status:', res.status);
        if (!res.ok) {
          throw new Error(`API returned ${res.status}`);
        }
        return res.json();
      })
      .then((result) => {
        console.log('[LibraryPage] API response:', {
          hasContactDetails: !!result.contactDetails,
          rolesCount: result.roles?.length ?? 0,
          skillsCount: result.skills?.length ?? 0,
          educationCount: result.education?.length ?? 0,
          libraryItemsCount: result.libraryItems?.length ?? 0,
          hasProfessionalSummary: !!result.professionalSummary,
          error: result.error,
        });

        if (result.error) {
          setError(result.error);
          setLoading(false);
          return;
        }

        setData({
          contactDetails: result.contactDetails || null,
          roles: result.roles || [],
          skills: result.skills || [],
          education: result.education || [],
          libraryItems: result.libraryItems || [],
          professionalSummary: result.professionalSummary || null,
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error('[LibraryPage] Error fetching library:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-serif text-3xl font-semibold mb-8">Your Library</h1>
          <div className="text-center py-16 border border-dashed border-editorial-line rounded-lg">
            <p className="text-destructive mb-2 font-medium">Error loading library</p>
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const isEmpty =
    !data.contactDetails &&
    data.roles.length === 0 &&
    data.skills.length === 0 &&
    data.education.length === 0 &&
    data.libraryItems.length === 0;

  if (isEmpty) {
    return (
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-serif text-3xl font-semibold mb-8">Your Library</h1>
          <div className="text-center py-20 border border-dashed border-editorial-line rounded-lg bg-gradient-to-b from-editorial-accent-muted/10 to-transparent">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-editorial-accent-muted flex items-center justify-center">
              <svg
                className="w-8 h-8 text-editorial-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <p className="text-muted-foreground font-serif italic text-lg">
              Your library is empty
            </p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Start a chat to upload your resume and populate your professional library with achievements, skills, and education.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Group library items by type
  const groupedLibraryItems = data.libraryItems.reduce<
    Record<string, LibraryItem[]>
  >((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {});

  const handleSaveSummary = async (summary: string) => {
    const res = await fetch('/api/professional-summary', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary }),
    });
    if (!res.ok) throw new Error('Failed to save');
    setData((prev) => ({ ...prev, professionalSummary: summary }));
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-auto">
      <div className="max-w-4xl mx-auto">
        {/* Contact Details Hero */}
        <ContactDetailsCard
          contactDetails={data.contactDetails}
          onSave={handleSaveContactDetails}
        />

        {/* Professional Summary */}
        <ProfessionalSummaryCard
          summary={data.professionalSummary}
          onSave={handleSaveSummary}
        />

        {/* Main Content Grid */}
        <div className="space-y-12">
          {/* Skills Section */}
          <section className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100">
            <SectionHeader title="Skills" count={data.skills.length} />
            <SkillsList
              skills={data.skills}
              onAdd={handleAddSkill}
              onUpdate={handleUpdateSkill}
              onDelete={handleDeleteSkill}
            />
          </section>

          {/* Education Section */}
          <section className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200">
            <SectionHeader title="Education" count={data.education.length} />
            <EducationList
              education={data.education}
              onAdd={handleAddEducation}
              onUpdate={handleUpdateEducation}
              onDelete={handleDeleteEducation}
            />
          </section>

          {/* Work Experience Section */}
          <section className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
            <SectionHeader
              title="Experience"
              count={data.roles.reduce((sum, role) => sum + role.achievements.length, 0)}
              onAdd={() => setAddingRole(true)}
              addLabel="Add Role"
            />

            {/* Add Role Form */}
            {addingRole && (
              <RoleFormInline
                onSave={handleAddRole}
                onCancel={() => setAddingRole(false)}
              />
            )}

            <div className="space-y-4">
              {data.roles.map((role, roleIndex) => (
                <div
                  key={role.id}
                  className="animate-in fade-in slide-in-from-bottom-1 duration-500"
                  style={{ animationDelay: `${400 + roleIndex * 100}ms` }}
                >
                  <RoleCard
                    role={role}
                    onUpdateRole={handleUpdateRole}
                    onDeleteRole={handleDeleteRole}
                    onAddAchievement={handleAddAchievement}
                    onUpdateAchievement={handleUpdateAchievement}
                    onDeleteAchievement={handleDeleteAchievement}
                  />
                </div>
              ))}
            </div>

            {data.roles.length === 0 && !addingRole && (
              <p className="text-sm text-muted-foreground italic">
                No work experience in your library yet.
              </p>
            )}
          </section>

          {/* Dynamic Sections (Projects, Publications, Certifications, etc.) */}
          {Object.entries(groupedLibraryItems).map(([type, items], typeIndex) => (
            <section
              key={type}
              className="animate-in fade-in slide-in-from-bottom-2 duration-700"
              style={{ animationDelay: `${400 + typeIndex * 100}ms` }}
            >
              <SectionHeader title={getTypeLabel(type)} count={items.length} />
              <LibraryItemsList
                items={items}
                type={type}
                onAdd={(itemData) => handleAddLibraryItem({ ...itemData, type })}
                onUpdate={handleUpdateLibraryItem}
                onDelete={handleDeleteLibraryItem}
              />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
