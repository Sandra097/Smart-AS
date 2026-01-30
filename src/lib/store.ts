import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  streamingMessage: string;
  
  // Actions
  setCurrentConversation: (id: string | null) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, content: string) => void;
  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  setStreamingMessage: (message: string) => void;
  appendStreamingMessage: (chunk: string) => void;
  clearStreamingMessage: () => void;
  getCurrentConversation: () => Conversation | undefined;
  startNewChat: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,
      isLoading: false,
      isStreaming: false,
      streamingMessage: '',

      setCurrentConversation: (id) => set({ currentConversationId: id }),

      addConversation: (conversation) =>
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          currentConversationId: conversation.id,
        })),

      updateConversation: (id, updates) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id ? { ...conv, ...updates, updatedAt: new Date() } : conv
          ),
        })),

      deleteConversation: (id) =>
        set((state) => ({
          conversations: state.conversations.filter((conv) => conv.id !== id),
          currentConversationId:
            state.currentConversationId === id ? null : state.currentConversationId,
        })),

      addMessage: (conversationId, message) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: [...conv.messages, message],
                  updatedAt: new Date(),
                  title:
                    conv.messages.length === 0 && message.role === 'user'
                      ? message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
                      : conv.title,
                }
              : conv
          ),
        })),

      updateMessage: (conversationId, messageId, content) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: conv.messages.map((msg) =>
                    msg.id === messageId ? { ...msg, content } : msg
                  ),
                }
              : conv
          ),
        })),

      setLoading: (loading) => set({ isLoading: loading }),
      setStreaming: (streaming) => set({ isStreaming: streaming }),
      setStreamingMessage: (message) => set({ streamingMessage: message }),
      appendStreamingMessage: (chunk) =>
        set((state) => ({ streamingMessage: state.streamingMessage + chunk })),
      clearStreamingMessage: () => set({ streamingMessage: '' }),

      getCurrentConversation: () => {
        const state = get();
        return state.conversations.find((conv) => conv.id === state.currentConversationId);
      },

      startNewChat: () => set({ currentConversationId: null, streamingMessage: '' }),
    }),
    {
      name: 'copilot-chat-storage',
      partialize: (state) => ({
        conversations: state.conversations,
      }),
    }
  )
);

// Theme store
interface ThemeState {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (dark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDarkMode: false,
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      setDarkMode: (dark) => set({ isDarkMode: dark }),
    }),
    {
      name: 'copilot-theme-storage',
    }
  )
);
