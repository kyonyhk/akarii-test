'use client'

import { MainLayout } from '@/components/layout/main-layout'
import { ChatPage } from '@/components/chat'
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

        {/* Chat Demo Section */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Live Chat Interface</h2>
            <ChatPage
              conversationId={demoConversationId}
              userId={demoUserId}
              userName="Demo User"
            />
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Features Overview</h2>
            <div className="grid grid-cols-1 gap-4">
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
                    Async review of conversations with inline analysis and
                    export options.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
