'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Smile } from 'lucide-react'
import { useTypingIndicator } from '@/hooks/use-typing-indicator'
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react'

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const emojiButtonRef = useRef<HTMLButtonElement>(null)
  const { startTyping, stopTyping } = useTypingIndicator({
    conversationId: conversationId || '',
    enabled: !!conversationId,
  })

  // Close emoji picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (message.trim() && !disabled) {
      onSendMessage(message.trim())
      setMessage('')
      setShowEmojiPicker(false) // Close emoji picker when sending
      // Stop typing when message is sent
      stopTyping()
    }
  }

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage(prev => prev + emojiData.emoji)
    // Trigger typing indicator when emoji is added
    if (conversationId) {
      startTyping()
    }
  }

  const toggleEmojiPicker = () => {
    setShowEmojiPicker(prev => !prev)
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
    <div className="relative">
      {/* Emoji Picker Popup */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-16 left-4 z-50 rounded-lg border bg-background shadow-lg"
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            autoFocusSearch={false}
            theme="auto"
            height={350}
            width={300}
            previewConfig={{
              showPreview: false,
            }}
          />
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t bg-background p-4"
      >
        <div className="flex flex-1 gap-2">
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
            ref={emojiButtonRef}
            type="button"
            size="icon"
            variant="outline"
            onClick={toggleEmojiPicker}
            disabled={disabled}
            className="shrink-0"
            aria-label="Open emoji picker"
          >
            <Smile className="h-4 w-4" />
          </Button>
        </div>
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
    </div>
  )
}
