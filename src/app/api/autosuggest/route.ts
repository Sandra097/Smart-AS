import { NextRequest, NextResponse } from 'next/server';
import { azureOpenAI } from '@/lib/azure-openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// In-memory cache for suggestions (in production, use Redis)
const suggestionCache = new Map<string, { suggestions: string[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Rate limiting
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT = 30; // requests per minute
const RATE_WINDOW = 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const data = rateLimitMap.get(ip);

  if (!data || now - data.timestamp > RATE_WINDOW) {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (data.count >= RATE_LIMIT) {
    return false;
  }

  data.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    console.log('[Autosuggest API] Request received');
    
    // Get client IP for rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { prefix, maxSuggestions = 4, style = 'natural', writingStyle = '', pastQueries = '' } = body as {
      prefix: string;
      maxSuggestions?: number;
      style?: 'keyword' | 'natural' | 'conversational';
      writingStyle?: string;
      pastQueries?: string;
    };

    console.log('[Autosuggest API] Personalization - Length Style:', style, '| Writing Style:', writingStyle, '| PastQueries:', pastQueries?.substring(0, 50));

    if (!prefix || typeof prefix !== 'string') {
      return NextResponse.json(
        { error: 'Prefix is required' },
        { status: 400 }
      );
    }

    const normalizedPrefix = prefix.toLowerCase().trim();
    
    // Check cache first (include style and user context in cache key)
    const cacheKey = `${normalizedPrefix}:${maxSuggestions}:${style}:${writingStyle}`;
    const cached = suggestionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ 
        suggestions: cached.suggestions,
        source: 'cache'
      });
    }

    // Style-specific LENGTH instructions with examples
    const lengthInstructions: Record<string, string> = {
      'keyword': `LENGTH: Very short (2-4 words total). Examples for "when is the":
- when is the superbowl
- when is the election
- when is the deadline`,
      
      'natural': `LENGTH: Medium length (4-6 words total). Examples for "when is the":
- when is the next full moon
- when is the best time to buy
- when is the deadline for taxes`,
      
      'conversational': `LENGTH: Detailed (6+ words total). Examples for "when is the":
- when is the best time to visit japan for cherry blossoms
- when is the right time to start investing in stocks
- when is the deadline for submitting my tax return this year`
    };

    // Writing style PHRASING instructions based on user's preference
    const getPhrasingInstructions = (userStyle: string): string => {
      const lowerStyle = userStyle.toLowerCase();
      
      if (lowerStyle.includes('keyword') || lowerStyle.includes('technical')) {
        return `TONE: Technical and precise. Use industry terms. Examples: "python syntax error fix", "API authentication methods", "machine learning model training"`;
      }
      if (lowerStyle.includes('casual') || lowerStyle.includes('search-engine')) {
        return `TONE: Casual and simple. Like everyday web searches. Examples: "weather tomorrow", "best restaurants nearby", "cheap flights to london"`;
      }
      if (lowerStyle.includes('semi-formal') || lowerStyle.includes('descriptive')) {
        return `TONE: Semi-formal and descriptive. Professional but clear. Examples: "comprehensive guide to investing", "step by step python tutorial", "best practices for interviews"`;
      }
      if (lowerStyle.includes('conversational') || lowerStyle.includes('question')) {
        return `TONE: Conversational and question-like. Natural spoken language. Examples: "how do I improve my credit score", "what are the best ways to save", "should I invest in stocks"`;
      }
      if (lowerStyle.includes('natural language') || lowerStyle.includes('task-oriented') || lowerStyle.includes('detailed')) {
        return `TONE: Task-oriented and detailed. Like asking an assistant for help. Examples: "help me plan a trip to europe next summer", "show me how to create a budget spreadsheet", "explain the difference between stocks and bonds"`;
      }
      
      return `TONE: Natural and helpful`;
    };

    // Build personalization context
    let topicsContext = '';
    if (pastQueries) {
      const pastQueriesList = pastQueries.split(';').map(q => q.trim()).filter(q => q.length > 0);
      if (pastQueriesList.length > 0) {
        topicsContext = `TOPICS OF INTEREST: ${pastQueriesList.slice(0, 4).join(', ')}. Consider these when relevant.`;
      }
    }
    
    const phrasingInstructions = writingStyle ? getPhrasingInstructions(writingStyle) : '';

    // Generate suggestions using Azure OpenAI - improved prompt
    const systemPrompt = `You are a search autocomplete engine. Complete the user's query with ${maxSuggestions} popular, realistic suggestions.

INPUT: "${prefix}"

${lengthInstructions[style] || lengthInstructions['natural']}

${phrasingInstructions}

${topicsContext}

RULES:
1. Every suggestion MUST start exactly with "${prefix}" - copy it exactly, including any trailing spaces
2. Complete with real, commonly searched queries
3. Make each suggestion unique and useful
4. Output ONLY the ${maxSuggestions} complete suggestions, one per line
5. No numbers, bullets, or explanations

OUTPUT ${maxSuggestions} SUGGESTIONS:`;

    const response = await azureOpenAI.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Complete: "${prefix}"` }
      ],
      // Removed max_completion_tokens and temperature as gpt-5-nano may not support them
    });

    console.log('[Autosuggest API] Full response:', JSON.stringify(response.choices[0], null, 2));
    const content = response.choices[0]?.message?.content || '';
    console.log('[Autosuggest API] AI Response content:', content);
    
    // Parse suggestions from response - be more lenient
    let suggestions = content
      .split('\n')
      .map(line => line.trim())
      .map(line => line.replace(/^\d+[\.\)]\s*/, '')) // Remove numbering like "1." or "1)"
      .map(line => line.replace(/^[-•*]\s*/, '')) // Remove bullets
      .map(line => line.replace(/^["']|["']$/g, '')) // Remove quotes
      .filter(line => line.length > 0);

    console.log('[Autosuggest API] Parsed suggestions:', suggestions);

    // Build final suggestions
    let finalSuggestions: string[] = [];
    
    for (const line of suggestions) {
      if (finalSuggestions.length >= maxSuggestions) break;
      
      const lineLower = line.toLowerCase();
      
      // Check if suggestion already starts with prefix
      if (lineLower.startsWith(normalizedPrefix)) {
        finalSuggestions.push(line);
      } 
      // If the suggestion is just a completion (doesn't include prefix), prepend the prefix
      else if (line.length > 0 && !lineLower.includes(normalizedPrefix)) {
        // This is likely just the completion part, prepend the original prefix
        const combined = `${prefix} ${line}`.replace(/\s+/g, ' ').trim();
        finalSuggestions.push(combined);
      }
    }

    console.log('[Autosuggest API] Final suggestions:', finalSuggestions);

    // Only cache if we have results
    if (finalSuggestions.length > 0) {
      suggestionCache.set(cacheKey, {
        suggestions: finalSuggestions,
        timestamp: Date.now()
      });
    }

    return NextResponse.json({
      suggestions: finalSuggestions,
      source: 'ai'
    });

  } catch (error) {
    console.error('Autosuggest API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions', suggestions: [] },
      { status: 500 }
    );
  }
}
