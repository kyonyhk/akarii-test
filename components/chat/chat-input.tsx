'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send } from 'lucide-react'
import { useTypingIndicator } from '@/hooks/use-typing-indicator'

interface ChatInputProps {
  onSendMessage: (content: string) => void
  disabled?: boolean
  placeholder?: string
  conversationId?: string
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = 'Type a message...',
  conversationId,
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const { startTyping, stopTyping } = useTypingIndicator({
    conversationId: conversationId || '',
    enabled: !!conversationId,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (message.trim() && !disabled) {
      onSendMessage(message.trim())
      setMessage('')
      // Stop typing when message is sent
      stopTyping()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setMessage(value)

    // Trigger typing indicator when user starts typing
    if (value.trim() && conversationId) {
      startTyping()
    } else if (!value.trim()) {
      stopTyping()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-2 border-t bg-background p-4"
    >
      <Input
        value={message}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
        autoComplete="off"
      />
      <Button
        type="submit"
        size="icon"
        disabled={disabled || !message.trim()}
        className="shrink-0"
      >
        <Send className="h-4 w-4" />
        <span className="sr-only">Send message</span>
      </Button>
    </form>
  )
}
