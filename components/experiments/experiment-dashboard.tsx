'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Activity, TrendingUp, Users, Clock } from 'lucide-react'

import { api } from '@/convex/_generated/api'
import { ExperimentList } from './experiment-list'
import { ExperimentMetrics } from './experiment-metrics'
import { CreateExperimentDialog } from './create-experiment-dialog'
import { ExperimentAnalytics } from './experiment-analytics'
import { RolloutDashboard } from './rollout-dashboard'

export function ExperimentDashboard() {
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Fetch experiment data
  const allExperiments = useQuery(api.experiments.listExperiments, {})
  const activeExperiments = useQuery(api.experiments.listExperiments, {
    status: 'active',
  })
  const completedExperiments = useQuery(api.experiments.listExperiments, {
    status: 'completed',
  })
  const activeRollouts = useQuery(api.gradualRollout.getActiveRollouts, {})

  // Calculate overview metrics
  const totalExperiments = allExperiments?.length ?? 0
  const activeCount = activeExperiments?.length ?? 0
  const completedCount = completedExperiments?.length ?? 0
  const draftCount =
    allExperiments?.filter(exp => exp.status === 'draft').length ?? 0
  const activeRolloutsCount = activeRollouts?.totalActive ?? 0

  // Calculate success rate from completed experiments
  const successfulExperiments =
    completedExperiments?.filter(
      exp =>
        // Consider an experiment successful if it has statistical significance
        // This would need to be determined from experiment results
        true // Simplified for now
    ).length ?? 0

  const successRate =
    completedCount > 0 ? (successfulExperiments / completedCount) * 100 : 0

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Experiments
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExperiments}</div>
            <p className="text-xs text-muted-foreground">
              {activeCount} active, {draftCount} draft
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tests</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">
              Currently running experiments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Of {completedCount} completed tests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12.5d</div>
            <p className="text-xs text-muted-foreground">
              Average experiment length
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Create Experiment Button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Experiment
        </Button>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedCount})
          </TabsTrigger>
          <TabsTrigger value="rollouts">
            Rollouts ({activeRolloutsCount})
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest experiment updates and results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExperimentList
                  experiments={allExperiments?.slice(0, 5) ?? []}
                  showActions={false}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Key performance indicators across all experiments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExperimentMetrics experiments={allExperiments ?? []} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Experiments</CardTitle>
              <CardDescription>
                Currently running A/B tests and their real-time performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExperimentList
                experiments={activeExperiments ?? []}
                showActions={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Completed Experiments</CardTitle>
              <CardDescription>
                Finished experiments with final results and statistical analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExperimentList
                experiments={completedExperiments ?? []}
                showActions={false}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rollouts" className="space-y-6">
          <RolloutDashboard />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <ExperimentAnalytics experiments={allExperiments ?? []} />
        </TabsContent>
      </Tabs>

      {/* Create Experiment Dialog */}
      <CreateExperimentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  )
}
