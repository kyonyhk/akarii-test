'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { formatDistanceToNow } from 'date-fns'
import {
  Play,
  Pause,
  Square,
  BarChart3,
  Settings,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { ExperimentStatusBadge } from './experiment-status-badge'

interface ExperimentListProps {
  experiments: any[]
  showActions?: boolean
}

export function ExperimentList({
  experiments,
  showActions = true,
}: ExperimentListProps) {
  const [loadingActions, setLoadingActions] = useState<string | null>(null)

  const updateExperimentStatus = useMutation(
    api.experiments.updateExperimentStatus
  )

  const handleStatusChange = async (
    experimentId: Id<'experiments'>,
    newStatus: 'active' | 'paused' | 'completed' | 'cancelled'
  ) => {
    setLoadingActions(experimentId)
    try {
      await updateExperimentStatus({
        experimentId,
        status: newStatus,
        updatedBy: 'current-user' as any, // This should come from auth context
      })
    } catch (error) {
      console.error('Failed to update experiment status:', error)
    } finally {
      setLoadingActions(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Play className="h-4 w-4 text-green-600" />
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-600" />
      case 'completed':
      case 'cancelled':
        return <Square className="h-4 w-4 text-gray-600" />
      default:
        return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  const getPerformanceIndicator = (experiment: any) => {
    // This would calculate based on experiment results
    // For now, returning mock data
    const mockLift = Math.random() * 20 - 10 // -10% to +10%
    const isPositive = mockLift > 0

    return (
      <div className="flex items-center space-x-1">
        {isPositive ? (
          <TrendingUp className="h-3 w-3 text-green-600" />
        ) : (
          <TrendingDown className="h-3 w-3 text-red-600" />
        )}
        <span
          className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}
        >
          {mockLift > 0 ? '+' : ''}
          {mockLift.toFixed(1)}%
        </span>
      </div>
    )
  }

  const calculateProgress = (experiment: any) => {
    if (experiment.status === 'completed') return 100
    if (experiment.status === 'cancelled') return 0

    // Calculate based on time elapsed vs duration
    const now = Date.now()
    const startTime = experiment.schedule.startDate
    const endTime =
      experiment.schedule.endDate || startTime + 30 * 24 * 60 * 60 * 1000 // 30 days default

    const elapsed = now - startTime
    const total = endTime - startTime

    return Math.min(100, Math.max(0, (elapsed / total) * 100))
  }

  if (experiments.length === 0) {
    return (
      <div className="py-8 text-center">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No experiments
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating your first A/B test.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Experiment</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Performance</TableHead>
            <TableHead>Created</TableHead>
            {showActions && (
              <TableHead className="text-right">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {experiments.map(experiment => (
            <TableRow key={experiment._id}>
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium">{experiment.name}</div>
                  <div className="line-clamp-1 text-sm text-muted-foreground">
                    {experiment.description}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {experiment.variants.length} variants
                  </div>
                </div>
              </TableCell>

              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {experiment.experimentType.replace('_', ' ')}
                </Badge>
              </TableCell>

              <TableCell>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(experiment.status)}
                  <ExperimentStatusBadge status={experiment.status} />
                </div>
              </TableCell>

              <TableCell>
                <div className="space-y-1">
                  <Progress
                    value={calculateProgress(experiment)}
                    className="h-2 w-16"
                  />
                  <div className="text-xs text-muted-foreground">
                    {calculateProgress(experiment).toFixed(0)}%
                  </div>
                </div>
              </TableCell>

              <TableCell>
                {experiment.status === 'active' ? (
                  getPerformanceIndicator(experiment)
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>

              <TableCell className="text-sm text-muted-foreground">
                {formatDistanceToNow(experiment.createdAt, { addSuffix: true })}
              </TableCell>

              {showActions && (
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={loadingActions === experiment._id}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        View Results
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        Configure
                      </DropdownMenuItem>

                      {experiment.status === 'draft' && (
                        <DropdownMenuItem
                          onClick={() =>
                            handleStatusChange(experiment._id, 'active')
                          }
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Start Experiment
                        </DropdownMenuItem>
                      )}

                      {experiment.status === 'active' && (
                        <>
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusChange(experiment._id, 'paused')
                            }
                          >
                            <Pause className="mr-2 h-4 w-4" />
                            Pause
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusChange(experiment._id, 'completed')
                            }
                          >
                            <Square className="mr-2 h-4 w-4" />
                            Stop & Complete
                          </DropdownMenuItem>
                        </>
                      )}

                      {experiment.status === 'paused' && (
                        <DropdownMenuItem
                          onClick={() =>
                            handleStatusChange(experiment._id, 'active')
                          }
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Resume
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
