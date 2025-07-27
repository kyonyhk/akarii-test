'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { MainLayout } from '@/components/layout/main-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { api } from '@/convex/_generated/api'
import {
  Loader2,
  TrendingUp,
  DollarSign,
  MessageSquare,
  Users,
} from 'lucide-react'

export default function Analytics() {
  const [selectedInterval, setSelectedInterval] = useState<
    'day' | 'week' | 'month'
  >('day')
  const [selectedTrendDays, setSelectedTrendDays] = useState<number>(30)

  // Fetch real data using Convex queries
  const costAggregation = useQuery(api.analytics.getCostAggregation, {
    interval: selectedInterval,
    startTimestamp: Date.now() - 30 * 24 * 60 * 60 * 1000, // Last 30 days
    endTimestamp: Date.now(),
  })

  const teamMembers = useQuery(api.analytics.getTeamMembers)
  const realTimeMetrics = useQuery(api.analytics.getRealTimeMetrics)
  const usageTrends = useQuery(api.analytics.getUsageTrends, {
    days: selectedTrendDays,
  })

  const isLoading =
    costAggregation === undefined ||
    teamMembers === undefined ||
    realTimeMetrics === undefined ||
    usageTrends === undefined

  if (isLoading) {
    return (
      <ProtectedRoute>
        <MainLayout title="Analytics Dashboard">
          <div className="flex h-96 items-center justify-center">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-lg">Loading analytics data...</span>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  // Format cost aggregation data for charts
  const costTrendData =
    costAggregation?.map((item: any) => ({
      period: item.period,
      cost: Number(item.cost.toFixed(2)),
      tokens: item.tokens,
      requests: item.requests,
    })) || []

  // Format usage trends data for charts
  const trendData =
    usageTrends?.map((item: any) => ({
      date: item.date,
      cost: Number(item.cost.toFixed(2)),
      tokens: item.tokens,
      requests: item.requests,
    })) || []

  // Prepare model breakdown data for pie chart
  const modelBreakdownData =
    realTimeMetrics?.modelBreakdown?.map((item: any) => ({
      name: item.model,
      value: Number(item.cost.toFixed(2)),
      tokens: item.tokens,
      requests: item.requests,
    })) || []

  const COLORS = [
    '#3B82F6',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#F97316',
  ]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-md">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}:{' '}
              {typeof entry.value === 'number'
                ? entry.name.toLowerCase().includes('cost')
                  ? `$${entry.value.toFixed(2)}`
                  : entry.value.toLocaleString()
                : entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <ProtectedRoute>
      <MainLayout title="Analytics Dashboard">
        <div className="w-full max-w-7xl space-y-8">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground">
              Real-time insights into your team&apos;s AI usage and costs
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Cost
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${realTimeMetrics?.totalCost?.toFixed(2) || '0.00'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last 24h: $
                  {realTimeMetrics?.last24Hours?.cost?.toFixed(2) || '0.00'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Tokens
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {realTimeMetrics?.totalTokens?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last 24h:{' '}
                  {realTimeMetrics?.last24Hours?.tokens?.toLocaleString() ||
                    '0'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Messages
                </CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {realTimeMetrics?.totalMessages?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last 24h:{' '}
                  {realTimeMetrics?.last24Hours?.messages?.toLocaleString() ||
                    '0'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Conversations
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {realTimeMetrics?.activeConversations?.toLocaleString() ||
                    '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total:{' '}
                  {realTimeMetrics?.totalConversations?.toLocaleString() || '0'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Cost Aggregation:</label>
              <Select
                value={selectedInterval}
                onValueChange={(value: 'day' | 'week' | 'month') =>
                  setSelectedInterval(value)
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Trend Period:</label>
              <Select
                value={selectedTrendDays.toString()}
                onValueChange={value => setSelectedTrendDays(Number(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cost Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Trends Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="date"
                    className="fill-muted-foreground text-xs"
                  />
                  <YAxis className="fill-muted-foreground text-xs" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name="Daily Cost ($)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Usage Metrics */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Token Usage Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trendData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="date"
                      className="fill-muted-foreground text-xs"
                    />
                    <YAxis className="fill-muted-foreground text-xs" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="tokens"
                      fill="#10B981"
                      name="Tokens"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Model Cost Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={modelBreakdownData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }: any) =>
                        `${name} (${((percent || 0) * 100).toFixed(1)}%)`
                      }
                    >
                      {modelBreakdownData.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Aggregated Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Aggregation by {selectedInterval}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={costTrendData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="period"
                    className="fill-muted-foreground text-xs"
                  />
                  <YAxis className="fill-muted-foreground text-xs" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="cost"
                    fill="#3B82F6"
                    name="Cost ($)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="requests"
                    fill="#F59E0B"
                    name="Requests"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card>
            <CardHeader>
              <CardTitle>Team Members ({teamMembers?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {teamMembers?.map((member: any) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {member.role || 'Member'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.joinedAt
                          ? new Date(member.joinedAt).toLocaleDateString()
                          : 'Unknown'}
                      </p>
                    </div>
                  </div>
                )) || (
                  <p className="py-4 text-center text-muted-foreground">
                    No team members found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Average Cost per Request
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  $
                  {realTimeMetrics?.averageCostPerRequest?.toFixed(4) ||
                    '0.0000'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Based on {realTimeMetrics?.totalRequests || 0} total requests
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Average Tokens per Request
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {realTimeMetrics?.averageTokensPerRequest?.toFixed(0) || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all API calls
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">API Requests (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {realTimeMetrics?.last24Hours?.requests?.toLocaleString() ||
                    '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total:{' '}
                  {realTimeMetrics?.totalRequests?.toLocaleString() || '0'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
