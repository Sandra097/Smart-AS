'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { SUGGESTION_PILLS } from '@/lib/types';

interface SuggestionPillsProps {
  onPillClick: (prompt: string) => void;
}

export default function SuggestionPills({ onPillClick }: SuggestionPillsProps) {
  const row1 = SUGGESTION_PILLS.slice(0, 5);
  const row2 = SUGGESTION_PILLS.slice(5);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 mt-8">
      {/* Row 1 */}
      <div className="flex flex-wrap justify-center gap-3 mb-3">
        {row1.map((pill, index) => (
          <motion.button
            key={pill.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onPillClick(pill.prompt)}
            className="px-4 py-2.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 shadow-sm"
          >
            {pill.label}
          </motion.button>
        ))}
      </div>

      {/* Row 2 */}
      <div className="flex flex-wrap justify-center gap-3">
        {row2.map((pill, index) => (
          <motion.button
            key={pill.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (index + 5) * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onPillClick(pill.prompt)}
            className="px-4 py-2.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 shadow-sm"
          >
            {pill.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
