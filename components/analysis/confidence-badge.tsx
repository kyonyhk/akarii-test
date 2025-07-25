'use client'

import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  useConfidenceThresholds,
  getConfidenceTreatment,
  getConfidenceColor,
  type UITreatment,
} from '@/hooks/useConfidenceThresholds'

interface ConfidenceBadgeProps {
  confidenceLevel: number
  variant?: 'default' | 'compact' | 'detailed'
  showTooltip?: boolean
  className?: string
}

export function ConfidenceBadge({
  confidenceLevel,
  variant = 'default',
  showTooltip = true,
  className,
}: ConfidenceBadgeProps) {
  const thresholds = useConfidenceThresholds()
  const treatment = getConfidenceTreatment(confidenceLevel, thresholds)
  const colors = getConfidenceColor(confidenceLevel, thresholds)

  const getIcon = (treatment: UITreatment) => {
    switch (treatment) {
      case 'hide':
        return <XCircle className="h-3 w-3" />
      case 'grey_out':
        return <Info className="h-3 w-3" />
      case 'warning':
        return <AlertTriangle className="h-3 w-3" />
      case 'normal':
        return <CheckCircle className="h-3 w-3" />
    }
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return 'px-1.5 py-0.5 text-xs'
      case 'detailed':
        return 'px-3 py-1.5 text-sm'
      default:
        return 'px-2 py-1 text-xs'
    }
  }

  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        colors.textColor,
        colors.bgColor,
        getVariantStyles(),
        className
      )}
    >
      {variant !== 'compact' && getIcon(treatment)}
      {confidenceLevel}%{variant === 'detailed' && ' confidence'}
    </span>
  )

  if (!showTooltip) {
    return badge
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{colors.description}</p>
            <div className="space-y-0.5 text-xs text-muted-foreground">
              <p>Current thresholds:</p>
              <ul className="ml-2 space-y-0.5">
                <li>• Hide: &lt;{thresholds.hideThreshold}%</li>
                <li>• Grey out: &lt;{thresholds.displayThreshold}%</li>
                <li>• Warning: &lt;{thresholds.warningThreshold}%</li>
              </ul>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Helper component for confidence level indicators in different contexts
export function ConfidenceLevelIndicator({
  confidenceLevel,
  className,
}: {
  confidenceLevel: number
  className?: string
}) {
  const thresholds = useConfidenceThresholds()
  const treatment = getConfidenceTreatment(confidenceLevel, thresholds)

  const getIndicatorColor = () => {
    switch (treatment) {
      case 'hide':
        return 'bg-red-500'
      case 'grey_out':
        return 'bg-red-400'
      case 'warning':
        return 'bg-yellow-500'
      case 'normal':
        return 'bg-green-500'
    }
  }

  return (
    <div
      className={cn('h-2 w-2 rounded-full', getIndicatorColor(), className)}
      title={`${confidenceLevel}% confidence`}
    />
  )
}
