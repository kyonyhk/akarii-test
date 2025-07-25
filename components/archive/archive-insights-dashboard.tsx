'use client'

import { useState, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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
  Area,
  AreaChart,
} from 'recharts'
import {
  TrendingUp,
  MessageCircle,
  Users,
  Clock,
  Target,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from 'lucide-react'

interface ArchiveInsightsDashboardProps {
  archiveId: Id<'conversationArchives'>
}

const INSIGHT_COLORS = {
  decision_pattern: '#8b5cf6',
  communication_pattern: '#06b6d4',
  topic_evolution: '#10b981',
  conflict_resolution: '#f59e0b',
  consensus_building: '#3b82f6',
  knowledge_sharing: '#ec4899',
}

const IMPACT_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
}

export function ArchiveInsightsDashboard({
  archiveId,
}: ArchiveInsightsDashboardProps) {
  const [selectedInsightType, setSelectedInsightType] = useState<string | null>(
    null
  )

  const archive = useQuery(api.archives.getArchivedConversation, { archiveId })
  const insights = useQuery(api.archiveInsights.getArchiveInsights, {
    archiveId,
  })
  const summaries = useQuery(api.archiveSummaries.getArchiveSummaries, {
    archiveId,
  })

  if (!archive || !insights || !summaries) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    )
  }

  const insightsByType = insights.reduce(
    (acc: Record<string, typeof insights>, insight: any) => {
      if (!acc[insight.insightType]) {
        acc[insight.insightType] = []
      }
      acc[insight.insightType].push(insight)
      return acc
    },
    {} as Record<string, typeof insights>
  )

  const insightTypeData = Object.entries(insightsByType).map(
    ([type, typeInsights]: [string, any]) => ({
      type: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count: typeInsights.length,
      avgConfidence:
        typeInsights.reduce((sum: number, i: any) => sum + i.confidence, 0) /
        typeInsights.length,
      highImpact: typeInsights.filter(
        (i: any) => i.impact === 'high' || i.impact === 'critical'
      ).length,
      color: INSIGHT_COLORS[type as keyof typeof INSIGHT_COLORS],
    })
  )

  const impactDistribution = insights.reduce(
    (acc: Record<string, number>, insight: any) => {
      acc[insight.impact] = (acc[insight.impact] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const impactData = Object.entries(impactDistribution).map(
    ([impact, count]) => ({
      impact: impact.charAt(0).toUpperCase() + impact.slice(1),
      count,
      color: IMPACT_COLORS[impact as keyof typeof IMPACT_COLORS],
    })
  )

  const confidenceData = insights.map((insight: any) => ({
    type: insight.insightType.replace('_', ' '),
    confidence: Math.round(insight.confidence * 100),
    impact: insight.impact,
  }))

  const overviewSummary = summaries.find(
    (s: any) => s.summaryType === 'overview'
  )

  return (
    <div className="space-y-6">
      {/* Header with Archive Info */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Archive Insights
            </h2>
            <p className="text-muted-foreground">
              Analysis patterns and decision insights for &ldquo;{archive.title}
              &rdquo;
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {insights.length} Insights Generated
          </Badge>
        </div>

        {/* Archive Metadata */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MessageCircle className="h-4 w-4" />
            {archive.messageCount} messages
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {archive.originalParticipants.length} participants
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {Math.round(
              archive.timeRange.duration / (1000 * 60 * 60 * 24)
            )}{' '}
            days
          </div>
          <div className="flex items-center gap-2">
            {archive.metadata.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="recommendations">Actions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Insights
                </CardTitle>
                <Lightbulb className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{insights.length}</div>
                <p className="text-xs text-muted-foreground">
                  Across {Object.keys(insightsByType).length} categories
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  High Impact
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {
                    insights.filter(
                      i => i.impact === 'high' || i.impact === 'critical'
                    ).length
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  Critical findings identified
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Confidence
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(
                    (insights.reduce((sum, i) => sum + i.confidence, 0) /
                      insights.length) *
                      100
                  )}
                  %
                </div>
                <p className="text-xs text-muted-foreground">
                  Analysis reliability score
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Validated</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {insights.filter(i => i.validatedBy).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Human-verified insights
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Insights by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={insightTypeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="type"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Impact Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={impactData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ impact, count }) => `${impact}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {impactData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Summary Card */}
          {overviewSummary && (
            <Card>
              <CardHeader>
                <CardTitle>Conversation Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed text-muted-foreground">
                  {overviewSummary.content}
                </p>
                <Separator className="my-4" />
                <div className="flex flex-wrap gap-2">
                  {overviewSummary.keyPoints.map((point, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {point}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pattern Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Identified behavioral and communication patterns
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(insightsByType).map(([type, typeInsights]) => (
                  <div key={type} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            INSIGHT_COLORS[type as keyof typeof INSIGHT_COLORS],
                        }}
                      />
                      <h4 className="font-medium">
                        {type
                          .replace('_', ' ')
                          .replace(/\b\w/g, l => l.toUpperCase())}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {typeInsights.length} patterns
                      </Badge>
                    </div>

                    <div className="space-y-2 pl-5">
                      {typeInsights.slice(0, 1).map(insight => (
                        <div key={insight._id}>
                          {insight.patterns.map((pattern, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {pattern.pattern}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Frequency: {pattern.frequency} | Significance:{' '}
                                  {pattern.significance}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  pattern.significance === 'high'
                                    ? 'default'
                                    : 'secondary'
                                }
                                className="text-xs"
                              >
                                {pattern.significance}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4">
            {insights
              .sort((a, b) => {
                const impactOrder = { critical: 4, high: 3, medium: 2, low: 1 }
                return (
                  impactOrder[b.impact] - impactOrder[a.impact] ||
                  b.confidence - a.confidence
                )
              })
              .map(insight => (
                <Card key={insight._id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">
                            {insight.title}
                          </CardTitle>
                          <Badge
                            variant={
                              insight.impact === 'critical' ||
                              insight.impact === 'high'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className="text-xs"
                          >
                            {insight.impact} impact
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {insight.insightType
                            .replace('_', ' ')
                            .replace(/\b\w/g, l => l.toUpperCase())}{' '}
                          •{Math.round(insight.confidence * 100)}% confidence
                        </p>
                      </div>
                      {insight.validatedBy && (
                        <Badge variant="outline" className="text-xs">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Validated
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="leading-relaxed text-muted-foreground">
                      {insight.description}
                    </p>

                    {insight.evidence.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">
                          Supporting Evidence
                        </h5>
                        <div className="space-y-2">
                          {insight.evidence.slice(0, 2).map((evidence, idx) => (
                            <div
                              key={idx}
                              className="rounded-lg bg-muted/30 p-3 text-sm"
                            >
                              <p className="italic text-muted-foreground">
                                &ldquo;{evidence.excerpt}&rdquo;
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Relevance:{' '}
                                {Math.round(evidence.relevanceScore * 100)}%
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {insight.recommendations.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">Recommendations</h5>
                        <ul className="space-y-1">
                          {insight.recommendations.map((rec, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-sm text-muted-foreground"
                            >
                              <ArrowUpRight className="mt-0.5 h-3 w-3 text-primary" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Actionable Recommendations</CardTitle>
              <p className="text-sm text-muted-foreground">
                Key actions derived from conversation analysis
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights
                  .filter(insight => insight.recommendations.length > 0)
                  .sort((a, b) => {
                    const impactOrder = {
                      critical: 4,
                      high: 3,
                      medium: 2,
                      low: 1,
                    }
                    return impactOrder[b.impact] - impactOrder[a.impact]
                  })
                  .map(insight => (
                    <div key={insight._id} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            insight.impact === 'critical' ||
                            insight.impact === 'high'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {insight.impact}
                        </Badge>
                        <h4 className="font-medium">{insight.title}</h4>
                      </div>

                      <div className="space-y-2 pl-4">
                        {insight.recommendations.map((rec, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 rounded-lg bg-muted/30 p-3"
                          >
                            <Activity className="mt-0.5 h-4 w-4 text-primary" />
                            <div className="flex-1">
                              <p className="text-sm">{rec}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                From {insight.insightType.replace('_', ' ')}{' '}
                                analysis
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
