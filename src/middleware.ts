import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/music(.*)',
  '/profile(.*)',
  '/settings(.*)',
]);

const isAuthRoute = createRouteMatcher(['/login(.*)', '/signup(.*)']);

export default clerkMiddleware(async (auth, req) => {
  // Clerk webhooks must not go through session/auth handling — Svix calls this with no user cookie.
  if (req.nextUrl.pathname.startsWith('/api/webhooks')) {
    return NextResponse.next();
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  if (isAuthRoute(req)) {
    const { userId } = await auth();
    if (userId) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }
});

export const config = {
  matcher: [
    // Pages + API except Clerk webhooks (Svix POSTs must not hit clerkMiddleware — avoids redirects / failed deliveries)
    '/((?!_next|api/webhooks|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api/(?!webhooks)|trpc)(.*)',
  ],
};
