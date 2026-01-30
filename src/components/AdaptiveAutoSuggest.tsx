'use client';

import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAutosuggest } from '@/lib/autosuggest-context';

interface AdaptiveAutoSuggestProps {
  query: string;
  isVisible: boolean;
  onSelectSuggestion: (suggestion: string) => void;
}

export default function AdaptiveAutoSuggest({
  query,
  isVisible,
  onSelectSuggestion,
}: AdaptiveAutoSuggestProps) {
  const { 
    isLoaded,
    selectedUserProfile,
    getSuggestions,
    getAISuggestions,
    getConfig,
    isAILoading,
    useAI,
  } = useAutosuggest();

  const [shouldShow, setShouldShow] = useState(false);
  const [lastTriggerLength, setLastTriggerLength] = useState(0);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [lastAIQuery, setLastAIQuery] = useState('');
  const previousQueryRef = useRef('');
  const lastTypingTimeRef = useRef<number>(Date.now());
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fetchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const config = getConfig();

  // Fetch AI suggestions with debounce to prevent flickering
  useEffect(() => {
    if (!useAI || !isVisible || !shouldShow) return;
    
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < config.minPrefixLength) return;
    if (trimmedQuery === lastAIQuery) return;
    
    // Clear previous fetch timer
    if (fetchTimerRef.current) {
      clearTimeout(fetchTimerRef.current);
    }
    
    // If the query doesn't start with the last query, clear old suggestions immediately
    // This prevents showing stale suggestions for a completely different query
    if (lastAIQuery && !trimmedQuery.toLowerCase().startsWith(lastAIQuery.toLowerCase())) {
      setAiSuggestions([]);
    }
    
    // Debounce the fetch by 300ms to prevent rapid requests
    fetchTimerRef.current = setTimeout(async () => {
      try {
        const suggestions = await getAISuggestions(trimmedQuery);
        // Only update if we got results and the query hasn't changed
        if (suggestions && suggestions.length > 0) {
          setAiSuggestions(suggestions);
        } else {
          setAiSuggestions([]);
        }
        setLastAIQuery(trimmedQuery);
      } catch (err) {
        console.error('Failed to fetch AI suggestions:', err);
        setAiSuggestions([]);
      }
    }, 300);
    
    return () => {
      if (fetchTimerRef.current) {
        clearTimeout(fetchTimerRef.current);
      }
    };
  }, [query, isVisible, shouldShow, useAI, config.minPrefixLength, getAISuggestions, lastAIQuery]);

  // Handle triggering based on CTR-based trigger mode
  useEffect(() => {
    if (!isVisible) {
      setShouldShow(false);
      setLastTriggerLength(0);
      setLastAIQuery(''); // Reset AI query tracking
      setAiSuggestions([]); // Clear suggestions
      previousQueryRef.current = '';
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
      }
      return;
    }

    const currentLength = query.trim().length;
    const previousLength = previousQueryRef.current.trim().length;
    previousQueryRef.current = query;
    lastTypingTimeRef.current = Date.now();

    // Clear any pending pause timer
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }

    // Reset if query is cleared or shortened significantly
    if (currentLength === 0) {
      setShouldShow(false);
      setLastTriggerLength(0);
      setAiSuggestions([]);
      return;
    }

    // Check if we meet the minimum prefix length
    if (currentLength < config.minPrefixLength) {
      setShouldShow(false);
      return;
    }

    // Trigger based on mode
    switch (config.triggerMode) {
      case 'disabled':
        // Never show suggestions for zero CTR users
        setShouldShow(false);
        break;

      case 'continuous':
        // Show on every keystroke (for very high CTR users)
        // Only set if not already showing to prevent flickering
        if (!shouldShow) {
          setShouldShow(true);
        }
        setLastTriggerLength(currentLength);
        break;

      case 'interval':
        // Show every N characters (for medium/high CTR users)
        const charsSinceLastTrigger = currentLength - lastTriggerLength;
        const isFirstValidPrefix = lastTriggerLength === 0 && currentLength >= config.minPrefixLength;
        const shouldTriggerByInterval = charsSinceLastTrigger >= config.triggerEveryNChars;

        if (isFirstValidPrefix || shouldTriggerByInterval) {
          if (!shouldShow) {
            setShouldShow(true);
          }
          setLastTriggerLength(currentLength);
        }
        break;

      case 'pause':
        // Only show when user pauses typing (for low CTR or fast typing users)
        // Keep showing if already visible, just reset the timer
        // Set timer to show after pause
        pauseTimerRef.current = setTimeout(() => {
          if (query.trim().length >= config.minPrefixLength) {
            setShouldShow(true);
            setLastTriggerLength(query.trim().length);
          }
        }, config.pauseThresholdMs);
        break;
    }

    return () => {
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
      }
    };
  }, [query, isVisible, config.minPrefixLength, config.triggerEveryNChars, config.triggerMode, config.pauseThresholdMs, lastTriggerLength, shouldShow]);

  const result = useMemo(() => {
    if (!isLoaded) return null;
    return getSuggestions(query);
  }, [query, isLoaded, getSuggestions]);

  // Only show AI suggestions if they match the current query
  const displaySuggestions = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    
    // Only show AI suggestions if they were generated for the current prefix
    // Check if the lastAIQuery matches or is a prefix of the current query
    if (useAI && aiSuggestions.length > 0) {
      const normalizedLastQuery = lastAIQuery.toLowerCase();
      // Only show if the suggestions were generated for this exact query or the query starts with lastAIQuery
      if (trimmedQuery === normalizedLastQuery || trimmedQuery.startsWith(normalizedLastQuery)) {
        // Also verify suggestions actually match the current query
        const matchingSuggestions = aiSuggestions.filter(s => 
          s.toLowerCase().startsWith(trimmedQuery)
        );
        if (matchingSuggestions.length > 0) {
          return matchingSuggestions.slice(0, config.maxSuggestions).map((text, idx) => ({
            text,
            position: idx + 1,
            score: 100 - idx * 10,
            source: 'ai',
          }));
        }
      }
    }
    
    // If AI is loading for this query, show loading indicator (return empty)
    if (isAILoading) {
      return [];
    }
    
    // No matching suggestions available
    return [];
  }, [useAI, aiSuggestions, config.maxSuggestions, isAILoading, query, lastAIQuery]);

  // Don't show if not ready
  if (!isLoaded || !result || !isVisible || !shouldShow) {
    return null;
  }

  // Don't show if disabled or no suggestions (check both AI and static)
  if (!result.enabled || (displaySuggestions.length === 0 && !isAILoading)) {
    return null;
  }

  const trimmedQuery = query.trim().toLowerCase();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.15 }}
        className="mt-2 z-50"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Loading state */}
          {isAILoading && displaySuggestions.length === 0 && (
            <div className="px-4 py-4 flex items-center gap-3 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Generating suggestions...</span>
            </div>
          )}

          {/* Suggestions list */}
          <ul className="py-1">
            {displaySuggestions.map((suggestion, index) => (
              <motion.li
                key={suggestion.text}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.03, duration: 0.15 }}
              >
                <button
                  onClick={() => onSelectSuggestion(suggestion.text)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <span className="text-gray-800 dark:text-gray-200 text-sm">
                    {highlightQuery(suggestion.text, trimmedQuery)}
                  </span>
                </button>
              </motion.li>
            ))}
          </ul>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Helper function to highlight the query portion at the start
function highlightQuery(text: string, query: string): React.ReactNode {
  if (!query) {
    return text;
  }

  const lowerText = text.toLowerCase();
  
  // Check if text starts with the query
  if (lowerText.startsWith(query)) {
    return (
      <>
        <span className="text-gray-800 dark:text-gray-200">{text.slice(0, query.length)}</span>
        <span className="text-gray-500 dark:text-gray-400">{text.slice(query.length)}</span>
      </>
    );
  }

  // Otherwise just return the text
  return text;
}
