'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { useAuth } from '@clerk/nextjs'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Share2,
  Copy,
  Check,
  Plus,
  Trash2,
  Calendar,
  Users,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface InvitationShareButtonProps {
  conversationId: string
}

export function InvitationShareButton({
  conversationId,
}: InvitationShareButtonProps) {
  const { isSignedIn } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [expirationHours, setExpirationHours] = useState<string>('24')

  // Check if this is a valid Convex ID (not a demo ID) and user is authenticated
  const isValidConvexId =
    conversationId && !conversationId.startsWith('demo-') && isSignedIn

  const invitations = useQuery(
    api.conversationInvites.getConversationInvitations,
    isValidConvexId ? { conversationId } : 'skip'
  )

  const generateToken = useMutation(
    api.conversationInvites.generateInvitationToken
  )
  const deactivateToken = useMutation(
    api.conversationInvites.deactivateInvitationToken
  )

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      toast.success('Invitation link copied to clipboard!')
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const handleGenerateToken = async () => {
    if (!isValidConvexId) {
      toast.error('Cannot create invitation links for demo conversations')
      return
    }

    try {
      const hours = expirationHours ? parseInt(expirationHours) : 24
      const result = await generateToken({
        conversationId,
        expirationHours: hours,
      })

      toast.success('Invitation link created successfully!')
      setShowCreateForm(false)
      setExpirationHours('24')

      // Copy the new link to clipboard
      const fullUrl = `${window.location.origin}/join/${result.token}`
      handleCopyUrl(fullUrl)
    } catch (error) {
      toast.error('Failed to create invitation link')
      console.error('Error generating token:', error)
    }
  }

  const handleDeactivateToken = async (tokenId: string) => {
    try {
      await deactivateToken({ tokenId })
      toast.success('Invitation link deactivated')
    } catch (error) {
      toast.error('Failed to deactivate link')
      console.error('Error deactivating token:', error)
    }
  }

  const activeInvitations =
    invitations?.filter(
      invitation => invitation.isActive && !invitation.isExpired
    ) || []

  const inactiveInvitations =
    invitations?.filter(
      invitation => !invitation.isActive || invitation.isExpired
    ) || []

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Conversation</DialogTitle>
          <DialogDescription>
            Create invitation links to let others join this conversation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Demo conversation notice */}
          {!isValidConvexId && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {!isSignedIn
                  ? 'Sign in to create and share invitation links for conversations.'
                  : conversationId?.startsWith('demo-')
                    ? 'This is a demo conversation. Invitation links are only available for real conversations. Create a conversation to share it with others.'
                    : 'Invitation links are only available for real conversations.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Create new invitation button */}
          {!showCreateForm && isValidConvexId && (
            <Button
              onClick={() => setShowCreateForm(true)}
              className="w-full"
              variant="outline"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Invitation Link
            </Button>
          )}

          {/* Create form */}
          {showCreateForm && isValidConvexId && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">New Invitation Link</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiration">Expires in (hours)</Label>
                <Input
                  id="expiration"
                  type="number"
                  value={expirationHours}
                  onChange={e => setExpirationHours(e.target.value)}
                  placeholder="24"
                  min="1"
                  max="168" // 7 days max
                />
                <p className="text-xs text-muted-foreground">
                  Maximum: 168 hours (7 days)
                </p>
              </div>

              <Button onClick={handleGenerateToken} className="w-full">
                Create Invitation Link
              </Button>
            </div>
          )}

          {/* Active invitations */}
          {isValidConvexId && activeInvitations.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Active Invitations</h3>
              {activeInvitations.map(invitation => {
                const fullUrl = `${window.location.origin}/join/${invitation.token}`
                const expiresAt = new Date(invitation.expiresAt)
                return (
                  <div
                    key={invitation._id}
                    className="space-y-3 rounded-lg border p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">Invitation Link</h4>
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              Expires {expiresAt.toLocaleDateString()} at{' '}
                              {expiresAt.toLocaleTimeString()}
                            </span>
                          </div>
                          {invitation.createdBy && (
                            <div className="flex items-center space-x-1">
                              <Users className="h-3 w-3" />
                              <span>
                                Created by{' '}
                                {invitation.createdBy.name ||
                                  invitation.createdBy.email}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeactivateToken(invitation._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Input
                        value={fullUrl}
                        readOnly
                        className="flex-1 text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleCopyUrl(fullUrl)}
                        variant="outline"
                      >
                        {copiedUrl === fullUrl ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Inactive invitations */}
          {isValidConvexId && inactiveInvitations.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-600">
                Inactive Invitations
              </h3>
              {inactiveInvitations.map(invitation => (
                <div
                  key={invitation._id}
                  className="rounded-lg border p-4 opacity-60"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">Invitation Link</h4>
                      <p className="text-sm text-gray-600">
                        {invitation.isExpired ? 'Expired' : 'Deactivated'}
                        {invitation.createdBy && (
                          <>
                            {' '}
                            • Created by{' '}
                            {invitation.createdBy.name ||
                              invitation.createdBy.email}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isValidConvexId && invitations && invitations.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No invitation links have been created for this conversation yet.
                Create one to share access with others.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
