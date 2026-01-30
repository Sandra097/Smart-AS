'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Home,
  MessageSquarePlus,
  History,
  Image,
  BookOpen,
  Copy,
  Download,
} from 'lucide-react';
import { useChatStore } from '@/lib/store';

interface SidebarProps {
  userName?: string;
}

export default function Sidebar({ userName = 'S' }: SidebarProps) {
  const pathname = usePathname();
  const { startNewChat, conversations } = useChatStore();

  const navItems = [
    { icon: Home, label: 'Home', href: '/', onClick: undefined },
    { icon: MessageSquarePlus, label: 'New Chat', href: '/', onClick: startNewChat },
    { icon: History, label: 'History', href: '/history', onClick: undefined },
    { icon: Image, label: 'Create Image', href: '/image', onClick: undefined },
    { icon: Copy, label: 'Notebook', href: '/notebook', onClick: undefined },
    { icon: Download, label: 'Plugins', href: '/plugins', onClick: undefined },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-12 bg-copilot-cream dark:bg-gray-900 flex flex-col items-center py-4 z-50">
      {/* Copilot Logo */}
      <motion.div
        className="mb-8 cursor-pointer"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="w-8 h-8 rounded-lg copilot-icon-gradient flex items-center justify-center">
          <svg
            className="w-5 h-5 text-white"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2L2 7L12 12L22 7L12 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 17L12 22L22 17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 12L12 17L22 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </motion.div>

      {/* Navigation Items */}
      <nav className="flex-1 flex flex-col items-center space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href && !item.onClick;

          return (
            <motion.div
              key={item.label}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {item.onClick ? (
                <button
                  onClick={item.onClick}
                  className={`p-2.5 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  title={item.label}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={`p-2.5 rounded-lg transition-all duration-200 block ${
                    isActive
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  title={item.label}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                </Link>
              )}
            </motion.div>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="flex flex-col items-center space-y-3">
        {/* Beta Badge */}
        <span className="text-[9px] font-bold text-gray-500 dark:text-gray-500 bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded">
          BETA
        </span>
        
        {/* User Avatar */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Link
            href="/profile"
            className="w-8 h-8 rounded-full bg-gray-700 dark:bg-gray-600 text-white flex items-center justify-center font-medium text-sm"
            title="Profile"
          >
            {userName.charAt(0).toUpperCase()}
          </Link>
        </motion.div>
      </div>
    </aside>
  );
}
