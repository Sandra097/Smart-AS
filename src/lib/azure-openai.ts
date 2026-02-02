import { AzureOpenAI } from 'openai';

// Parse the endpoint to extract base URL
const fullEndpoint = process.env.AZURE_OPENAI_ENDPOINT || '';
const endpointMatch = fullEndpoint.match(/https:\/\/[^\/]+/);
const baseEndpoint = endpointMatch ? endpointMatch[0] : '';

// Lazy create Azure OpenAI client at runtime to avoid requiring credentials during build
function createAzureClient(): AzureOpenAI | null {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  if (!apiKey) {
    // Return null; callers will throw a clear error at request time if they attempt to use the client
    return null;
  }

  return new AzureOpenAI({
    endpoint: baseEndpoint,
    apiKey,
    apiVersion: '2024-05-01-preview',
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-5-nano',
  });
}

export function getAzureOpenAI(): AzureOpenAI {
  const client = createAzureClient();
  if (!client) {
    throw new Error('Missing AZURE_OPENAI_API_KEY environment variable. Configure it in your environment.');
  }
  return client;
} 

export const SYSTEM_PROMPT = `You are a helpful AI assistant named Copilot, created by Microsoft. You are friendly, knowledgeable, and always aim to provide accurate and helpful responses.

Your capabilities include:
- Answering questions on a wide range of topics
- Helping with writing, editing, and improving text
- Explaining complex concepts in simple terms
- Assisting with coding and technical questions
- Creative writing and brainstorming
- Problem-solving and analysis

Guidelines:
- Be concise but thorough in your responses
- Use markdown formatting when appropriate (headers, lists, code blocks)
- If you're unsure about something, acknowledge it
- Be respectful and professional
- Provide examples when they would be helpful`;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function* streamChatCompletion(messages: ChatMessage[]) {
  const messagesWithSystem: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages,
  ];

  const azureOpenAI = getAzureOpenAI();

  const stream = await azureOpenAI.chat.completions.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-5-nano',
    messages: messagesWithSystem,
    stream: true,
    max_tokens: 4096,
    temperature: 0.7,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}

export async function getChatCompletion(messages: ChatMessage[]): Promise<string> {
  const messagesWithSystem: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages,
  ];

  const azureOpenAI = getAzureOpenAI();

  const response = await azureOpenAI.chat.completions.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-5-nano',
    messages: messagesWithSystem,
    max_tokens: 4096,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || '';
} 
