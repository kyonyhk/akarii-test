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
  Users,
  Calendar,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const token = params.token as string

  const inviteValidation = useQuery(
    api.invites.validateInviteToken,
    token ? { token } : 'skip'
  )

  const acceptInvite = useMutation(api.invites.acceptInvite)

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated && token) {
      router.push(`/sign-in?redirect=${encodeURIComponent(`/invite/${token}`)}`)
    }
  }, [authLoading, isAuthenticated, token, router])

  const handleAcceptInvite = async () => {
    if (!token || !inviteValidation?.valid) return

    setAccepting(true)
    setError(null)

    try {
      const result = await acceptInvite({ token })
      setAccepted(true)

      // Redirect to team dashboard after a brief delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite')
    } finally {
      setAccepting(false)
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
              You need to sign in to accept this team invitation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() =>
                router.push(
                  `/sign-in?redirect=${encodeURIComponent(`/invite/${token}`)}`
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

  if (!inviteValidation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Validating invitation...</span>
        </div>
      </div>
    )
  }

  if (!inviteValidation.valid) {
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
                {inviteValidation.reason ||
                  'This invitation link is invalid or has expired.'}
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => router.push('/dashboard')}
              className="mt-4 w-full"
              variant="outline"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (accepted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Welcome to the Team!</span>
            </CardTitle>
            <CardDescription>
              Successfully joined {inviteValidation?.invite?.team.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-600">
              You&apos;ve been added to the team. Redirecting to your
              dashboard...
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

  const { invite } = inviteValidation
  const expiresAt = new Date(invite?.expiresAt || 0)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Team Invitation</span>
          </CardTitle>
          <CardDescription>
            You&apos;ve been invited to join a team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Team:</span>
              <span className="text-sm">{invite?.team.name}</span>
            </div>

            {invite?.createdBy && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Invited by:</span>
                <span className="text-sm">
                  {invite.createdBy.name || invite.createdBy.email}
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
              onClick={handleAcceptInvite}
              disabled={accepting}
              className="flex-1"
            >
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accepting...
                </>
              ) : (
                'Accept Invitation'
              )}
            </Button>

            <Button
              onClick={() => router.push('/dashboard')}
              variant="outline"
              disabled={accepting}
            >
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
