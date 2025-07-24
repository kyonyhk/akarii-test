'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
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
import { Plus, Users, Loader2 } from 'lucide-react'

interface CreateTeamProps {
  onTeamCreated?: (teamId: string) => void
}

export function CreateTeam({ onTeamCreated }: CreateTeamProps) {
  const [teamName, setTeamName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createTeam = useMutation(api.teams.createTeam)

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      setError('Team name is required')
      return
    }

    setCreating(true)
    setError(null)

    try {
      const teamId = await createTeam({ name: teamName.trim() })
      setTeamName('')
      onTeamCreated?.(teamId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team')
    } finally {
      setCreating(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleCreateTeam()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Plus className="h-5 w-5" />
          <span>Create New Team</span>
        </CardTitle>
        <CardDescription>
          Start collaborating by creating a new team
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="team-name" className="text-sm font-medium">
              Team Name
            </label>
            <Input
              id="team-name"
              type="text"
              placeholder="Enter team name..."
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              disabled={creating}
              className="w-full"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={creating || !teamName.trim()}
            className="w-full"
          >
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Team...
              </>
            ) : (
              <>
                <Users className="mr-2 h-4 w-4" />
                Create Team
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
