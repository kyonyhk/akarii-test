'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
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
  MessageCircle,
  Calendar,
  AlertCircle,
  CheckCircle,
  Users,
} from 'lucide-react'

export default function JoinConversationPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const token = params.token as string

  const tokenValidation = useQuery(
    api.conversationInvites.validateInvitationToken,
    token ? { token } : 'skip'
  )

  const joinConversation = useMutation(api.conversationInvites.joinConversationWithToken)

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated && token) {
      router.push(`/sign-in?redirect=${encodeURIComponent(`/join/${token}`)}`)
    }
  }, [authLoading, isAuthenticated, token, router])

  const handleJoinConversation = async () => {
    if (!token || !tokenValidation?.valid) return

    setJoining(true)
    setError(null)

    try {
      const result = await joinConversation({ token })
      setJoined(true)

      // Redirect to the conversation after a brief delay
      setTimeout(() => {
        router.push(`/chat?conversationId=${result.conversationId}`)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join conversation')
    } finally {
      setJoining(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign in Required</CardTitle>
            <CardDescription>
              You need to sign in to join this conversation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() =>
                router.push(
                  `/sign-in?redirect=${encodeURIComponent(`/join/${token}`)}`
                )
              }
              className="w-full"
            >
              Sign In to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!tokenValidation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Validating invitation...</span>
        </div>
      </div>
    )
  }

  if (!tokenValidation.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span>Invalid Invitation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                {tokenValidation.reason ||
                  'This invitation link is invalid or has expired.'}
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => router.push('/chat')}
              className="mt-4 w-full"
              variant="outline"
            >
              Go to Chat
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (joined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Welcome to the Conversation!</span>
            </CardTitle>
            <CardDescription>
              Successfully joined "{tokenValidation?.invitation?.conversation?.title || 'the conversation'}"
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-600">
              You&apos;ve been added to the conversation. Redirecting to the chat...
            </p>
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Redirecting...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { invitation } = tokenValidation
  const expiresAt = new Date(invitation?.expiresAt || 0)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Conversation Invitation</span>
          </CardTitle>
          <CardDescription>
            You&apos;ve been invited to join a conversation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Conversation:</span>
              <span className="text-sm">
                {invitation?.conversation?.title || 'Untitled Conversation'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Participants:</span>
              <span className="flex items-center space-x-1 text-sm">
                <Users className="h-3 w-3" />
                <span>{invitation?.conversation?.participantCount || 0}</span>
              </span>
            </div>

            {invitation?.createdBy && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Invited by:</span>
                <span className="text-sm">
                  {invitation.createdBy.name || invitation.createdBy.email}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Expires:</span>
              <span className="flex items-center space-x-1 text-sm">
                <Calendar className="h-3 w-3" />
                <span>
                  {expiresAt.toLocaleDateString()} at{' '}
                  {expiresAt.toLocaleTimeString()}
                </span>
              </span>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex space-x-2">
            <Button
              onClick={handleJoinConversation}
              disabled={joining}
              className="flex-1"
            >
              {joining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                'Join Conversation'
              )}
            </Button>

            <Button
              onClick={() => router.push('/chat')}
              variant="outline"
              disabled={joining}
            >
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}