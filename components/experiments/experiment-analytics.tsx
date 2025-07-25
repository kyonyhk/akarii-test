'use client'

import { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface ExperimentAnalyticsProps {
  experiments: any[]
}

export function ExperimentAnalytics({ experiments }: ExperimentAnalyticsProps) {
  const analyticsData = useMemo(() => {
    // Generate mock time series data for experiments
    const generateTimeSeriesData = () => {
      const days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (29 - i))
        return {
          date: date.toISOString().split('T')[0],
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          activeExperiments: Math.floor(Math.random() * 5) + 2,
          newExperiments:
            Math.random() > 0.8 ? Math.floor(Math.random() * 3) + 1 : 0,
          completedExperiments:
            Math.random() > 0.9 ? Math.floor(Math.random() * 2) + 1 : 0,
          avgConfidence: Math.random() * 20 + 70,
          avgConversion: Math.random() * 10 + 5,
        }
      })
      return days
    }

    // Generate experiment type distribution
    const typeDistribution = [
      {
        name: 'Prompt Variant',
        value: experiments.filter(e => e.experimentType === 'prompt_variant')
          .length,
        color: '#3B82F6',
      },
      {
        name: 'Feature Flag',
        value: experiments.filter(e => e.experimentType === 'feature_flag')
          .length,
        color: '#10B981',
      },
      {
        name: 'Algorithm',
        value: experiments.filter(e => e.experimentType === 'algorithm').length,
        color: '#F59E0B',
      },
    ].filter(item => item.value > 0)

    // Generate status distribution
    const statusDistribution = [
      {
        name: 'Active',
        value: experiments.filter(e => e.status === 'active').length,
        color: '#10B981',
      },
      {
        name: 'Draft',
        value: experiments.filter(e => e.status === 'draft').length,
        color: '#6B7280',
      },
      {
        name: 'Completed',
        value: experiments.filter(e => e.status === 'completed').length,
        color: '#3B82F6',
      },
      {
        name: 'Paused',
        value: experiments.filter(e => e.status === 'paused').length,
        color: '#F59E0B',
      },
      {
        name: 'Cancelled',
        value: experiments.filter(e => e.status === 'cancelled').length,
        color: '#EF4444',
      },
    ].filter(item => item.value > 0)

    // Generate performance comparison data
    const performanceData = experiments
      .filter(exp => exp.status === 'active' || exp.status === 'completed')
      .slice(0, 10)
      .map(exp => ({
        name: exp.name.substring(0, 20) + (exp.name.length > 20 ? '...' : ''),
        confidence: Math.random() * 30 + 60,
        conversion: Math.random() * 15 + 5,
        users: Math.floor(Math.random() * 5000) + 500,
        improvement: (Math.random() - 0.5) * 20,
      }))

    return {
      timeSeriesData: generateTimeSeriesData(),
      typeDistribution,
      statusDistribution,
      performanceData,
    }
  }, [experiments])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-md">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
              {entry.name.includes('Confidence') ||
              entry.name.includes('Conversion')
                ? '%'
                : ''}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (experiments.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="text-muted-foreground">
          No experiments available for analytics
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Time Series Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Experiment Activity Over Time</CardTitle>
            <CardDescription>
              Daily experiment activity and new experiment creation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="day"
                  className="fill-muted-foreground text-xs"
                />
                <YAxis className="fill-muted-foreground text-xs" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="activeExperiments"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Active Experiments"
                />
                <Line
                  type="monotone"
                  dataKey="newExperiments"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="New Experiments"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
            <CardDescription>
              Average confidence scores and conversion rates over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="day"
                  className="fill-muted-foreground text-xs"
                />
                <YAxis className="fill-muted-foreground text-xs" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avgConfidence"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  name="Avg Confidence %"
                />
                <Line
                  type="monotone"
                  dataKey="avgConversion"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  name="Avg Conversion %"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Experiment Types</CardTitle>
            <CardDescription>
              Distribution of experiments by type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analyticsData.typeDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {analyticsData.typeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Experiment Status</CardTitle>
            <CardDescription>
              Current status distribution of all experiments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analyticsData.statusDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  className="fill-muted-foreground text-xs"
                />
                <YAxis className="fill-muted-foreground text-xs" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {analyticsData.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Experiment Performance Comparison</CardTitle>
          <CardDescription>
            Confidence scores and user engagement across experiments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={analyticsData.performanceData}
              margin={{ left: 20, right: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                className="fill-muted-foreground text-xs"
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis className="fill-muted-foreground text-xs" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="confidence"
                fill="#3B82F6"
                name="Confidence Score %"
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="conversion"
                fill="#10B981"
                name="Conversion Rate %"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Best Performing Experiment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {analyticsData.performanceData.length > 0
                ? analyticsData.performanceData[0].name
                : 'No data'}
            </div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.performanceData.length > 0
                ? `${analyticsData.performanceData[0].confidence.toFixed(1)}% confidence`
                : 'Run some experiments to see results'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total User Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {analyticsData.performanceData
                .reduce((sum, exp) => sum + exp.users, 0)
                .toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all active experiments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Average Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {analyticsData.performanceData.length > 0
                ? `${(
                    analyticsData.performanceData.reduce(
                      (sum, exp) => sum + exp.improvement,
                      0
                    ) / analyticsData.performanceData.length
                  ).toFixed(1)}%`
                : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              Over control variants
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
