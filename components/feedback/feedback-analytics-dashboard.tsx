'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  Target,
  Lightbulb,
} from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { useQuery } from 'convex/react'

interface FeedbackAnalysisData {
  overview: {
    totalAnalyses: number
    totalVotes: number
    overallApprovalRate: number
    engagementRate: number
  }
  approvalRatesByType: Record<
    string,
    {
      total: number
      thumbsUp: number
      thumbsDown: number
      approvalRate: number
      engagementRate: number
    }
  >
  failurePatterns: {
    lowApprovalAnalyses: Array<{
      analysisId: string
      statementType: string
      approvalRate: number
      confidenceLevel: number
      commonIssues: string[]
    }>
    commonFailureReasons: Record<string, number>
    confidenceVsApproval: Array<{
      confidenceRange: string
      avgApprovalRate: number
      count: number
    }>
  }
  trends: {
    dailyApprovalRates: Array<{
      date: string
      approvalRate: number
      totalVotes: number
    }>
    improvementOpportunities: string[]
  }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

const STATEMENT_TYPE_COLORS = {
  fact: '#10B981',
  opinion: '#3B82F6',
  question: '#F59E0B',
  request: '#EF4444',
  other: '#6B7280',
}

export function FeedbackAnalyticsDashboard() {
  const [analysisData, setAnalysisData] = useState<FeedbackAnalysisData | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Query existing analysis stats
  const analysisStats = useQuery(api.analyses.getAnalysisStats, {})

  useEffect(() => {
    const loadAnalysisData = async () => {
      try {
        setLoading(true)

        // For now, use mock data since the database is empty
        // In production, this would call the actual analysis service
        const mockData: FeedbackAnalysisData = {
          overview: {
            totalAnalyses: 1247,
            totalVotes: 3891,
            overallApprovalRate: 0.73,
            engagementRate: 3.12,
          },
          approvalRatesByType: {
            fact: {
              total: 435,
              thumbsUp: 389,
              thumbsDown: 98,
              approvalRate: 0.799,
              engagementRate: 1.12,
            },
            opinion: {
              total: 312,
              thumbsUp: 201,
              thumbsDown: 156,
              approvalRate: 0.563,
              engagementRate: 1.14,
            },
            question: {
              total: 298,
              thumbsUp: 156,
              thumbsDown: 201,
              approvalRate: 0.437,
              engagementRate: 1.2,
            },
            request: {
              total: 134,
              thumbsUp: 89,
              thumbsDown: 67,
              approvalRate: 0.571,
              engagementRate: 1.16,
            },
            other: {
              total: 68,
              thumbsUp: 34,
              thumbsDown: 45,
              approvalRate: 0.43,
              engagementRate: 1.16,
            },
          },
          failurePatterns: {
            lowApprovalAnalyses: [
              {
                analysisId: 'k1234567890',
                statementType: 'question',
                approvalRate: 0.15,
                confidenceLevel: 0.92,
                commonIssues: [
                  'Overconfident incorrect analysis',
                  'Missing context',
                ],
              },
              {
                analysisId: 'k2345678901',
                statementType: 'opinion',
                approvalRate: 0.23,
                confidenceLevel: 0.78,
                commonIssues: [
                  'Missing belief extraction',
                  'Unclear statement classification',
                ],
              },
            ],
            commonFailureReasons: {
              'Overconfident incorrect analysis': 23,
              'Missing belief extraction': 18,
              'Missing trade-off analysis': 15,
              'Unclear statement classification': 12,
              'Missing context': 9,
            },
            confidenceVsApproval: [
              {
                confidenceRange: 'Low (0-50%)',
                avgApprovalRate: 0.45,
                count: 89,
              },
              {
                confidenceRange: 'Medium (50-70%)',
                avgApprovalRate: 0.67,
                count: 234,
              },
              {
                confidenceRange: 'High (70-90%)',
                avgApprovalRate: 0.78,
                count: 567,
              },
              {
                confidenceRange: 'Very High (90-100%)',
                avgApprovalRate: 0.71,
                count: 357,
              },
            ],
          },
          trends: {
            dailyApprovalRates: [
              { date: '2024-01-01', approvalRate: 0.68, totalVotes: 145 },
              { date: '2024-01-02', approvalRate: 0.72, totalVotes: 167 },
              { date: '2024-01-03', approvalRate: 0.75, totalVotes: 189 },
              { date: '2024-01-04', approvalRate: 0.73, totalVotes: 201 },
              { date: '2024-01-05', approvalRate: 0.76, totalVotes: 198 },
            ],
            improvementOpportunities: [
              'Improve question analysis accuracy (current approval: 43.7%)',
              'Calibrate confidence scoring - high confidence analyses receiving low approval',
              "Address 'Overconfident incorrect analysis' - affecting 23 analyses",
              "Address 'Missing belief extraction' - affecting 18 analyses",
            ],
          },
        }

        setAnalysisData(mockData)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load analysis data'
        )
      } finally {
        setLoading(false)
      }
    }

    loadAnalysisData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="animate-pulse">
          <div className="mb-4 h-8 w-1/4 rounded bg-gray-200"></div>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded bg-gray-200"></div>
            ))}
          </div>
          <div className="h-64 rounded bg-gray-200"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="m-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Data</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!analysisData) return null

  const { overview, approvalRatesByType, failurePatterns, trends } =
    analysisData

  // Prepare chart data
  const typeChartData = Object.entries(approvalRatesByType).map(
    ([type, stats]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      approvalRate: Math.round(stats.approvalRate * 100),
      total: stats.total,
      thumbsUp: stats.thumbsUp,
      thumbsDown: stats.thumbsDown,
    })
  )

  const confidenceChartData = failurePatterns.confidenceVsApproval.map(
    item => ({
      range: item.confidenceRange.split(' ')[0],
      approval: Math.round(item.avgApprovalRate * 100),
      count: item.count,
    })
  )

  const failureReasonsData = Object.entries(
    failurePatterns.commonFailureReasons
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([reason, count]) => ({
      reason: reason.replace(/([A-Z])/g, ' $1').trim(),
      count,
    }))

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feedback Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Analysis of thumb vote patterns and improvement opportunities
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Last updated: {new Date().toLocaleDateString()}
        </Badge>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Analyses
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.totalAnalyses.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Processed this period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.totalVotes.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {overview.engagementRate.toFixed(1)} votes per analysis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            {overview.overallApprovalRate >= 0.7 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(overview.overallApprovalRate * 100).toFixed(1)}%
            </div>
            <Progress
              value={overview.overallApprovalRate * 100}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues Found</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {failurePatterns.lowApprovalAnalyses.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Low approval analyses
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patterns">Failure Patterns</TabsTrigger>
          <TabsTrigger value="confidence">Confidence Analysis</TabsTrigger>
          <TabsTrigger value="improvements">Improvements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Approval Rates by Statement Type</CardTitle>
                <CardDescription>
                  How different types of analyses are performing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={typeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name) => [
                        `${value}%`,
                        name === 'approvalRate' ? 'Approval Rate' : name,
                      ]}
                    />
                    <Bar
                      dataKey="approvalRate"
                      fill="#3B82F6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vote Distribution by Type</CardTitle>
                <CardDescription>
                  Breakdown of thumbs up vs thumbs down by analysis type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(approvalRatesByType).map(([type, stats]) => (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">{type}</span>
                        <span className="text-sm text-muted-foreground">
                          {stats.thumbsUp + stats.thumbsDown} votes
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-green-100">
                          <div
                            className="h-full bg-green-600 transition-all duration-300"
                            style={{
                              width: `${(stats.thumbsUp / (stats.thumbsUp + stats.thumbsDown)) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-red-100">
                          <div
                            className="h-full bg-red-600 transition-all duration-300"
                            style={{
                              width: `${(stats.thumbsDown / (stats.thumbsUp + stats.thumbsDown)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>👍 {stats.thumbsUp}</span>
                        <span>👎 {stats.thumbsDown}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Common Failure Reasons</CardTitle>
                <CardDescription>
                  Most frequent issues in low-approval analyses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={failureReasonsData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="reason" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Low Approval Analyses</CardTitle>
                <CardDescription>
                  Specific analyses that need attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {failurePatterns.lowApprovalAnalyses
                    .slice(0, 5)
                    .map((analysis, idx) => (
                      <div
                        key={analysis.analysisId}
                        className="rounded-lg border p-3"
                      >
                        <div className="mb-2 flex items-start justify-between">
                          <Badge variant="outline" className="capitalize">
                            {analysis.statementType}
                          </Badge>
                          <div className="text-right">
                            <div className="text-sm font-medium text-red-600">
                              {(analysis.approvalRate * 100).toFixed(1)}%
                              approval
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {(analysis.confidenceLevel * 100).toFixed(1)}%
                              confidence
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {analysis.commonIssues.map((issue, issueIdx) => (
                            <Badge
                              key={issueIdx}
                              variant="secondary"
                              className="mb-1 mr-1 text-xs"
                            >
                              {issue}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="confidence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Confidence vs Approval Analysis</CardTitle>
              <CardDescription>
                Relationship between model confidence and user approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={confidenceChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      name === 'approval' ? `${value}%` : value,
                      name === 'approval' ? 'Approval Rate' : 'Count',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="approval"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="improvements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-600" />
                Improvement Opportunities
              </CardTitle>
              <CardDescription>
                AI-generated recommendations based on feedback patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trends.improvementOpportunities.map((opportunity, idx) => (
                  <Alert key={idx}>
                    <Target className="h-4 w-4" />
                    <AlertTitle>Priority {idx + 1}</AlertTitle>
                    <AlertDescription>{opportunity}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default FeedbackAnalyticsDashboard
