'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ChatPage } from '@/components/chat'
import { MainLayout } from '@/components/layout/main-layout'
import { ScrollSyncProvider } from '@/contexts/scroll-sync-context'

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
      <MainLayout title="Loading Chat...">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!user) {
    return null // Will redirect to sign-in
  }

  // Demo conversation ID - in production this would come from routing or user selection
  const demoConversationId = 'demo-conversation-123'

  return (
    <MainLayout title="Chat">
      <ScrollSyncProvider>
        <div className="flex h-[600px] w-full max-w-6xl">
          <ChatPage
            conversationId={demoConversationId}
            userId={user.id}
            userName={user.fullName || user.username || 'User'}
          />
        </div>
      </ScrollSyncProvider>
    </MainLayout>
  )
}
