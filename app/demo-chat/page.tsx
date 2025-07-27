'use client'

import { DemoChatView } from '@/components/chat/demo-chat-view'

export default function DemoChatPage() {
  return (
    <div className="container mx-auto h-screen max-w-4xl p-4">
      <div className="mb-4 text-center">
        <h1 className="mb-2 text-2xl font-bold">Integrated Chat View Demo</h1>
        <p className="text-muted-foreground">
          Complete chat experience with message grouping and smart timestamps
        </p>
      </div>

      <div className="h-[calc(100vh-8rem)]">
        <DemoChatView />
      </div>
    </div>
  )
}
