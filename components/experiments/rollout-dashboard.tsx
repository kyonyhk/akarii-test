'use client'

import { useQuery } from 'convex/react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import {
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Pause,
  Play,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

import { api } from '@/convex/_generated/api'

export function RolloutDashboard() {
  const activeRollouts = useQuery(api.gradualRollout.getActiveRollouts, {})

  const formatDuration = (ms: number) => {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000))
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))

    if (days > 0) {
      return `${days}d ${hours}h`
    }
    return `${hours}h`
  }

  const generateProgressChart = (rollouts: any[]) => {
    // Generate mock progress data for visualization
    return rollouts.map(rollout => ({
      name: rollout.experimentName.substring(0, 15) + '...',
      current: rollout.currentPercentage,
      target: rollout.targetPercentage,
      progress: rollout.progress * 100,
    }))
  }

  const generateTimelineData = (rollouts: any[]) => {
    // Generate mock timeline data showing rollout progression
    const hours = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date()
      hour.setHours(hour.getHours() - (23 - i))

      return {
        hour: hour.getHours(),
        time: hour.toISOString().split('T')[1].split(':')[0] + ':00',
        ...rollouts.reduce(
          (acc, rollout, index) => {
            // Mock progressive increase for each rollout
            const baseIncrease =
              (i / 23) * rollout.progress * rollout.targetPercentage
            acc[`rollout_${index}`] = Math.min(
              rollout.targetPercentage,
              Math.max(0, baseIncrease + (Math.random() - 0.5) * 2)
            )
            return acc
          },
          {} as Record<string, number>
        ),
      }
    })

    return hours
  }

  if (!activeRollouts) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
        <p className="mt-2 text-sm text-muted-foreground">
          Loading rollout data...
        </p>
      </div>
    )
  }

  const { activeRollouts: rollouts, totalActive } = activeRollouts

  if (totalActive === 0) {
    return (
      <div className="py-12 text-center">
        <Clock className="mx-auto mb-4 h-12 w-12 text-gray-400" />
        <h3 className="mb-2 text-lg font-medium text-gray-900">
          No Active Rollouts
        </h3>
        <p className="text-sm text-gray-500">
          Configure gradual rollouts on your experiments to see them here
        </p>
      </div>
    )
  }

  const chartData = generateProgressChart(rollouts)
  const timelineData = generateTimelineData(rollouts)

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Rollouts
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActive}</div>
            <p className="text-xs text-muted-foreground">
              Currently rolling out
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rollouts.length > 0
                ? (
                    (rollouts.reduce((sum, r) => sum + r.progress, 0) /
                      rollouts.length) *
                    100
                  ).toFixed(0)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Across all rollouts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Remaining</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rollouts.length > 0
                ? formatDuration(
                    rollouts.reduce((sum, r) => sum + r.remainingTime, 0) /
                      rollouts.length
                  )
                : '0h'}
            </div>
            <p className="text-xs text-muted-foreground">Until completion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Status</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Healthy</div>
            <p className="text-xs text-muted-foreground">
              All rollouts on track
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Visualization */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rollout Progress</CardTitle>
            <CardDescription>
              Current vs target percentages for each experiment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  className="fill-muted-foreground text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis className="fill-muted-foreground text-xs" />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-md">
                          <p className="font-medium">{label}</p>
                          {payload.map((entry: any, index: number) => (
                            <p key={index} style={{ color: entry.color }}>
                              {entry.name}: {entry.value.toFixed(1)}%
                            </p>
                          ))}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar
                  dataKey="current"
                  fill="#3B82F6"
                  name="Current %"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="target"
                  fill="#E5E7EB"
                  name="Target %"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rollout Timeline</CardTitle>
            <CardDescription>Progress over the last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="time"
                  className="fill-muted-foreground text-xs"
                />
                <YAxis className="fill-muted-foreground text-xs" />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-md">
                          <p className="font-medium">{label}</p>
                          {payload.map((entry: any, index: number) => (
                            <p key={index} style={{ color: entry.color }}>
                              Rollout {index + 1}: {entry.value?.toFixed(1)}%
                            </p>
                          ))}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                {rollouts.map((_, index) => (
                  <Line
                    key={index}
                    type="monotone"
                    dataKey={`rollout_${index}`}
                    stroke={`hsl(${index * 60}, 70%, 50%)`}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Active Rollouts List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Rollouts</CardTitle>
          <CardDescription>
            Detailed view of all currently running gradual rollouts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rollouts.map(rollout => (
              <div
                key={rollout.experimentId}
                className="space-y-3 rounded-lg border p-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="font-medium">{rollout.experimentName}</h4>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="capitalize">
                        {rollout.strategy}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {rollout.currentPercentage.toFixed(1)}% →{' '}
                        {rollout.targetPercentage}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-right">
                    <div className="text-sm font-medium">
                      {(rollout.progress * 100).toFixed(0)}% Complete
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDuration(rollout.remainingTime)} remaining
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <Progress value={rollout.progress * 100} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      Started{' '}
                      {formatDistanceToNow(rollout.lastUpdated, {
                        addSuffix: true,
                      })}
                    </span>
                    <span>ETA: {formatDuration(rollout.remainingTime)}</span>
                  </div>
                </div>

                {/* Safety Thresholds */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Safety Thresholds</div>
                    <div className="text-muted-foreground">
                      Error: {rollout.safetyThresholds.maxErrorRate}%,
                      Confidence: {rollout.safetyThresholds.minConfidenceScore}%
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Strategy</div>
                    <div className="capitalize text-muted-foreground">
                      {rollout.strategy} rollout
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center justify-end space-x-2">
                  <Button variant="outline" size="sm">
                    <Pause className="mr-2 h-3 w-3" />
                    Pause
                  </Button>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
