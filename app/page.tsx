'use client'

import { MainLayout } from '@/components/layout/main-layout'
import { MessageInput } from '@/components/forms/message-input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function Home() {
  const handleSendMessage = (message: string) => {
    console.log('Message sent:', message)
    // This will be connected to Convex later
  }

  return (
    <MainLayout title="Welcome to Akarii">
      <div className="w-full max-w-4xl space-y-8">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome to Akarii
          </h1>
          <p className="text-xl text-muted-foreground">
            AI-powered real-time message analysis platform
          </p>
        </div>

        <Card className="mx-auto max-w-sm">
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>Test the component integration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <MessageInput onSendMessage={handleSendMessage} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
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
    </MainLayout>
  )
}
