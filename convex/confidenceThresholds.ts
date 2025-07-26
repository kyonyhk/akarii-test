import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { api } from './_generated/api'

// Default confidence thresholds
export const DEFAULT_THRESHOLDS = {
  DISPLAY_THRESHOLD: 40, // Show normally above this level
  HIDE_THRESHOLD: 20, // Hide completely below this level
  WARNING_THRESHOLD: 60, // Show warning indicator below this level
} as const

export type ThresholdType =
  | 'display_threshold'
  | 'hide_threshold'
  | 'warning_threshold'
export type UITreatment = 'hide' | 'grey_out' | 'warning' | 'normal'

export interface ConfidenceThreshold {
  teamId?: string
  userId?: string
  thresholdType: ThresholdType
  confidenceValue: number
  uiTreatment: UITreatment
  isActive: boolean
}

// Get effective confidence thresholds for a user/team combination
export const getEffectiveThresholds = query({
  args: {
    userId: v.optional(v.string()), // Accept Clerk user ID as string
    teamId: v.optional(v.id('teams')),
  },
  handler: async (ctx, args) => {
    // Convert Clerk user ID to Convex user ID if provided
    let convexUserId: string | undefined
    if (args.userId) {
      const user = await ctx.db
        .query('users')
        .withIndex('by_clerk_id', q => q.eq('clerkId', args.userId!))
        .first()
      convexUserId = user?._id
    }
    const thresholds = new Map<ThresholdType, number>()

    // Start with defaults
    thresholds.set('display_threshold', DEFAULT_THRESHOLDS.DISPLAY_THRESHOLD)
    thresholds.set('hide_threshold', DEFAULT_THRESHOLDS.HIDE_THRESHOLD)
    thresholds.set('warning_threshold', DEFAULT_THRESHOLDS.WARNING_THRESHOLD)

    // Get global thresholds (teamId and userId both null)
    const globalThresholds = await ctx.db
      .query('confidenceThresholds')
      .filter(q =>
        q.and(
          q.eq(q.field('teamId'), undefined),
          q.eq(q.field('userId'), undefined),
          q.eq(q.field('isActive'), true)
        )
      )
      .collect()

    // Apply global overrides
    for (const threshold of globalThresholds) {
      thresholds.set(threshold.thresholdType, threshold.confidenceValue)
    }

    // Get team-level thresholds (if teamId provided)
    if (args.teamId) {
      const teamThresholds = await ctx.db
        .query('confidenceThresholds')
        .withIndex('by_team', q => q.eq('teamId', args.teamId))
        .filter(q =>
          q.and(
            q.eq(q.field('userId'), undefined),
            q.eq(q.field('isActive'), true)
          )
        )
        .collect()

      // Apply team overrides
      for (const threshold of teamThresholds) {
        thresholds.set(threshold.thresholdType, threshold.confidenceValue)
      }
    }

    // Get user-level thresholds (if userId provided)
    if (convexUserId) {
      const userThresholds = await ctx.db
        .query('confidenceThresholds')
        .withIndex('by_user', q => q.eq('userId', convexUserId))
        .filter(q => q.eq(q.field('isActive'), true))
        .collect()

      // Apply user overrides (highest priority)
      for (const threshold of userThresholds) {
        thresholds.set(threshold.thresholdType, threshold.confidenceValue)
      }
    }

    return {
      displayThreshold: thresholds.get('display_threshold')!,
      hideThreshold: thresholds.get('hide_threshold')!,
      warningThreshold: thresholds.get('warning_threshold')!,
    }
  },
})

// Set confidence threshold for team or user
export const setConfidenceThreshold = mutation({
  args: {
    userId: v.optional(v.string()), // Accept Clerk user ID as string
    teamId: v.optional(v.id('teams')),
    thresholdType: v.union(
      v.literal('display_threshold'),
      v.literal('hide_threshold'),
      v.literal('warning_threshold')
    ),
    confidenceValue: v.number(),
    uiTreatment: v.union(
      v.literal('hide'),
      v.literal('grey_out'),
      v.literal('warning'),
      v.literal('normal')
    ),
    createdBy: v.id('users'),
  },
  handler: async (ctx, args) => {
    // Convert Clerk user ID to Convex user ID if provided
    let convexUserId: string | undefined
    if (args.userId) {
      const user = await ctx.db
        .query('users')
        .withIndex('by_clerk_id', q => q.eq('clerkId', args.userId!))
        .first()
      convexUserId = user?._id
    }

    // Validate confidence value
    if (args.confidenceValue < 0 || args.confidenceValue > 100) {
      throw new Error('Confidence value must be between 0 and 100')
    }

    // Find existing threshold
    const existing = await ctx.db
      .query('confidenceThresholds')
      .withIndex('by_team_user')
      .filter(q =>
        q.and(
          q.eq(q.field('teamId'), args.teamId),
          q.eq(q.field('userId'), convexUserId),
          q.eq(q.field('thresholdType'), args.thresholdType),
          q.eq(q.field('isActive'), true)
        )
      )
      .first()

    if (existing) {
      // Update existing threshold
      await ctx.db.patch(existing._id, {
        confidenceValue: args.confidenceValue,
        uiTreatment: args.uiTreatment,
        updatedAt: Date.now(),
      })
      return existing._id
    } else {
      // Create new threshold
      return await ctx.db.insert('confidenceThresholds', {
        teamId: args.teamId,
        userId: convexUserId,
        thresholdType: args.thresholdType,
        confidenceValue: args.confidenceValue,
        uiTreatment: args.uiTreatment,
        isActive: true,
        createdBy: args.createdBy,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }
  },
})

// Get all thresholds for a team/user
export const getConfidenceThresholds = query({
  args: {
    userId: v.optional(v.string()), // Accept Clerk user ID as string
    teamId: v.optional(v.id('teams')),
  },
  handler: async (ctx, args) => {
    // Convert Clerk user ID to Convex user ID if provided
    let convexUserId: string | undefined
    if (args.userId) {
      const user = await ctx.db
        .query('users')
        .withIndex('by_clerk_id', q => q.eq('clerkId', args.userId!))
        .first()
      convexUserId = user?._id
    }

    return await ctx.db
      .query('confidenceThresholds')
      .withIndex('by_team_user')
      .filter(q =>
        q.and(
          q.eq(q.field('teamId'), args.teamId),
          q.eq(q.field('userId'), convexUserId),
          q.eq(q.field('isActive'), true)
        )
      )
      .collect()
  },
})

// Remove confidence threshold
export const removeConfidenceThreshold = mutation({
  args: {
    thresholdId: v.id('confidenceThresholds'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.thresholdId, {
      isActive: false,
      updatedAt: Date.now(),
    })
  },
})

// Utility function to determine UI treatment for a confidence level
export function getConfidenceTreatment(
  confidenceLevel: number,
  thresholds: {
    displayThreshold: number
    hideThreshold: number
    warningThreshold: number
  }
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

// Enhanced validation with threshold checking
export function validateConfidenceLevelWithThresholds(
  level: number,
  thresholds: {
    displayThreshold: number
    hideThreshold: number
    warningThreshold: number
  }
): {
  isValid: boolean
  normalizedLevel: number
  treatment: UITreatment
  shouldDisplay: boolean
} {
  // Basic validation from existing function
  let normalizedLevel: number

  if (typeof level === 'number' && level >= 0 && level <= 100) {
    normalizedLevel = Math.round(level)
  } else if (typeof level === 'string') {
    const parsed = parseFloat(level)
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      normalizedLevel = Math.round(parsed)
    } else {
      normalizedLevel = 50 // Default fallback
    }
  } else {
    normalizedLevel = 50 // Default fallback
  }

  const treatment = getConfidenceTreatment(normalizedLevel, thresholds)
  const shouldDisplay = treatment !== 'hide'

  return {
    isValid: normalizedLevel >= 0 && normalizedLevel <= 100,
    normalizedLevel,
    treatment,
    shouldDisplay,
  }
}
