'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Play,
  Pause,
  Square,
  Settings,
  AlertTriangle,
  Clock,
  TrendingUp,
  BarChart3,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

interface RolloutManagerProps {
  experimentId: Id<'experiments'>
}

export function RolloutManager({ experimentId }: RolloutManagerProps) {
  const [showConfigDialog, setShowConfigDialog] = useState(false)
  const [rolloutConfig, setRolloutConfig] = useState({
    strategy: 'linear' as const,
    targetPercentage: 100,
    duration: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    stepSize: 10,
    checkInterval: 60 * 60 * 1000, // 1 hour
    maxErrorRate: 5, // 5%
    minConfidenceScore: 70, // 70%
  })

  const rolloutStatus = useQuery(api.gradualRollout.getRolloutStatus, {
    experimentId,
  })
  const configureRollout = useMutation(
    api.gradualRollout.configureGradualRollout
  )
  const controlRollout = useMutation(api.gradualRollout.controlGradualRollout)

  const handleConfigureRollout = async () => {
    try {
      await configureRollout({
        experimentId,
        rolloutConfig: {
          strategy: rolloutConfig.strategy,
          targetPercentage: rolloutConfig.targetPercentage,
          duration: rolloutConfig.duration,
          stepSize: rolloutConfig.stepSize,
          checkInterval: rolloutConfig.checkInterval,
          safetyThresholds: {
            maxErrorRate: rolloutConfig.maxErrorRate,
            minConfidenceScore: rolloutConfig.minConfidenceScore,
          },
        },
        triggeredBy: 'current-user' as any, // Should come from auth context
      })
      setShowConfigDialog(false)
    } catch (error) {
      console.error('Failed to configure rollout:', error)
    }
  }

  const handleControlRollout = async (
    action: 'pause' | 'resume' | 'stop',
    reason?: string
  ) => {
    try {
      await controlRollout({
        experimentId,
        action,
        reason,
        triggeredBy: 'current-user' as any, // Should come from auth context
      })
    } catch (error) {
      console.error(`Failed to ${action} rollout:`, error)
    }
  }

  if (!rolloutStatus) {
    return <div>Loading rollout status...</div>
  }

  const formatDuration = (ms: number) => {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000))
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))

    if (days > 0) {
      return `${days}d ${hours}h`
    }
    return `${hours}h`
  }

  const getStatusIcon = () => {
    if (!rolloutStatus.hasGradualRollout) {
      return <Settings className="h-4 w-4 text-gray-400" />
    }

    if (rolloutStatus.status.isPaused) {
      return <Pause className="h-4 w-4 text-yellow-600" />
    }

    if (rolloutStatus.status.isCompleted || rolloutStatus.status.isStopped) {
      return <Square className="h-4 w-4 text-gray-600" />
    }

    if (rolloutStatus.status.isActive) {
      return <Play className="h-4 w-4 text-green-600" />
    }

    return <Clock className="h-4 w-4 text-blue-600" />
  }

  const getStatusBadge = () => {
    if (!rolloutStatus.hasGradualRollout) {
      return <Badge variant="secondary">Not Configured</Badge>
    }

    if (rolloutStatus.status.isPaused) {
      return (
        <Badge
          variant="outline"
          className="border-yellow-200 bg-yellow-100 text-yellow-800"
        >
          Paused
        </Badge>
      )
    }

    if (rolloutStatus.status.isCompleted) {
      return (
        <Badge
          variant="outline"
          className="border-blue-200 bg-blue-100 text-blue-800"
        >
          Completed
        </Badge>
      )
    }

    if (rolloutStatus.status.isStopped) {
      return (
        <Badge
          variant="outline"
          className="border-gray-200 bg-gray-100 text-gray-800"
        >
          Stopped
        </Badge>
      )
    }

    if (rolloutStatus.status.isActive) {
      return (
        <Badge
          variant="default"
          className="border-green-200 bg-green-100 text-green-800"
        >
          Active
        </Badge>
      )
    }

    return <Badge variant="secondary">Ready</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <CardTitle className="text-lg">Gradual Rollout</CardTitle>
            {getStatusBadge()}
          </div>
          <div className="flex items-center space-x-2">
            {rolloutStatus.hasGradualRollout &&
              rolloutStatus.status.isActive && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleControlRollout('pause', 'Manual pause')
                    }
                  >
                    <Pause className="mr-2 h-4 w-4" />
                    Pause
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleControlRollout('stop', 'Manual stop')}
                  >
                    <Square className="mr-2 h-4 w-4" />
                    Stop
                  </Button>
                </>
              )}

            {rolloutStatus.hasGradualRollout &&
              rolloutStatus.status.isPaused && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleControlRollout('resume')}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Resume
                </Button>
              )}

            <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="mr-2 h-4 w-4" />
                  Configure
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Configure Gradual Rollout</DialogTitle>
                  <DialogDescription>
                    Set up automated rollout parameters and safety thresholds
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Rollout Strategy</Label>
                    <Select
                      value={rolloutConfig.strategy}
                      onValueChange={(value: any) =>
                        setRolloutConfig({
                          ...rolloutConfig,
                          strategy: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate</SelectItem>
                        <SelectItem value="linear">Linear</SelectItem>
                        <SelectItem value="exponential">Exponential</SelectItem>
                        <SelectItem value="stepped">Stepped</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Target %</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={rolloutConfig.targetPercentage}
                        onChange={e =>
                          setRolloutConfig({
                            ...rolloutConfig,
                            targetPercentage: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Duration (days)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={rolloutConfig.duration / (24 * 60 * 60 * 1000)}
                        onChange={e =>
                          setRolloutConfig({
                            ...rolloutConfig,
                            duration:
                              (parseInt(e.target.value) || 1) *
                              24 *
                              60 *
                              60 *
                              1000,
                          })
                        }
                      />
                    </div>
                  </div>

                  {rolloutConfig.strategy === 'stepped' && (
                    <div className="space-y-2">
                      <Label>Step Size (%)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        value={rolloutConfig.stepSize}
                        onChange={e =>
                          setRolloutConfig({
                            ...rolloutConfig,
                            stepSize: parseInt(e.target.value) || 10,
                          })
                        }
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Safety Thresholds
                    </Label>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Max Error Rate (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={rolloutConfig.maxErrorRate}
                          onChange={e =>
                            setRolloutConfig({
                              ...rolloutConfig,
                              maxErrorRate: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Min Confidence (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={rolloutConfig.minConfidenceScore}
                          onChange={e =>
                            setRolloutConfig({
                              ...rolloutConfig,
                              minConfidenceScore:
                                parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowConfigDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleConfigureRollout}>
                    Configure Rollout
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!rolloutStatus.hasGradualRollout ? (
          <div className="py-6 text-center">
            <Settings className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-sm font-medium text-gray-900">
              No Gradual Rollout Configured
            </h3>
            <p className="mb-4 text-sm text-gray-500">
              Set up automated rollout to gradually increase traffic to your
              experiment
            </p>
            <Button onClick={() => setShowConfigDialog(true)}>
              Configure Rollout
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress Overview */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{(rolloutStatus.status.progress * 100).toFixed(1)}%</span>
              </div>
              <Progress
                value={rolloutStatus.status.progress * 100}
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {rolloutStatus.status.currentPercentage.toFixed(1)}% current
                </span>
                <span>{rolloutStatus.config.targetPercentage}% target</span>
              </div>
            </div>

            {/* Status Information */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">Strategy</div>
                <div className="capitalize text-muted-foreground">
                  {rolloutStatus.config.strategy}
                </div>
              </div>
              <div>
                <div className="font-medium">Duration</div>
                <div className="text-muted-foreground">
                  {formatDuration(rolloutStatus.config.duration)}
                </div>
              </div>
              <div>
                <div className="font-medium">Elapsed</div>
                <div className="text-muted-foreground">
                  {formatDuration(rolloutStatus.status.elapsedTime)}
                </div>
              </div>
              <div>
                <div className="font-medium">Remaining</div>
                <div className="text-muted-foreground">
                  {rolloutStatus.status.remainingTime > 0
                    ? formatDuration(rolloutStatus.status.remainingTime)
                    : 'Complete'}
                </div>
              </div>
            </div>

            {/* Warning Messages */}
            {rolloutStatus.status.isPaused &&
              rolloutStatus.status.pauseReason && (
                <div className="flex items-start space-x-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-600" />
                  <div>
                    <div className="font-medium text-yellow-800">
                      Rollout Paused
                    </div>
                    <div className="text-sm text-yellow-700">
                      {rolloutStatus.status.pauseReason}
                    </div>
                  </div>
                </div>
              )}

            {/* Safety Thresholds */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Safety Thresholds</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between">
                  <span>Max Error Rate</span>
                  <span className="font-mono">
                    {rolloutStatus.safetyThresholds.maxErrorRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Min Confidence</span>
                  <span className="font-mono">
                    {rolloutStatus.safetyThresholds.minConfidenceScore}%
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline Preview */}
            {rolloutStatus.timeline.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Recent Activity</div>
                <div className="max-h-32 space-y-1 overflow-y-auto">
                  {rolloutStatus.timeline.slice(0, 5).map((event, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="capitalize">
                        {event.eventName
                          .replace('rollout_', '')
                          .replace('_', ' ')}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(event.timestamp, {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
