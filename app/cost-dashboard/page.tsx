'use client'

import { MainLayout } from '@/components/layout/main-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UsageChartsComponent } from '@/components/dashboard/usage-charts'
import { CostBreakdownComponent } from '@/components/dashboard/cost-breakdown'
import { TeamUsageDistribution } from '@/components/dashboard/team-usage-distribution'
import { BillingPeriodSummary } from '@/components/dashboard/billing-period-summary'
import { AlertIndicators, useAlertData } from '@/components/dashboard/alert-indicators'

export default function CostDashboard() {
  const { alerts } = useAlertData()

  return (
    <ProtectedRoute>
      <MainLayout title="Cost Dashboard">
        <div className="w-full max-w-7xl space-y-8">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">
              Cost Dashboard
            </h1>
            <p className="text-muted-foreground">
              Monitor your team&apos;s token consumption and cost metrics
            </p>
          </div>

          <div className="space-y-6">
            {/* Alert Indicators Section */}
            <AlertIndicators 
              alerts={alerts} 
              onResolveAlert={(alertId) => {
                console.log('Resolving alert:', alertId)
                // This would call the actual resolve function
              }}
            />

            <BillingPeriodSummary />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <UsageChartsComponent />
              <CostBreakdownComponent />
            </div>

            <TeamUsageDistribution />
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
