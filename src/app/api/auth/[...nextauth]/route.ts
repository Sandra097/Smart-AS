// Lazy initialize NextAuth to avoid initializing the Prisma adapter at build time
// This prevents build-time failures on platforms without the DB (e.g., Vercel using SQLite)
export const GET = async (request: Request) => {
  const { authOptions } = await import('@/lib/auth');
  const NextAuth = (await import('next-auth')).default;
  const handler = NextAuth(authOptions);
  return handler(request as any);
};

export const POST = async (request: Request) => {
  const { authOptions } = await import('@/lib/auth');
  const NextAuth = (await import('next-auth')).default;
  const handler = NextAuth(authOptions);
  return handler(request as any);
};
