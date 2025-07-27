'use client'

import { useState, useEffect } from 'react'
import { ChatPage } from '@/components/chat'
import { PrismPanel } from '@/components/analysis'
import { MainLayout } from '@/components/layout/main-layout'
import { ScrollSyncProvider } from '@/contexts/scroll-sync-context'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Loader2 } from 'lucide-react'
import type { Id } from '@/convex/_generated/dataModel'

export default function Chat() {
  const { user } = useUser()
  const [currentConversationId, setCurrentConversationId] =
    useState<Id<'conversations'> | null>(null)

  // Get user's conversations
  const conversations = useQuery(api.conversations.getConversations, {
    userId: user?.id || '',
  })

  // Create conversation mutation
  const createConversationMutation = useMutation(
    api.conversations.createConversation
  )

  // Auto-create or use existing conversation
  useEffect(() => {
    const initializeConversation = async () => {
      if (!user?.id || !conversations) return

      if (conversations.length > 0) {
        // Use the most recent conversation
        setCurrentConversationId(conversations[0]._id)
      } else {
        // Create a new conversation for the user
        try {
          const newConversationId = await createConversationMutation({
            title: 'My Chat',
            participants: [user.id],
            createdBy: user.id,
          })
          setCurrentConversationId(newConversationId)
        } catch (error) {
          console.error('Failed to create conversation:', error)
        }
      }
    }

    initializeConversation()
  }, [user?.id, conversations, createConversationMutation])

  // Loading state
  if (!user || !currentConversationId) {
    return (
      <ProtectedRoute>
        <MainLayout title="Chat">
          <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Setting up your chat...</span>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <MainLayout title="Chat">
        <ScrollSyncProvider>
          <div className="flex h-[calc(100vh-8rem)] w-full max-w-6xl gap-4">
            {/* Chat Interface */}
            <div className="min-w-0 flex-1">
              <ChatPage
                conversationId={currentConversationId}
                userId={user.id}
                userName={user.fullName || user.username || 'User'}
              />
            </div>

            {/* Analysis Panel - Hidden on mobile since analysis is already shown in chat */}
            <div className="hidden w-80 min-w-0 md:block">
              <PrismPanel conversationId={currentConversationId} />
            </div>
          </div>
        </ScrollSyncProvider>
      </MainLayout>
    </ProtectedRoute>
  )
}
