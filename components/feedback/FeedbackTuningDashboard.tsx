'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ThresholdMonitoringDashboard } from './ThresholdMonitoringDashboard'
import { PromptProposalReview } from './PromptProposalReview'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Brain,
  Target,
  Zap,
  BarChart3,
} from 'lucide-react'

export function FeedbackTuningDashboard() {
  const learningStatus = useQuery(api.learningMetrics.getLearningStatus)
  const learningTrends = useQuery(api.learningMetrics.getLearningTrends, {
    daysBack: 30,
  })
  const learningInsights = useQuery(
    api.learningMetrics.generateLearningInsights
  )
  const improvementMapping = useQuery(
    api.improvementMapping.getImprovementMappingDashboard
  )
  const refinementAnalytics = useQuery(
    api.promptRefinement.getPromptRefinementAnalytics
  )

  const manualPipeline = useMutation(api.learningMetrics.manualLearningPipeline)
  const manualAnalysis = useMutation(api.promptRefinement.manualPatternAnalysis)

  const runManualPipeline = async () => {
    try {
      await manualPipeline({})
    } catch (error) {
      console.error('Failed to run manual pipeline:', error)
    }
  }

  const runManualAnalysis = async () => {
    try {
      await manualAnalysis({})
    } catch (error) {
      console.error('Failed to run manual analysis:', error)
    }
  }

  if (
    !learningStatus ||
    !learningTrends ||
    !improvementMapping ||
    !refinementAnalytics
  ) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Brain className="mx-auto mb-2 h-8 w-8 animate-pulse text-muted-foreground" />
          <p className="text-muted-foreground">
            Loading feedback tuning system...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Feedback-Based Prompt Tuning
          </h1>
          <p className="text-muted-foreground">
            Automated system for improving analysis quality through user
            feedback
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runManualAnalysis} variant="outline" size="sm">
            <Activity className="mr-2 h-4 w-4" />
            Analyze Patterns
          </Button>
          <Button onClick={runManualPipeline} variant="outline" size="sm">
            <Zap className="mr-2 h-4 w-4" />
            Run Pipeline
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  System Health
                </p>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">
                    {learningStatus.healthScore}
                  </div>
                  <Badge
                    variant={
                      learningStatus.healthScore >= 80
                        ? 'default'
                        : learningStatus.healthScore >= 60
                          ? 'secondary'
                          : 'destructive'
                    }
                  >
                    {learningStatus.healthScore >= 80
                      ? 'Excellent'
                      : learningStatus.healthScore >= 60
                        ? 'Good'
                        : 'Needs Attention'}
                  </Badge>
                </div>
              </div>
              <div
                className={`rounded-full p-2 ${learningStatus.healthScore >= 80 ? 'bg-green-100' : learningStatus.healthScore >= 60 ? 'bg-yellow-100' : 'bg-red-100'}`}
              >
                {learningStatus.healthScore >= 80 ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : learningStatus.healthScore >= 60 ? (
                  <Clock className="h-6 w-6 text-yellow-600" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Overall Approval
                </p>
                <div className="text-2xl font-bold">
                  {learningStatus.currentMetrics
                    ? (
                        learningStatus.currentMetrics.overallApprovalRate * 100
                      ).toFixed(1)
                    : '0'}
                  %
                </div>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  {learningStatus.dayOverDayChanges.approvalRate >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  {Math.abs(
                    learningStatus.dayOverDayChanges.approvalRate * 100
                  ).toFixed(1)}
                  % vs yesterday
                </p>
              </div>
              <Target className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Question Approval
                </p>
                <div className="text-2xl font-bold">
                  {learningStatus.currentMetrics
                    ? (
                        learningStatus.currentMetrics.questionApprovalRate * 100
                      ).toFixed(1)
                    : '0'}
                  %
                </div>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  {learningStatus.dayOverDayChanges.questionApproval >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  {Math.abs(
                    learningStatus.dayOverDayChanges.questionApproval * 100
                  ).toFixed(1)}
                  % vs yesterday
                </p>
              </div>
              <BarChart3 className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Improvements
                </p>
                <div className="text-2xl font-bold">
                  {learningStatus.systemStatus.pendingReviews}
                </div>
                <p className="text-xs text-muted-foreground">
                  {learningStatus.systemStatus.activeTesting} testing
                </p>
              </div>
              <Brain className="h-6 w-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights and Recommendations */}
      {learningInsights &&
        (learningInsights.insights.length > 0 ||
          learningInsights.recommendations.length > 0) && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {learningInsights.insights.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="h-5 w-5" />
                    System Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {learningInsights.insights.map((insight, idx) => (
                    <Alert
                      key={idx}
                      variant={
                        insight.severity === 'high' ? 'destructive' : 'default'
                      }
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle className="text-sm">
                        {insight.type.replace(/_/g, ' ').toUpperCase()}
                      </AlertTitle>
                      <AlertDescription className="text-xs">
                        {insight.message}
                      </AlertDescription>
                    </Alert>
                  ))}
                </CardContent>
              </Card>
            )}

            {learningInsights.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {learningInsights.recommendations.map((rec, idx) => (
                    <div key={idx} className="rounded border bg-blue-50 p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <Badge
                          variant={
                            rec.priority === 'high'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {rec.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="mb-1 text-sm font-medium">
                        {rec.action.replace(/_/g, ' ').toUpperCase()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {rec.message}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="monitoring" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="monitoring">Threshold Monitoring</TabsTrigger>
          <TabsTrigger value="proposals">
            Proposal Review
            {refinementAnalytics.pendingReview > 0 && (
              <Badge className="ml-2 px-1.5 py-0.5 text-xs">
                {refinementAnalytics.pendingReview}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="patterns">Pattern Analysis</TabsTrigger>
          <TabsTrigger value="trends">Learning Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring" className="space-y-4">
          <ThresholdMonitoringDashboard />
        </TabsContent>

        <TabsContent value="proposals" className="space-y-4">
          <PromptProposalReview />
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Improvement Mapping</CardTitle>
                <CardDescription>
                  Pattern detection and improvement coverage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-500">
                      {improvementMapping.totalPatterns}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Patterns
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-500">
                      {improvementMapping.coveredPatterns}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      With Improvements
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Coverage Rate</span>
                    <span>
                      {(
                        (improvementMapping.coveredPatterns /
                          Math.max(1, improvementMapping.totalPatterns)) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      (improvementMapping.coveredPatterns /
                        Math.max(1, improvementMapping.totalPatterns)) *
                      100
                    }
                  />
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Top Impact Patterns</h4>
                  {improvementMapping.topPatterns
                    .slice(0, 3)
                    .map((pattern, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded bg-muted p-2 text-xs"
                      >
                        <span className="capitalize">
                          {pattern.category.replace(/_/g, ' ')}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Impact: {pattern.impact.toFixed(0)}
                          </Badge>
                          {pattern.hasImprovement && (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Last 30 days improvement activity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-orange-500">
                      {improvementMapping.recentActivity.proposalsCreated}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Proposals Created
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-500">
                      {improvementMapping.recentActivity.deployed}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Deployed
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Deployment Rate</span>
                    <span>
                      {improvementMapping.recentActivity.proposalsCreated > 0
                        ? (
                            (improvementMapping.recentActivity.deployed /
                              improvementMapping.recentActivity
                                .proposalsCreated) *
                            100
                          ).toFixed(1)
                        : '0'}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      improvementMapping.recentActivity.proposalsCreated > 0
                        ? (improvementMapping.recentActivity.deployed /
                            improvementMapping.recentActivity
                              .proposalsCreated) *
                          100
                        : 0
                    }
                  />
                </div>

                <div className="rounded bg-blue-50 p-3">
                  <div className="text-sm font-medium">
                    Average Expected Improvement
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    {(
                      improvementMapping.recentActivity.avgExpectedImprovement *
                      100
                    ).toFixed(1)}
                    %
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">30-Day Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Total Improvements</span>
                  <span className="font-medium">
                    {learningTrends.summary.totalSuccessfulChanges}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Avg Approval Rate</span>
                  <span className="font-medium">
                    {(learningTrends.summary.averageApprovalRate * 100).toFixed(
                      1
                    )}
                    %
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Question Approval</span>
                  <span className="font-medium">
                    {(
                      learningTrends.summary.currentQuestionApproval * 100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Improvement Rate</span>
                  <span className="font-medium">
                    {learningTrends.summary.improvementRate >= 0 ? '+' : ''}
                    {(learningTrends.summary.improvementRate * 100).toFixed(2)}
                    %/day
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trend Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Approval Rate</span>
                    <Badge
                      variant={
                        learningTrends.trends.approvalRateTrend.direction ===
                        'improving'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {learningTrends.trends.approvalRateTrend.direction}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Question Performance</span>
                    <Badge
                      variant={
                        learningTrends.trends.questionApprovalTrend
                          .direction === 'improving'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {learningTrends.trends.questionApprovalTrend.direction}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Confidence Calibration</span>
                    <Badge
                      variant={
                        learningTrends.trends.confidenceCalibrationTrend
                          .direction === 'declining'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {learningTrends.trends.confidenceCalibrationTrend
                        .direction === 'declining'
                        ? 'improving'
                        : learningTrends.trends.confidenceCalibrationTrend
                            .direction}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Efficiency</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Total Cycles</span>
                  <span className="font-medium">
                    {learningTrends.summary.totalImprovementCycles}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Success Rate</span>
                  <span className="font-medium">
                    {learningTrends.summary.totalImprovementCycles > 0
                      ? (
                          (learningTrends.summary.totalSuccessfulChanges /
                            learningTrends.summary.totalImprovementCycles) *
                          100
                        ).toFixed(1)
                      : '0'}
                    %
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Pipeline Efficiency</span>
                    <span>
                      {learningTrends.summary.totalImprovementCycles > 0
                        ? (
                            (learningTrends.summary.totalSuccessfulChanges /
                              learningTrends.summary.totalImprovementCycles) *
                            100
                          ).toFixed(0)
                        : '0'}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      learningTrends.summary.totalImprovementCycles > 0
                        ? (learningTrends.summary.totalSuccessfulChanges /
                            learningTrends.summary.totalImprovementCycles) *
                          100
                        : 0
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
