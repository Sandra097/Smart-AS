'use client';

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatMessage, { TypingIndicator } from './ChatMessage';
import { Message } from '@/lib/store';

interface ChatContainerProps {
  messages: Message[];
  streamingMessage?: string;
  isLoading?: boolean;
}

export default function ChatContainer({
  messages,
  streamingMessage,
  isLoading = false,
}: ChatContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth"
    >
      <div className="max-w-4xl mx-auto">
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
        </AnimatePresence>

        {/* Streaming Message */}
        {streamingMessage && (
          <ChatMessage
            message={{
              id: 'streaming',
              role: 'assistant',
              content: streamingMessage,
              timestamp: new Date(),
            }}
            isStreaming={true}
          />
        )}

        {/* Loading Indicator */}
        {isLoading && !streamingMessage && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
