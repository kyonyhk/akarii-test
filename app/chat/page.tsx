'use client'

import { ChatPage } from '@/components/chat'
import { MainLayout } from '@/components/layout/main-layout'
import { ScrollSyncProvider } from '@/contexts/scroll-sync-context'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useUser } from '@clerk/nextjs'

export default function Chat() {
  const { user } = useUser()

  // Demo conversation ID - in production this would come from routing or user selection
  const demoConversationId = 'demo-conversation-123'

  return (
    <ProtectedRoute>
      <MainLayout title="Chat">
        <ScrollSyncProvider>
          <div className="flex h-[600px] w-full max-w-6xl">
            <ChatPage
              conversationId={demoConversationId}
              userId={user?.id || ''}
              userName={user?.fullName || user?.username || 'User'}
            />
          </div>
        </ScrollSyncProvider>
      </MainLayout>
    </ProtectedRoute>
  )
}
