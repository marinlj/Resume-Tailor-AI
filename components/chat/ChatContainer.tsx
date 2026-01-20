'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { UIMessage } from 'ai';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { generateTitle } from '@/lib/utils';

interface ChatContainerProps {
  conversationId?: string;
  initialMessages?: UIMessage[];
}

export function ChatContainer({ conversationId, initialMessages }: ChatContainerProps) {
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(conversationId);
  const isCreatingConversation = useRef(false);

  // IMPORTANT: Keep transport stable across re-renders to prevent state loss
  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/chat' }),
    []
  );

  // IMPORTANT: useChat requires a stable ID for proper state management
  const chatId = useMemo(() => conversationId || 'default-chat', [conversationId]);

  const { messages, sendMessage, status } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
  });

  const [isExtracting, setIsExtracting] = useState(false);

  const saveMessages = useCallback(async (convId: string, msgs: UIMessage[]) => {
    try {
      const response = await fetch(`/api/conversations/${convId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs }),
      });
      if (!response.ok) {
        throw new Error('Failed to save messages');
      }
    } catch (err) {
      console.error('Failed to save messages:', err);
      setError('Failed to save messages. Your conversation may not be preserved.');
    }
  }, []);

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
    } catch (err) {
      console.error('Failed to create conversation:', err);
      setError('Failed to create conversation. Please try again.');
      return null;
    }
  }, []);

  // Helper to check if file needs server-side text extraction
  const needsExtraction = (file: File) => {
    const name = file.name.toLowerCase();
    return name.endsWith('.pdf') || name.endsWith('.docx');
  };

  // Extract text from PDF/DOCX files via API
  const extractTextFromFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/extract-text', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to extract text');
    }

    const data = await response.json();
    return data.text;
  };

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
      isCreatingConversation.current = false;

      if (!newId) {
        // Don't send message if conversation creation failed
        return;
      }

      setCurrentConversationId(newId);
      // Redirect to the new conversation URL
      router.push(`/chat/${newId}`);
    }

    sendMessage({ text: messageText });
    setInput('');
    setAttachedFile(null);
  };

  // Save messages after each exchange (debounced to avoid rapid API calls)
  useEffect(() => {
    if (!currentConversationId) return;
    if (messages.length === 0) return;
    if (status === 'streaming' || status === 'submitted') return;

    const timeoutId = setTimeout(() => {
      saveMessages(currentConversationId, messages);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [currentConversationId, messages, status, saveMessages]);

  return (
    <div className="flex h-full flex-col">
      {error && (
        <div className="mx-4 mt-2 flex items-center justify-between rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 hover:opacity-70"
            aria-label="Dismiss error"
          >
            &times;
          </button>
        </div>
      )}
      <MessageList messages={messages} status={status} />
      <ChatInput
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
        isLoading={status === 'streaming' || status === 'submitted' || isExtracting}
        attachedFile={attachedFile}
        onFileAttach={setAttachedFile}
      />
    </div>
  );
}
