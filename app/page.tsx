'use client'

import { MainLayout } from '@/components/layout/main-layout'
import { ChatPage } from '@/components/chat'
import { PrismPanel } from '@/components/analysis'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function Home() {
  // Demo conversation ID - in production this would come from routing or user selection
  const demoConversationId = 'demo-conversation-123'
  const demoUserId = 'demo-user-456'

  return (
    <MainLayout title="Welcome to Akarii">
      <div className="w-full max-w-6xl space-y-8">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome to Akarii
          </h1>
          <p className="text-xl text-muted-foreground">
            AI-powered real-time message analysis platform
          </p>
        </div>

        {/* Chat Demo Section - Split Pane Layout */}
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
          <div className="h-px bg-border lg:hidden" />

          {/* Right side - Analysis Prism Panel */}
          <div className="flex min-h-0 w-full flex-col space-y-4 p-4 lg:w-80">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Analysis Prism</h2>
              <span className="text-xs text-muted-foreground lg:hidden">
                Swipe or scroll to explore
              </span>
            </div>
            <div className="min-h-0 flex-1">
              <PrismPanel conversationId={demoConversationId} />
            </div>
          </div>
        </div>

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
