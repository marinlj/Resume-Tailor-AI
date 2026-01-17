'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useMemo } from 'react';
import type { UIMessage } from 'ai';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

interface ChatContainerProps {
  conversationId?: string;
  initialMessages?: UIMessage[];
}

export function ChatContainer({ conversationId, initialMessages }: ChatContainerProps) {
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

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
          // Use API for PDF/DOCX files
          fileContent = await extractTextFromFile(attachedFile);
        } else {
          // Use direct text reading for txt/md files
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
        isLoading={status === 'streaming' || status === 'submitted' || isExtracting}
        attachedFile={attachedFile}
        onFileAttach={setAttachedFile}
      />
    </div>
  );
}
