'use client'

import { useState } from 'react'
import { ChatInput } from '@/components/chat/chat-input'
import { MessageBubble } from '@/components/chat/message-bubble'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function TestTask173Page() {
  const [messages, setMessages] = useState<
    {
      id: string
      content: string
      timestamp: number
      isOwn: boolean
      authorName: string
      authorId: string
    }[]
  >([])

  const handleSendMessage = (content: string) => {
    const newMessage = {
      id: `msg-${Date.now()}`,
      content,
      timestamp: Date.now(),
      isOwn: true,
      authorName: 'You',
      authorId: 'current-user',
    }
    setMessages(prev => [...prev, newMessage])
  }

  const addTestMessage = (content: string, isOwn: boolean = false) => {
    const newMessage = {
      id: `test-${Date.now()}`,
      content,
      timestamp: Date.now(),
      isOwn,
      authorName: isOwn ? 'You' : 'Test User',
      authorId: isOwn ? 'current-user' : 'test-user',
    }
    setMessages(prev => [...prev, newMessage])
  }

  const clearMessages = () => {
    setMessages([])
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      <div className="text-center">
        <h1 className="mb-2 text-3xl font-bold">
          Task 17.3: End-to-End Emoji & Markdown Flow Test
        </h1>
        <p className="text-muted-foreground">
          Test the complete flow: typing markdown + adding emojis → sending →
          rendering
        </p>
      </div>

      {/* Test Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Test Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
            <h3 className="mb-2 font-semibold">Follow these steps:</h3>
            <ol className="list-inside list-decimal space-y-2 text-sm">
              <li>
                Type a message with markdown formatting (e.g., **bold** and
                *italic*)
              </li>
              <li>Click the emoji button (😊) to open the emoji picker</li>
              <li>Add an emoji to your message</li>
              <li>Send the message</li>
              <li>
                Verify the message appears correctly formatted in the chat below
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Quick Test Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Test Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                addTestMessage('This is **bold** text with an emoji! 🎉')
              }
            >
              Add: Bold + Emoji
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                addTestMessage('This is *italic* text with emojis! 👋 🚀')
              }
            >
              Add: Italic + Emojis
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                addTestMessage('Complex: **Bold** and *italic* with emoji! 💯')
              }
            >
              Add: Complex Format
            </Button>
            <Button variant="outline" size="sm" onClick={clearMessages}>
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chat Messages Display */}
      <Card>
        <CardHeader>
          <CardTitle>Message History ({messages.length} messages)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[500px] min-h-[300px] space-y-4 overflow-y-auto rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
            {messages.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No messages yet. Send a message using the input below!
              </div>
            ) : (
              messages.map(message => (
                <MessageBubble
                  key={message.id}
                  messageId={message.id}
                  content={message.content}
                  authorId={message.authorId}
                  authorName={message.authorName}
                  timestamp={message.timestamp}
                  isOwn={message.isOwn}
                  showAnalysis={false}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat Input for Testing */}
      <Card>
        <CardHeader>
          <CardTitle>Chat Input (with Emoji Picker)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChatInput
            onSendMessage={handleSendMessage}
            placeholder="Type your message with **markdown** and add emojis! 🎯"
          />
        </CardContent>
      </Card>

      {/* Expected Results */}
      <Card>
        <CardHeader>
          <CardTitle>Expected Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="font-semibold text-green-600">✓</span>
              <span>
                Markdown formatting should render correctly (**bold** →{' '}
                <strong>bold</strong>, *italic* → <em>italic</em>)
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-green-600">✓</span>
              <span>Emojis should display properly in the message bubbles</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-green-600">✓</span>
              <span>
                Raw string should be sent to backend (markdown syntax + emojis
                preserved)
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-green-600">✓</span>
              <span>
                Emoji picker should integrate smoothly with text input
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-green-600">✓</span>
              <span>No conflicts between markdown and emoji rendering</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
