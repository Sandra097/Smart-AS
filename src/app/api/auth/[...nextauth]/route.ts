// Lazy initialize NextAuth to avoid initializing the Prisma adapter at build time
// This prevents build-time failures on platforms without the DB (e.g., Vercel using SQLite)
export const GET = async (request: Request) => {
  try {
    const { authOptions } = await import('@/lib/auth');
    const NextAuth = (await import('next-auth')).default;
    const handler = NextAuth(authOptions);
    return await handler(request as any);
  } catch (err) {
    // Protect build-time page data collection and return a friendly status instead of crashing
    console.error('[NextAuth] handler error:', err);
    return new Response('Auth handler not available at build time', { status: 503 });
  }
};

export const POST = async (request: Request) => {
  try {
    const { authOptions } = await import('@/lib/auth');
    const NextAuth = (await import('next-auth')).default;
    const handler = NextAuth(authOptions);
    return await handler(request as any);
  } catch (err) {
    console.error('[NextAuth] handler error:', err);
    return new Response('Auth handler not available at build time', { status: 503 });
  }
};
