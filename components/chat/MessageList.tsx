'use client';

import { useEffect, useRef } from 'react';
import type { UIMessage } from 'ai';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MarkdownContent } from './MarkdownContent';
import { cn } from '@/lib/utils';

interface MessageListProps {
  messages: UIMessage[];
  status: string;
}

export function MessageList({ messages, status }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h2 className="text-2xl font-semibold mb-2">Resume Tailor AI</h2>
          <p className="text-muted-foreground">
            Paste a job description to get started, or upload your resume to build your library.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'p-4 rounded-lg',
              message.role === 'user' ? 'bg-primary/10 ml-8' : 'bg-muted mr-8'
            )}
          >
            <div className="font-semibold mb-2 text-sm text-muted-foreground">
              {message.role === 'user' ? 'You' : 'Assistant'}
            </div>
            <div>
              {message.parts.map((part, i) => {
                if (part.type === 'text') {
                  return message.role === 'assistant' ? (
                    <MarkdownContent key={i} content={part.text} />
                  ) : (
                    <p key={i} className="whitespace-pre-wrap">{part.text}</p>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}
        {status === 'streaming' && (
          <div className="flex items-center gap-2 text-muted-foreground p-4">
            <div className="animate-pulse">Thinking...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
