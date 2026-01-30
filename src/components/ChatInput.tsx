'use client';

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronDown, Mic, MicOff, ArrowUp, Paperclip, X } from 'lucide-react';
import AdaptiveAutoSuggest from './AdaptiveAutoSuggest';

interface ChatInputProps {
  onSendMessage: (message: string, attachments?: File[]) => void;
  onVoiceInput?: () => void;
  isLoading?: boolean;
  isRecording?: boolean;
  placeholder?: string;
  initialValue?: string;
  showAutoSuggest?: boolean;
}

export default function ChatInput({
  onSendMessage,
  onVoiceInput,
  isLoading = false,
  isRecording = false,
  placeholder = 'Message Copilot',
  initialValue = '',
  showAutoSuggest = true,
}: ChatInputProps) {
  const [message, setMessage] = useState(initialValue);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [selectedMode, setSelectedMode] = useState('Smart');
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const modes = ['Smart', 'Creative', 'Precise', 'Balanced'];

  useEffect(() => {
    setMessage(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show suggestions when focused
  useEffect(() => {
    if (isFocused && showAutoSuggest) {
      setShowSuggestions(true);
    }
  }, [isFocused, showAutoSuggest]);

  const handleSubmit = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim(), attachments.length > 0 ? attachments : undefined);
      setMessage('');
      setAttachments([]);
      setShowSuggestions(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setMessage(suggestion);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div ref={containerRef} className="w-full max-w-3xl mx-auto px-4 relative">
      {/* Attachments Preview */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex flex-wrap gap-2 mb-2"
          >
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-1.5 text-sm"
              >
                <Paperclip className="w-4 h-4 text-gray-500" />
                <span className="truncate max-w-[150px]">{file.name}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-gray-500 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Input Container */}
      <motion.div
        className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden transition-shadow duration-200 ${
          isFocused ? 'shadow-lg ring-1 ring-gray-300 dark:ring-gray-600' : ''
        }`}
      >
        {/* Textarea Row */}
        <div className="px-4 pt-3 pb-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            rows={1}
            className="w-full resize-none bg-transparent border-none outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 text-base leading-6 max-h-[200px]"
            disabled={isLoading}
          />
        </div>

        {/* Bottom Row with buttons */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          <div className="flex items-center gap-1">
            {/* Attachment Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              title="Add attachment"
            >
              <Plus className="w-5 h-5" />
            </motion.button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />

            {/* Mode Dropdown */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowModeDropdown(!showModeDropdown)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              >
                {selectedMode}
                <ChevronDown className="w-4 h-4" />
              </motion.button>

              <AnimatePresence>
                {showModeDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-10 min-w-[120px]"
                  >
                    {modes.map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setSelectedMode(mode);
                          setShowModeDropdown(false);
                        }}
                        className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                          selectedMode === mode
                            ? 'text-gray-900 dark:text-white font-medium'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Voice Input Button - shown when no text */}
            {!message.trim() && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onVoiceInput}
                className={`p-2 rounded-lg transition-all ${
                  isRecording
                    ? 'text-red-500 bg-red-100 dark:bg-red-900/30 recording-pulse'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={isRecording ? 'Stop recording' : 'Voice input'}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </motion.button>
            )}

            {/* Send Button - shown when there's text */}
            <AnimatePresence>
              {message.trim() && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="p-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-200 transition-all disabled:opacity-50"
                  title="Send message"
                >
                  <ArrowUp className="w-5 h-5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Adaptive AutoSuggest - Below the input */}
      {showAutoSuggest && (
        <AdaptiveAutoSuggest
          query={message}
          isVisible={showSuggestions && !isLoading}
          onSelectSuggestion={handleSelectSuggestion}
        />
      )}
    </div>
  );
}
