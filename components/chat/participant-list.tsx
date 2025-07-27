'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Participant {
  id: string
  name: string
  avatar?: string
  isOnline: boolean
  isTyping?: boolean
}

interface ParticipantListProps {
  participants: Participant[]
  className?: string
  showTypingIndicator?: boolean
}

export function ParticipantList({
  participants,
  className,
  showTypingIndicator = true,
}: ParticipantListProps) {
  const onlineParticipants = participants.filter(p => p.isOnline)
  const typingParticipants = participants.filter(p => p.isTyping)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Online count and status */}
      <div className="flex items-center gap-1">
        <div className="h-2 w-2 rounded-full bg-green-500"></div>
        <span className="text-sm text-muted-foreground">
          {onlineParticipants.length} online
        </span>
      </div>

      {/* Participant avatars */}
      {onlineParticipants.length > 0 && (
        <div className="flex -space-x-2">
          {onlineParticipants.slice(0, 3).map(participant => (
            <div key={participant.id} className="relative">
              <Avatar className="h-6 w-6 border-2 border-background">
                <AvatarImage src={participant.avatar} alt={participant.name} />
                <AvatarFallback className="text-xs">
                  {participant.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background bg-green-500"></div>
            </div>
          ))}
          {onlineParticipants.length > 3 && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-xs">
              +{onlineParticipants.length - 3}
            </div>
          )}
        </div>
      )}

      {/* Typing indicator */}
      {showTypingIndicator && typingParticipants.length > 0 && (
        <Badge variant="secondary" className="text-xs">
          {typingParticipants.length === 1
            ? `${typingParticipants[0].name} is typing...`
            : `${typingParticipants.length} people are typing...`}
        </Badge>
      )}
    </div>
  )
}
