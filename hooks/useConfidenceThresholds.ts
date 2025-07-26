import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useUser } from '@clerk/nextjs'

export interface ConfidenceThresholds {
  displayThreshold: number
  hideThreshold: number
  warningThreshold: number
}

export type UITreatment = 'hide' | 'grey_out' | 'warning' | 'normal'

export function useConfidenceThresholds() {
  const { user } = useUser()

  // TODO: Add team context when available
  const teamId = undefined
  const userId = user?.id // Clerk user ID string

  const thresholds = useQuery(api.confidenceThresholds.getEffectiveThresholds, {
    userId,
    teamId,
  })

  return (
    thresholds || {
      displayThreshold: 40,
      hideThreshold: 20,
      warningThreshold: 60,
    }
  )
}

export function getConfidenceTreatment(
  confidenceLevel: number,
  thresholds: ConfidenceThresholds
): UITreatment {
  if (confidenceLevel < thresholds.hideThreshold) {
    return 'hide'
  }
  if (confidenceLevel < thresholds.displayThreshold) {
    return 'grey_out'
  }
  if (confidenceLevel < thresholds.warningThreshold) {
    return 'warning'
  }
  return 'normal'
}

export function getConfidenceColor(
  confidenceLevel: number,
  thresholds: ConfidenceThresholds
): {
  textColor: string
  bgColor?: string
  description: string
} {
  const treatment = getConfidenceTreatment(confidenceLevel, thresholds)

  switch (treatment) {
    case 'hide':
      return {
        textColor: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-950/20',
        description: 'Very low confidence - consider hiding',
      }
    case 'grey_out':
      return {
        textColor: 'text-red-500 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-950/20',
        description: 'Low confidence - reduced visibility',
      }
    case 'warning':
      return {
        textColor: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
        description: 'Medium confidence - review recommended',
      }
    case 'normal':
      return {
        textColor: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-950/20',
        description: 'High confidence',
      }
  }
}

export function shouldShowAnalysis(
  confidenceLevel: number,
  thresholds: ConfidenceThresholds
): boolean {
  return getConfidenceTreatment(confidenceLevel, thresholds) !== 'hide'
}
