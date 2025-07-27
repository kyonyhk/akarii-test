import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher([
  '/chat(.*)',
  '/dashboard(.*)',
  '/profile(.*)',
  '/settings(.*)',
  '/invite(.*)',
])

const isAdminRoute = createRouteMatcher(['/admin(.*)'])

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

  // Check for admin routes first - require authentication and admin role
  if (isAdminRoute(req)) {
    const { sessionClaims } = await auth.protect()

    // Check if user has admin role
    const userRole = (sessionClaims?.publicMetadata as { role?: string })?.role
    if (userRole !== 'admin') {
      // Redirect non-admin users to home page
      return NextResponse.redirect(new URL('/', req.url))
    }
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
