'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useUser } from '@clerk/nextjs'
import { TeamList } from '@/components/team/team-list'
import { CreateTeam } from '@/components/team/create-team'
import { TeamManagement } from '@/components/team/team-management'
import { Plus, Users } from 'lucide-react'
import { Id } from '@/convex/_generated/dataModel'

export default function Dashboard() {
  const { user } = useUser()
  const [selectedTeamId, setSelectedTeamId] = useState<Id<'teams'> | undefined>(
    undefined
  )
  const [showCreateTeam, setShowCreateTeam] = useState(false)

  const handleTeamCreated = (teamId: string) => {
    setSelectedTeamId(teamId as Id<'teams'>)
    setShowCreateTeam(false)
  }

  const handleSelectTeam = (teamId: Id<'teams'>) => {
    setSelectedTeamId(teamId)
  }

  return (
    <ProtectedRoute>
      <MainLayout title="Dashboard">
        <div className="w-full max-w-6xl space-y-8">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {user?.firstName || user?.username || 'User'}!
            </h1>
            <p className="text-muted-foreground">
              Here&apos;s an overview of your teams and activity.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left Column - Team Management */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Team Management</h2>
                <Button
                  onClick={() => setShowCreateTeam(!showCreateTeam)}
                  variant={showCreateTeam ? 'outline' : 'default'}
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {showCreateTeam ? 'Cancel' : 'New Team'}
                </Button>
              </div>

              {showCreateTeam && (
                <CreateTeam onTeamCreated={handleTeamCreated} />
              )}

              <TeamList
                onSelectTeam={handleSelectTeam}
                selectedTeamId={selectedTeamId}
              />
            </div>

            {/* Right Column - Team Details or Overview */}
            <div className="space-y-6">
              {selectedTeamId ? (
                <div>
                  <h2 className="mb-4 text-xl font-semibold">Team Details</h2>
                  <TeamManagement teamId={selectedTeamId} />
                </div>
              ) : (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">Activity Overview</h2>

                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Conversations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        View and manage your recent chat conversations.
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Analysis Insights</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Review AI-powered insights from your conversations.
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Users className="h-5 w-5" />
                        <span>Getting Started</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-4 text-sm text-muted-foreground">
                        Create a team to start collaborating with others or
                        accept an invitation to join an existing team.
                      </p>
                      <Button
                        onClick={() => setShowCreateTeam(true)}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Team
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
