'use client';

import { useEffect, useRef } from 'react';
import type { UIMessage } from 'ai';
import { isToolUIPart, getToolName } from 'ai';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MarkdownContent } from './MarkdownContent';
import { ToolCallDisplay } from './ToolCallDisplay';
import { FileCard } from './FileCard';
import { cn } from '@/lib/utils';

interface DocxToolOutput {
  success: boolean;
  downloadUrl?: string;
  filename?: string;
}

function isDocxOutput(output: unknown): output is DocxToolOutput {
  return (
    typeof output === 'object' &&
    output !== null &&
    'success' in output &&
    (output as DocxToolOutput).success === true &&
    'downloadUrl' in output &&
    typeof (output as DocxToolOutput).downloadUrl === 'string'
  );
}

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
                if (isToolUIPart(part)) {
                  const toolName = getToolName(part);
                  const output = 'output' in part ? part.output : undefined;

                  // Show FileCard for successful DOCX generation
                  if (
                    toolName === 'generateDocxFile' &&
                    part.state === 'output-available' &&
                    isDocxOutput(output)
                  ) {
                    return (
                      <FileCard
                        key={i}
                        filename={output.filename || 'Resume.docx'}
                        downloadUrl={output.downloadUrl!}
                        type="docx"
                      />
                    );
                  }

                  return (
                    <ToolCallDisplay
                      key={i}
                      toolName={toolName}
                      state={part.state}
                    />
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
