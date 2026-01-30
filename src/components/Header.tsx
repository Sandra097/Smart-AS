'use client';

import React, { useMemo } from 'react';
import UserSelector from './UserSelector';
import { useAutosuggest } from '@/lib/autosuggest-context';

interface HeaderProps {
  userName?: string;
  showGreeting?: boolean;
  showUserSelector?: boolean;
}

// Array of greeting variants for variety
const GREETINGS = [
  (name: string) => `Hey ${name}, what's on your mind today?`,
  (name: string) => `Nice to see you, ${name}. What's new?`,
  (name: string) => `Hello ${name}, how can I help you today?`,
  (name: string) => `Hi ${name}, what would you like to explore?`,
  (name: string) => `Good to see you, ${name}. What can I do for you?`,
];

export default function Header({ 
  userName = 'there', 
  showGreeting = true,
  showUserSelector = true 
}: HeaderProps) {
  const { selectedUserProfile, isLoaded } = useAutosuggest();
  
  // Use selected user's name from the autosuggest context, fallback to prop
  const displayName = useMemo(() => {
    if (isLoaded && selectedUserProfile) {
      // Extract just the name part (e.g., "SANDRA" from "USER_001_SANDRA")
      const parts = selectedUserProfile.userId.split('_');
      return parts[parts.length - 1]; // Get the last part which is the name
    }
    return userName.split(' ')[0];
  }, [isLoaded, selectedUserProfile, userName]);
  
  // Pick a greeting based on current hour for some variety
  const greeting = useMemo(() => {
    const hourIndex = new Date().getHours() % GREETINGS.length;
    return GREETINGS[hourIndex](displayName);
  }, [displayName]);

  return (
    <header className="relative py-8 min-h-[80px]">
      {/* User Selector with Persistent Characteristics Panel - Top Right */}
      {showUserSelector && (
        <div className="fixed top-4 right-4 z-[100]">
          <UserSelector />
        </div>
      )}
      
      {showGreeting && (
        <div className="text-center pt-4 pr-80 mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-white tracking-tight">
            {greeting}
          </h1>
        </div>
      )}
    </header>
  );
}
