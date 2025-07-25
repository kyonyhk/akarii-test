import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/chat(.*)',
  '/dashboard(.*)',
  '/profile(.*)',
  '/settings(.*)',
  '/invite(.*)',
])

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/share(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // Skip authentication for public routes
  if (isPublicRoute(req)) {
    return
  }

  // Protect all other routes by default, with specific handling for protected routes
  if (isProtectedRoute(req)) {
    await auth.protect()
  } else {
    // For any other routes, still require authentication but don't enforce specific permissions
    await auth.protect()
  }
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
