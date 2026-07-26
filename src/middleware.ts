import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // If we are in production (e.g. Vercel), block access entirely
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not Found' },
      { status: 404 }
    );
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    '/editor',
    '/editor/:path*',
    '/api/save',
    '/api/save/:path*',
    '/api/upload',
    '/api/upload/:path*'
  ],
};
