'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar } from '@/components/ui/avatar'
import {
  Users,
  Plus,
  Copy,
  Check,
  Settings,
  UserMinus,
  Clock,
  Link as LinkIcon,
  RefreshCw,
} from 'lucide-react'
import { Id } from '@/convex/_generated/dataModel'

interface TeamManagementProps {
  teamId: Id<'teams'>
}

export function TeamManagement({ teamId }: TeamManagementProps) {
  const [inviteExpiration, setInviteExpiration] = useState(168) // 7 days default
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const team = useQuery(api.teams.getTeam, { teamId })
  const invites = useQuery(api.invites.getTeamInvites, { teamId })
  const createInvite = useMutation(api.invites.createInviteLink)
  const deactivateInvite = useMutation(api.invites.deactivateInvite)
  const removeTeamMember = useMutation(api.teams.removeTeamMember)

  const handleCreateInvite = async () => {
    setCreating(true)
    setError(null)

    try {
      const result = await createInvite({
        teamId,
        expirationHours: inviteExpiration,
      })

      const fullUrl = `${window.location.origin}${result.inviteUrl}`
      await navigator.clipboard.writeText(fullUrl)
      setCopiedInvite(result.token)

      setTimeout(() => setCopiedInvite(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite')
    } finally {
      setCreating(false)
    }
  }

  const handleCopyInvite = async (token: string) => {
    const fullUrl = `${window.location.origin}/invite/${token}`
    await navigator.clipboard.writeText(fullUrl)
    setCopiedInvite(token)
    setTimeout(() => setCopiedInvite(null), 2000)
  }

  const handleDeactivateInvite = async (inviteId: Id<'inviteLinks'>) => {
    try {
      await deactivateInvite({ inviteId })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to deactivate invite'
      )
    }
  }

  const handleRemoveMember = async (userId: Id<'users'>) => {
    try {
      await removeTeamMember({ teamId, userId })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member')
    }
  }

  if (!team) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <RefreshCw className="mr-2 h-6 w-6 animate-spin" />
          Loading team...
        </CardContent>
      </Card>
    )
  }

  const activeInvites =
    invites?.filter(invite => invite.isActive && !invite.isExpired) || []
  const inactiveInvites =
    invites?.filter(invite => !invite.isActive || invite.isExpired) || []

  return (
    <div className="space-y-6">
      {/* Team Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>{team.name}</span>
          </CardTitle>
          <CardDescription>
            Manage your team members and invite links
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {team.members.length}{' '}
            {team.members.length === 1 ? 'member' : 'members'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {team.members.map(member => (
              <div
                key={member._id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.name || ''} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-200 text-sm">
                        {member.name?.[0] || member.email[0].toUpperCase()}
                      </div>
                    )}
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {member.name || 'Unnamed User'}
                    </p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
                    {member.role}
                  </span>
                  {team.members.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveMember(member._id)}
                    >
                      <UserMinus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create New Invite */}
      <Card>
        <CardHeader>
          <CardTitle>Create Invite Link</CardTitle>
          <CardDescription>
            Generate a new invite link to add members to your team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <label htmlFor="expiration" className="text-sm font-medium">
              Expires in:
            </label>
            <Input
              id="expiration"
              type="number"
              value={inviteExpiration}
              onChange={e =>
                setInviteExpiration(parseInt(e.target.value) || 168)
              }
              className="w-20"
              min="1"
              max="720" // 30 days
            />
            <span className="text-sm text-gray-500">hours</span>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleCreateInvite}
            disabled={creating}
            className="w-full"
          >
            {creating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Invite Link
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Active Invites */}
      {activeInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Invites</CardTitle>
            <CardDescription>
              These invite links are currently active and can be used
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeInvites.map(invite => (
                <div
                  key={invite._id}
                  className="flex items-center justify-between rounded-lg border bg-green-50 p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <LinkIcon className="h-4 w-4 text-green-600" />
                      <code className="rounded bg-gray-100 px-2 py-1 text-sm">
                        /invite/{invite.token.substring(0, 8)}...
                      </code>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Expires: {new Date(invite.expiresAt).toLocaleString()}
                    </p>
                    {invite.createdBy && (
                      <p className="text-xs text-gray-500">
                        Created by:{' '}
                        {invite.createdBy.name || invite.createdBy.email}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyInvite(invite.token)}
                    >
                      {copiedInvite === invite.token ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeactivateInvite(invite._id)}
                    >
                      Deactivate
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inactive/Expired Invites */}
      {inactiveInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Inactive Invites</CardTitle>
            <CardDescription>
              These invite links are no longer active
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inactiveInvites.map(invite => (
                <div
                  key={invite._id}
                  className="flex items-center justify-between rounded-lg border bg-gray-50 p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <LinkIcon className="h-4 w-4 text-gray-400" />
                      <code className="rounded bg-gray-100 px-2 py-1 text-sm">
                        /invite/{invite.token.substring(0, 8)}...
                      </code>
                      <span className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-600">
                        {invite.isExpired ? 'Expired' : 'Deactivated'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {invite.isExpired ? 'Expired' : 'Deactivated'}:{' '}
                      {new Date(invite.expiresAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
