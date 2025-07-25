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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { Id } from '@/convex/_generated/dataModel'

export function ThresholdMonitoringDashboard() {
  const dashboardData = useQuery(api.feedbackMonitoring.getMonitoringDashboard)
  const acknowledgeAlert = useMutation(api.feedbackMonitoring.acknowledgeAlert)
  const initializeThresholds = useMutation(
    api.feedbackMonitoring.initializeThresholds
  )

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            Loading threshold monitoring data...
          </p>
        </div>
      </div>
    )
  }

  const handleAcknowledgeAlert = async (alertId: Id<'thresholdAlerts'>) => {
    try {
      await acknowledgeAlert({
        alertId,
        acknowledgedBy: 'current_user', // Replace with actual user ID
      })
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    }
  }

  const handleInitializeThresholds = async () => {
    try {
      await initializeThresholds({})
    } catch (error) {
      console.error('Failed to initialize thresholds:', error)
    }
  }

  if (dashboardData.thresholds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Threshold Monitoring</CardTitle>
          <CardDescription>
            Initialize the feedback threshold monitoring system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">
              No Thresholds Configured
            </h3>
            <p className="mb-4 text-muted-foreground">
              Set up automatic monitoring for feedback quality metrics
            </p>
            <Button onClick={handleInitializeThresholds}>
              Initialize Default Thresholds
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Threshold Monitoring
          </h2>
          <p className="text-muted-foreground">
            Real-time monitoring of feedback quality metrics
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          Last updated:{' '}
          {new Date(dashboardData.lastChecked).toLocaleTimeString()}
        </Badge>
      </div>

      {/* Pending Alerts */}
      {dashboardData.pendingAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Active Alerts ({dashboardData.pendingAlerts.length})
          </h3>
          {dashboardData.pendingAlerts.map(alert => (
            <Alert key={alert._id} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="flex items-center justify-between">
                <span>
                  {alert.threshold.name.replace(/_/g, ' ').toUpperCase()}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAcknowledgeAlert(alert._id)}
                >
                  Acknowledge
                </Button>
              </AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1">
                  <p>
                    <strong>Breach Value:</strong>{' '}
                    {formatMetricValue(
                      alert.breachValue,
                      alert.threshold.metric
                    )}
                  </p>
                  <p>
                    <strong>Threshold:</strong>{' '}
                    {formatMetricValue(
                      alert.threshold.threshold,
                      alert.threshold.metric
                    )}
                  </p>
                  <p>
                    <strong>Affected Analyses:</strong>{' '}
                    {alert.affectedAnalyses.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Detected: {new Date(alert.breachTime).toLocaleString()}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Threshold Status Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dashboardData.thresholds.map(item => (
          <Card
            key={item.threshold._id}
            className={item.isBreached ? 'border-destructive' : ''}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {item.threshold.name.replace(/_/g, ' ').toUpperCase()}
                </CardTitle>
                {item.isBreached ? (
                  <Badge variant="destructive" className="text-xs">
                    <TrendingDown className="mr-1 h-3 w-3" />
                    BREACH
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    OK
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">
                Window: {item.threshold.window} | Action:{' '}
                {item.threshold.action}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Current:</span>
                  <span
                    className={`font-medium ${item.isBreached ? 'text-destructive' : 'text-primary'}`}
                  >
                    {formatMetricValue(
                      item.currentValue,
                      item.threshold.metric
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Target:</span>
                  <span>
                    {formatMetricValue(
                      item.threshold.threshold,
                      item.threshold.metric
                    )}
                  </span>
                </div>

                {/* Progress bar for visual indicator */}
                <div className="space-y-1">
                  <Progress
                    value={getProgressValue(
                      item.currentValue,
                      item.threshold.threshold,
                      item.threshold.metric
                    )}
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>Target</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Additional metrics */}
                <div className="space-y-1 border-t pt-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Analyses:</span>
                    <span>{item.metrics.totalAnalyses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Votes:</span>
                    <span>{item.metrics.voteCount}</span>
                  </div>
                  {item.threshold.metric === 'confidence_gap' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Confidence Accuracy:
                      </span>
                      <span>
                        {(item.metrics.confidenceAccuracy * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Health Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
            <div>
              <div className="text-2xl font-bold text-primary">
                {dashboardData.thresholds.filter(t => !t.isBreached).length}
              </div>
              <div className="text-sm text-muted-foreground">
                Healthy Metrics
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-destructive">
                {dashboardData.thresholds.filter(t => t.isBreached).length}
              </div>
              <div className="text-sm text-muted-foreground">
                Breached Metrics
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-500">
                {dashboardData.pendingAlerts.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Pending Alerts
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-500">
                {dashboardData.thresholds.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Active Thresholds
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function formatMetricValue(value: number, metric: string): string {
  switch (metric) {
    case 'approval_rate':
      return `${(value * 100).toFixed(1)}%`
    case 'confidence_gap':
      return `${(value * 100).toFixed(1)}%`
    case 'vote_count':
      return value.toFixed(1)
    default:
      return value.toFixed(2)
  }
}

function getProgressValue(
  current: number,
  threshold: number,
  metric: string
): number {
  if (metric === 'confidence_gap') {
    // For confidence gap, lower is better, so invert the progress
    return Math.max(0, Math.min(100, (1 - current / threshold) * 100))
  } else {
    // For approval rate and vote count, higher is better
    return Math.max(0, Math.min(100, (current / threshold) * 100))
  }
}
