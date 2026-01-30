'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Sparkles, X } from 'lucide-react';
import { useAutosuggest } from '@/lib/autosuggest-context';

export default function SettingsToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  
  const {
    selectedUserId,
    autosuggestEnabled,
    setAutosuggestEnabled,
  } = useAutosuggest();

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get user display name from userId
  const getUserDisplayName = () => {
    if (!selectedUserId) return 'User';
    const namePart = selectedUserId.split('_').pop();
    return namePart ? namePart.charAt(0) + namePart.slice(1).toLowerCase() : 'User';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50" ref={panelRef}>
      {/* Settings Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`p-3 rounded-full shadow-lg transition-all ${
          isOpen
            ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800'
            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        title="Settings"
      >
        <Settings className="w-5 h-5" />
      </motion.button>

      {/* Settings Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-14 right-0 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Settings
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* User indicator */}
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Settings for: <span className="font-medium text-gray-700 dark:text-gray-300">{getUserDisplayName()}</span>
              </p>

              {/* Autosuggest Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className={`w-4 h-4 ${autosuggestEnabled ? 'text-purple-500' : 'text-gray-400'}`} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Autosuggest
                  </span>
                </div>
                
                {/* Toggle Switch */}
                <button
                  onClick={() => setAutosuggestEnabled(!autosuggestEnabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    autosuggestEnabled
                      ? 'bg-purple-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <motion.div
                    initial={false}
                    animate={{ x: autosuggestEnabled ? 20 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                  />
                </button>
              </div>

              {/* Status text */}
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {autosuggestEnabled
                  ? 'Suggestions will appear as you type'
                  : 'Suggestions are disabled'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
