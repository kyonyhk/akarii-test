'use client'

import { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, Activity, Users } from 'lucide-react'

interface ExperimentMetricsProps {
  experiments: any[]
}

export function ExperimentMetrics({ experiments }: ExperimentMetricsProps) {
  const metrics = useMemo(() => {
    if (!experiments || experiments.length === 0) {
      return {
        avgConversionRate: 0,
        avgConfidenceScore: 0,
        totalUserAssignments: 0,
        avgDuration: 0,
        successfulExperiments: 0,
        trendsData: [],
      }
    }

    // Mock calculations - in production these would come from experiment results
    const activeExperiments = experiments.filter(exp => exp.status === 'active')
    const completedExperiments = experiments.filter(
      exp => exp.status === 'completed'
    )

    // Calculate average conversion rate (mock data)
    const avgConversionRate =
      activeExperiments.length > 0
        ? activeExperiments.reduce(
            (sum, exp) => sum + (Math.random() * 15 + 5),
            0
          ) / activeExperiments.length
        : 0

    // Calculate average confidence score (mock data)
    const avgConfidenceScore =
      activeExperiments.length > 0
        ? activeExperiments.reduce(
            (sum, exp) => sum + (Math.random() * 20 + 70),
            0
          ) / activeExperiments.length
        : 0

    // Mock user assignments
    const totalUserAssignments = experiments.reduce((sum, exp) => {
      return (
        sum +
        (exp.variants?.length || 0) * Math.floor(Math.random() * 1000 + 50)
      )
    }, 0)

    // Calculate average duration
    const now = Date.now()
    const avgDuration =
      completedExperiments.length > 0
        ? completedExperiments.reduce((sum, exp) => {
            const duration =
              (exp.schedule.endDate || now) - exp.schedule.startDate
            return sum + duration
          }, 0) /
          completedExperiments.length /
          (24 * 60 * 60 * 1000) // Convert to days
        : 0

    // Count successful experiments (those with positive results)
    const successfulExperiments = completedExperiments.filter(
      exp => Math.random() > 0.3
    ).length

    return {
      avgConversionRate,
      avgConfidenceScore,
      totalUserAssignments,
      avgDuration,
      successfulExperiments,
      completedCount: completedExperiments.length,
    }
  }, [experiments])

  const successRate =
    metrics.completedCount > 0
      ? (metrics.successfulExperiments / metrics.completedCount) * 100
      : 0

  const MetricCard = ({
    title,
    value,
    description,
    trend,
    icon: Icon,
    progress,
  }: {
    title: string
    value: string | number
    description: string
    trend?: 'up' | 'down' | 'neutral'
    icon: any
    progress?: number
  }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        {trend && (
          <div className="flex items-center space-x-1">
            {trend === 'up' ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : trend === 'down' ? (
              <TrendingDown className="h-3 w-3 text-red-600" />
            ) : null}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {progress !== undefined && (
          <Progress value={progress} className="h-1" />
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          title="Avg. Conversion Rate"
          value={`${metrics.avgConversionRate.toFixed(1)}%`}
          description="Across all active experiments"
          trend="up"
          icon={TrendingUp}
          progress={metrics.avgConversionRate}
        />

        <MetricCard
          title="Avg. Confidence Score"
          value={`${metrics.avgConfidenceScore.toFixed(0)}%`}
          description="Statistical confidence level"
          trend="up"
          icon={Activity}
          progress={metrics.avgConfidenceScore}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          title="Total User Assignments"
          value={metrics.totalUserAssignments.toLocaleString()}
          description="Users participating in experiments"
          icon={Users}
        />

        <MetricCard
          title="Success Rate"
          value={`${successRate.toFixed(1)}%`}
          description={`${metrics.successfulExperiments} of ${metrics.completedCount} completed`}
          trend={
            successRate > 60 ? 'up' : successRate > 40 ? 'neutral' : 'down'
          }
          icon={TrendingUp}
          progress={successRate}
        />
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium">Avg. Duration</div>
              <div className="text-muted-foreground">
                {metrics.avgDuration.toFixed(1)} days
              </div>
            </div>
            <div>
              <div className="font-medium">Active Tests</div>
              <div className="text-muted-foreground">
                {experiments.filter(exp => exp.status === 'active').length}
              </div>
            </div>
            <div>
              <div className="font-medium">Draft Tests</div>
              <div className="text-muted-foreground">
                {experiments.filter(exp => exp.status === 'draft').length}
              </div>
            </div>
            <div>
              <div className="font-medium">Completed</div>
              <div className="text-muted-foreground">
                {experiments.filter(exp => exp.status === 'completed').length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
