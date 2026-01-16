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
