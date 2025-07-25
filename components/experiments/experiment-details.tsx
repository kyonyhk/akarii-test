'use client'

import { useQuery } from 'convex/react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatDistanceToNow } from 'date-fns'
import {
  Users,
  Target,
  BarChart3,
  Clock,
  TrendingUp,
  Settings,
} from 'lucide-react'

import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { RolloutManager } from './rollout-manager'
import { ExperimentStatusBadge } from './experiment-status-badge'

interface ExperimentDetailsProps {
  experimentId: Id<'experiments'>
}

export function ExperimentDetails({ experimentId }: ExperimentDetailsProps) {
  const experiment = useQuery(api.experiments.getExperiment, { experimentId })
  const experimentMetrics = useQuery(
    api.experimentMetrics.getExperimentMetrics,
    {
      experimentId,
    }
  )

  if (!experiment) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
        <p className="mt-2 text-sm text-muted-foreground">
          Loading experiment details...
        </p>
      </div>
    )
  }

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`

  return (
    <div className="space-y-6">
      {/* Experiment Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{experiment.name}</h1>
            <p className="text-muted-foreground">{experiment.description}</p>
          </div>
          <ExperimentStatusBadge status={experiment.status} />
        </div>

        <div className="flex items-center space-x-6 text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>
              Created{' '}
              {formatDistanceToNow(experiment.createdAt, { addSuffix: true })}
            </span>
          </div>
          {experiment.startDate && (
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>
                Started{' '}
                {formatDistanceToNow(experiment.startDate, { addSuffix: true })}
              </span>
            </div>
          )}
          {experiment.endDate && (
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>
                Ended{' '}
                {formatDistanceToNow(experiment.endDate, { addSuffix: true })}
              </span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Experiment Configuration */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Configuration</span>
            </CardTitle>
            <CardDescription>
              Experiment setup and targeting rules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">Traffic Allocation</div>
                <div className="text-muted-foreground">
                  {formatPercentage(
                    experiment.targetingRules.rolloutPercentage
                  )}
                </div>
              </div>
              <div>
                <div className="font-medium">Variants</div>
                <div className="text-muted-foreground">
                  {experiment.variants.length} variants
                </div>
              </div>
              <div>
                <div className="font-medium">Audience</div>
                <div className="text-muted-foreground">
                  {experiment.targetingRules.userSegments?.join(', ') ||
                    'All users'}
                </div>
              </div>
              <div>
                <div className="font-medium">Success Metric</div>
                <div className="text-muted-foreground">
                  {experiment.successMetric}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="font-medium">Variants</div>
              <div className="space-y-2">
                {experiment.variants.map((variant: any) => (
                  <div
                    key={variant.id}
                    className="flex items-center justify-between rounded border p-2"
                  >
                    <div>
                      <div className="font-medium">{variant.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {variant.description}
                      </div>
                    </div>
                    <Badge variant="outline">
                      {formatPercentage(variant.trafficAllocation)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Performance</span>
            </CardTitle>
            <CardDescription>Real-time experiment metrics</CardDescription>
          </CardHeader>
          <CardContent>
            {experimentMetrics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Total Exposures</div>
                    <div className="text-2xl font-bold">
                      {experimentMetrics.totalExposures.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Conversion Rate</div>
                    <div className="text-2xl font-bold">
                      {formatPercentage(
                        experimentMetrics.overallConversionRate
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Total Conversions</div>
                    <div className="text-2xl font-bold">
                      {experimentMetrics.totalConversions.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Error Rate</div>
                    <div className="text-2xl font-bold">
                      {formatPercentage(experimentMetrics.errorRate)}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="font-medium">Variant Performance</div>
                  {experimentMetrics.variantMetrics.map((variant: any) => (
                    <div
                      key={variant.variantId}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">{variant.variantName}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                          {variant.exposures} exp.
                        </span>
                        <Badge variant="outline">
                          {formatPercentage(variant.conversionRate)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-4 text-center">
                <div className="text-sm text-muted-foreground">
                  No metrics data available yet
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gradual Rollout Management */}
      <RolloutManager experimentId={experimentId} />
    </div>
  )
}
