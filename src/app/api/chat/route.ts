import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { streamChatCompletion, ChatMessage } from '@/lib/azure-openai';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT = 20; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userData = rateLimitMap.get(userId);

  if (!userData || now - userData.timestamp > RATE_WINDOW) {
    rateLimitMap.set(userId, { count: 1, timestamp: now });
    return true;
  }

  if (userData.count >= RATE_LIMIT) {
    return false;
  }

  userData.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    // For demo purposes, allow unauthenticated access
    const userId = (session?.user as any)?.id || 'demo-user';

    // Check rate limit
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { messages, conversationId } = body as {
      messages: ChatMessage[];
      conversationId?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages are required' },
        { status: 400 }
      );
    }

    // Validate and sanitize messages
    const sanitizedMessages: ChatMessage[] = messages.map((msg) => ({
      role: msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
      content: String(msg.content).slice(0, 32000), // Limit content length
    }));

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = '';

          for await (const chunk of streamChatCompletion(sanitizedMessages)) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
          }

          // Save to database if user is authenticated and conversationId provided
          if (session?.user && conversationId) {
            try {
              // Save the assistant message
              await prisma.message.create({
                data: {
                  role: 'assistant',
                  content: fullResponse,
                  conversationId,
                },
              });

              // Update conversation timestamp
              await prisma.conversation.update({
                where: { id: conversationId },
                data: { updatedAt: new Date() },
              });
            } catch (dbError) {
              console.error('Error saving to database:', dbError);
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: 'An error occurred while generating the response.' })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
