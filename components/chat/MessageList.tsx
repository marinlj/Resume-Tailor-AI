'use client';

import type { UIMessage } from 'ai';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MessageListProps {
  messages: UIMessage[];
  status: string;
}

export function MessageList({ messages, status }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Resume Tailor AI</h2>
          <p className="text-muted-foreground">
            Paste a job description to get started, or upload your resume to build your library.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="p-4 rounded-lg bg-muted">
            <div className="font-semibold mb-1">
              {message.role === 'user' ? 'You' : 'Assistant'}
            </div>
            <div>
              {message.parts.map((part, i) => {
                if (part.type === 'text') {
                  return <p key={i}>{part.text}</p>;
                }
                return null;
              })}
            </div>
          </div>
        ))}
        {status === 'streaming' && (
          <div className="text-muted-foreground">Thinking...</div>
        )}
      </div>
    </ScrollArea>
  );
}
