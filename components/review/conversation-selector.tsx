'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChevronDown, MessageSquare, Calendar } from 'lucide-react'

interface Conversation {
  id: string
  title: string
  lastMessage: string
  lastActivity: Date
  messageCount: number
}

interface ConversationSelectorProps {
  conversations?: Conversation[]
  selectedConversation?: string
  onConversationSelect?: (conversationId: string) => void
}

export function ConversationSelector({
  conversations = [],
  selectedConversation,
  onConversationSelect,
}: ConversationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Demo data for now
  const demoConversations: Conversation[] = [
    {
      id: 'demo-conversation-123',
      title: 'Product Strategy Discussion',
      lastMessage:
        'I think we should prioritize the mobile experience first...',
      lastActivity: new Date(2024, 6, 24, 14, 30),
      messageCount: 42,
    },
    {
      id: 'demo-conversation-456',
      title: 'Team Retrospective',
      lastMessage: 'What went well this sprint was our communication...',
      lastActivity: new Date(2024, 6, 23, 16, 45),
      messageCount: 28,
    },
    {
      id: 'demo-conversation-789',
      title: 'Feature Requirements',
      lastMessage: 'The user should be able to export their data...',
      lastActivity: new Date(2024, 6, 22, 10, 15),
      messageCount: 15,
    },
  ]

  const activeConversations =
    conversations.length > 0 ? conversations : demoConversations
  const selected = activeConversations.find(c => c.id === selectedConversation)

  return (
    <div className="relative">
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="h-auto justify-start p-2"
      >
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-4 w-4" />
          <span className="font-medium">
            {selected?.title || 'Select Conversation'}
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </Button>

      {isOpen && (
        <Card className="absolute left-0 top-full z-50 mt-1 max-h-96 w-80 overflow-y-auto shadow-lg">
          <div className="p-2">
            <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
              Recent Conversations
            </div>
            {activeConversations.map(conversation => (
              <Button
                key={conversation.id}
                variant={
                  selectedConversation === conversation.id
                    ? 'secondary'
                    : 'ghost'
                }
                className="h-auto w-full justify-start p-3"
                onClick={() => {
                  onConversationSelect?.(conversation.id)
                  setIsOpen(false)
                }}
              >
                <div className="flex w-full flex-col items-start space-y-1">
                  <div className="flex w-full items-center justify-between">
                    <span className="truncate text-sm font-medium">
                      {conversation.title}
                    </span>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <MessageSquare className="h-3 w-3" />
                      <span>{conversation.messageCount}</span>
                    </div>
                  </div>
                  <p className="w-full truncate text-left text-xs text-muted-foreground">
                    {conversation.lastMessage}
                  </p>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {conversation.lastActivity.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
