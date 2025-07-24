'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ChatPage } from '@/components/chat'

export default function Chat() {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in')
    }
  }, [user, isLoaded, router])

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to sign-in
  }

  // Demo conversation ID - in production this would come from routing or user selection
  const demoConversationId = 'demo-conversation-123'

  return (
    <ChatPage
      conversationId={demoConversationId}
      userId={user.id}
      userName={user.fullName || user.username || 'User'}
    />
  )
}
