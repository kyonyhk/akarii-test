'use client'

import { MessageBubble } from '@/components/chat/message-bubble-redesigned'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestMessageBubblePage() {
  const currentTime = Date.now()
  const yesterdayTime = currentTime - 24 * 60 * 60 * 1000
  const lastWeekTime = currentTime - 7 * 24 * 60 * 60 * 1000

  return (
    <div className="container mx-auto max-w-4xl space-y-8 p-6">
      <div className="text-center">
        <h1 className="mb-2 text-3xl font-bold">
          MessageBubble Component Test
        </h1>
        <p className="text-muted-foreground">
          Testing different variants and states
        </p>
      </div>

      {/* Default Variant */}
      <Card>
        <CardHeader>
          <CardTitle>Default Variant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
            <MessageBubble
              messageId="test-1"
              content="Hey there! This is a message from another user. It should appear on the left side with a white background."
              authorId="user-123"
              authorName="Alice Johnson"
              timestamp={currentTime}
              isOwn={false}
              showAnalysis={false}
            />

            <MessageBubble
              messageId="test-2"
              content="And this is my response! It should appear on the right side with a blue gradient background."
              authorId="current-user"
              authorName="You"
              timestamp={currentTime + 60000}
              isOwn={true}
              showAnalysis={false}
            />

            <MessageBubble
              messageId="test-3"
              content="This is a longer message to test how the component handles text wrapping. It should maintain proper bubble shape and readability even with multiple lines of content. The bubble should expand naturally to accommodate the text."
              authorId="user-456"
              authorName="Bob Smith"
              timestamp={currentTime + 120000}
              isOwn={false}
              showAnalysis={false}
            />
          </div>
        </CardContent>
      </Card>

      {/* Compact Variant */}
      <Card>
        <CardHeader>
          <CardTitle>Compact Variant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-900">
            <MessageBubble
              messageId="compact-1"
              content="First message in a group"
              authorId="user-123"
              authorName="Alice Johnson"
              timestamp={currentTime}
              isOwn={false}
              variant="compact"
              showAnalysis={false}
            />

            <MessageBubble
              messageId="compact-2"
              content="Second message from same user"
              authorId="user-123"
              authorName="Alice Johnson"
              timestamp={currentTime + 30000}
              isOwn={false}
              variant="compact"
              showAvatar={false}
              showTimestamp={false}
              showAnalysis={false}
            />

            <MessageBubble
              messageId="compact-3"
              content="Third message completing the group"
              authorId="user-123"
              authorName="Alice Johnson"
              timestamp={currentTime + 60000}
              isOwn={false}
              variant="compact"
              showAvatar={false}
              showAnalysis={false}
            />
          </div>
        </CardContent>
      </Card>

      {/* Different Timestamps */}
      <Card>
        <CardHeader>
          <CardTitle>Timestamp Variations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
            <MessageBubble
              messageId="time-1"
              content="Message from today"
              authorId="user-123"
              authorName="Alice Johnson"
              timestamp={currentTime}
              isOwn={false}
              showAnalysis={false}
            />

            <MessageBubble
              messageId="time-2"
              content="Message from yesterday"
              authorId="user-456"
              authorName="Bob Smith"
              timestamp={yesterdayTime}
              isOwn={false}
              showAnalysis={false}
            />

            <MessageBubble
              messageId="time-3"
              content="Message from last week"
              authorId="user-789"
              authorName="Carol Davis"
              timestamp={lastWeekTime}
              isOwn={false}
              showAnalysis={false}
            />
          </div>
        </CardContent>
      </Card>

      {/* Active State */}
      <Card>
        <CardHeader>
          <CardTitle>Active/Selected State</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
            <MessageBubble
              messageId="active-1"
              content="This message is in active/selected state"
              authorId="user-123"
              authorName="Alice Johnson"
              timestamp={currentTime}
              isOwn={false}
              isActive={true}
              showAnalysis={false}
            />

            <MessageBubble
              messageId="normal-1"
              content="This is a normal message for comparison"
              authorId="user-456"
              authorName="Bob Smith"
              timestamp={currentTime + 60000}
              isOwn={false}
              showAnalysis={false}
            />
          </div>
        </CardContent>
      </Card>

      {/* User vs Assistant Styling */}
      <Card>
        <CardHeader>
          <CardTitle>User vs Assistant Comparison</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
            <MessageBubble
              messageId="assistant-1"
              content="I'm an AI assistant. This message should have clean, professional styling that's easy to read."
              authorId="assistant"
              authorName="AI Assistant"
              timestamp={currentTime}
              isOwn={false}
              showAnalysis={false}
            />

            <MessageBubble
              messageId="user-own-1"
              content="I'm the current user. My messages should have the blue gradient and appear on the right."
              authorId="current-user"
              authorName="You"
              timestamp={currentTime + 60000}
              isOwn={true}
              showAnalysis={false}
            />

            <MessageBubble
              messageId="user-other-1"
              content="I'm another user in the conversation. I should have the same styling as the assistant but with my own avatar."
              authorId="other-user"
              authorName="Team Member"
              timestamp={currentTime + 120000}
              isOwn={false}
              showAnalysis={false}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
