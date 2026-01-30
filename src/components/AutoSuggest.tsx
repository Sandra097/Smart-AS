'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Code, 
  Lightbulb, 
  Palette, 
  BookOpen, 
  Rocket,
  Brain,
  Zap,
  Globe,
  Music,
  Film,
  Gamepad2,
  ChefHat,
  Plane,
  Heart,
  TrendingUp
} from 'lucide-react';

// Interesting suggestions to show before user starts typing
export const FEATURED_SUGGESTIONS = [
  {
    id: 'explain-quantum',
    text: 'Explain quantum computing like I\'m 10 years old',
    icon: Brain,
    category: 'learning',
  },
  {
    id: 'write-poem',
    text: 'Write a poem about coding at midnight',
    icon: Sparkles,
    category: 'creative',
  },
  {
    id: 'debug-code',
    text: 'Help me debug this JavaScript error',
    icon: Code,
    category: 'coding',
  },
  {
    id: 'story-idea',
    text: 'Give me a unique sci-fi story idea',
    icon: Rocket,
    category: 'creative',
  },
  {
    id: 'learn-language',
    text: 'Teach me 5 useful phrases in Japanese',
    icon: Globe,
    category: 'learning',
  },
  {
    id: 'recipe',
    text: 'What can I cook with chicken, rice, and vegetables?',
    icon: ChefHat,
    category: 'lifestyle',
  },
  {
    id: 'travel-tips',
    text: 'Best hidden gems to visit in Italy',
    icon: Plane,
    category: 'travel',
  },
  {
    id: 'workout',
    text: 'Create a 15-minute morning workout routine',
    icon: Heart,
    category: 'health',
  },
  {
    id: 'movie-rec',
    text: 'Recommend a mind-bending movie like Inception',
    icon: Film,
    category: 'entertainment',
  },
  {
    id: 'game-idea',
    text: 'Design a simple game concept I could build',
    icon: Gamepad2,
    category: 'gaming',
  },
  {
    id: 'productivity',
    text: 'Share 5 productivity hacks for developers',
    icon: Zap,
    category: 'productivity',
  },
  {
    id: 'music-theory',
    text: 'Explain music theory basics for beginners',
    icon: Music,
    category: 'learning',
  },
  {
    id: 'startup-idea',
    text: 'Brainstorm a SaaS startup idea for 2026',
    icon: TrendingUp,
    category: 'business',
  },
  {
    id: 'color-palette',
    text: 'Suggest a modern color palette for a tech website',
    icon: Palette,
    category: 'design',
  },
  {
    id: 'book-summary',
    text: 'Summarize "Atomic Habits" in 3 key points',
    icon: BookOpen,
    category: 'learning',
  },
  {
    id: 'fun-facts',
    text: 'Tell me 3 mind-blowing facts about space',
    icon: Lightbulb,
    category: 'trivia',
  },
];

// Prefix-based suggestions database
export const PREFIX_SUGGESTIONS: Record<string, string[]> = {
  'how': [
    'How do I center a div in CSS?',
    'How does machine learning work?',
    'How to make a good first impression?',
    'How can I improve my memory?',
    'How to start investing in stocks?',
  ],
  'what': [
    'What is the difference between React and Vue?',
    'What are the best practices for REST APIs?',
    'What should I learn after JavaScript?',
    'What causes climate change?',
    'What is quantum entanglement?',
  ],
  'why': [
    'Why is the sky blue?',
    'Why do we dream?',
    'Why is TypeScript better than JavaScript?',
    'Why do cats purr?',
    'Why is sleep important for productivity?',
  ],
  'can': [
    'Can you explain recursion with an example?',
    'Can you write a Python script to sort files?',
    'Can AI become sentient?',
    'Can you help me prepare for a job interview?',
    'Can you create a meal plan for weight loss?',
  ],
  'help': [
    'Help me write a professional email',
    'Help me understand async/await in JavaScript',
    'Help me create a workout routine',
    'Help me plan a birthday party',
    'Help me debug this code',
  ],
  'write': [
    'Write a haiku about programming',
    'Write a cover letter for a software engineer position',
    'Write a short story about time travel',
    'Write a LinkedIn post about my new project',
    'Write unit tests for this function',
  ],
  'create': [
    'Create a regex for email validation',
    'Create a weekly meal plan',
    'Create a study schedule for learning Python',
    'Create a marketing tagline for my app',
    'Create a character for my story',
  ],
  'explain': [
    'Explain blockchain in simple terms',
    'Explain the difference between HTTP and HTTPS',
    'Explain how neural networks learn',
    'Explain the theory of relativity',
    'Explain CSS flexbox vs grid',
  ],
  'give': [
    'Give me 5 project ideas for my portfolio',
    'Give me tips for public speaking',
    'Give me a motivational quote',
    'Give me feedback on my resume',
    'Give me book recommendations for entrepreneurs',
  ],
  'tell': [
    'Tell me a joke about programming',
    'Tell me about the history of the internet',
    'Tell me an interesting fact about the ocean',
    'Tell me about emerging tech trends in 2026',
    'Tell me a bedtime story',
  ],
  'make': [
    'Make a list of healthy snacks',
    'Make a comparison between Python and JavaScript',
    'Make a checklist for launching a website',
    'Make suggestions for my vacation in Japan',
    'Make a budget template for me',
  ],
  'show': [
    'Show me how to use Git branches',
    'Show me examples of good UI design',
    'Show me how to meditate properly',
    'Show me the steps to deploy on Vercel',
    'Show me how to solve this math problem',
  ],
  'code': [
    'Code a simple todo app in React',
    'Code a function to reverse a string',
    'Code a REST API endpoint in Node.js',
    'Code a binary search algorithm',
    'Code a responsive navbar in CSS',
  ],
  'design': [
    'Design a database schema for a blog',
    'Design a logo concept for a coffee shop',
    'Design an API for a social media app',
    'Design a landing page layout',
    'Design a mobile app user flow',
  ],
  'plan': [
    'Plan a 7-day trip to Paris',
    'Plan my week for maximum productivity',
    'Plan a healthy diet for muscle gain',
    'Plan a product launch strategy',
    'Plan a learning roadmap for web development',
  ],
};

interface AutoSuggestProps {
  query: string;
  isVisible: boolean;
  onSelectSuggestion: (suggestion: string) => void;
  maxSuggestions?: number;
}

export default function AutoSuggest({
  query,
  isVisible,
  onSelectSuggestion,
  maxSuggestions = 6,
}: AutoSuggestProps) {
  const suggestions = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();

    // If no query, show featured suggestions (random selection)
    if (!trimmedQuery) {
      // Shuffle and pick random featured suggestions
      const shuffled = [...FEATURED_SUGGESTIONS].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, maxSuggestions).map((s) => ({
        text: s.text,
        icon: s.icon,
        isFeatured: true,
      }));
    }

    // Find prefix-based suggestions
    const matchingSuggestions: { text: string; icon?: typeof Sparkles; isFeatured: boolean }[] = [];

    // Check all prefix categories
    for (const [prefix, suggestions] of Object.entries(PREFIX_SUGGESTIONS)) {
      if (trimmedQuery.startsWith(prefix)) {
        // Filter suggestions that match the current query
        const filtered = suggestions.filter((s) =>
          s.toLowerCase().startsWith(trimmedQuery) ||
          s.toLowerCase().includes(trimmedQuery)
        );
        matchingSuggestions.push(
          ...filtered.map((text) => ({ text, isFeatured: false }))
        );
      }
    }

    // Also search through all suggestions for partial matches
    if (matchingSuggestions.length < maxSuggestions) {
      for (const suggestions of Object.values(PREFIX_SUGGESTIONS)) {
        for (const suggestion of suggestions) {
          if (
            suggestion.toLowerCase().includes(trimmedQuery) &&
            !matchingSuggestions.some((s) => s.text === suggestion)
          ) {
            matchingSuggestions.push({ text: suggestion, isFeatured: false });
          }
        }
      }
    }

    // Also search featured suggestions
    const featuredMatches = FEATURED_SUGGESTIONS.filter(
      (s) =>
        s.text.toLowerCase().includes(trimmedQuery) &&
        !matchingSuggestions.some((ms) => ms.text === s.text)
    ).map((s) => ({ text: s.text, icon: s.icon, isFeatured: true }));

    matchingSuggestions.push(...featuredMatches);

    return matchingSuggestions.slice(0, maxSuggestions);
  }, [query, maxSuggestions]);

  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  const isFeaturedMode = !query.trim();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="absolute bottom-full left-0 right-0 mb-2 z-50"
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {isFeaturedMode && (
            <div className="px-4 py-2 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span>Try asking...</span>
              </div>
            </div>
          )}

          <ul className="py-1 max-h-[300px] overflow-y-auto">
            {suggestions.map((suggestion, index) => {
              const IconComponent = suggestion.icon || Lightbulb;

              return (
                <motion.li
                  key={suggestion.text}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <button
                    onClick={() => onSelectSuggestion(suggestion.text)}
                    className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                  >
                    {suggestion.isFeatured && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 flex items-center justify-center">
                        <IconComponent className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                    )}
                    <span className="flex-1 text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                      {highlightMatch(suggestion.text, query)}
                    </span>
                    <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Press to use
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </ul>

          {!isFeaturedMode && (
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Press <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">↑</kbd>{' '}
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">↓</kbd> to navigate,{' '}
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Enter</kbd> to select
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Helper function to highlight matching text
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) {
    return text;
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) {
    return text;
  }

  return (
    <>
      {text.slice(0, index)}
      <span className="font-semibold text-ms-blue">{text.slice(index, index + lowerQuery.length)}</span>
      {text.slice(index + lowerQuery.length)}
    </>
  );
}

// Export for external customization
export { highlightMatch };
