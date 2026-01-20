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

interface Conversation {
  id: string;
  title: string | null;
  updatedAt: string;
}

export function ConversationList() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const pathname = usePathname();
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
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/conversations')
      .then((res) => res.json())
      .then((data) => setConversations(data.conversations || []))
      .catch((err) => console.error('Failed to fetch conversations:', err));
  }, [pathname]);

  const handleRename = async (newTitle: string) => {
    if (!renameDialog.conversation) return;

    setIsLoading(true);
    setRenameError(null);
    try {
      const response = await fetch(`/api/conversations/${renameDialog.conversation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!response.ok) {
        setRenameError('Failed to rename conversation. Please try again.');
        return;
      }

      setConversations((prev) =>
        prev.map((c) =>
          c.id === renameDialog.conversation!.id ? { ...c, title: newTitle } : c
        )
      );
      setRenameDialog({ open: false, conversation: null });
    } catch (err) {
      console.error('Failed to rename conversation:', err);
      setRenameError('Failed to rename conversation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.conversation) return;

    setIsLoading(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/conversations/${deleteDialog.conversation.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        setDeleteError('Failed to delete conversation. Please try again.');
        return;
      }

      const deletedId = deleteDialog.conversation.id;
      setConversations((prev) => prev.filter((c) => c.id !== deletedId));
      setDeleteDialog({ open: false, conversation: null });

      // If we deleted the current conversation, redirect to home
      if (pathname === `/chat/${deletedId}`) {
        router.push('/');
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      setDeleteError('Failed to delete conversation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (conversations.length === 0) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton disabled>
          <span className="text-muted-foreground text-sm">No conversations yet</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  // Group by date
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const grouped = conversations.reduce<Record<string, Conversation[]>>(
    (acc, conv) => {
      const date = new Date(conv.updatedAt);
      let key = 'Older';
      if (date.toDateString() === today.toDateString()) {
        key = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = 'Yesterday';
      }
      if (!acc[key]) acc[key] = [];
      acc[key].push(conv);
      return acc;
    },
    {}
  );

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
                        className="text-destructive focus:text-destructive"
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
        onOpenChange={(open) => {
          setRenameDialog({ open, conversation: open ? renameDialog.conversation : null });
          if (!open) setRenameError(null);
        }}
        currentTitle={renameDialog.conversation?.title || ''}
        onRename={handleRename}
        loading={isLoading}
        error={renameError}
      />

      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          setDeleteDialog({ open, conversation: open ? deleteDialog.conversation : null });
          if (!open) setDeleteError(null);
        }}
        title="Delete conversation"
        description="Are you sure you want to delete this conversation? This action cannot be undone."
        onConfirm={handleDelete}
        loading={isLoading}
        error={deleteError}
      />
    </>
  );
}
