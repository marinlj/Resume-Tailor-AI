'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  title: string | null;
  updatedAt: string;
}

export function ConversationList() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/conversations')
      .then((res) => res.json())
      .then((data) => setConversations(data.conversations || []));
  }, [pathname]);

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
                <SidebarMenuItem key={conv.id}>
                  <SidebarMenuButton
                    asChild
                    className={cn(
                      pathname === `/chat/${conv.id}` && 'bg-accent'
                    )}
                  >
                    <Link href={`/chat/${conv.id}`}>
                      <MessageSquare className="h-4 w-4" />
                      <span className="truncate">{conv.title || 'Untitled'}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </div>
          )
      )}
    </>
  );
}
