/**
 * Adaptive Autosuggest Engine
 * Uses user signals to control autosuggest behavior
 */

import {
  UserProfile,
  SuggestionCandidate,
  SYNTHETIC_COMPLETIONS,
} from './autosuggest-data';

// Autosuggest configuration derived from user signals
export interface AutosuggestConfig {
  // On/Off control
  enabled: boolean;
  minPrefixLength: number;
  
  // Content control
  maxSuggestions: number;
  
  // Style control - based on user's writing style
  style: 'keyword' | 'natural' | 'conversational' | 'search' | 'task-oriented';
  writingStyle: string;  // User's specific writing style description
  
  // Trigger control - CTR and typing speed based
  triggerMode: 'disabled' | 'pause' | 'interval' | 'continuous'; // How to trigger
  triggerEveryNChars: number; // For 'interval' mode: trigger every N characters typed
  pauseThresholdMs: number; // For 'pause' mode: ms of no typing before showing
  
  // Topics of interest for content personalization
  topicsOfInterest: string[];
  
  // Experience control
  experienceConfig: {
    showPositionHints: boolean;
    stableOrdering: boolean;
    emphasizeTopResult: boolean;
    showTypingIndicator: boolean;
    animationSpeed: 'fast' | 'normal' | 'slow';
  };
}

export interface AutosuggestResult {
  enabled: boolean;
  suggestions: Array<{
    text: string;
    position: number;
    score: number;
    source: string;
  }>;
  style: string;
  triggerReason: string;
  experienceConfig: AutosuggestConfig['experienceConfig'];
  userProfile: {
    ctrCategory: string;
    typingSpeed: string;
    region: string;
  };
}

// Get autosuggest configuration based on user profile
export function getAutosuggestConfig(profile: UserProfile | null): AutosuggestConfig {
  // Default config for unknown users
  if (!profile) {
    return {
      enabled: true,
      minPrefixLength: 2,
      maxSuggestions: 4,
      style: 'natural',
      writingStyle: 'Balanced, natural language',
      triggerMode: 'interval',
      triggerEveryNChars: 3,
      pauseThresholdMs: 500,
      topicsOfInterest: [],
      experienceConfig: {
        showPositionHints: true,
        stableOrdering: false,
        emphasizeTopResult: true,
        showTypingIndicator: false,
        animationSpeed: 'normal',
      },
    };
  }

  // Determine trigger mode based on BOTH CTR and typing speed
  // CTR affects whether we trigger at all
  // Typing speed affects how aggressively we trigger
  let enabled = true;
  let minPrefixLength = 2;
  let maxSuggestions = 4;
  let triggerMode: AutosuggestConfig['triggerMode'] = 'interval';
  let triggerEveryNChars = 3;
  let pauseThresholdMs = 500;

  // CTR-based behavior:
  // - Zero CTR: Disabled (not triggering at all)
  // - Low CTR: Trigger only on pause
  // - Medium/High CTR: More frequent triggering
  switch (profile.ctrCategory) {
    case 'zero':
      // Zero CTR (0%) - User never clicks suggestions
      // DISABLED - not triggering at all
      triggerMode = 'disabled';
      enabled = true; // Enabled but trigger mode is disabled
      minPrefixLength = 999; // Effectively never triggers
      maxSuggestions = 0;
      pauseThresholdMs = 99999;
      triggerEveryNChars = 999;
      break;
    
    case 'low':
      // Low CTR - User rarely clicks suggestions
      // Trigger only on pause in typing
      triggerMode = 'pause';
      minPrefixLength = 3;
      maxSuggestions = 2;
      pauseThresholdMs = 800;
      triggerEveryNChars = 999;
      break;
    
    case 'medium':
      // Medium CTR - Balanced usage
      // Trigger on interval
      triggerMode = 'interval';
      minPrefixLength = 2;
      maxSuggestions = 3;
      triggerEveryNChars = 4;
      pauseThresholdMs = 500;
      break;
    
    case 'high':
      // High CTR - Frequently uses autosuggest
      // More aggressive interval triggering
      triggerMode = 'interval';
      minPrefixLength = 1;
      maxSuggestions = 4;
      triggerEveryNChars = 2;
      pauseThresholdMs = 300;
      break;
    
    case 'very_high':
      // Very High CTR (Power User)
      // Continuous triggering on every keystroke
      triggerMode = 'continuous';
      minPrefixLength = 1;
      maxSuggestions = 4;
      triggerEveryNChars = 1;
      pauseThresholdMs = 0;
      break;
  }

  // Typing speed modifier:
  // - Slow/Very slow typing: More triggering (they may need help)
  // - Fast/Ultra-fast typing: Trigger only on pause (don't interrupt)
  if (profile.ctrCategory !== 'zero') { // Don't modify if disabled
    switch (profile.typingSpeedCategory) {
      case 'ultra_fast':
        // Ultra-fast typers - only show on pause, don't interrupt
        if (triggerMode !== 'disabled') {
          triggerMode = 'pause';
          pauseThresholdMs = Math.max(pauseThresholdMs, 1000);
        }
        break;
      
      case 'fast':
        // Fast typers - prefer pause-based triggering
        if (triggerMode === 'continuous' || triggerMode === 'interval') {
          triggerMode = 'pause';
          pauseThresholdMs = Math.max(pauseThresholdMs, 600);
        }
        break;
      
      case 'moderate':
        // Moderate typers - keep the CTR-based settings
        break;
      
      case 'slow':
        // Slow typers - more frequent triggering to help them
        if (triggerMode === 'pause') {
          pauseThresholdMs = Math.min(pauseThresholdMs, 400);
        } else if (triggerMode === 'interval') {
          triggerEveryNChars = Math.max(1, triggerEveryNChars - 1);
        }
        break;
      
      case 'very_slow':
        // Very slow typers - most aggressive triggering
        if (triggerMode !== 'disabled') {
          triggerMode = 'continuous';
          triggerEveryNChars = 1;
        }
        break;
    }
  }

  // Determine style based on user's writing style
  let style: AutosuggestConfig['style'] = 'natural';
  const writingStyleLower = profile.writingStyle.toLowerCase();
  
  if (writingStyleLower.includes('keyword') || writingStyleLower.includes('short')) {
    style = 'keyword';
  } else if (writingStyleLower.includes('search')) {
    style = 'search';
  } else if (writingStyleLower.includes('conversational') || writingStyleLower.includes('question')) {
    style = 'conversational';
  } else if (writingStyleLower.includes('task') || writingStyleLower.includes('detailed')) {
    style = 'task-oriented';
  } else if (writingStyleLower.includes('balanced') || writingStyleLower.includes('semi-formal')) {
    style = 'natural';
  }

  // Experience config based on user behavior
  const experienceConfig: AutosuggestConfig['experienceConfig'] = {
    showPositionHints: profile.ctrCategory !== 'zero',
    stableOrdering: profile.ctrCategory === 'high' || profile.ctrCategory === 'very_high',
    emphasizeTopResult: profile.ctrCategory !== 'zero',
    showTypingIndicator: profile.typingSpeedCategory === 'slow' || profile.typingSpeedCategory === 'very_slow',
    animationSpeed: profile.typingSpeedCategory === 'ultra_fast' || profile.typingSpeedCategory === 'fast' ? 'fast' : 
                    profile.typingSpeedCategory === 'slow' || profile.typingSpeedCategory === 'very_slow' ? 'slow' : 'normal',
  };

  return {
    enabled,
    minPrefixLength,
    maxSuggestions,
    style,
    writingStyle: profile.writingStyle,
    triggerMode,
    triggerEveryNChars,
    pauseThresholdMs,
    topicsOfInterest: profile.topicsOfInterest || [],
    experienceConfig,
  };
}

// Get suggestions for a given prefix and user
export function getAutosuggest(
  userId: string,
  prefix: string,
  timestamp: number,
  userProfiles: Map<string, UserProfile>,
  suggestionPool: Map<string, SuggestionCandidate[]>,
  baseSuggestions: Record<string, string[]>
): AutosuggestResult {
  const profile = userProfiles.get(userId) || null;
  const config = getAutosuggestConfig(profile);
  const normalizedPrefix = prefix.toLowerCase().trim();

  // Build trigger reason
  let triggerReason = 'default';
  
  // Check if we should show suggestions
  if (!config.enabled) {
    return {
      enabled: false,
      suggestions: [],
      style: config.style,
      triggerReason: 'disabled_for_user',
      experienceConfig: config.experienceConfig,
      userProfile: {
        ctrCategory: profile?.ctrCategory || 'unknown',
        typingSpeed: profile?.typingSpeedCategory || 'unknown',
        region: profile?.region || 'unknown',
      },
    };
  }

  // Check prefix length requirement
  if (normalizedPrefix.length < config.minPrefixLength) {
    triggerReason = `prefix_too_short (need ${config.minPrefixLength}+ chars)`;
    return {
      enabled: true,
      suggestions: [],
      style: config.style,
      triggerReason,
      experienceConfig: config.experienceConfig,
      userProfile: {
        ctrCategory: profile?.ctrCategory || 'unknown',
        typingSpeed: profile?.typingSpeedCategory || 'unknown',
        region: profile?.region || 'unknown',
      },
    };
  }

  // Gather candidate suggestions
  const candidates: Array<{
    text: string;
    score: number;
    source: string;
  }> = [];

  // 1. Get crowd-based suggestions from dataset pool (exact prefix match)
  const poolCandidates = suggestionPool.get(normalizedPrefix) || [];
  poolCandidates.forEach(candidate => {
    candidates.push({
      text: candidate.text,
      score: candidate.score * 2, // Weight crowd data higher
      source: 'crowd',
    });
  });

  // 2. Get completions from SYNTHETIC_COMPLETIONS - find best matching prefix
  const matchingPrefixes = Object.keys(SYNTHETIC_COMPLETIONS)
    .filter(pattern => normalizedPrefix.startsWith(pattern) || pattern.startsWith(normalizedPrefix))
    .sort((a, b) => {
      // Prefer longer matches that the user has typed past
      const aMatch = normalizedPrefix.startsWith(a) ? a.length : 0;
      const bMatch = normalizedPrefix.startsWith(b) ? b.length : 0;
      return bMatch - aMatch;
    });

  if (matchingPrefixes.length > 0) {
    // Use the best matching prefix
    const bestPrefix = matchingPrefixes[0];
    const completions = SYNTHETIC_COMPLETIONS[bestPrefix];
    
    completions.forEach((completion, idx) => {
      // Only include if the completion actually matches what user typed
      if (completion.toLowerCase().startsWith(normalizedPrefix)) {
        if (!candidates.some(c => c.text.toLowerCase() === completion.toLowerCase())) {
          candidates.push({
            text: completion,
            score: 80 - idx * 10, // High score, decreasing by position
            source: 'synthetic',
          });
        }
      }
    });
  }

  // 3. Get matching suggestions from base suggestions
  for (const [basePrefix, suggestions] of Object.entries(baseSuggestions)) {
    if (normalizedPrefix.startsWith(basePrefix) || basePrefix.startsWith(normalizedPrefix)) {
      suggestions.forEach((text, idx) => {
        // Only include if suggestion starts with what user typed
        if (text.toLowerCase().startsWith(normalizedPrefix)) {
          if (!candidates.some(c => c.text.toLowerCase() === text.toLowerCase())) {
            candidates.push({
              text,
              score: 50 - idx * 5,
              source: 'base',
            });
          }
        }
      });
    }
  }

  // 4. Apply personalization based on user profile
  if (profile) {
    candidates.forEach(candidate => {
      const textLower = candidate.text.toLowerCase();
      
      // Boost based on topics of interest (content personalization)
      if (profile.topicsOfInterest && profile.topicsOfInterest.length > 0) {
        profile.topicsOfInterest.forEach((topic, idx) => {
          const topicLower = topic.toLowerCase();
          if (textLower.includes(topicLower)) {
            candidate.score += 30 - idx * 8; // Strong boost for matching topics of interest
          }
          // Also check for related keywords
          const topicKeywords = getTopicKeywords(topic);
          topicKeywords.forEach(keyword => {
            if (textLower.includes(keyword.toLowerCase())) {
              candidate.score += 15 - idx * 3;
            }
          });
        });
      }
      
      // Boost based on topic affinity (from past behavior)
      profile.topicAffinities.forEach((topic, idx) => {
        if (textLower.includes(topic)) {
          candidate.score += 20 - idx * 5; // Higher boost for primary affinity
        }
      });

      // Boost based on historical queries similarity
      profile.historicalQueries.forEach(query => {
        const queryLower = query.toLowerCase();
        if (textLower.includes(queryLower.slice(0, 5)) || 
            queryLower.includes(textLower.slice(0, 5))) {
          candidate.score += 10;
        }
      });
    });
  }

  // Sort by score and take top N
  candidates.sort((a, b) => b.score - a.score);
  const topCandidates = candidates.slice(0, config.maxSuggestions);

  // Apply style transformation based on user's writing style
  const styledSuggestions = topCandidates.map((candidate, idx) => ({
    text: applyStyle(candidate.text, config.style, profile?.writingStyle || ''),
    position: idx + 1,
    score: candidate.score,
    source: candidate.source,
  }));

  // Determine trigger reason
  if (profile) {
    triggerReason = `ctr=${profile.ctrCategory}, speed=${profile.typingSpeedCategory}, style=${config.style}, prefix_len=${normalizedPrefix.length}`;
  } else {
    triggerReason = `new_user, prefix_len=${normalizedPrefix.length}`;
  }

  return {
    enabled: true,
    suggestions: styledSuggestions,
    style: config.style,
    triggerReason,
    experienceConfig: config.experienceConfig,
    userProfile: {
      ctrCategory: profile?.ctrCategory || 'unknown',
      typingSpeed: profile?.typingSpeedCategory || 'unknown',
      region: profile?.region || 'unknown',
    },
  };
}

// Get keywords related to a topic for content matching
function getTopicKeywords(topic: string): string[] {
  const topicKeywordMap: Record<string, string[]> = {
    'AI': ['artificial intelligence', 'machine learning', 'neural', 'copilot', 'gpt', 'llm', 'model'],
    'Product Strategy': ['product', 'strategy', 'roadmap', 'planning', 'vision', 'market'],
    'Technology Trends': ['technology', 'tech', 'innovation', 'future', 'trends', 'digital'],
    'Local News': ['news', 'local', 'today', 'breaking', 'headlines'],
    'Sports': ['sports', 'football', 'soccer', 'basketball', 'scores', 'game', 'match'],
    'Weather': ['weather', 'forecast', 'temperature', 'rain', 'sunny'],
    'Food': ['food', 'restaurant', 'recipe', 'cook', 'meal', 'eat', 'dining'],
    'Data Science': ['data', 'analytics', 'statistics', 'analysis', 'insights'],
    'Machine Learning': ['machine learning', 'ml', 'neural network', 'deep learning', 'model'],
    'Programming': ['programming', 'code', 'python', 'javascript', 'sql', 'developer'],
    'Finance': ['finance', 'money', 'investment', 'banking', 'mortgage', 'loan'],
    'Investing': ['investing', 'stocks', 'portfolio', 'returns', 'dividends'],
    'Banking': ['bank', 'credit', 'account', 'savings', 'loan'],
    'Product Management': ['product management', 'pm', 'backlog', 'sprint', 'requirements'],
    'Agile': ['agile', 'scrum', 'sprint', 'kanban', 'iteration'],
    'User Research': ['user research', 'ux', 'design thinking', 'usability', 'interview'],
  };
  
  return topicKeywordMap[topic] || [topic.toLowerCase()];
}

// Apply style transformation to suggestion text based on user's writing style
function applyStyle(text: string, style: AutosuggestConfig['style'], writingStyle: string): string {
  const writingStyleLower = writingStyle.toLowerCase();
  
  // Apply transformations based on the user's writing style
  switch (style) {
    case 'keyword':
      // For keyword-based users, keep suggestions concise
      // If the suggestion is a question, extract the key phrase
      if (writingStyleLower.includes('technical')) {
        // Technical users prefer concise, jargon-friendly text
        return text;
      }
      return text;
      
    case 'search':
      // For search-engine style users, format as search queries
      // Remove question marks and make more query-like
      if (text.endsWith('?')) {
        return text.slice(0, -1);
      }
      return text;
      
    case 'conversational':
      // For conversational users, keep the natural phrasing
      // Ensure questions have question marks
      if (text.toLowerCase().startsWith('how') || 
          text.toLowerCase().startsWith('what') ||
          text.toLowerCase().startsWith('why') ||
          text.toLowerCase().startsWith('can you')) {
        if (!text.endsWith('?')) {
          return text + '?';
        }
      }
      return text;
      
    case 'task-oriented':
      // For task-oriented users, phrase as actionable commands
      // Prefer imperative mood
      if (writingStyleLower.includes('detailed')) {
        // Detailed users might appreciate more context
        return text;
      }
      return text;
      
    case 'natural':
    default:
      return text;
  }
}

// Get user display info for UI
export function getUserDisplayInfo(profile: UserProfile): {
  ctrLabel: string;
  ctrColor: string;
  ctrScore: string;
  speedLabel: string;
  speedColor: string;
  keystrokeInterval: string;
  triggerMode: string;
  triggerDetails: string;
  autosuggestStatus: string;
  suggestionsShown: number;
  style: string;
  writingStyle: string;
  topicsOfInterest: string[];
  description: string;
} {
  const ctrLabels: Record<string, { label: string; color: string }> = {
    'zero': { label: 'Zero CTR', color: 'bg-gray-500' },
    'low': { label: 'Low CTR', color: 'bg-yellow-500' },
    'medium': { label: 'Medium CTR', color: 'bg-blue-500' },
    'high': { label: 'High CTR', color: 'bg-green-500' },
    'very_high': { label: 'Very High CTR', color: 'bg-purple-500' },
  };

  const speedLabels: Record<string, { label: string; color: string; interval: string }> = {
    'ultra_fast': { label: 'Ultra-Fast', color: 'bg-red-500', interval: '≤ 150 ms' },
    'fast': { label: 'Fast', color: 'bg-orange-400', interval: '200–300 ms' },
    'moderate': { label: 'Moderate', color: 'bg-yellow-400', interval: '400–700 ms' },
    'slow': { label: 'Slow', color: 'bg-green-400', interval: '1–2 s' },
    'very_slow': { label: 'Very Slow', color: 'bg-teal-400', interval: '2–4 s' },
  };

  // Get config based on profile to determine actual trigger behavior
  const config = getAutosuggestConfig(profile);
  
  // Map trigger mode to display values
  const triggerModeLabels: Record<string, { mode: string; details: string; status: string }> = {
    'disabled': { 
      mode: 'Disabled', 
      details: 'Autosuggest not triggered', 
      status: 'Off' 
    },
    'pause': { 
      mode: 'Pause Only', 
      details: `Show after ${config.pauseThresholdMs} ms inactivity`, 
      status: 'Pause Trigger' 
    },
    'interval': { 
      mode: 'Interval', 
      details: `Every ${config.triggerEveryNChars} characters typed`, 
      status: 'Always On' 
    },
    'continuous': { 
      mode: 'Continuous', 
      details: 'Every keystroke', 
      status: 'Always On' 
    },
  };
  
  const triggerInfo = triggerModeLabels[config.triggerMode] || triggerModeLabels['interval'];
  const speedInfo = speedLabels[profile.typingSpeedCategory] || speedLabels['moderate'];
  
  // Style label based on writing style
  const styleLabels: Record<string, string> = {
    'keyword': 'Short keywords',
    'search': 'Search-engine style',
    'natural': 'Natural language',
    'conversational': 'Conversational',
    'task-oriented': 'Task-oriented',
  };

  // Description based on CTR and typing speed combination
  const descriptions: Record<string, string> = {
    'zero': 'Never clicks suggestions. Autosuggest disabled to avoid interrupting typing flow.',
    'low': 'Rarely clicks suggestions. Triggers only on typing pause to minimize distraction.',
    'medium': 'Balanced autosuggest usage. Triggers at regular intervals while typing.',
    'high': 'Frequently uses autosuggest. More aggressive triggering to help with input.',
    'very_high': 'Power user of autosuggest. Continuous triggering for maximum assistance.',
  };

  return {
    ctrLabel: ctrLabels[profile.ctrCategory]?.label || 'Unknown',
    ctrColor: ctrLabels[profile.ctrCategory]?.color || 'bg-gray-400',
    ctrScore: `${(profile.ctrScore * 100).toFixed(0)}%`,
    speedLabel: speedInfo.label,
    speedColor: speedInfo.color,
    keystrokeInterval: speedInfo.interval,
    triggerMode: triggerInfo.mode,
    triggerDetails: triggerInfo.details,
    autosuggestStatus: triggerInfo.status,
    suggestionsShown: config.maxSuggestions,
    style: styleLabels[config.style] || config.style,
    writingStyle: profile.writingStyle,
    topicsOfInterest: profile.topicsOfInterest || [],
    description: descriptions[profile.ctrCategory] || 'Standard autosuggest behavior.',
  };
}
