'use client'

import { MainLayout } from '@/components/layout/main-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { ExperimentDashboard } from '@/components/experiments'

export default function ExperimentsPage() {
  return (
    <ProtectedRoute>
      <MainLayout title="Experiments">
        <div className="w-full max-w-7xl space-y-8">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">
              A/B Testing Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage and analyze prompt experiments and feature flags to
              optimize system performance
            </p>
          </div>
          <ExperimentDashboard />
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
