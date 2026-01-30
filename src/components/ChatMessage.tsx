'use client';

import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, User, Bot } from 'lucide-react';
import { Message } from '@/lib/store';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export default function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const [copied, setCopied] = React.useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-4 p-4 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full copilot-icon-gradient flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
        </div>
      )}

      {/* Message Content */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-ms-blue text-white'
            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');

                  if (!inline && match) {
                    return (
                      <div className="relative group">
                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(codeString);
                            }}
                            className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            borderRadius: '8px',
                            fontSize: '14px',
                          }}
                          {...props}
                        >
                          {codeString}
                        </SyntaxHighlighter>
                      </div>
                    );
                  }

                  return (
                    <code
                      className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                p({ children }) {
                  return <p className="mb-2 last:mb-0">{children}</p>;
                },
                ul({ children }) {
                  return <ul className="list-disc pl-4 mb-2">{children}</ul>;
                },
                ol({ children }) {
                  return <ol className="list-decimal pl-4 mb-2">{children}</ol>;
                },
                li({ children }) {
                  return <li className="mb-1">{children}</li>;
                },
                a({ href, children }) {
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ms-blue hover:underline"
                    >
                      {children}
                    </a>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>

            {/* Streaming Indicator */}
            {isStreaming && (
              <span className="inline-flex ml-1">
                <span className="typing-dot w-1.5 h-1.5 bg-gray-400 rounded-full mx-0.5"></span>
                <span className="typing-dot w-1.5 h-1.5 bg-gray-400 rounded-full mx-0.5"></span>
                <span className="typing-dot w-1.5 h-1.5 bg-gray-400 rounded-full mx-0.5"></span>
              </span>
            )}
          </div>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 bg-white/10 rounded px-2 py-1 text-sm"
              >
                <span>{attachment.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Copy Button for Assistant Messages */}
        {!isUser && !isStreaming && (
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-ms-blue flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Typing indicator component
export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4 p-4"
    >
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full copilot-icon-gradient flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full"></span>
          <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full"></span>
          <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full"></span>
        </div>
      </div>
    </motion.div>
  );
}
