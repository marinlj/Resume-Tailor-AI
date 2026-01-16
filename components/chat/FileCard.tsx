'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';

interface FileCardProps {
  filename: string;
  downloadUrl: string;
  type: 'markdown' | 'docx';
}

export function FileCard({ filename, downloadUrl, type }: FileCardProps) {
  return (
    <Card className="p-4 my-2">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{filename}</p>
          <p className="text-sm text-muted-foreground">
            {type === 'docx' ? 'Word Document' : 'Markdown'}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={downloadUrl} download={filename}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </a>
        </Button>
      </div>
    </Card>
  );
}
