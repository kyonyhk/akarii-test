'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react'
import { ConversationSelector } from './conversation-selector'

interface ReviewModeProps {
  conversationId?: string
  onModeToggle?: (mode: 'live' | 'review') => void
  onConversationSelect?: (conversationId: string) => void
  currentMode?: 'live' | 'review'
}

export function ReviewMode({
  conversationId,
  onModeToggle,
  onConversationSelect,
  currentMode = 'review',
}: ReviewModeProps) {
  const [mode, setMode] = useState<'live' | 'review'>(currentMode)

  const handleModeToggle = () => {
    const newMode = mode === 'live' ? 'review' : 'live'
    setMode(newMode)
    onModeToggle?.(newMode)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header Navigation */}
      <Card className="rounded-none border-b">
        <div className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center space-x-2 text-sm">
            <ConversationSelector
              selectedConversation={conversationId}
              onConversationSelect={onConversationSelect}
            />
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center justify-center space-x-3 sm:justify-end">
            <span
              className={`text-sm ${mode === 'live' ? 'text-muted-foreground' : 'font-medium'}`}
            >
              Review
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleModeToggle}
              className="p-1"
              title={`Switch to ${mode === 'live' ? 'Review' : 'Live'} mode`}
            >
              {mode === 'live' ? (
                <ToggleRight className="h-5 w-5 text-primary" />
              ) : (
                <ToggleLeft className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>
            <span
              className={`text-sm ${mode === 'live' ? 'font-medium' : 'text-muted-foreground'}`}
            >
              Live
            </span>
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {mode === 'review' ? (
          <div className="h-full p-4">
            <Card className="h-full">
              <div className="flex h-full items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <h3 className="mb-2 text-lg font-medium">Review Mode</h3>
                  <p>Message history and analysis will be displayed here</p>
                  {!conversationId && (
                    <p className="mt-2 text-sm">
                      Select a conversation to begin reviewing
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="h-full p-4">
            <Card className="h-full">
              <div className="flex h-full items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <h3 className="mb-2 text-lg font-medium">Live Mode</h3>
                  <p>Live chat interface will be displayed here</p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
