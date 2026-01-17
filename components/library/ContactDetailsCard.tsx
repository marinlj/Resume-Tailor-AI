'use client';

import { Mail, Phone, MapPin, Linkedin, Globe, Github } from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

export function ContactDetailsCard({ contactDetails }: ContactDetailsCardProps) {
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
        {/* Name - large editorial serif */}
        <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
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
