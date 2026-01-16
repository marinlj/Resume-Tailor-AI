# Phase 2: Chat UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Claude-like chat interface with collapsible sidebar, message streaming, and file upload capabilities.

**Architecture:** Use shadcn/ui components for the base UI, AI SDK's `useChat` hook for chat state management, and react-markdown for rendering assistant responses. The layout is a two-panel design (sidebar + chat) with the sidebar collapsible.

**Tech Stack:** Next.js 16 App Router, shadcn/ui, Tailwind CSS 4, @ai-sdk/react (useChat), react-markdown

---

## Task 1: Initialize shadcn/ui

**Files:**
- Create: `components.json`
- Create: `lib/utils.ts`
- Modify: `app/globals.css`
- Modify: `tailwind.config.ts` (if exists)

**Step 1: Run shadcn init**

```bash
cd /Users/marinljubas/Projects/Resume-Tailor-AI
npx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Neutral
- CSS variables: Yes

**Step 2: Verify installation**

```bash
cat components.json
ls lib/utils.ts
```

Expected: `components.json` exists with shadcn config, `lib/utils.ts` has `cn` function.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: initialize shadcn/ui"
```

---

## Task 2: Install Base shadcn Components

**Files:**
- Create: `components/ui/button.tsx`
- Create: `components/ui/input.tsx`
- Create: `components/ui/textarea.tsx`
- Create: `components/ui/card.tsx`
- Create: `components/ui/scroll-area.tsx`
- Create: `components/ui/separator.tsx`
- Create: `components/ui/avatar.tsx`
- Create: `components/ui/tooltip.tsx`
- Create: `components/ui/sheet.tsx`

**Step 1: Install required components**

```bash
npx shadcn@latest add button input textarea card scroll-area separator avatar tooltip sheet
```

**Step 2: Verify installation**

```bash
ls components/ui/
```

Expected: All component files exist.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: add shadcn ui components"
```

---

## Task 3: Install Sidebar Block

**Files:**
- Create: `components/ui/sidebar.tsx`
- Modify: Files from sidebar-07 block

**Step 1: Install sidebar component**

```bash
npx shadcn@latest add sidebar
```

**Step 2: Verify sidebar exists**

```bash
cat components/ui/sidebar.tsx | head -20
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: add shadcn sidebar component"
```

---

## Task 4: Create App Layout with Sidebar Provider

**Files:**
- Create: `components/layout/AppSidebar.tsx`
- Modify: `app/layout.tsx`

**Step 1: Create AppSidebar component**

Create `components/layout/AppSidebar.tsx`:

```tsx
'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { MessageSquarePlus, Library, Settings, User } from 'lucide-react';

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <h1 className="text-lg font-semibold">Resume Tailor AI</h1>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button className="w-full">
                    <MessageSquarePlus className="h-4 w-4" />
                    <span>New Chat</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>History</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <span className="text-muted-foreground text-sm">No conversations yet</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Library className="h-4 w-4" />
              <span>Library</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <User className="h-4 w-4" />
              <span>Profile</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
```

**Step 2: Install lucide-react icons**

```bash
npm install lucide-react
```

**Step 3: Update app/layout.tsx**

Replace `app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Resume Tailor AI',
  description: 'AI-powered resume tailoring assistant',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-14 items-center gap-4 border-b px-4">
              <SidebarTrigger />
            </header>
            <main className="flex-1 overflow-hidden">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  );
}
```

**Step 4: Run dev server and verify**

```bash
npm run dev
```

Open http://localhost:3000 - should see sidebar with header.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add app layout with collapsible sidebar"
```

---

## Task 5: Create Chat Container Component

**Files:**
- Create: `components/chat/ChatContainer.tsx`
- Modify: `app/page.tsx`

**Step 1: Create ChatContainer**

Create `components/chat/ChatContainer.tsx`:

```tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

export function ChatContainer() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput('');
  };

  return (
    <div className="flex h-full flex-col">
      <MessageList messages={messages} status={status} />
      <ChatInput
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
        isLoading={status === 'streaming' || status === 'submitted'}
      />
    </div>
  );
}
```

**Step 2: Create placeholder MessageList**

Create `components/chat/MessageList.tsx`:

```tsx
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
```

**Step 3: Create ChatInput**

Create `components/chat/ChatInput.tsx`:

```tsx
'use client';

import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { SendHorizontal } from 'lucide-react';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export function ChatInput({ input, setInput, onSubmit, isLoading }: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="border-t p-4">
      <form onSubmit={onSubmit} className="max-w-3xl mx-auto">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste a job description or ask a question..."
            className="min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
```

**Step 4: Update app/page.tsx**

Replace `app/page.tsx`:

```tsx
import { ChatContainer } from '@/components/chat/ChatContainer';

export default function Home() {
  return <ChatContainer />;
}
```

**Step 5: Run and verify**

```bash
npm run dev
```

Open http://localhost:3000 - should see chat interface with empty state and input.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add chat container with message list and input"
```

---

## Task 6: Add Markdown Rendering for Assistant Messages

**Files:**
- Create: `components/chat/MarkdownContent.tsx`
- Modify: `components/chat/MessageList.tsx`

**Step 1: Create MarkdownContent component**

Create `components/chat/MarkdownContent.tsx`:

```tsx
'use client';

import ReactMarkdown from 'react-markdown';

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <ReactMarkdown
      className="prose prose-sm dark:prose-invert max-w-none"
      components={{
        h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-bold mt-2 mb-1">{children}</h3>,
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        code: ({ className, children }) => {
          const isInline = !className;
          if (isInline) {
            return <code className="bg-muted px-1 py-0.5 rounded text-sm">{children}</code>;
          }
          return (
            <pre className="bg-muted p-3 rounded-lg overflow-x-auto my-2">
              <code className="text-sm">{children}</code>
            </pre>
          );
        },
        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

**Step 2: Update MessageList to use MarkdownContent**

Update `components/chat/MessageList.tsx`:

```tsx
'use client';

import type { UIMessage } from 'ai';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MarkdownContent } from './MarkdownContent';
import { cn } from '@/lib/utils';

interface MessageListProps {
  messages: UIMessage[];
  status: string;
}

export function MessageList({ messages, status }: MessageListProps) {
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
      </div>
    </ScrollArea>
  );
}
```

**Step 3: Run and verify**

```bash
npm run dev
```

Send a message and verify markdown renders correctly.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add markdown rendering for assistant messages"
```

---

## Task 7: Add Auto-scroll to Bottom

**Files:**
- Modify: `components/chat/MessageList.tsx`

**Step 1: Update MessageList with auto-scroll**

Update `components/chat/MessageList.tsx`:

```tsx
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
```

**Step 2: Verify auto-scroll works**

```bash
npm run dev
```

Send multiple messages - chat should auto-scroll to bottom.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add auto-scroll to bottom on new messages"
```

---

## Task 8: Add File Upload to Chat Input

**Files:**
- Modify: `components/chat/ChatInput.tsx`
- Modify: `components/chat/ChatContainer.tsx`

**Step 1: Update ChatInput with file upload**

Update `components/chat/ChatInput.tsx`:

```tsx
'use client';

import { useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { SendHorizontal, Paperclip, X } from 'lucide-react';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  attachedFile: File | null;
  onFileAttach: (file: File | null) => void;
}

export function ChatInput({
  input,
  setInput,
  onSubmit,
  isLoading,
  attachedFile,
  onFileAttach,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileAttach(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('text/')) {
        // Let text paste through normally
        return;
      }
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          onFileAttach(file);
        }
      }
    }
  };

  return (
    <div className="border-t p-4">
      <form onSubmit={onSubmit} className="max-w-3xl mx-auto">
        {attachedFile && (
          <div className="mb-2 flex items-center gap-2 text-sm bg-muted p-2 rounded">
            <Paperclip className="h-4 w-4" />
            <span className="flex-1 truncate">{attachedFile.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onFileAttach(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf,.doc,.docx"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Paste a job description or ask a question..."
            className="min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || (!input.trim() && !attachedFile)}>
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}
```

**Step 2: Update ChatContainer to handle files**

Update `components/chat/ChatContainer.tsx`:

```tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

export function ChatContainer() {
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const { messages, sendMessage, status } = useChat();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !attachedFile) return;

    let messageText = input;

    // If file is attached, read its content and include in message
    if (attachedFile) {
      try {
        const fileContent = await attachedFile.text();
        messageText = input
          ? `${input}\n\n---\n\nAttached file (${attachedFile.name}):\n\n${fileContent}`
          : `Here is my resume:\n\n${fileContent}`;
      } catch {
        messageText = input || 'Unable to read file';
      }
    }

    sendMessage({ text: messageText });
    setInput('');
    setAttachedFile(null);
  };

  return (
    <div className="flex h-full flex-col">
      <MessageList messages={messages} status={status} />
      <ChatInput
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
        isLoading={status === 'streaming' || status === 'submitted'}
        attachedFile={attachedFile}
        onFileAttach={setAttachedFile}
      />
    </div>
  );
}
```

**Step 3: Verify file upload**

```bash
npm run dev
```

Test uploading a text file and sending.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add file upload and paste support to chat input"
```

---

## Task 9: Add Tool Call Display

**Files:**
- Create: `components/chat/ToolCallDisplay.tsx`
- Modify: `components/chat/MessageList.tsx`

**Step 1: Create ToolCallDisplay component**

Create `components/chat/ToolCallDisplay.tsx`:

```tsx
'use client';

import { Card } from '@/components/ui/card';
import { CheckCircle, Loader2 } from 'lucide-react';

interface ToolCallDisplayProps {
  toolName: string;
  state: 'call' | 'result';
  args?: Record<string, unknown>;
  result?: unknown;
}

const toolLabels: Record<string, string> = {
  getLibraryStatus: 'Checking library status',
  getAchievements: 'Fetching achievements',
  addAchievement: 'Adding achievement',
  addMultipleAchievements: 'Adding achievements',
  parseJobDescription: 'Analyzing job description',
  buildSuccessProfile: 'Building success profile',
  matchAchievements: 'Matching achievements',
  generateResume: 'Generating resume',
  generateDocxFile: 'Creating DOCX file',
  getPreferences: 'Loading preferences',
  updatePreferences: 'Updating preferences',
};

export function ToolCallDisplay({ toolName, state, args, result }: ToolCallDisplayProps) {
  const label = toolLabels[toolName] || toolName;
  const isComplete = state === 'result';

  return (
    <Card className="p-3 my-2 bg-muted/50">
      <div className="flex items-center gap-2 text-sm">
        {isComplete ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        <span className={isComplete ? 'text-muted-foreground' : ''}>
          {label}
          {isComplete && ' - Done'}
        </span>
      </div>
    </Card>
  );
}
```

**Step 2: Update MessageList to show tool calls**

Update `components/chat/MessageList.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import type { UIMessage } from 'ai';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MarkdownContent } from './MarkdownContent';
import { ToolCallDisplay } from './ToolCallDisplay';
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
                switch (part.type) {
                  case 'text':
                    return message.role === 'assistant' ? (
                      <MarkdownContent key={i} content={part.text} />
                    ) : (
                      <p key={i} className="whitespace-pre-wrap">{part.text}</p>
                    );
                  case 'tool-invocation':
                    return (
                      <ToolCallDisplay
                        key={i}
                        toolName={part.toolInvocation.toolName}
                        state={part.toolInvocation.state}
                        args={part.toolInvocation.args}
                        result={'result' in part.toolInvocation ? part.toolInvocation.result : undefined}
                      />
                    );
                  default:
                    return null;
                }
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
```

**Step 3: Verify tool calls display**

```bash
npm run dev
```

Send a message - tool calls should appear with loading/done states.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add tool call display in messages"
```

---

## Task 10: Add File Download Card for Generated Resumes

**Files:**
- Create: `components/chat/FileCard.tsx`
- Modify: `components/chat/MessageList.tsx`

**Step 1: Create FileCard component**

Create `components/chat/FileCard.tsx`:

```tsx
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
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add file download card component"
```

---

## Task 11: Test Full Chat Flow

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Test the full flow**

1. Open http://localhost:3000
2. Type "Hello, I want to tailor my resume for a job application"
3. Verify:
   - Message appears in chat
   - Agent responds with streaming text
   - Tool calls show loading/done states
   - Markdown renders correctly

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete Phase 2 chat UI implementation"
```

---

## Summary

Phase 2 creates:
- Collapsible sidebar with navigation
- Chat interface with `useChat` hook
- Message rendering with markdown support
- File upload (click + paste)
- Tool call display
- Auto-scroll to bottom
- File download cards

**Files created:**
- `components/layout/AppSidebar.tsx`
- `components/chat/ChatContainer.tsx`
- `components/chat/MessageList.tsx`
- `components/chat/ChatInput.tsx`
- `components/chat/MarkdownContent.tsx`
- `components/chat/ToolCallDisplay.tsx`
- `components/chat/FileCard.tsx`
- `components/ui/*` (shadcn components)

**Next Phase:** Auth + Persistence (chat history, library management page)
