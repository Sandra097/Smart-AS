'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  User, 
  Zap, 
  Clock, 
  Target,
  TrendingUp,
  BarChart3,
  Globe,
  Check,
  Eye,
  EyeOff,
  Timer,
  Layers,
  Sparkles,
  MousePointer,
  Settings2,
} from 'lucide-react';
import { useAutosuggest } from '@/lib/autosuggest-context';

export default function UserSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const {
    isLoaded,
    isLoading,
    error,
    availableUsers,
    selectedUserId,
    selectedUserProfile,
    setSelectedUserId,
    getUserInfo,
    getConfig,
    datasetStats,
  } = useAutosuggest();

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border-2 border-blue-300 dark:border-blue-600 rounded-xl shadow-lg animate-pulse">
        <div className="w-6 h-6 bg-blue-300 dark:bg-blue-600 rounded-full" />
        <div className="w-32 h-4 bg-blue-200 dark:bg-blue-700 rounded" />
      </div>
    );
  }

  if (!isLoaded || !selectedUserProfile) {
    // If loading failed, show error details and a quick reload action to help debugging
    if (error) {
      return (
        <div className="flex flex-col gap-2 px-4 py-3 bg-white dark:bg-gray-800 border-2 border-red-300 dark:border-red-600 rounded-xl shadow-lg w-72">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-400 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-red-600 dark:text-red-400">Failed to load user data</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-300 break-words">{error}</div>
          <div className="flex justify-end">
            <button
              onClick={() => window.location.reload()}
              className="text-sm px-3 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 transition"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border-2 border-red-300 dark:border-red-600 rounded-xl shadow-lg">
        <div className="w-6 h-6 bg-red-400 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm text-red-600 dark:text-red-400">No user loaded</span>
      </div>
    );
  }

  const userInfo = getUserInfo(selectedUserProfile);
  const config = getConfig();

  // Get behavior description based on config
  const getBehaviorSummary = () => {
    const behaviors = [];
    
    if (config.triggerMode === 'disabled') {
      behaviors.push({ icon: EyeOff, text: 'Autosuggest disabled', color: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-900/20' });
    } else {
      behaviors.push({ icon: Eye, text: 'Autosuggest enabled', color: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-900/20' });
    }
    
    if (config.minPrefixLength >= 4) {
      behaviors.push({ icon: Timer, text: `Shows after ${config.minPrefixLength}+ chars`, color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-900/20' });
    } else if (config.minPrefixLength <= 1) {
      behaviors.push({ icon: Zap, text: 'Shows immediately', color: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-900/20' });
    } else {
      behaviors.push({ icon: Timer, text: `Shows after ${config.minPrefixLength}+ chars`, color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20' });
    }
    
    // Trigger mode based on CTR
    switch (config.triggerMode) {
      case 'continuous':
        behaviors.push({ icon: Zap, text: 'Every keystroke', color: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-900/20' });
        break;
      case 'interval':
        behaviors.push({ icon: Layers, text: `Every ${config.triggerEveryNChars} chars`, color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20' });
        break;
      case 'pause':
        behaviors.push({ icon: Clock, text: `On ${config.pauseThresholdMs}ms pause`, color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-900/20' });
        break;
    }
    
    behaviors.push({ icon: Target, text: `${config.maxSuggestions} suggestions`, color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-900/20' });
    
    return behaviors;
  };

  const behaviors = getBehaviorSummary();

  // Static color mappings (Tailwind classes) so JIT picks up colors and they render reliably
  // Streamlined style maps so patterns are easier to scan
  const CTR_STYLES: Record<string, { bg: string; text: string }> = {
    zero: { bg: 'bg-gray-500', text: 'text-white' },
    low: { bg: 'bg-yellow-400', text: 'text-gray-900' },
    medium: { bg: 'bg-blue-500', text: 'text-white' },
    high: { bg: 'bg-green-500', text: 'text-white' },
    very_high: { bg: 'bg-green-700', text: 'text-white' },
  };

  const SPEED_STYLES: Record<string, { bg: string; text: string }> = {
    power_user: { bg: 'bg-red-400', text: 'text-white' },
    regular_user: { bg: 'bg-red-400', text: 'text-white' },
    moderate_user: { bg: 'bg-yellow-400', text: 'text-gray-900' },
    occasional_user: { bg: 'bg-teal-400', text: 'text-white' },
    new_user: { bg: 'bg-teal-600', text: 'text-white' },
  };

  // Selected user styles (avoid dynamic class strings so Tailwind includes them)
  const selectedCtr = CTR_STYLES[selectedUserProfile.ctrCategory];
  const selectedSpeed = SPEED_STYLES[selectedUserProfile.typingSpeedCategory];

  return (
    <div ref={dropdownRef} className="flex flex-col gap-3">
      {/* Compact User Selector Button - Made more prominent */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 !text-gray-900 dark:!text-gray-100 border-2 border-blue-400 dark:border-blue-500 rounded-xl hover:bg-blue-50 dark:hover:bg-gray-700 hover:border-blue-500 transition-all shadow-lg"
        >
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${selectedCtr.bg} shadow-md`}>
            <User className={`w-5 h-5 ${selectedCtr.text}`} />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {selectedUserProfile.userId.split('_').pop()}
            </span>
            <span className="text-xs !text-gray-500 dark:!text-gray-300">{userInfo.ctrLabel} • {userInfo.speedLabel}</span>
          </div>
          <ChevronDown className={`w-5 h-5 text-blue-500 transition-transform ml-1 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
            >
              {/* Header */}
              <div className="px-3 py-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xs font-semibold text-gray-900 dark:text-white">
                  Select User Profile
                </h3>
              </div>

              {/* User List */}
              <div className="max-h-64 overflow-y-auto">
                {availableUsers.map((user) => {
                  const info = getUserInfo(user);
                  const isSelected = user.userId === selectedUserId;

                  // Use static style maps (Tailwind picks these up from source)
                  const ctrStyle = CTR_STYLES[user.ctrCategory];
                  const speedStyle = SPEED_STYLES[user.typingSpeedCategory];

                  return (
                    <button
                      key={user.userId}
                      onClick={() => {
                        setSelectedUserId(user.userId);
                        setIsOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left !text-gray-900 dark:!text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700/50 last:border-b-0 ${
                        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${ctrStyle.bg}`}>
                          <User className={`w-4 h-4 ${ctrStyle.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-medium text-gray-900 dark:text-white">
                              {user.userId.replace('USER_', '').replace(/_/g, ' ')}
                            </span>
                            {isSelected && <Check className="w-3 h-3 text-blue-600" />}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`text-[9px] px-1 py-0.5 rounded ${ctrStyle.text} ${ctrStyle.bg} shadow-sm`}>
                              {info.ctrLabel}
                            </span>
                            <span className={`text-[9px] px-1 py-0.5 rounded ${speedStyle.text} ${speedStyle.bg} shadow-sm`}>
                              {info.speedLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Always Visible User Characteristics Panel */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden w-72">
        {/* Panel Header */}
        <div className="px-3 py-2 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Settings2 className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">User Characteristics</span>
          </div>
        </div>
        
        {/* User Summary */}
        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedCtr.bg}`}>
              <User className={`${selectedCtr.text} w-3 h-3`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                  {selectedUserProfile.userId.replace('USER_', '').replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 italic">
                {userInfo.description}
              </p>
            </div>
          </div>
        </div>
        
        {/* User Characteristics Table */}
        <div className="px-3 py-2 space-y-1.5 text-[10px]">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">CTR Category</span>
            <div className="flex items-center gap-1">
              <span className={`px-1.5 py-0.5 rounded ${selectedCtr.text} ${selectedCtr.bg}`}>{userInfo.ctrLabel}</span>
              <span className="text-gray-400">({userInfo.ctrScore})</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Copilot Usage</span>
            <span className={`px-1.5 py-0.5 rounded ${selectedSpeed.text} ${selectedSpeed.bg}`}>{userInfo.speedLabel}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-500">Region</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">{selectedUserProfile.region.toUpperCase()}</span>
          </div>
        </div>
        
        {/* Writing Style & Topics */}
        <div className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-t border-gray-100 dark:border-gray-700/50 space-y-1.5 text-[10px]">
          <div className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-1">Personalization</div>
          {userInfo.writingStyle && (
            <div className="flex flex-col gap-0.5">
              <span className="text-gray-500">Writing Style</span>
              <span className="font-medium text-gray-700 dark:text-gray-300 italic">&quot;{userInfo.writingStyle}&quot;</span>
            </div>
          )}
          {userInfo.topicsOfInterest && userInfo.topicsOfInterest.length > 0 && (
            <div className="flex flex-col gap-0.5 mt-1">
              <span className="text-gray-500">Topics of Interest</span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {userInfo.topicsOfInterest.map((topic, idx) => (
                  <span key={idx} className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-800/50 text-indigo-700 dark:text-indigo-300 rounded text-[9px]">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Autosuggest Behavior */}
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700/50 space-y-1.5 text-[10px]">
          <div className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Autosuggest Behavior</div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Status</span>
            <span className={`font-medium ${config.triggerMode !== 'disabled' ? 'text-green-600' : 'text-red-500'}`}>{userInfo.autosuggestStatus}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Trigger Mode</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">{userInfo.triggerMode}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Trigger Details</span>
            <span className="font-medium text-gray-700 dark:text-gray-300 text-right">{userInfo.triggerDetails}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Min Prefix</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">{config.minPrefixLength} chars</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Suggestions Shown</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">{userInfo.suggestionsShown}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Style</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">{userInfo.style}</span>
          </div>
        </div>
        
        {/* Past Queries */}
        {selectedUserProfile.pastQueries && (
          <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-t border-gray-100 dark:border-gray-700/50 space-y-1.5 text-[10px]">
            <div className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Past Queries</div>
            <span className="font-medium text-gray-700 dark:text-gray-300 text-[9px]">
              {selectedUserProfile.pastQueries.split(';').slice(0, 3).map(q => q.trim()).join(' • ')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
