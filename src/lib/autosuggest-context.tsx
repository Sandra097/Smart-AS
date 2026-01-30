'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import {
  parseDataset,
  buildUserProfiles,
  buildSuggestionPool,
  UserProfile,
  SuggestionCandidate,
  AutosuggestLogEntry,
} from './autosuggest-data';
import {
  getAutosuggest,
  getAutosuggestConfig,
  AutosuggestConfig,
  AutosuggestResult,
  getUserDisplayInfo,
} from './autosuggest-engine';
import { PREFIX_SUGGESTIONS } from '@/components/AutoSuggest';

interface AutosuggestContextType {
  // Data state
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  
  // User selection
  availableUsers: UserProfile[];
  selectedUserId: string | null;
  selectedUserProfile: UserProfile | null;
  setSelectedUserId: (userId: string | null) => void;
  
  // Get suggestions
  getSuggestions: (prefix: string) => AutosuggestResult;
  getAISuggestions: (prefix: string) => Promise<string[]>;
  getConfig: () => AutosuggestConfig;
  
  // AI state
  isAILoading: boolean;
  useAI: boolean;
  setUseAI: (value: boolean) => void;
  
  // User info
  getUserInfo: (profile: UserProfile) => ReturnType<typeof getUserDisplayInfo>;
  
  // Per-user autosuggest toggle
  autosuggestEnabled: boolean;
  setAutosuggestEnabled: (enabled: boolean) => void;
  
  // Stats
  datasetStats: {
    totalEntries: number;
    totalUsers: number;
    totalCVIDs: number;
    totalSuggestions: number;
  } | null;
}

const AutosuggestContext = createContext<AutosuggestContextType | null>(null);

// Embedded dataset - this will be loaded from CSV
// In production, this would be fetched from an API
const DATASET_CSV = `UserId,PreviousQuery,Prefix,Market,UiLanguage,Region,Time,CVID,EventId,Position,Suggestion,SuggestionClick,PastQueries,WritingStyle
USER_001_SANDRA,future of technology,e,en-US,en,us,19:05:51,W3IMV5LY1HZK5EXDX6QFS,FA6CE345C4E1438E960CBB281785D937,1,explain artificial intelligence,false,future of technology; ai product roadmap; machine learning basics; copilot features,"Short, keyword-based, technical"
USER_001_SANDRA,future of technology,e,en-US,en,us,19:05:51,W3IMV5LY1HZK5EXDX6QFS,FA6CE345C4E1438E960CBB281785D937,2,explain blockchain technology,false,future of technology; ai product roadmap; machine learning basics; copilot features,"Short, keyword-based, technical"
USER_001_SANDRA,future of technology,e,en-US,en,us,19:05:51,W3IMV5LY1HZK5EXDX6QFS,FA6CE345C4E1438E960CBB281785D937,3,explain climate change,false,future of technology; ai product roadmap; machine learning basics; copilot features,"Short, keyword-based, technical"
USER_001_SANDRA,future of technology,e,en-US,en,us,19:05:51,W3IMV5LY1HZK5EXDX6QFS,FA6CE345C4E1438E960CBB281785D937,4,explain how vaccines work,false,future of technology; ai product roadmap; machine learning basics; copilot features,"Short, keyword-based, technical"
USER_001_SANDRA,future of technology,explain,en-US,en,us,19:05:52,W3IMV5LY1HZK5EXDX6QFS,B3F1A8D652A6435AAE355F8D952A0373,1,explain quantum computing,false,future of technology; ai product roadmap; machine learning basics; copilot features,"Short, keyword-based, technical"
USER_001_SANDRA,future of technology,explain,en-US,en,us,19:05:52,W3IMV5LY1HZK5EXDX6QFS,B3F1A8D652A6435AAE355F8D952A0373,2,explain quantum mechanics,false,future of technology; ai product roadmap; machine learning basics; copilot features,"Short, keyword-based, technical"
USER_001_SANDRA,future of technology,explain,en-US,en,us,19:05:52,W3IMV5LY1HZK5EXDX6QFS,B3F1A8D652A6435AAE355F8D952A0373,3,explain quantum entanglement,false,future of technology; ai product roadmap; machine learning basics; copilot features,"Short, keyword-based, technical"
USER_001_SANDRA,future of technology,explain,en-US,en,us,19:05:52,W3IMV5LY1HZK5EXDX6QFS,B3F1A8D652A6435AAE355F8D952A0373,4,explain quantum physics simply,false,future of technology; ai product roadmap; machine learning basics; copilot features,"Short, keyword-based, technical"
USER_002_JAMES,how to read faster,sum,en-GB,en,gb,07:34:22,PPCICBCW73YT9LXMD5RKQ,D8E7F6A5B4C3D2E1F0A9,1,summarize this document,false,weather london; news today; football scores; restaurants near me,"Short, casual, search-engine style"
USER_002_JAMES,how to read faster,sum,en-GB,en,gb,07:34:22,PPCICBCW73YT9LXMD5RKQ,D8E7F6A5B4C3D2E1F0A9,2,summarize the main points,false,weather london; news today; football scores; restaurants near me,"Short, casual, search-engine style"
USER_002_JAMES,how to read faster,sum,en-GB,en,gb,07:34:22,PPCICBCW73YT9LXMD5RKQ,D8E7F6A5B4C3D2E1F0A9,3,summarize in bullet points,false,weather london; news today; football scores; restaurants near me,"Short, casual, search-engine style"
USER_002_JAMES,how to read faster,sum,en-GB,en,gb,07:34:22,PPCICBCW73YT9LXMD5RKQ,D8E7F6A5B4C3D2E1F0A9,4,summarize briefly,false,weather london; news today; football scores; restaurants near me,"Short, casual, search-engine style"
USER_002_JAMES,how to read faster,summarize,en-GB,en,gb,07:34:23,PPCICBCW73YT9LXMD5RKQ,A1B2C3D4E5F6A7B8C9D0,1,summarize this document,true,weather london; news today; football scores; restaurants near me,"Short, casual, search-engine style"
USER_002_JAMES,how to read faster,summarize,en-GB,en,gb,07:34:23,PPCICBCW73YT9LXMD5RKQ,A1B2C3D4E5F6A7B8C9D0,2,summarize this document for me,false,weather london; news today; football scores; restaurants near me,"Short, casual, search-engine style"
USER_002_JAMES,how to read faster,summarize,en-GB,en,gb,07:34:23,PPCICBCW73YT9LXMD5RKQ,A1B2C3D4E5F6A7B8C9D0,3,summarize this document briefly,false,weather london; news today; football scores; restaurants near me,"Short, casual, search-engine style"
USER_002_JAMES,how to read faster,summarize,en-GB,en,gb,07:34:23,PPCICBCW73YT9LXMD5RKQ,A1B2C3D4E5F6A7B8C9D0,4,summarize this document clearly,false,weather london; news today; football scores; restaurants near me,"Short, casual, search-engine style"
USER_003_PRIYA,creative writing prompts,wri,en-IN,en,in,16:05:49,MXXIKDG1FFTEST123,E1F2A3B4C5D6E7F8A9B0,1,write a poem about nature,false,data science course; python pandas tutorial; ml interview questions; sql joins,"Balanced, semi-formal, descriptive"
USER_003_PRIYA,creative writing prompts,wri,en-IN,en,in,16:05:49,MXXIKDG1FFTEST123,E1F2A3B4C5D6E7F8A9B0,2,write a poem about the ocean,false,data science course; python pandas tutorial; ml interview questions; sql joins,"Balanced, semi-formal, descriptive"
USER_003_PRIYA,creative writing prompts,wri,en-IN,en,in,16:05:49,MXXIKDG1FFTEST123,E1F2A3B4C5D6E7F8A9B0,3,write a poem about mountains,false,data science course; python pandas tutorial; ml interview questions; sql joins,"Balanced, semi-formal, descriptive"
USER_003_PRIYA,creative writing prompts,wri,en-IN,en,in,16:05:49,MXXIKDG1FFTEST123,E1F2A3B4C5D6E7F8A9B0,4,write a poem about flowers,false,data science course; python pandas tutorial; ml interview questions; sql joins,"Balanced, semi-formal, descriptive"
USER_003_PRIYA,creative writing prompts,write,en-IN,en,in,16:05:50,MXXIKDG1FFTEST123,B0C1D2E3F4A5B6C7D8E9,1,write a poem about nature,true,data science course; python pandas tutorial; ml interview questions; sql joins,"Balanced, semi-formal, descriptive"
USER_003_PRIYA,creative writing prompts,write,en-IN,en,in,16:05:50,MXXIKDG1FFTEST123,B0C1D2E3F4A5B6C7D8E9,2,write a poem about trees,false,data science course; python pandas tutorial; ml interview questions; sql joins,"Balanced, semi-formal, descriptive"
USER_003_PRIYA,creative writing prompts,write,en-IN,en,in,16:05:50,MXXIKDG1FFTEST123,B0C1D2E3F4A5B6C7D8E9,3,write a poem about wildlife,false,data science course; python pandas tutorial; ml interview questions; sql joins,"Balanced, semi-formal, descriptive"
USER_003_PRIYA,creative writing prompts,write,en-IN,en,in,16:05:50,MXXIKDG1FFTEST123,B0C1D2E3F4A5B6C7D8E9,4,write a poem about forests,false,data science course; python pandas tutorial; ml interview questions; sql joins,"Balanced, semi-formal, descriptive"
USER_004_MICHAEL,best programming languages 2026,how,en-CA,en,ca,11:38:26,1IUL505PPETEST456,C1D2E3F4A5B6C7D8E9F0,1,how to learn python,true,mortgage calculator; credit score check; investment portfolio; retirement planning,"Conversational, question-based"
USER_004_MICHAEL,best programming languages 2026,how,en-CA,en,ca,11:38:26,1IUL505PPETEST456,C1D2E3F4A5B6C7D8E9F0,2,how to cook healthy meals,false,mortgage calculator; credit score check; investment portfolio; retirement planning,"Conversational, question-based"
USER_004_MICHAEL,best programming languages 2026,how,en-CA,en,ca,11:38:26,1IUL505PPETEST456,C1D2E3F4A5B6C7D8E9F0,3,how to start a business,false,mortgage calculator; credit score check; investment portfolio; retirement planning,"Conversational, question-based"
USER_004_MICHAEL,best programming languages 2026,how,en-CA,en,ca,11:38:26,1IUL505PPETEST456,C1D2E3F4A5B6C7D8E9F0,4,how to improve sleep quality,false,mortgage calculator; credit score check; investment portfolio; retirement planning,"Conversational, question-based"
USER_004_MICHAEL,job search tips 2026,help,en-CA,en,ca,14:22:15,2JVM606QQFTEST789,D2E3F4A5B6C7D8E9F0A1,1,help me write a cover letter,true,mortgage calculator; credit score check; investment portfolio; retirement planning,"Conversational, question-based"
USER_004_MICHAEL,job search tips 2026,help,en-CA,en,ca,14:22:15,2JVM606QQFTEST789,D2E3F4A5B6C7D8E9F0A1,2,help me with my homework,false,mortgage calculator; credit score check; investment portfolio; retirement planning,"Conversational, question-based"
USER_004_MICHAEL,job search tips 2026,help,en-CA,en,ca,14:22:15,2JVM606QQFTEST789,D2E3F4A5B6C7D8E9F0A1,3,help me plan a trip,false,mortgage calculator; credit score check; investment portfolio; retirement planning,"Conversational, question-based"
USER_004_MICHAEL,job search tips 2026,help,en-CA,en,ca,14:22:15,2JVM606QQFTEST789,D2E3F4A5B6C7D8E9F0A1,4,help me prepare for interview,false,mortgage calculator; credit score check; investment portfolio; retirement planning,"Conversational, question-based"
USER_004_MICHAEL,things to do this weekend,best,en-CA,en,ca,09:15:30,3KWN707RRGTEST012,E3F4A5B6C7D8E9F0A1B2,1,best restaurants near me,true,mortgage calculator; credit score check; investment portfolio; retirement planning,"Conversational, question-based"
USER_004_MICHAEL,things to do this weekend,best,en-CA,en,ca,09:15:30,3KWN707RRGTEST012,E3F4A5B6C7D8E9F0A1B2,2,best brunch spots,false,mortgage calculator; credit score check; investment portfolio; retirement planning,"Conversational, question-based"
USER_004_MICHAEL,things to do this weekend,best,en-CA,en,ca,09:15:30,3KWN707RRGTEST012,E3F4A5B6C7D8E9F0A1B2,3,best fine dining,false,mortgage calculator; credit score check; investment portfolio; retirement planning,"Conversational, question-based"
USER_004_MICHAEL,things to do this weekend,best,en-CA,en,ca,09:15:30,3KWN707RRGTEST012,E3F4A5B6C7D8E9F0A1B2,4,best cheap eats,false,mortgage calculator; credit score check; investment portfolio; retirement planning,"Conversational, question-based"
USER_005_EMMA,how to edit photos,cre,en-AU,en,au,19:08:40,IP9FEX6Z7CTEST345,F4A5B6C7D8E9F0A1B2C3,1,create an image of a sunset,true,project management tools; agile sprint planning; user research methods; design thinking,"Natural language, task-oriented, detailed"
USER_005_EMMA,how to edit photos,cre,en-AU,en,au,19:08:40,IP9FEX6Z7CTEST345,F4A5B6C7D8E9F0A1B2C3,2,create an image of a forest,false,project management tools; agile sprint planning; user research methods; design thinking,"Natural language, task-oriented, detailed"
USER_005_EMMA,how to edit photos,cre,en-AU,en,au,19:08:40,IP9FEX6Z7CTEST345,F4A5B6C7D8E9F0A1B2C3,3,create an image of a city,false,project management tools; agile sprint planning; user research methods; design thinking,"Natural language, task-oriented, detailed"
USER_005_EMMA,how to edit photos,cre,en-AU,en,au,19:08:40,IP9FEX6Z7CTEST345,F4A5B6C7D8E9F0A1B2C3,4,create an image of space,false,project management tools; agile sprint planning; user research methods; design thinking,"Natural language, task-oriented, detailed"
USER_005_EMMA,best travel destinations 2026,plan,en-AU,en,au,20:30:15,JQ0GFY7A8DTEST678,A5B6C7D8E9F0A1B2C3D4,1,plan a trip to japan,true,project management tools; agile sprint planning; user research methods; design thinking,"Natural language, task-oriented, detailed"
USER_005_EMMA,best travel destinations 2026,plan,en-AU,en,au,20:30:15,JQ0GFY7A8DTEST678,A5B6C7D8E9F0A1B2C3D4,2,plan a weekend getaway,false,project management tools; agile sprint planning; user research methods; design thinking,"Natural language, task-oriented, detailed"
USER_005_EMMA,best travel destinations 2026,plan,en-AU,en,au,20:30:15,JQ0GFY7A8DTEST678,A5B6C7D8E9F0A1B2C3D4,3,plan a road trip,false,project management tools; agile sprint planning; user research methods; design thinking,"Natural language, task-oriented, detailed"
USER_005_EMMA,best travel destinations 2026,plan,en-AU,en,au,20:30:15,JQ0GFY7A8DTEST678,A5B6C7D8E9F0A1B2C3D4,4,plan a hiking adventure,false,project management tools; agile sprint planning; user research methods; design thinking,"Natural language, task-oriented, detailed"
USER_005_EMMA,environmental issues today,tell,en-AU,en,au,21:45:22,KR1HGZ8B9ETEST901,B6C7D8E9F0A1B2C3D4E5,1,tell me about climate change,true,project management tools; agile sprint planning; user research methods; design thinking,"Natural language, task-oriented, detailed"
USER_005_EMMA,environmental issues today,tell,en-AU,en,au,21:45:22,KR1HGZ8B9ETEST901,B6C7D8E9F0A1B2C3D4E5,2,tell me about global warming,false,project management tools; agile sprint planning; user research methods; design thinking,"Natural language, task-oriented, detailed"
USER_005_EMMA,environmental issues today,tell,en-AU,en,au,21:45:22,KR1HGZ8B9ETEST901,B6C7D8E9F0A1B2C3D4E5,3,tell me about renewable energy,false,project management tools; agile sprint planning; user research methods; design thinking,"Natural language, task-oriented, detailed"
USER_005_EMMA,environmental issues today,tell,en-AU,en,au,21:45:22,KR1HGZ8B9ETEST901,B6C7D8E9F0A1B2C3D4E5,4,tell me about carbon footprint,false,project management tools; agile sprint planning; user research methods; design thinking,"Natural language, task-oriented, detailed"
USER_005_EMMA,easy dessert recipes,show,en-AU,en,au,15:20:10,LS2IHA9C0FTEST234,C7D8E9F0A1B2C3D4E5F6,1,show me how to bake a cake,true,project management tools; agile sprint planning; user research methods; design thinking,"Natural language, task-oriented, detailed"
USER_005_EMMA,easy dessert recipes,show,en-AU,en,au,15:20:10,LS2IHA9C0FTEST234,C7D8E9F0A1B2C3D4E5F6,2,show me how to bake cookies,false,project management tools; agile sprint planning; user research methods; design thinking,"Natural language, task-oriented, detailed"
USER_005_EMMA,easy dessert recipes,show,en-AU,en,au,15:20:10,LS2IHA9C0FTEST234,C7D8E9F0A1B2C3D4E5F6,3,show me how to bake brownies,false,project management tools; agile sprint planning; user research methods; design thinking,"Natural language, task-oriented, detailed"
USER_005_EMMA,easy dessert recipes,show,en-AU,en,au,15:20:10,LS2IHA9C0FTEST234,C7D8E9F0A1B2C3D4E5F6,4,show me how to bake muffins,false,project management tools; agile sprint planning; user research methods; design thinking,"Natural language, task-oriented, detailed"`;

export function AutosuggestProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [entries, setEntries] = useState<AutosuggestLogEntry[]>([]);
  const [userProfiles, setUserProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [suggestionPool, setSuggestionPool] = useState<Map<string, SuggestionCandidate[]>>(new Map());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // AI suggestions state
  const [isAILoading, setIsAILoading] = useState(false);
  const [useAI, setUseAI] = useState(true); // Enable AI by default
  const [aiCache, setAiCache] = useState<Map<string, string[]>>(new Map());
  
  // Per-user autosuggest settings (persisted in localStorage)
  const [userAutosuggestSettings, setUserAutosuggestSettings] = useState<Record<string, boolean>>({});
  
  // Load user autosuggest settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('copilot-autosuggest-settings');
      if (stored) {
        setUserAutosuggestSettings(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load autosuggest settings:', err);
    }
  }, []);
  
  // Persist user autosuggest settings to localStorage
  useEffect(() => {
    if (Object.keys(userAutosuggestSettings).length > 0) {
      try {
        localStorage.setItem('copilot-autosuggest-settings', JSON.stringify(userAutosuggestSettings));
      } catch (err) {
        console.error('Failed to save autosuggest settings:', err);
      }
    }
  }, [userAutosuggestSettings]);
  
  // Get autosuggest enabled state for current user (default: true)
  const autosuggestEnabled = selectedUserId ? (userAutosuggestSettings[selectedUserId] ?? true) : true;
  
  // Set autosuggest enabled state for current user
  const setAutosuggestEnabled = useCallback((enabled: boolean) => {
    if (selectedUserId) {
      setUserAutosuggestSettings(prev => ({
        ...prev,
        [selectedUserId]: enabled,
      }));
    }
  }, [selectedUserId]);
  
  const [datasetStats, setDatasetStats] = useState<{
    totalEntries: number;
    totalUsers: number;
    totalCVIDs: number;
    totalSuggestions: number;
  } | null>(null);

  // Load and parse dataset on mount
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        
        // Try to load from file first, fall back to embedded data
        let csvContent = DATASET_CSV;
        
        try {
          const response = await fetch('/autosuggest_dataset_output.csv');
          if (response.ok) {
            csvContent = await response.text();
          }
        } catch {
          console.log('Using embedded dataset');
        }
        
        const parsedEntries = parseDataset(csvContent);
        setEntries(parsedEntries);
        
        const profiles = buildUserProfiles(parsedEntries);
        setUserProfiles(profiles);
        
        const pool = buildSuggestionPool(parsedEntries);
        setSuggestionPool(pool);
        
        // Calculate stats
        const uniqueCVIDs = new Set(parsedEntries.map(e => e.CVID));
        const uniqueSuggestions = new Set(parsedEntries.map(e => e.Suggestion));
        
        setDatasetStats({
          totalEntries: parsedEntries.length,
          totalUsers: profiles.size,
          totalCVIDs: uniqueCVIDs.size,
          totalSuggestions: uniqueSuggestions.size,
        });
        
        // Select first predefined user by default (USER_001_SANDRA)
        const predefinedUserIds = ['USER_001_SANDRA', 'USER_002_JAMES', 'USER_003_PRIYA', 'USER_004_MICHAEL', 'USER_005_EMMA'];
        const firstUser = predefinedUserIds.find(id => profiles.has(id)) || Array.from(profiles.keys())[0];
        if (firstUser) {
          setSelectedUserId(firstUser);
        }
        
        setIsLoaded(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dataset');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, []);

  // Return users in a consistent order with predefined users first
  const availableUsers = useMemo(() => {
    const predefinedOrder = ['USER_001_SANDRA', 'USER_002_JAMES', 'USER_003_PRIYA', 'USER_004_MICHAEL', 'USER_005_EMMA'];
    const allUsers = Array.from(userProfiles.values());
    
    // Sort: predefined users first (in order), then others
    return allUsers.sort((a, b) => {
      const aIndex = predefinedOrder.indexOf(a.userId);
      const bIndex = predefinedOrder.indexOf(b.userId);
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.userId.localeCompare(b.userId);
    });
  }, [userProfiles]);
  
  const selectedUserProfile = selectedUserId ? userProfiles.get(selectedUserId) || null : null;

  const getSuggestions = (prefix: string): AutosuggestResult => {
    return getAutosuggest(
      selectedUserId || '',
      prefix,
      Date.now(),
      userProfiles,
      suggestionPool,
      PREFIX_SUGGESTIONS
    );
  };

  // Fetch AI-generated suggestions
  const getAISuggestions = useCallback(async (prefix: string): Promise<string[]> => {
    const normalizedPrefix = prefix.toLowerCase().trim();
    const config = getAutosuggestConfig(selectedUserProfile);
    
    // Get user's writing style and past queries from their profile
    const writingStyle = selectedUserProfile?.writingStyle || '';
    const pastQueries = selectedUserProfile?.pastQueries || '';
    
    // Include style and user-specific data in cache key
    const cacheKey = `${normalizedPrefix}:${config.style}:${selectedUserId}`;
    
    // Check cache first
    if (aiCache.has(cacheKey)) {
      return aiCache.get(cacheKey) || [];
    }
    
    // Don't fetch for very short prefixes
    if (normalizedPrefix.length < 2) {
      return [];
    }
    
    setIsAILoading(true);
    
    try {
      const response = await fetch('/api/autosuggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefix: normalizedPrefix,
          maxSuggestions: config.maxSuggestions,
          style: config.style,
          writingStyle,    // Pass user's writing style
          pastQueries,     // Pass user's past queries for context
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }
      
      const data = await response.json();
      const suggestions = data.suggestions || [];
      
      // Cache the result with style-specific key
      setAiCache(prev => {
        const newCache = new Map(prev);
        newCache.set(cacheKey, suggestions);
        return newCache;
      });
      
      return suggestions;
    } catch (err) {
      console.error('AI suggestions error:', err);
      return [];
    } finally {
      setIsAILoading(false);
    }
  }, [aiCache, selectedUserProfile]);

  const getConfig = (): AutosuggestConfig => {
    return getAutosuggestConfig(selectedUserProfile);
  };

  const getUserInfo = (profile: UserProfile) => {
    return getUserDisplayInfo(profile);
  };

  return (
    <AutosuggestContext.Provider
      value={{
        isLoaded,
        isLoading,
        error,
        availableUsers,
        selectedUserId,
        selectedUserProfile,
        setSelectedUserId,
        getSuggestions,
        getAISuggestions,
        getConfig,
        isAILoading,
        useAI,
        setUseAI,
        getUserInfo,
        autosuggestEnabled,
        setAutosuggestEnabled,
        datasetStats,
      }}
    >
      {children}
    </AutosuggestContext.Provider>
  );
}

export function useAutosuggest() {
  const context = useContext(AutosuggestContext);
  if (!context) {
    throw new Error('useAutosuggest must be used within an AutosuggestProvider');
  }
  return context;
}
