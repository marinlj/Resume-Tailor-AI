'use client';

import { useState } from 'react';
import { Mail, Phone, MapPin, Linkedin, Globe, Github, Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function normalizeUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
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

interface ContactDetailsCardProps {
  contactDetails: ContactDetails | null;
  onSave?: (data: Partial<ContactDetails>) => Promise<void>;
}

export function ContactDetailsCard({ contactDetails, onSave }: ContactDetailsCardProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: contactDetails?.fullName || '',
    email: contactDetails?.email || '',
    phone: contactDetails?.phone || '',
    location: contactDetails?.location || '',
    linkedinUrl: contactDetails?.linkedinUrl || '',
    portfolioUrl: contactDetails?.portfolioUrl || '',
    githubUrl: contactDetails?.githubUrl || '',
    headline: contactDetails?.headline || '',
  });

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(formData);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      fullName: contactDetails?.fullName || '',
      email: contactDetails?.email || '',
      phone: contactDetails?.phone || '',
      location: contactDetails?.location || '',
      linkedinUrl: contactDetails?.linkedinUrl || '',
      portfolioUrl: contactDetails?.portfolioUrl || '',
      githubUrl: contactDetails?.githubUrl || '',
      headline: contactDetails?.headline || '',
    });
    setEditing(false);
  };

  const handleChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  if (!contactDetails) {
    return (
      <div className="relative py-16 px-8 text-center border-b border-editorial-line">
        <div className="absolute inset-0 bg-gradient-to-b from-editorial-accent-muted/30 to-transparent opacity-50" />
        <p className="relative text-muted-foreground font-serif italic">
          No contact details yet. Upload a resume or ask the agent to add them.
        </p>
      </div>
    );
  }

  if (editing) {
    return (
      <header className="relative pb-12 mb-4">
        <div className="absolute inset-0 -mx-6 bg-gradient-to-b from-editorial-accent-muted/20 via-transparent to-transparent" />

        <div className="relative border border-editorial-accent/30 bg-editorial-accent-muted/5 rounded-lg p-6">
          <h2 className="font-serif text-xl font-medium mb-6">Edit Contact Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={handleChange('fullName')}
                placeholder="Your full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                placeholder="your.email@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange('phone')}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={handleChange('location')}
                placeholder="City, State/Country"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="headline">Professional Headline</Label>
              <Input
                id="headline"
                value={formData.headline}
                onChange={handleChange('headline')}
                placeholder="e.g., Senior Software Engineer | Full-Stack Developer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
              <Input
                id="linkedinUrl"
                type="url"
                value={formData.linkedinUrl}
                onChange={handleChange('linkedinUrl')}
                placeholder="linkedin.com/in/yourprofile"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="githubUrl">GitHub URL</Label>
              <Input
                id="githubUrl"
                type="url"
                value={formData.githubUrl}
                onChange={handleChange('githubUrl')}
                placeholder="github.com/yourusername"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="portfolioUrl">Portfolio URL</Label>
              <Input
                id="portfolioUrl"
                type="url"
                value={formData.portfolioUrl}
                onChange={handleChange('portfolioUrl')}
                placeholder="yourportfolio.com"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Check size={14} className="mr-1" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X size={14} className="mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      </header>
    );
  }

  const socialLinks = [
    { url: contactDetails.linkedinUrl, icon: Linkedin, label: 'LinkedIn' },
    { url: contactDetails.portfolioUrl, icon: Globe, label: 'Portfolio' },
    { url: contactDetails.githubUrl, icon: Github, label: 'GitHub' },
  ].filter((link) => link.url);

  return (
    <header className="relative pb-12 mb-4">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 -mx-6 bg-gradient-to-b from-editorial-accent-muted/20 via-transparent to-transparent" />

      <div className="relative">
        {/* Edit button */}
        {onSave && !editing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
            className="absolute top-0 right-0"
          >
            <Pencil size={14} className="mr-1" />
            Edit
          </Button>
        )}

        {/* Name - large editorial serif */}
        <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-3 animate-in fade-in slide-in-from-bottom-2 duration-500 pr-20">
          {contactDetails.fullName}
        </h1>

        {/* Headline - elegant subtext */}
        {contactDetails.headline && (
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
            {contactDetails.headline}
          </p>
        )}

        {/* Decorative line */}
        <div className="mt-8 mb-6 flex items-center gap-4 animate-in fade-in duration-700 delay-200">
          <div className="h-px flex-1 max-w-24 bg-gradient-to-r from-editorial-accent to-transparent" />
          <div className="h-1.5 w-1.5 rounded-full bg-editorial-accent" />
        </div>

        {/* Contact info - refined layout */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm animate-in fade-in slide-in-from-bottom-1 duration-500 delay-300">
          <a
            href={`mailto:${contactDetails.email}`}
            className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Mail className="h-4 w-4 text-editorial-accent group-hover:scale-110 transition-transform" />
            <span className="border-b border-transparent group-hover:border-current transition-colors">
              {contactDetails.email}
            </span>
          </a>

          {contactDetails.phone && (
            <a
              href={`tel:${contactDetails.phone}`}
              className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Phone className="h-4 w-4 text-editorial-accent group-hover:scale-110 transition-transform" />
              <span className="border-b border-transparent group-hover:border-current transition-colors">
                {contactDetails.phone}
              </span>
            </a>
          )}

          {contactDetails.location && (
            <span className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 text-editorial-accent" />
              {contactDetails.location}
            </span>
          )}
        </div>

        {/* Social links - elegant pills */}
        {socialLinks.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-3 animate-in fade-in slide-in-from-bottom-1 duration-500 delay-400">
            {socialLinks.map(({ url, icon: Icon, label }) => (
              <a
                key={label}
                href={normalizeUrl(url!)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "group inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm",
                  "bg-secondary/50 hover:bg-editorial-accent-muted border border-transparent hover:border-editorial-accent/20",
                  "text-muted-foreground hover:text-foreground transition-all duration-200"
                )}
              >
                <Icon className="h-4 w-4 group-hover:text-editorial-accent transition-colors" />
                {label}
              </a>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
