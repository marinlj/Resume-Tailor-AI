'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
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
  const { messages, sendMessage, status } = useChat({
    id: conversationId,
    messages: initialMessages,
  });

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
