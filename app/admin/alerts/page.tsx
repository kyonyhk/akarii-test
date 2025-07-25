'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AlertManagement } from '@/components/admin/alert-management'

// Mock teams data - would be replaced with actual Convex query
const mockTeams = [
  { _id: 'team1', name: 'Engineering Team' },
  { _id: 'team2', name: 'Product Team' },
  { _id: 'team3', name: 'Design Team' },
]

export default function AdminAlertsPage() {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')

  return (
    <ProtectedRoute requiredRole="admin">
      <MainLayout title="Alert Management">
        <div className="w-full max-w-6xl space-y-8">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">
              Alert Management
            </h1>
            <p className="text-muted-foreground">
              Configure usage alerts and enforcement limits for your teams
            </p>
          </div>

          <AlertManagement
            teams={mockTeams}
            selectedTeamId={selectedTeamId}
            onTeamSelect={setSelectedTeamId}
          />
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
