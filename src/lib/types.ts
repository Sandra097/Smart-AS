export interface ConversationData {
  id: string;
  title: string;
  messages: MessageData[];
  createdAt: string;
  updatedAt: string;
}

export interface MessageData {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  attachments?: AttachmentData[];
}

export interface AttachmentData {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
}

export interface ChatRequest {
  messages: MessageData[];
  conversationId?: string;
}

export interface ChatResponse {
  message: MessageData;
  conversationId: string;
}

export interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface SuggestionPill {
  id: string;
  label: string;
  prompt: string;
  icon?: string;
}

export const SUGGESTION_PILLS: SuggestionPill[] = [
  {
    id: 'create-image',
    label: 'Create an image',
    prompt: 'Create an image of ',
  },
  {
    id: 'simplify-topic',
    label: 'Simplify a topic',
    prompt: 'Explain this topic in simple terms: ',
  },
  {
    id: 'write-draft',
    label: 'Write a first draft',
    prompt: 'Help me write a first draft about ',
  },
  {
    id: 'take-quiz',
    label: 'Take a quiz',
    prompt: 'Create a quiz for me about ',
  },
  {
    id: 'design-logo',
    label: 'Design a logo',
    prompt: 'Design a logo for ',
  },
  {
    id: 'say-with-care',
    label: 'Say it with care',
    prompt: 'Help me say this more thoughtfully: ',
  },
  {
    id: 'paint-sunrise',
    label: 'Paint a sunrise',
    prompt: 'Create an image of a beautiful sunrise ',
  },
  {
    id: 'write-speech',
    label: 'Write a speech',
    prompt: 'Help me write a speech about ',
  },
];
