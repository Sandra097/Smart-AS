'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Download, Trash2, MessageSquare, ArrowLeft } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useChatStore } from '@/lib/store';
import { formatDistanceToNow, exportConversation, downloadFile } from '@/lib/utils';

export default function HistoryPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const {
    conversations,
    setCurrentConversation,
    deleteConversation,
  } = useChatStore();

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.messages.some((msg) =>
      msg.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleSelectConversation = (id: string) => {
    setCurrentConversation(id);
    router.push('/');
  };

  const handleExport = async (conversationId: string) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation) return;

    const content = await exportConversation(conversation, 'text');
    downloadFile(content, `${conversation.title}.md`, 'text/markdown');
  };

  return (
    <div className="min-h-screen bg-light-gray dark:bg-gray-900 flex">
      <Sidebar />

      <main className="flex-1 ml-12 p-8">
        {/* Header */}
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-8"
          >
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              Conversation History
            </h1>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative mb-6"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-ms-blue focus:border-transparent transition-all"
            />
          </motion.div>

          {/* Conversations List */}
          {filteredConversations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <MessageSquare className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                No conversations found
              </h2>
              <p className="text-gray-500 dark:text-gray-500">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Start a new chat to begin'}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {filteredConversations.map((conversation, index) => (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-subtle transition-all cursor-pointer"
                  onClick={() => handleSelectConversation(conversation.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-800 dark:text-white truncate">
                        {conversation.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {conversation.messages.length} messages •{' '}
                        {formatDistanceToNow(conversation.updatedAt)}
                      </p>
                      {conversation.messages.length > 0 && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                          {conversation.messages[conversation.messages.length - 1].content}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExport(conversation.id);
                        }}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                        title="Export conversation"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this conversation?')) {
                            deleteConversation(conversation.id);
                          }
                        }}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
