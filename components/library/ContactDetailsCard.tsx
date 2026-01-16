import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone, MapPin, Linkedin, Globe, Github } from 'lucide-react';

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
      <Card className="bg-muted/50">
        <CardContent className="py-6 text-center">
          <p className="text-muted-foreground">
            No contact details yet. Upload a resume or ask the agent to add them.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-6">
        <div className="space-y-2">
          {/* Name and headline */}
          <div>
            <h2 className="text-2xl font-bold">{contactDetails.fullName}</h2>
            {contactDetails.headline && (
              <p className="text-muted-foreground">{contactDetails.headline}</p>
            )}
          </div>

          {/* Contact info row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="flex items-center gap-1">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${contactDetails.email}`} className="hover:underline">
                {contactDetails.email}
              </a>
            </span>

            {contactDetails.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${contactDetails.phone}`} className="hover:underline">
                  {contactDetails.phone}
                </a>
              </span>
            )}

            {contactDetails.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {contactDetails.location}
              </span>
            )}
          </div>

          {/* Links row */}
          {(contactDetails.linkedinUrl || contactDetails.portfolioUrl || contactDetails.githubUrl) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {contactDetails.linkedinUrl && (
                <a
                  href={contactDetails.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </a>
              )}

              {contactDetails.portfolioUrl && (
                <a
                  href={contactDetails.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  Portfolio
                </a>
              )}

              {contactDetails.githubUrl && (
                <a
                  href={contactDetails.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
