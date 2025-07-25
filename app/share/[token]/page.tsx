'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Loader2,
  Share2,
  Eye,
  Calendar,
  AlertCircle,
  User,
  MessageSquare,
} from 'lucide-react'
import { ChatContainer } from '@/components/chat/chat-container'
import { MessageHistory } from '@/components/chat/message-history'

export default function SharePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const linkValidation = useQuery(
    api.conversationLinks.validateConversationLink,
    token ? { token } : 'skip'
  )

  const conversationData = useQuery(
    api.conversationLinks.getConversationByShareLink,
    token && linkValidation?.valid ? { token } : 'skip'
  )

  if (!linkValidation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading shared conversation...</span>
        </div>
      </div>
    )
  }

  if (!linkValidation.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span>Invalid Link</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                {linkValidation.reason ||
                  'This share link is invalid or has expired.'}
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => router.push('/')}
              className="mt-4 w-full"
              variant="outline"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!conversationData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading conversation...</span>
        </div>
      </div>
    )
  }

  const { conversation, shareInfo } = conversationData
  const { link } = linkValidation

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header with share info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Share2 className="h-5 w-5" />
              <span>{shareInfo.title}</span>
            </CardTitle>
            {shareInfo.description && (
              <CardDescription>{shareInfo.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {shareInfo.viewCount} view
                  {shareInfo.viewCount !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {conversation.messages.length} message
                  {conversation.messages.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {conversation.participants.length} participant
                  {conversation.participants.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {new Date(conversation.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {link.expiresAt && (
              <div className="mt-4 flex items-center space-x-2 text-sm text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <span>
                  This link expires on{' '}
                  {new Date(link.expiresAt).toLocaleDateString()} at{' '}
                  {new Date(link.expiresAt).toLocaleTimeString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversation Display */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Conversation</span>
            </CardTitle>
            <CardDescription>
              Shared conversation in read-only mode
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {conversation.messages.length === 0 ? (
              <div className="flex min-h-[400px] items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    No messages yet
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    This conversation doesn&apos;t have any messages to display.
                  </p>
                </div>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto p-4">
                <div className="space-y-4">
                  {conversation.messages.map((message: any) => (
                    <div key={message._id} className="flex space-x-3">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {message.user.avatar ? (
                          <img
                            src={message.user.avatar}
                            alt={message.user.name}
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
                            {message.user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Message Content */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {message.user.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(message.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                          {message.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            This is a shared conversation in read-only mode.{' '}
            {shareInfo.accessType === 'public' && (
              <span>Anyone with this link can view it.</span>
            )}
          </p>
          <Button
            onClick={() => router.push('/')}
            variant="outline"
            className="mt-4"
          >
            Visit Homepage
          </Button>
        </div>
      </div>
    </div>
  )
}
