'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Trash2 } from 'lucide-react';
import { Conversation, useChatStore } from '@/lib/store';
import { formatDistanceToNow } from '@/lib/utils';

interface ConversationListProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
}

export default function ConversationList({
  conversations,
  currentConversationId,
  onSelectConversation,
  onDeleteConversation,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No conversations yet</p>
        <p className="text-sm">Start a new chat to begin</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conversation) => (
        <motion.div
          key={conversation.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.02 }}
          className={`group relative p-3 rounded-lg cursor-pointer transition-all ${
            currentConversationId === conversation.id
              ? 'bg-ms-blue text-white'
              : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
          }`}
          onClick={() => onSelectConversation(conversation.id)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate text-sm">
                {conversation.title}
              </h3>
              <p
                className={`text-xs truncate mt-1 ${
                  currentConversationId === conversation.id
                    ? 'text-white/70'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {conversation.messages.length} messages • {formatDistanceToNow(conversation.updatedAt)}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteConversation(conversation.id);
              }}
              className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                currentConversationId === conversation.id
                  ? 'hover:bg-white/20 text-white'
                  : 'hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500'
              }`}
              title="Delete conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
