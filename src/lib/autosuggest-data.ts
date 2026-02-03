/**
 * Autosuggest Data Loader and User Profile Analyzer
 * Processes the autosuggest_dataset_output.csv to extract user signals
 */

// Types for the dataset
export interface AutosuggestLogEntry {
  UserId: string;
  PreviousQuery: string;
  Prefix: string;
  Market: string;
  UiLanguage: string;
  Region: string;
  Time: string;
  CVID: string;
  EventId: string;
  Position: number;
  Suggestion: string;
  SuggestionClick: boolean;
  PastQueries: string;      // Semicolon-separated list of past queries
  WritingStyle: string;     // User's writing style description
}

export interface UserProfile {
  userId: string;
  market: string;
  uiLanguage: string;
  region: string;
  
  // CTR metrics
  totalEvents: number;
  clickedEvents: number;
  ctr: number;
  ctrScore: number;           // Actual CTR score (0.00 - 1.00)
  ctrCategory: 'zero' | 'low' | 'medium' | 'high' | 'very_high';
  
  // Typing behavior
  avgTypingSpeedMs: number;
  typingSpeedCategory: 'power_user' | 'regular_user' | 'moderate_user' | 'occasional_user' | 'new_user';
  typingSpeedRank: number;    // 1 = fastest, 5 = slowest
  
  // Usage patterns
  totalCVIDs: number;
  avgEventsPerCVID: number;
  usageFrequency: 'low' | 'medium' | 'high';
  
  // Topic affinity (most clicked/queried topics)
  topicAffinities: string[];
  
  // Topics of interest for content personalization
  topicsOfInterest: string[];
  
  // Historical queries (final prefixes from CVIDs)
  historicalQueries: string[];
  
  // Clicked suggestions
  clickedSuggestions: string[];
  
  // New fields from CSV
  pastQueries: string;        // Semicolon-separated list of past queries
  writingStyle: string;       // User's writing style description (e.g., "Short, keyword-based, technical")
}

export interface SuggestionCandidate {
  text: string;
  score: number;
  source: 'crowd' | 'synthetic' | 'personalized';
  historicalCTR: number;
}

// Parse the dataset CSV
export function parseDataset(csvContent: string): AutosuggestLogEntry[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    // Handle potential commas in quoted fields
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    return {
      UserId: values[0] || '',
      PreviousQuery: values[1] || '',
      Prefix: values[2] || '',
      Market: values[3] || '',
      UiLanguage: values[4] || '',
      Region: values[5] || '',
      Time: values[6] || '',
      CVID: values[7] || '',
      EventId: values[8] || '',
      Position: parseInt(values[9]) || 1,
      Suggestion: values[10] || '',
      SuggestionClick: values[11]?.toLowerCase() === 'true',
      PastQueries: values[12] || '',
      WritingStyle: values[13] || '',
    };
  });
}

// Calculate typing speed between events
function calculateTypingSpeed(entries: AutosuggestLogEntry[]): number {
  const cvidGroups = new Map<string, AutosuggestLogEntry[]>();
  
  // Group by CVID
  entries.forEach(entry => {
    const key = `${entry.UserId}-${entry.CVID}`;
    if (!cvidGroups.has(key)) {
      cvidGroups.set(key, []);
    }
    cvidGroups.get(key)!.push(entry);
  });
  
  const allDeltas: number[] = [];
  
  cvidGroups.forEach(events => {
    // Get unique events by EventId
    const uniqueEvents = new Map<string, AutosuggestLogEntry>();
    events.forEach(e => {
      if (!uniqueEvents.has(e.EventId)) {
        uniqueEvents.set(e.EventId, e);
      }
    });
    
    const sortedEvents = Array.from(uniqueEvents.values())
      .sort((a, b) => a.Time.localeCompare(b.Time));
    
    for (let i = 1; i < sortedEvents.length; i++) {
      const t1 = parseTime(sortedEvents[i - 1].Time);
      const t2 = parseTime(sortedEvents[i].Time);
      const deltaMs = (t2 - t1);
      if (deltaMs > 0 && deltaMs < 10000) { // Ignore gaps > 10 seconds
        allDeltas.push(deltaMs);
      }
    }
  });
  
  if (allDeltas.length === 0) return 500; // Default
  return allDeltas.reduce((a, b) => a + b, 0) / allDeltas.length;
}

function parseTime(timeStr: string): number {
  const [h, m, s] = timeStr.split(':').map(Number);
  return (h * 3600 + m * 60 + s) * 1000;
}

// Build user profiles from the dataset
export function buildUserProfiles(entries: AutosuggestLogEntry[]): Map<string, UserProfile> {
  const profiles = new Map<string, UserProfile>();
  const userEntries = new Map<string, AutosuggestLogEntry[]>();
  
  // Group entries by user
  entries.forEach(entry => {
    if (!userEntries.has(entry.UserId)) {
      userEntries.set(entry.UserId, []);
    }
    userEntries.get(entry.UserId)!.push(entry);
  });
  
  userEntries.forEach((entries, userId) => {
    // Get unique events
    const uniqueEvents = new Set<string>();
    const clickedEvents = new Set<string>();
    const cvids = new Set<string>();
    const clickedSuggestions: string[] = [];
    const historicalQueries: string[] = [];
    
    entries.forEach(entry => {
      uniqueEvents.add(entry.EventId);
      cvids.add(entry.CVID);
      
      if (entry.SuggestionClick) {
        clickedEvents.add(entry.EventId);
        clickedSuggestions.push(entry.Suggestion);
      }
    });
    
    // Get final prefixes (last prefix per CVID)
    const cvidPrefixes = new Map<string, { prefix: string; time: string }>();
    entries.forEach(entry => {
      const existing = cvidPrefixes.get(entry.CVID);
      if (!existing || entry.Time > existing.time) {
        cvidPrefixes.set(entry.CVID, { prefix: entry.Prefix, time: entry.Time });
      }
    });
    cvidPrefixes.forEach(({ prefix }) => {
      if (prefix.length > 3) {
        historicalQueries.push(prefix);
      }
    });
    
    // Calculate CTR
    const totalEvents = uniqueEvents.size;
    const clickedEventsCount = clickedEvents.size;
    const ctr = totalEvents > 0 ? clickedEventsCount / totalEvents : 0;
    
    // Categorize CTR
    let ctrCategory: UserProfile['ctrCategory'];
    if (ctr === 0) ctrCategory = 'zero';
    else if (ctr < 0.1) ctrCategory = 'low';
    else if (ctr < 0.3) ctrCategory = 'medium';
    else if (ctr < 0.6) ctrCategory = 'high';
    else ctrCategory = 'very_high';
    
    // Calculate typing speed and map to Copilot usage tiers
    const avgTypingSpeedMs = calculateTypingSpeed(entries);
    let typingSpeedCategory: UserProfile['typingSpeedCategory'];
    let typingSpeedRank: number;
    if (avgTypingSpeedMs <= 150) {
      // Very fast typing -> Power user
      typingSpeedCategory = 'power_user';
      typingSpeedRank = 1;
    } else if (avgTypingSpeedMs <= 300) {
      // Fast typing -> Regular user
      typingSpeedCategory = 'regular_user';
      typingSpeedRank = 2;
    } else if (avgTypingSpeedMs <= 700) {
      // Moderate typing -> Moderate user
      typingSpeedCategory = 'moderate_user';
      typingSpeedRank = 3;
    } else if (avgTypingSpeedMs <= 2000) {
      // Slow typing -> Occasional user
      typingSpeedCategory = 'occasional_user';
      typingSpeedRank = 4;
    } else {
      // Very slow typing -> New user
      typingSpeedCategory = 'new_user';
      typingSpeedRank = 5;
    }
    
    // Usage frequency
    const totalCVIDs = cvids.size;
    let usageFrequency: UserProfile['usageFrequency'];
    if (totalCVIDs <= 2) usageFrequency = 'low';
    else if (totalCVIDs <= 4) usageFrequency = 'medium';
    else usageFrequency = 'high';
    
    // Extract topic affinities from clicked suggestions
    const topicAffinities = extractTopics(clickedSuggestions);
    
    // Get first entry for locale info and writing style
    const firstEntry = entries[0];
    
    // Extract topics of interest from writing style and past queries
    const topicsOfInterest = extractTopicsOfInterest(firstEntry.WritingStyle, firstEntry.PastQueries);
    
    profiles.set(userId, {
      userId,
      market: firstEntry.Market,
      uiLanguage: firstEntry.UiLanguage,
      region: firstEntry.Region,
      totalEvents,
      clickedEvents: clickedEventsCount,
      ctr,
      ctrScore: ctr,
      ctrCategory,
      avgTypingSpeedMs,
      typingSpeedCategory,
      typingSpeedRank,
      totalCVIDs,
      avgEventsPerCVID: totalEvents / totalCVIDs,
      usageFrequency,
      topicAffinities,
      topicsOfInterest,
      historicalQueries,
      clickedSuggestions,
      pastQueries: firstEntry.PastQueries || '',
      writingStyle: firstEntry.WritingStyle || '',
    });
  });
  
  // Merge with predefined user profiles from the dataset
  const predefinedProfiles = getPredefinedUserProfiles();
  predefinedProfiles.forEach((profile, userId) => {
    profiles.set(userId, profile);
  });
  
  return profiles;
}

// Extract topics of interest from writing style and past queries
function extractTopicsOfInterest(writingStyle: string, pastQueries: string): string[] {
  const topics: string[] = [];
  const combined = `${writingStyle} ${pastQueries}`.toLowerCase();
  
  // Topic keyword mappings
  const topicMappings: Record<string, string[]> = {
    'AI': ['ai', 'artificial intelligence', 'copilot', 'machine learning', 'ml'],
    'Product Strategy': ['product', 'strategy', 'roadmap', 'planning'],
    'Technology Trends': ['technology', 'tech', 'future', 'trends'],
    'Local News': ['news', 'local', 'today'],
    'Sports': ['sports', 'football', 'scores', 'game'],
    'Weather': ['weather'],
    'Food': ['food', 'restaurants', 'recipe', 'cook'],
    'Data Science': ['data science', 'data', 'analytics'],
    'Machine Learning': ['machine learning', 'ml', 'neural'],
    'Programming': ['programming', 'python', 'code', 'sql', 'javascript'],
    'Finance': ['finance', 'mortgage', 'investment', 'portfolio'],
    'Investing': ['investing', 'invest', 'stocks', 'portfolio'],
    'Banking': ['banking', 'credit', 'bank'],
    'Product Management': ['product management', 'project management'],
    'Agile': ['agile', 'sprint', 'scrum'],
    'User Research': ['user research', 'design thinking', 'ux'],
  };
  
  for (const [topic, keywords] of Object.entries(topicMappings)) {
    if (keywords.some(kw => combined.includes(kw))) {
      topics.push(topic);
    }
  }
  
  return topics.slice(0, 3);
}

// Extract topics from queries/suggestions
function extractTopics(texts: string[]): string[] {
  const topicKeywords: Record<string, string[]> = {
    'technology': ['python', 'javascript', 'code', 'programming', 'api', 'software', 'computer', 'algorithm'],
    'learning': ['learn', 'explain', 'teach', 'understand', 'how to', 'tutorial', 'guide'],
    'travel': ['trip', 'travel', 'visit', 'japan', 'paris', 'vacation', 'destination'],
    'food': ['recipe', 'cook', 'bake', 'food', 'meal', 'restaurant', 'cake'],
    'business': ['startup', 'business', 'marketing', 'sales', 'invest', 'finance'],
    'creative': ['write', 'poem', 'story', 'image', 'create', 'design', 'art'],
    'health': ['health', 'workout', 'exercise', 'sleep', 'diet', 'fitness'],
    'career': ['job', 'cover letter', 'resume', 'interview', 'career', 'professional'],
  };
  
  const topicCounts = new Map<string, number>();
  
  texts.forEach(text => {
    const lowerText = text.toLowerCase();
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(kw => lowerText.includes(kw))) {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      }
    }
  });
  
  return Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic);
}

// Predefined user profiles from the dataset JSON
export function getPredefinedUserProfiles(): Map<string, UserProfile> {
  const profiles = new Map<string, UserProfile>();
  
  // USER_001_SANDRA - Zero CTR, Ultra-Fast typer
  profiles.set('USER_001_SANDRA', {
    userId: 'USER_001_SANDRA',
    market: 'en-US',
    uiLanguage: 'en',
    region: 'us',
    totalEvents: 8,
    clickedEvents: 0,
    ctr: 0.00,
    ctrScore: 0.00,
    ctrCategory: 'zero',
    avgTypingSpeedMs: 120,
    typingSpeedCategory: 'power_user',
    typingSpeedRank: 1,
    totalCVIDs: 1,
    avgEventsPerCVID: 8,
    usageFrequency: 'low',
    topicAffinities: ['technology', 'learning'],
    topicsOfInterest: ['AI', 'Product Strategy', 'Technology Trends'],
    historicalQueries: ['explain'],
    clickedSuggestions: [],
    pastQueries: 'future of technology; ai product roadmap; machine learning basics; copilot features',
    writingStyle: 'Short, keyword-based, technical',
  });
  
  // USER_002_JAMES - Low CTR, Fast typer
  profiles.set('USER_002_JAMES', {
    userId: 'USER_002_JAMES',
    market: 'en-GB',
    uiLanguage: 'en',
    region: 'gb',
    totalEvents: 8,
    clickedEvents: 1,
    ctr: 0.05,
    ctrScore: 0.05,
    ctrCategory: 'low',
    avgTypingSpeedMs: 250,
    typingSpeedCategory: 'regular_user',
    typingSpeedRank: 2,
    totalCVIDs: 1,
    avgEventsPerCVID: 8,
    usageFrequency: 'low',
    topicAffinities: ['learning'],
    topicsOfInterest: ['Local News', 'Sports', 'Weather', 'Food'],
    historicalQueries: ['summarize'],
    clickedSuggestions: ['summarize this document'],
    pastQueries: 'weather london; news today; football scores; restaurants near me',
    writingStyle: 'Short, casual, search-engine style',
  });
  
  // USER_003_PRIYA - Medium CTR, Moderate typer
  profiles.set('USER_003_PRIYA', {
    userId: 'USER_003_PRIYA',
    market: 'en-IN',
    uiLanguage: 'en',
    region: 'in',
    totalEvents: 8,
    clickedEvents: 1,
    ctr: 0.15,
    ctrScore: 0.15,
    ctrCategory: 'medium',
    avgTypingSpeedMs: 550,
    typingSpeedCategory: 'moderate_user',
    typingSpeedRank: 3,
    totalCVIDs: 1,
    avgEventsPerCVID: 8,
    usageFrequency: 'low',
    topicAffinities: ['creative'],
    topicsOfInterest: ['Data Science', 'Machine Learning', 'Programming'],
    historicalQueries: ['write'],
    clickedSuggestions: ['write a poem about nature'],
    pastQueries: 'data science course; python pandas tutorial; ml interview questions; sql joins',
    writingStyle: 'Balanced, semi-formal, descriptive',
  });
  
  // USER_004_MICHAEL - High CTR, Slow typer
  profiles.set('USER_004_MICHAEL', {
    userId: 'USER_004_MICHAEL',
    market: 'en-CA',
    uiLanguage: 'en',
    region: 'ca',
    totalEvents: 12,
    clickedEvents: 3,
    ctr: 0.25,
    ctrScore: 0.25,
    ctrCategory: 'high',
    avgTypingSpeedMs: 1500,
    typingSpeedCategory: 'occasional_user',
    typingSpeedRank: 4,
    totalCVIDs: 3,
    avgEventsPerCVID: 4,
    usageFrequency: 'medium',
    topicAffinities: ['technology', 'career', 'food'],
    topicsOfInterest: ['Finance', 'Investing', 'Banking'],
    historicalQueries: ['how', 'help', 'best'],
    clickedSuggestions: ['how to learn python', 'help me write a cover letter', 'best restaurants near me'],
    pastQueries: 'mortgage calculator; credit score check; investment portfolio; retirement planning',
    writingStyle: 'Conversational, question-based',
  });
  
  // USER_005_EMMA - Very High CTR, Very Slow typer
  profiles.set('USER_005_EMMA', {
    userId: 'USER_005_EMMA',
    market: 'en-AU',
    uiLanguage: 'en',
    region: 'au',
    totalEvents: 16,
    clickedEvents: 4,
    ctr: 0.35,
    ctrScore: 0.35,
    ctrCategory: 'very_high',
    avgTypingSpeedMs: 3000,
    typingSpeedCategory: 'new_user',
    typingSpeedRank: 5,
    totalCVIDs: 4,
    avgEventsPerCVID: 4,
    usageFrequency: 'medium',
    topicAffinities: ['creative', 'travel', 'learning', 'food'],
    topicsOfInterest: ['Product Management', 'Agile', 'User Research'],
    historicalQueries: ['create', 'plan', 'tell', 'show'],
    clickedSuggestions: ['create an image of a sunset', 'plan a trip to japan', 'tell me about climate change', 'show me how to bake a cake'],
    pastQueries: 'project management tools; agile sprint planning; user research methods; design thinking',
    writingStyle: 'Natural language, task-oriented, detailed',
  });
  
  return profiles;
}

// Build suggestion pool from dataset
export function buildSuggestionPool(entries: AutosuggestLogEntry[]): Map<string, SuggestionCandidate[]> {
  const pool = new Map<string, SuggestionCandidate[]>();
  
  // Group by prefix
  const prefixSuggestions = new Map<string, Map<string, { count: number; clicks: number }>>();
  
  entries.forEach(entry => {
    const prefix = entry.Prefix.toLowerCase().trim();
    if (!prefix) return;
    
    if (!prefixSuggestions.has(prefix)) {
      prefixSuggestions.set(prefix, new Map());
    }
    
    const suggestions = prefixSuggestions.get(prefix)!;
    const existing = suggestions.get(entry.Suggestion) || { count: 0, clicks: 0 };
    existing.count++;
    if (entry.SuggestionClick) existing.clicks++;
    suggestions.set(entry.Suggestion, existing);
  });
  
  // Convert to candidates with CTR-based scoring
  prefixSuggestions.forEach((suggestions, prefix) => {
    const candidates: SuggestionCandidate[] = [];
    
    suggestions.forEach((stats, text) => {
      const historicalCTR = stats.count > 0 ? stats.clicks / stats.count : 0;
      candidates.push({
        text,
        score: stats.count + (historicalCTR * 100), // Blend frequency and CTR
        source: 'crowd',
        historicalCTR,
      });
    });
    
    // Sort by score
    candidates.sort((a, b) => b.score - a.score);
    pool.set(prefix, candidates.slice(0, 10)); // Keep top 10 per prefix
  });
  
  return pool;
}

// Synthetic suggestion expansions - full completions mapped to prefixes
export const SYNTHETIC_COMPLETIONS: Record<string, string[]> = {
  // "how to" queries
  'how to': [
    'how to learn python programming',
    'how to write a cover letter',
    'how to cook pasta perfectly',
    'how to start a business',
    'how to improve productivity',
  ],
  'how to b': [
    'how to bake a chocolate cake',
    'how to build a website from scratch',
    'how to become a data scientist',
    'how to budget your money',
    'how to backup your phone',
  ],
  'how to be': [
    'how to become a software developer',
    'how to become more productive',
    'how to beat procrastination',
    'how to be more confident',
    'how to become a data scientist',
  ],
  'how to bec': [
    'how to become a software engineer',
    'how to become a data scientist',
    'how to become more productive',
    'how to become a better writer',
    'how to become a freelancer',
  ],
  'how to beco': [
    'how to become a software engineer',
    'how to become a data scientist',
    'how to become a full stack developer',
    'how to become a machine learning engineer',
    'how to become a project manager',
  ],
  'how to becom': [
    'how to become a software engineer',
    'how to become a data scientist',
    'how to become a full stack developer',
    'how to become a machine learning engineer',
    'how to become a better programmer',
  ],
  'how to become': [
    'how to become a software engineer',
    'how to become a data scientist',
    'how to become a full stack developer',
    'how to become a better writer',
    'how to become a freelancer',
  ],
  'how to become a': [
    'how to become a software engineer',
    'how to become a data scientist',
    'how to become a full stack developer',
    'how to become a machine learning engineer',
    'how to become a better programmer',
  ],
  'how to become a b': [
    'how to become a better programmer',
    'how to become a better writer',
    'how to become a backend developer',
    'how to become a business analyst',
    'how to become a blockchain developer',
  ],
  'how to become a bi': [
    'how to become a big data engineer',
    'how to become a big tech developer',
    'how to become a BI analyst',
    'how to become a big picture thinker',
  ],
  'how to become a big': [
    'how to become a big data engineer',
    'how to become a big tech developer',
    'how to become a big data analyst',
    'how to become a big thinker',
  ],
  // "what is" queries
  'what is': [
    'what is machine learning',
    'what is the difference between AI and ML',
    'what is Python used for',
    'what is cloud computing',
    'what is the best programming language',
  ],
  'what is t': [
    'what is the best laptop for programming',
    'what is TypeScript',
    'what is the difference between Java and JavaScript',
    'what is TensorFlow',
    'what is the cloud',
  ],
  'what is th': [
    'what is the best way to learn coding',
    'what is the difference between React and Angular',
    'what is the cloud',
    'what is the metaverse',
    'what is the best IDE for Python',
  ],
  // "best" queries
  'best': [
    'best programming language to learn in 2024',
    'best laptop for developers',
    'best way to learn coding',
    'best practices for software development',
    'best online courses for programming',
  ],
  'best p': [
    'best programming language for beginners',
    'best Python IDE',
    'best practices for API design',
    'best podcasts for developers',
    'best programming books',
  ],
  // "learn" queries
  'learn': [
    'learn Python for beginners',
    'learn JavaScript in 30 days',
    'learn machine learning',
    'learn web development',
    'learn data science',
  ],
  'learn p': [
    'learn Python from scratch',
    'learn Python for data science',
    'learn programming basics',
    'learn Python with projects',
    'learn Python automation',
  ],
  // "explain" queries  
  'explain': [
    'explain machine learning to me',
    'explain the difference between API and SDK',
    'explain cloud computing',
    'explain how neural networks work',
    'explain Docker containers',
  ],
  // "write" queries
  'write': [
    'write a Python script to download files',
    'write a cover letter for software engineer',
    'write a poem about technology',
    'write a SQL query to find duplicates',
    'write a resume summary',
  ],
  'write a': [
    'write a Python script for web scraping',
    'write a cover letter for me',
    'write a business email',
    'write a thank you note',
    'write a function to sort an array',
  ],
  // "help" queries
  'help': [
    'help me write code in Python',
    'help me understand machine learning',
    'help me debug this code',
    'help me learn JavaScript',
    'help me with my resume',
  ],
  'help me': [
    'help me learn Python programming',
    'help me write a cover letter',
    'help me understand recursion',
    'help me with my homework',
    'help me plan a trip to Japan',
  ],
  // Travel queries
  'plan': [
    'plan a trip to Japan',
    'plan a vacation on a budget',
    'plan a road trip across Europe',
    'plan a surprise birthday party',
    'plan healthy meals for the week',
  ],
  'plan a': [
    'plan a trip to Tokyo',
    'plan a weekend getaway',
    'plan a wedding on a budget',
    'plan a career change',
    'plan a successful project',
  ],
  // Recipe queries
  'recipe': [
    'recipe for chocolate chip cookies',
    'recipe for pasta carbonara',
    'recipe for healthy smoothies',
    'recipe for banana bread',
    'recipe for homemade pizza',
  ],
  'recipe for': [
    'recipe for chocolate cake',
    'recipe for chicken tikka masala',
    'recipe for vegetarian lasagna',
    'recipe for french toast',
    'recipe for beef stew',
  ],
  // Python queries
  'python': [
    'Python tutorial for beginners',
    'Python list comprehension examples',
    'Python pandas dataframe tutorial',
    'Python web scraping guide',
    'Python API development',
  ],
  'python h': [
    'Python how to read a file',
    'Python how to install packages',
    'Python how to use classes',
    'Python how to handle exceptions',
    'Python how to create a function',
  ],
  // Code queries
  'code': [
    'code to reverse a string in Python',
    'code editor for beginners',
    'code review best practices',
    'code to sort an array',
    'code examples for machine learning',
  ],
  // Default fallback patterns
  'the': [
    'the best programming language in 2024',
    'the difference between Java and JavaScript',
    'the future of artificial intelligence',
    'the basics of machine learning',
    'the most popular frameworks',
  ],
  'can': [
    'can you help me write code',
    'can you explain machine learning',
    'can you create an image of',
    'can you summarize this article',
    'can AI replace programmers',
  ],
  'can you': [
    'can you help me with Python',
    'can you explain this code',
    'can you write a cover letter',
    'can you create a website',
    'can you generate an image',
  ],
  // "who is" queries
  'who': [
    'who is the CEO of Microsoft',
    'who invented the internet',
    'who is the best programmer',
    'who created Python',
    'who founded OpenAI',
  ],
  'who is': [
    'who is the CEO of Google',
    'who is Elon Musk',
    'who is the best software developer',
    'who is the richest person in the world',
    'who is the creator of JavaScript',
  ],
  'who is the': [
    'who is the CEO of Apple',
    'who is the best programmer in the world',
    'who is the founder of Amazon',
    'who is the creator of Linux',
    'who is the richest tech billionaire',
  ],
  'who is the best': [
    'who is the best programmer in the world',
    'who is the best software engineer',
    'who is the best AI researcher',
    'who is the best tech CEO',
    'who is the best data scientist',
  ],
  // "where" queries
  'where': [
    'where to learn programming',
    'where is Silicon Valley',
    'where to find coding tutorials',
    'where to host a website',
    'where to learn machine learning',
  ],
  'where to': [
    'where to learn Python for free',
    'where to find coding jobs',
    'where to host a web app',
    'where to learn data science',
    'where to buy a domain name',
  ],
  // "why" queries
  'why': [
    'why learn programming',
    'why is Python popular',
    'why use TypeScript',
    'why is AI important',
    'why learn machine learning',
  ],
  'why is': [
    'why is Python so popular',
    'why is JavaScript everywhere',
    'why is AI the future',
    'why is coding important',
    'why is React better than Angular',
  ],
  // "when" queries
  'when': [
    'when was Python created',
    'when to use machine learning',
    'when will AI surpass humans',
    'when to learn a new programming language',
    'when was the first computer invented',
  ],
  // "should" queries
  'should': [
    'should I learn Python or JavaScript',
    'should I use React or Vue',
    'should I learn machine learning',
    'should I become a software engineer',
    'should I use TypeScript',
  ],
  'should i': [
    'should I learn Python first',
    'should I use a framework',
    'should I learn cloud computing',
    'should I become a data scientist',
    'should I learn multiple languages',
  ],
  // "tell me" queries
  'tell': [
    'tell me about Python',
    'tell me a joke',
    'tell me about machine learning',
    'tell me about AI',
    'tell me about web development',
  ],
  'tell me': [
    'tell me about artificial intelligence',
    'tell me how to code',
    'tell me about cloud computing',
    'tell me about data science',
    'tell me about JavaScript',
  ],
  'tell me about': [
    'tell me about Python programming',
    'tell me about machine learning algorithms',
    'tell me about the history of computers',
    'tell me about software engineering',
    'tell me about web development trends',
  ],
  // "show me" queries
  'show': [
    'show me how to code',
    'show me Python examples',
    'show me a tutorial',
    'show me how to build a website',
    'show me machine learning projects',
  ],
  'show me': [
    'show me how to learn Python',
    'show me coding tutorials',
    'show me web development examples',
    'show me AI projects',
    'show me how to use Git',
  ],
  // "i want" queries
  'i want': [
    'I want to learn programming',
    'I want to build a website',
    'I want to become a developer',
    'I want to learn Python',
    'I want to create an app',
  ],
  'i want to': [
    'I want to learn Python from scratch',
    'I want to become a software engineer',
    'I want to build a mobile app',
    'I want to learn machine learning',
    'I want to start a tech company',
  ],
  // "i need" queries
  'i need': [
    'I need help with coding',
    'I need to learn Python',
    'I need a website',
    'I need help with my project',
    'I need to understand algorithms',
  ],
  // Common single words
  'create': [
    'create a website for me',
    'create a Python script',
    'create a mobile app',
    'create a logo',
    'create a business plan',
  ],
  'generate': [
    'generate a random password',
    'generate Python code',
    'generate an image of',
    'generate a report',
    'generate API documentation',
  ],
  'make': [
    'make a website',
    'make a Python script',
    'make an app',
    'make a game',
    'make a chatbot',
  ],
  'build': [
    'build a website from scratch',
    'build a mobile app',
    'build a REST API',
    'build a machine learning model',
    'build a chatbot',
  ],
  'find': [
    'find the best programming language',
    'find coding tutorials',
    'find a job in tech',
    'find Python resources',
    'find machine learning courses',
  ],
  'compare': [
    'compare Python and JavaScript',
    'compare React and Vue',
    'compare AWS and Azure',
    'compare different programming languages',
    'compare machine learning frameworks',
  ],
};
