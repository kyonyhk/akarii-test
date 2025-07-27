'use client'

import { useAuth, useUser } from '@clerk/nextjs'
import { MainLayout } from '@/components/layout/main-layout'
import { ChatPage } from '@/components/chat'
import { PrismPanel } from '@/components/analysis'
import { ScrollSyncProvider } from '@/contexts/scroll-sync-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRole } from '@/hooks/useRole'
import Link from 'next/link'

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()
  const { role, isLoading: roleLoading } = useRole()

  // Demo conversation ID - in production this would come from routing or user selection
  const demoConversationId = 'demo-conversation-123'
  const demoUserId = 'demo-user-456'

  if (!isLoaded) {
    return (
      <MainLayout title="Welcome to Akarii">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Welcome to Akarii">
      <div className="w-full max-w-6xl space-y-8">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            {isSignedIn ? 'Welcome Back!' : 'Welcome to Akarii'}
          </h1>
          <p className="text-xl text-muted-foreground">
            AI-powered real-time message analysis platform
          </p>

          {/* Debug: Show user role information - Admin only */}
          {isSignedIn && user && role === 'admin' && (
            <div className="rounded-lg border bg-card p-4 text-left text-sm">
              <h3 className="mb-2 font-semibold">
                Debug: User Role Information (Admin Only)
              </h3>
              <div className="space-y-1 font-mono">
                <div>Email: {user.primaryEmailAddress?.emailAddress}</div>
                <div>User ID: {user.id}</div>
                <div>
                  Public Metadata:{' '}
                  {JSON.stringify(user.publicMetadata, null, 2)}
                </div>
                <div>
                  Role from metadata: {user.publicMetadata?.role || 'undefined'}
                </div>
              </div>
            </div>
          )}
          {isSignedIn ? (
            <div className="flex justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/chat">Start Chatting</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/dashboard">View Dashboard</Link>
              </Button>
            </div>
          ) : (
            <div className="flex justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/sign-in">Sign In</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/sign-up">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Chat Demo Section - Split Pane Layout */}
        <ScrollSyncProvider>
          <div className="flex h-[600px] flex-col gap-4 rounded-lg border bg-card lg:flex-row">
            {/* Left side - Chat Interface */}
            <div className="flex min-h-0 flex-1 flex-col space-y-4 p-4">
              <h2 className="text-xl font-semibold">Live Chat Interface</h2>
              <div className="min-h-0 flex-1">
                <ChatPage
                  conversationId={demoConversationId}
                  userId={demoUserId}
                  userName="Demo User"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="hidden w-px bg-border lg:block" />

            {/* Right side - Analysis Prism Panel (hidden on mobile, analysis shown in chat) */}
            <div className="hidden min-h-0 w-full flex-col space-y-4 p-4 lg:flex lg:w-80">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Analysis Prism</h2>
              </div>
              <div className="min-h-0 flex-1">
                <PrismPanel conversationId={demoConversationId} />
              </div>
            </div>
          </div>
        </ScrollSyncProvider>

        {/* Features Overview Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Features Overview</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>Real-time Chat</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Live messaging with instant message delivery and real-time
                  updates.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Instant message analysis powered by OpenAI for insights and
                  patterns.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Collaboration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Seamless team workflows with invite links and shared
                  conversations.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Review Mode</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Async review of conversations with inline analysis and export
                  options.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
