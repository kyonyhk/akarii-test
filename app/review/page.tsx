'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ReviewMode } from '@/components/review'
import { MainLayout } from '@/components/layout/main-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'

export default function Review() {
  const router = useRouter()
  const [currentMode, setCurrentMode] = useState<'live' | 'review'>('review')
  const [selectedConversation, setSelectedConversation] = useState<string>(
    'demo-conversation-123'
  )

  const handleModeToggle = (mode: 'live' | 'review') => {
    setCurrentMode(mode)

    // Navigate to appropriate page based on mode
    if (mode === 'live') {
      router.push('/chat')
    }
  }

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversation(conversationId)
  }

  return (
    <ProtectedRoute>
      <MainLayout title="Review Mode">
        <div className="h-[600px] w-full max-w-6xl">
          <ReviewMode
            conversationId={selectedConversation}
            currentMode={currentMode}
            onModeToggle={handleModeToggle}
            onConversationSelect={handleConversationSelect}
          />
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
