/**
 * Quality Metrics Dashboard Component
 * Comprehensive visualization of analysis quality metrics and trends
 */

'use client'

import React, { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  BarChart3,
  Activity,
  RefreshCw,
  Eye,
  AlertCircle,
} from 'lucide-react'

interface QualityMetricsDashboardProps {
  teamId?: string
}

const GRADE_COLORS = {
  A: '#22c55e', // green
  B: '#84cc16', // lime
  C: '#eab308', // yellow
  D: '#f97316', // orange
  F: '#ef4444', // red
}

const SEVERITY_COLORS = {
  low: '#6b7280',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#dc2626',
}

export function QualityMetricsDashboard({
  teamId,
}: QualityMetricsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('7d')
  const [selectedDimension, setSelectedDimension] =
    useState<string>('content_accuracy')

  // Fetch dashboard data
  const dashboardData = useQuery(api.qualityMetrics.getQualityDashboard, {
    timeRange,
    teamId,
  })

  // Fetch dimension analysis
  const dimensionAnalysis = useQuery(api.qualityMetrics.getDimensionAnalysis, {
    dimension: selectedDimension,
    timeRange,
  })

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading quality metrics...</span>
        </div>
      </div>
    )
  }

  const { overview, trends, dimensions, humanReview, retryAnalysis, alerts } =
    dashboardData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quality Metrics Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and analyze analysis quality across all dimensions
          </p>
        </div>
        <Select
          value={timeRange}
          onValueChange={(value: any) => setTimeRange(value)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">24 Hours</SelectItem>
            <SelectItem value="7d">7 Days</SelectItem>
            <SelectItem value="30d">30 Days</SelectItem>
            <SelectItem value="90d">90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quality Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Quality Alerts</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {alerts.map(alert => (
              <Alert
                key={alert.id}
                className={`border-l-4 ${
                  alert.severity === 'critical'
                    ? 'border-l-red-500'
                    : alert.severity === 'high'
                      ? 'border-l-orange-500'
                      : alert.severity === 'medium'
                        ? 'border-l-yellow-500'
                        : 'border-l-blue-500'
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="flex items-center justify-between">
                  {alert.title}
                  <Badge
                    variant={
                      alert.severity === 'critical'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {alert.severity}
                  </Badge>
                </AlertTitle>
                <AlertDescription>{alert.description}</AlertDescription>
              </Alert>
            ))}
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Quality Score
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.averageQualityScore}
            </div>
            <div className="mt-1 flex items-center space-x-2 text-xs text-muted-foreground">
              <Progress
                value={overview.averageQualityScore}
                className="flex-1"
              />
              <span>{overview.averageQualityScore}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Display Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.displayRate}%</div>
            <p className="text-xs text-muted-foreground">
              {overview.totalAnalyses} total analyses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Human Review Rate
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.humanReviewRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {humanReview.pendingReviews} pending reviews
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retry Rate</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.retryRate}%</div>
            <p className="text-xs text-muted-foreground">
              {retryAnalysis.successRate}% success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
          <TabsTrigger value="humanReview">Human Review</TabsTrigger>
          <TabsTrigger value="retries">Retries</TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Quality Score Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Quality Score Trend</CardTitle>
                <CardDescription>Daily average quality scores</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends.dailyScores}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Quality Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Quality Grade Distribution</CardTitle>
                <CardDescription>
                  Distribution of analysis grades
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(overview.qualityDistribution).map(
                        ([grade, count]) => ({
                          grade,
                          count,
                          percentage: Math.round(
                            (count / overview.totalAnalyses) * 100
                          ),
                        })
                      )}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ grade, percentage }) =>
                        `${grade} (${percentage}%)`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {Object.keys(overview.qualityDistribution).map(grade => (
                        <Cell
                          key={grade}
                          fill={
                            GRADE_COLORS[grade as keyof typeof GRADE_COLORS]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Dimension Trends */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Dimension Score Trends</CardTitle>
                <CardDescription>
                  Track quality across different dimensions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trends.dimensionTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="contentAccuracy"
                      stroke="#ef4444"
                      name="Accuracy"
                    />
                    <Line
                      type="monotone"
                      dataKey="contentCompleteness"
                      stroke="#f97316"
                      name="Completeness"
                    />
                    <Line
                      type="monotone"
                      dataKey="contentCoherence"
                      stroke="#eab308"
                      name="Coherence"
                    />
                    <Line
                      type="monotone"
                      dataKey="contentSpecificity"
                      stroke="#22c55e"
                      name="Specificity"
                    />
                    <Line
                      type="monotone"
                      dataKey="confidenceCalibration"
                      stroke="#3b82f6"
                      name="Confidence"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Dimensions Tab */}
        <TabsContent value="dimensions" className="space-y-4">
          <div className="mb-4 flex items-center space-x-4">
            <Select
              value={selectedDimension}
              onValueChange={setSelectedDimension}
            >
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="content_accuracy">
                  Content Accuracy
                </SelectItem>
                <SelectItem value="content_completeness">
                  Content Completeness
                </SelectItem>
                <SelectItem value="content_coherence">
                  Content Coherence
                </SelectItem>
                <SelectItem value="content_specificity">
                  Content Specificity
                </SelectItem>
                <SelectItem value="confidence_calibration">
                  Confidence Calibration
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Dimension Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Dimension Scores</CardTitle>
                <CardDescription>Average scores by dimension</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(dimensions.averageScores).map(
                  ([dimension, score]) => (
                    <div key={dimension} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">
                          {dimension.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm font-bold">{score}</span>
                      </div>
                      <Progress value={score} />
                    </div>
                  )
                )}
              </CardContent>
            </Card>

            {/* Top Issues */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Top Quality Issues</CardTitle>
                <CardDescription>Most common quality problems</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dimensions.topIssues.map((issue, index) => (
                    <div key={index} className="rounded-lg border p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="font-semibold capitalize">
                          {issue.dimension.replace(/_/g, ' ')} -{' '}
                          {issue.flagType.replace(/_/g, ' ')}
                        </h4>
                        <Badge variant="secondary">
                          {issue.count} occurrences
                        </Badge>
                      </div>
                      <div className="mb-2 text-sm text-muted-foreground">
                        Impact Score: {issue.impact}/10
                      </div>
                      <div className="space-y-1">
                        {issue.examples.map((example, i) => (
                          <div
                            key={i}
                            className="text-xs text-muted-foreground"
                          >
                            • {example}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dimension Analysis */}
          {dimensionAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedDimension.replace(/_/g, ' ')} Analysis
                </CardTitle>
                <CardDescription>
                  Detailed analysis of selected dimension
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div>
                    <h4 className="mb-2 font-semibold">Average Score</h4>
                    <div className="text-2xl font-bold">
                      {Math.round(dimensionAnalysis.averageScore)}
                    </div>
                    <Badge className="mt-1">
                      {dimensionAnalysis.trend === 'improving' && (
                        <TrendingUp className="mr-1 h-3 w-3" />
                      )}
                      {dimensionAnalysis.trend === 'degrading' && (
                        <TrendingDown className="mr-1 h-3 w-3" />
                      )}
                      {dimensionAnalysis.trend}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="mb-2 font-semibold">Common Issues</h4>
                    <div className="space-y-1">
                      {dimensionAnalysis.commonFlags
                        .slice(0, 3)
                        .map((flag, i) => (
                          <div key={i} className="text-sm">
                            {flag.flag}: {flag.count}
                          </div>
                        ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-2 font-semibold">Recommendations</h4>
                    <div className="space-y-1">
                      {dimensionAnalysis.recommendations
                        .slice(0, 2)
                        .map((rec, i) => (
                          <div
                            key={i}
                            className="text-xs text-muted-foreground"
                          >
                            • {rec}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Human Review Tab */}
        <TabsContent value="humanReview" className="space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Review Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Review Overview</CardTitle>
                <CardDescription>
                  Human review performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold">
                      {humanReview.totalReviews}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total Reviews
                    </p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {humanReview.averageReviewTime}m
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Avg Review Time
                    </p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {humanReview.approvalRate}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Approval Rate
                    </p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {humanReview.pendingReviews}
                    </div>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Review Triggers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Review Triggers</CardTitle>
                <CardDescription>
                  Most common reasons for human review
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={humanReview.topReviewTriggers}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="trigger" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Reviewer Performance */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Reviewer Performance</CardTitle>
                <CardDescription>Individual reviewer metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {humanReview.reviewerPerformance.map(reviewer => (
                    <div
                      key={reviewer.reviewerId}
                      className="rounded-lg border p-4"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="font-semibold">{reviewer.reviewerId}</h4>
                        <Badge variant="secondary">
                          {reviewer.reviewsCompleted} reviews
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            Avg Time:{' '}
                          </span>
                          {reviewer.averageTime}m
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Approval:{' '}
                          </span>
                          {reviewer.approvalRate}%
                        </div>
                        <div>
                          <span className="text-muted-foreground">SLA: </span>
                          {reviewer.slaCompliance}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Retries Tab */}
        <TabsContent value="retries" className="space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Retry Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Retry Overview</CardTitle>
                <CardDescription>Automatic retry performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold">
                      {retryAnalysis.totalRetries}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total Retries
                    </p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {retryAnalysis.successRate}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Success Rate
                    </p>
                  </div>
                  <div className="col-span-2">
                    <div className="text-2xl font-bold">
                      {retryAnalysis.averageAttempts}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Average Attempts
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Strategy Effectiveness */}
            <Card>
              <CardHeader>
                <CardTitle>Strategy Effectiveness</CardTitle>
                <CardDescription>Performance by retry strategy</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {retryAnalysis.strategyEffectiveness.map(strategy => (
                    <div key={strategy.strategy} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {strategy.strategy.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm">{strategy.successRate}%</span>
                      </div>
                      <Progress value={strategy.successRate} />
                      <div className="text-xs text-muted-foreground">
                        {strategy.attempts} attempts, +
                        {strategy.avgQualityImprovement} avg improvement
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Common Failures */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Most Common Failure Patterns</CardTitle>
                <CardDescription>
                  Recurring issues that trigger retries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={retryAnalysis.mostCommonFailures}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="pattern" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
