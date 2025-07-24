'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Users, Settings, Calendar, RefreshCw } from 'lucide-react'
import { Id } from '@/convex/_generated/dataModel'

interface TeamListProps {
  onSelectTeam?: (teamId: Id<'teams'>) => void
  selectedTeamId?: Id<'teams'>
}

export function TeamList({ onSelectTeam, selectedTeamId }: TeamListProps) {
  const teams = useQuery(api.teams.getUserTeams)

  if (teams === undefined) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <RefreshCw className="mr-2 h-6 w-6 animate-spin" />
          Loading teams...
        </CardContent>
      </Card>
    )
  }

  if (teams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Your Teams</span>
          </CardTitle>
          <CardDescription>
            You&apos;re not part of any teams yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-gray-600">
            Create a new team or ask someone to invite you to their team.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Your Teams</span>
        </CardTitle>
        <CardDescription>
          {teams.length} {teams.length === 1 ? 'team' : 'teams'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {teams.map(team => (
            <div
              key={team._id}
              className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                selectedTeamId === team._id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => onSelectTeam?.(team._id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium">{team.name}</h3>

                  <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Users className="h-3 w-3" />
                      <span>
                        {team.members.length}{' '}
                        {team.members.length === 1 ? 'member' : 'members'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Created {new Date(team.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Member Avatars */}
                  <div className="mt-3 flex items-center space-x-2">
                    <div className="flex -space-x-2">
                      {team.members.slice(0, 5).map((member, index) => (
                        <Avatar
                          key={member._id}
                          className="h-6 w-6 border-2 border-white"
                        >
                          {member.avatar ? (
                            <img src={member.avatar} alt={member.name || ''} />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gray-200 text-xs">
                              {member.name?.[0] ||
                                member.email[0].toUpperCase()}
                            </div>
                          )}
                        </Avatar>
                      ))}
                      {team.members.length > 5 && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs">
                          +{team.members.length - 5}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedTeamId === team._id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation()
                      // Could add team settings modal here
                    }}
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
