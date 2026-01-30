'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { v4 as uuidv4 } from 'uuid';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ChatInput from '@/components/ChatInput';
import ChatContainer from '@/components/ChatContainer';
import SuggestionPills from '@/components/SuggestionPills';
import Footer from '@/components/Footer';
import SettingsToggle from '@/components/SettingsToggle';
import { useChatStore, Message, Conversation } from '@/lib/store';
import { useAutosuggest } from '@/lib/autosuggest-context';
import { generateId } from '@/lib/utils';

export default function Home() {
  const { data: session } = useSession();
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  const { autosuggestEnabled } = useAutosuggest();

  const {
    conversations,
    currentConversationId,
    isLoading,
    isStreaming,
    streamingMessage,
    setCurrentConversation,
    addConversation,
    addMessage,
    setLoading,
    setStreaming,
    appendStreamingMessage,
    clearStreamingMessage,
    getCurrentConversation,
    startNewChat,
  } = useChatStore();

  const currentConversation = getCurrentConversation();
  const userName = session?.user?.name || 'Sandra';

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join('');
        setInputValue(transcript);
      };

      recognitionInstance.onend = () => {
        setIsRecording(false);
      };

      recognitionInstance.onerror = () => {
        setIsRecording(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  const handleVoiceInput = useCallback(() => {
    if (!recognition) {
      alert('Speech recognition is not supported in your browser');
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      recognition.start();
      setIsRecording(true);
    }
  }, [recognition, isRecording]);

  const handleSendMessage = useCallback(
    async (message: string, attachments?: File[]) => {
      if (!message.trim() || isLoading || isStreaming) return;

      setInputValue('');
      setLoading(true);

      // Create or get conversation
      let conversationId = currentConversationId;
      if (!conversationId) {
        const newConversation: Conversation = {
          id: generateId(),
          title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        addConversation(newConversation);
        conversationId = newConversation.id;
      }

      // Add user message
      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: message,
        timestamp: new Date(),
      };
      addMessage(conversationId, userMessage);

      // Prepare messages for API
      const conversation = conversations.find((c) => c.id === conversationId);
      const allMessages = [...(conversation?.messages || []), userMessage];
      const apiMessages = allMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      try {
        setStreaming(true);
        clearStreamingMessage();

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: apiMessages,
            conversationId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get response');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                break;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  appendStreamingMessage(parsed.content);
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }

        // Add assistant message
        if (fullContent) {
          const assistantMessage: Message = {
            id: generateId(),
            role: 'assistant',
            content: fullContent,
            timestamp: new Date(),
          };
          addMessage(conversationId, assistantMessage);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        // Add error message
        const errorMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: 'Sorry, I encountered an error while processing your request. Please try again.',
          timestamp: new Date(),
        };
        addMessage(conversationId, errorMessage);
      } finally {
        setLoading(false);
        setStreaming(false);
        clearStreamingMessage();
      }
    },
    [
      currentConversationId,
      conversations,
      isLoading,
      isStreaming,
      addConversation,
      addMessage,
      setLoading,
      setStreaming,
      appendStreamingMessage,
      clearStreamingMessage,
    ]
  );

  const handlePillClick = useCallback((prompt: string) => {
    setInputValue(prompt);
  }, []);

  const hasMessages = currentConversation && currentConversation.messages.length > 0;

  return (
    <div className="min-h-screen bg-copilot-beige dark:bg-gray-900 flex">
      <Sidebar userName={userName} />

      <main className="flex-1 ml-12 flex flex-col min-h-screen">
        {!hasMessages ? (
          // Welcome View
          <div className="flex-1 flex flex-col justify-center items-center px-4">
            <Header userName={userName} showGreeting={true} />

            <ChatInput
              onSendMessage={handleSendMessage}
              onVoiceInput={handleVoiceInput}
              isLoading={isLoading}
              isRecording={isRecording}
              initialValue={inputValue}
              showAutoSuggest={autosuggestEnabled}
            />

            <SuggestionPills onPillClick={handlePillClick} />

            <Footer />
          </div>
        ) : (
          // Chat View
          <>
            <Header userName={userName} showGreeting={false} showUserSelector={true} />
            <ChatContainer
              messages={currentConversation.messages}
              streamingMessage={streamingMessage}
              isLoading={isLoading}
            />

            <div className="sticky bottom-0 bg-copilot-beige dark:bg-gray-900 py-4 border-t border-gray-200 dark:border-gray-700">
              <ChatInput
                onSendMessage={handleSendMessage}
                onVoiceInput={handleVoiceInput}
                isLoading={isLoading || isStreaming}
                isRecording={isRecording}
                initialValue={inputValue}
                showAutoSuggest={autosuggestEnabled}
              />
              <Footer />
            </div>
          </>
        )}
      </main>

      {/* Settings Toggle - Fixed position at bottom right */}
      <SettingsToggle />
    </div>
  );
}
