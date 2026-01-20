# Chat History Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement persistent chat history with conversation creation, message saving, and sidebar actions (rename/delete).

**Architecture:** Modify ChatContainer to create conversations on first message and persist messages after each exchange. Add dropdown menu to ConversationList for rename/delete actions.

**Tech Stack:** Next.js, React, AI SDK useChat, Prisma, shadcn/ui (DropdownMenu, AlertDialog, Dialog)

---

## Task 1: Add Dialog Component from shadcn

**Files:**
- Create: `components/ui/dialog.tsx`

**Step 1: Install Dialog component**

Run: `npx shadcn@latest add dialog`

Expected: Dialog component added to `components/ui/dialog.tsx`

**Step 2: Verify installation**

Run: `ls components/ui/dialog.tsx`

Expected: File exists

**Step 3: Commit**

```bash
git add components/ui/dialog.tsx
git commit -m "chore: add shadcn dialog component"
```

---

## Task 2: Add generateTitle Utility Function

**Files:**
- Modify: `lib/utils.ts`

**Step 1: Add generateTitle function**

Add to `lib/utils.ts`:

```typescript
/**
 * Generate a conversation title from the first message.
 * Extracts first ~50 characters, cutting at word boundary.
 */
export function generateTitle(message: string): string {
  const cleaned = message.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= 50) return cleaned;

  const truncated = cleaned.slice(0, 50);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > 20) {
    return truncated.slice(0, lastSpace) + '...';
  }
  return truncated + '...';
}
```

**Step 2: Commit**

```bash
git add lib/utils.ts
git commit -m "feat: add generateTitle utility for conversation titles"
```

---

## Task 3: Add Conversation Persistence to ChatContainer

**Files:**
- Modify: `components/chat/ChatContainer.tsx`

**Step 1: Add imports and state**

Add these imports at the top:

```typescript
import { useRouter } from 'next/navigation';
import { useRef, useCallback } from 'react';
import { generateTitle } from '@/lib/utils';
```

Update the useState imports:

```typescript
import { useState, useMemo, useRef, useCallback } from 'react';
```

**Step 2: Add router and conversation tracking state**

Inside the component, after the existing state declarations, add:

```typescript
const router = useRouter();
const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(conversationId);
const isCreatingConversation = useRef(false);
```

**Step 3: Add saveMessages function**

Add this function inside the component:

```typescript
const saveMessages = useCallback(async (convId: string, msgs: UIMessage[]) => {
  try {
    await fetch(`/api/conversations/${convId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: msgs }),
    });
  } catch (error) {
    console.error('Failed to save messages:', error);
  }
}, []);
```

**Step 4: Add createConversation function**

Add this function inside the component:

```typescript
const createConversation = useCallback(async (firstMessage: string): Promise<string | null> => {
  try {
    const title = generateTitle(firstMessage);
    const response = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        messages: [{ role: 'user', content: firstMessage }],
      }),
    });

    if (!response.ok) throw new Error('Failed to create conversation');

    const data = await response.json();
    return data.conversation.id;
  } catch (error) {
    console.error('Failed to create conversation:', error);
    return null;
  }
}, []);
```

**Step 5: Modify handleSubmit to handle persistence**

Replace the entire `handleSubmit` function:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!input.trim() && !attachedFile) return;

  let messageText = input;

  // If file is attached, read its content and include in message
  if (attachedFile) {
    try {
      setIsExtracting(true);
      let fileContent: string;

      if (needsExtraction(attachedFile)) {
        fileContent = await extractTextFromFile(attachedFile);
      } else {
        fileContent = await attachedFile.text();
      }

      messageText = input
        ? `${input}\n\n---\n\nAttached file (${attachedFile.name}):\n\n${fileContent}`
        : `Here is my resume:\n\n${fileContent}`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unable to read file';
      messageText = input || errorMessage;
    } finally {
      setIsExtracting(false);
    }
  }

  // If no conversation exists, create one first
  if (!currentConversationId && !isCreatingConversation.current) {
    isCreatingConversation.current = true;
    const newId = await createConversation(messageText);

    if (newId) {
      setCurrentConversationId(newId);
      // Redirect to the new conversation URL
      router.push(`/chat/${newId}`);
    }
    isCreatingConversation.current = false;
  }

  sendMessage({ text: messageText });
  setInput('');
  setAttachedFile(null);
};
```

**Step 6: Add effect to save messages after AI responds**

Add this useEffect after the existing hooks:

```typescript
// Save messages after each exchange
useEffect(() => {
  if (!currentConversationId) return;
  if (messages.length === 0) return;
  if (status === 'streaming' || status === 'submitted') return;

  // Only save when we have messages and status is ready/error
  saveMessages(currentConversationId, messages);
}, [currentConversationId, messages, status, saveMessages]);
```

**Step 7: Commit**

```bash
git add components/chat/ChatContainer.tsx
git commit -m "feat: add conversation persistence to ChatContainer

- Create conversation on first message
- Redirect to /chat/{id} after creation
- Save messages after each AI response"
```

---

## Task 4: Create RenameDialog Component

**Files:**
- Create: `components/layout/RenameDialog.tsx`

**Step 1: Create RenameDialog component**

Create `components/layout/RenameDialog.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTitle: string;
  onRename: (newTitle: string) => void;
  loading?: boolean;
}

export function RenameDialog({
  open,
  onOpenChange,
  currentTitle,
  onRename,
  loading = false,
}: RenameDialogProps) {
  const [title, setTitle] = useState(currentTitle);

  // Reset title when dialog opens with new currentTitle
  useEffect(() => {
    if (open) {
      setTitle(currentTitle);
    }
  }, [open, currentTitle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onRename(title.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename chat</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Chat title"
            autoFocus
            disabled={loading}
          />
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Commit**

```bash
git add components/layout/RenameDialog.tsx
git commit -m "feat: add RenameDialog component for conversation renaming"
```

---

## Task 5: Update ConversationList with Actions Menu

**Files:**
- Modify: `components/layout/ConversationList.tsx`

**Step 1: Add imports**

Replace the imports section:

```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RenameDialog } from './RenameDialog';
import { DeleteConfirmDialog } from '@/components/library/DeleteConfirmDialog';
```

**Step 2: Add state for dialogs and actions**

Inside the component, after the existing state, add:

```typescript
const router = useRouter();
const [renameDialog, setRenameDialog] = useState<{ open: boolean; conversation: Conversation | null }>({
  open: false,
  conversation: null,
});
const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; conversation: Conversation | null }>({
  open: false,
  conversation: null,
});
const [isLoading, setIsLoading] = useState(false);
```

**Step 3: Add rename handler**

Add this function:

```typescript
const handleRename = async (newTitle: string) => {
  if (!renameDialog.conversation) return;

  setIsLoading(true);
  try {
    const response = await fetch(`/api/conversations/${renameDialog.conversation.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    });

    if (response.ok) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === renameDialog.conversation!.id ? { ...c, title: newTitle } : c
        )
      );
      setRenameDialog({ open: false, conversation: null });
    }
  } catch (error) {
    console.error('Failed to rename conversation:', error);
  } finally {
    setIsLoading(false);
  }
};
```

**Step 4: Add delete handler**

Add this function:

```typescript
const handleDelete = async () => {
  if (!deleteDialog.conversation) return;

  setIsLoading(true);
  try {
    const response = await fetch(`/api/conversations/${deleteDialog.conversation.id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      setConversations((prev) => prev.filter((c) => c.id !== deleteDialog.conversation!.id));
      setDeleteDialog({ open: false, conversation: null });

      // If we deleted the current conversation, redirect to home
      if (pathname === `/chat/${deleteDialog.conversation.id}`) {
        router.push('/');
      }
    }
  } catch (error) {
    console.error('Failed to delete conversation:', error);
  } finally {
    setIsLoading(false);
  }
};
```

**Step 5: Update the conversation list rendering**

Replace the return statement (the part that renders conversations) with:

```typescript
return (
  <>
    {['Today', 'Yesterday', 'Older'].map(
      (period) =>
        grouped[period] && (
          <div key={period}>
            <p className="text-xs text-muted-foreground px-2 py-1">{period}</p>
            {grouped[period].map((conv) => (
              <SidebarMenuItem key={conv.id} className="group/item">
                <SidebarMenuButton
                  asChild
                  className={cn(
                    'pr-8',
                    pathname === `/chat/${conv.id}` && 'bg-accent'
                  )}
                >
                  <Link href={`/chat/${conv.id}`}>
                    <MessageSquare className="h-4 w-4" />
                    <span className="truncate">{conv.title || 'Untitled'}</span>
                  </Link>
                </SidebarMenuButton>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover/item:opacity-100 hover:bg-accent"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setRenameDialog({ open: true, conversation: conv })}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteDialog({ open: true, conversation: conv })}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            ))}
          </div>
        )
    )}

    <RenameDialog
      open={renameDialog.open}
      onOpenChange={(open) => setRenameDialog({ open, conversation: open ? renameDialog.conversation : null })}
      currentTitle={renameDialog.conversation?.title || ''}
      onRename={handleRename}
      loading={isLoading}
    />

    <DeleteConfirmDialog
      open={deleteDialog.open}
      onOpenChange={(open) => setDeleteDialog({ open, conversation: open ? deleteDialog.conversation : null })}
      title="Delete conversation"
      description="Are you sure you want to delete this conversation? This action cannot be undone."
      onConfirm={handleDelete}
      loading={isLoading}
    />
  </>
);
```

**Step 6: Commit**

```bash
git add components/layout/ConversationList.tsx
git commit -m "feat: add rename and delete actions to conversation list

- Three-dot menu appears on hover
- Rename opens dialog to edit title
- Delete shows confirmation then removes conversation"
```

---

## Task 6: Test End-to-End Flow

**Step 1: Start development server**

Run: `npm run dev`

**Step 2: Manual testing checklist**

Test the following scenarios:

1. **New conversation creation:**
   - Go to `/` (home page)
   - Type a message and send
   - Verify URL changes to `/chat/{id}`
   - Verify conversation appears in sidebar

2. **Message persistence:**
   - Send a message in a conversation
   - Refresh the page
   - Verify messages are still there

3. **Rename conversation:**
   - Hover over a conversation in sidebar
   - Click three-dot menu → Rename
   - Enter new title and save
   - Verify title updates in sidebar

4. **Delete conversation:**
   - Hover over a conversation in sidebar
   - Click three-dot menu → Delete
   - Confirm deletion
   - Verify conversation is removed
   - If viewing deleted conversation, verify redirect to home

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete chat history implementation

Adds persistent chat history with:
- Conversation creation on first message
- Auto-generated titles from first message
- Message persistence after each exchange
- Sidebar actions: rename and delete conversations"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add Dialog component | `components/ui/dialog.tsx` |
| 2 | Add generateTitle utility | `lib/utils.ts` |
| 3 | Add persistence to ChatContainer | `components/chat/ChatContainer.tsx` |
| 4 | Create RenameDialog | `components/layout/RenameDialog.tsx` |
| 5 | Update ConversationList with actions | `components/layout/ConversationList.tsx` |
| 6 | Test end-to-end | Manual testing |
