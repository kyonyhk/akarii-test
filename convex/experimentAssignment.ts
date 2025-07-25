import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { Id } from './_generated/dataModel'

// Hash function for consistent user assignment
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

// Generate deterministic bucket assignment for user
function getUserBucket(userId: string, experimentId: string): number {
  const combined = `${userId}:${experimentId}`
  const hash = hashString(combined)
  return hash % 100 // Return 0-99
}

// Check if user matches targeting rules
async function checkUserTargeting(
  ctx: any,
  userId: string,
  targetingRules: any
): Promise<boolean> {
  // Check user exclusion list
  if (targetingRules.excludeUserIds?.includes(userId)) {
    return false
  }

  // Check team inclusion (if specified)
  if (targetingRules.teamIds && targetingRules.teamIds.length > 0) {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .first()

    if (!user) return false

    const userTeams = await ctx.db
      .query('teams')
      .filter(q => q.field('members').includes(user._id))
      .collect()

    const userTeamIds = userTeams.map(team => team._id)
    const hasMatchingTeam = targetingRules.teamIds.some((teamId: Id<'teams'>) =>
      userTeamIds.includes(teamId)
    )

    if (!hasMatchingTeam) return false
  }

  // Check user segments (simplified - can be extended with more complex logic)
  if (targetingRules.userSegments.length > 0) {
    const userSegment = await determineUserSegment(ctx, userId)
    if (!targetingRules.userSegments.includes(userSegment)) {
      return false
    }
  }

  return true
}

// Determine user segment based on usage patterns
async function determineUserSegment(ctx: any, userId: string): Promise<string> {
  const now = Date.now()
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

  // Get user's message count in last 30 days
  const recentMessages = await ctx.db
    .query('messages')
    .withIndex('by_user', q => q.eq('userId', userId))
    .filter(q => q.gte(q.field('timestamp'), thirtyDaysAgo))
    .collect()

  // Get user registration info
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
    .first()

  if (!user) return 'unknown'

  const daysSinceJoined = (now - user.joinedAt) / (24 * 60 * 60 * 1000)

  // Segment logic
  if (daysSinceJoined <= 7) {
    return 'new_user'
  } else if (recentMessages.length >= 50) {
    return 'power_user'
  } else if (recentMessages.length >= 10) {
    return 'active_user'
  } else if (recentMessages.length > 0) {
    return 'casual_user'
  } else {
    return 'inactive_user'
  }
}

// Assign user to experiment variant based on targeting rules and traffic allocation
export const assignUserToVariant = mutation({
  args: {
    userId: v.string(),
    experimentId: v.id('experiments'),
    forceVariant: v.optional(v.string()), // For testing/override purposes
  },
  handler: async (ctx, args) => {
    // Get experiment details
    const experiment = await ctx.db.get(args.experimentId)
    if (!experiment) {
      throw new Error('Experiment not found')
    }

    // Only assign to active experiments
    if (experiment.status !== 'active') {
      return null
    }

    // Check if experiment is within its schedule
    const now = Date.now()
    if (now < experiment.schedule.startDate) {
      return null // Experiment hasn't started yet
    }

    if (experiment.schedule.endDate && now > experiment.schedule.endDate) {
      return null // Experiment has ended
    }

    // Check if user already has an assignment
    const existingAssignment = await ctx.db
      .query('userExperimentAssignments')
      .withIndex('by_user_experiment', q =>
        q.eq('userId', args.userId).eq('experimentId', args.experimentId)
      )
      .filter(q => q.eq(q.field('isActive'), true))
      .first()

    if (existingAssignment) {
      return existingAssignment
    }

    // Check if user matches targeting rules
    const matchesTargeting = await checkUserTargeting(
      ctx,
      args.userId,
      experiment.targetingRules
    )

    if (!matchesTargeting) {
      return null
    }

    // Check rollout percentage
    const userBucket = getUserBucket(args.userId, args.experimentId)
    if (userBucket >= experiment.targetingRules.rolloutPercentage) {
      return null
    }

    // Determine variant assignment
    let selectedVariant: string

    if (args.forceVariant) {
      // Override for testing
      const variant = experiment.variants.find(v => v.id === args.forceVariant)
      if (!variant) {
        throw new Error(`Variant ${args.forceVariant} not found`)
      }
      selectedVariant = args.forceVariant
    } else {
      // Use traffic allocation to determine variant
      const bucket = userBucket % 100
      let cumulativeAllocation = 0

      selectedVariant = experiment.variants[0].id // Default to first variant

      for (const variant of experiment.variants) {
        cumulativeAllocation += variant.trafficAllocation
        if (bucket < cumulativeAllocation) {
          selectedVariant = variant.id
          break
        }
      }
    }

    // Create assignment
    const assignmentId = await ctx.db.insert('userExperimentAssignments', {
      userId: args.userId,
      experimentId: args.experimentId,
      variantId: selectedVariant,
      assignmentMethod: args.forceVariant ? 'override' : 'random',
      assignedAt: now,
      isActive: true,
      metadata: {
        bucket: userBucket,
        segment: await determineUserSegment(ctx, args.userId),
      },
    })

    // Log assignment event
    await ctx.db.insert('experimentEvents', {
      experimentId: args.experimentId,
      variantId: selectedVariant,
      userId: args.userId,
      eventType: 'assignment',
      eventName: 'user_assigned',
      properties: {
        bucket: userBucket,
        assignmentMethod: args.forceVariant ? 'override' : 'random',
        rolloutPercentage: experiment.targetingRules.rolloutPercentage,
      },
      timestamp: now,
    })

    return await ctx.db.get(assignmentId)
  },
})

// Get variant for user (with automatic assignment if needed)
export const getVariantForUser = mutation({
  args: {
    userId: v.string(),
    experimentId: v.id('experiments'),
  },
  handler: async (ctx, args) => {
    // Try to get existing assignment
    let assignment = await ctx.db
      .query('userExperimentAssignments')
      .withIndex('by_user_experiment', q =>
        q.eq('userId', args.userId).eq('experimentId', args.experimentId)
      )
      .filter(q => q.eq(q.field('isActive'), true))
      .first()

    // If no assignment exists, try to create one
    if (!assignment) {
      assignment = await assignUserToVariant(ctx, {
        userId: args.userId,
        experimentId: args.experimentId,
      })
    }

    if (!assignment) {
      return null // User not eligible for experiment
    }

    // Get experiment and variant details
    const experiment = await ctx.db.get(args.experimentId)
    if (!experiment) {
      return null
    }

    const variant = experiment.variants.find(v => v.id === assignment.variantId)
    if (!variant) {
      return null
    }

    // Log exposure event
    await ctx.db.insert('experimentEvents', {
      experimentId: args.experimentId,
      variantId: assignment.variantId,
      userId: args.userId,
      eventType: 'exposure',
      eventName: 'variant_exposed',
      properties: {
        variantConfig: variant.config,
      },
      timestamp: Date.now(),
    })

    return {
      assignment,
      variant,
      experiment: {
        id: experiment._id,
        name: experiment.name,
        type: experiment.experimentType,
      },
    }
  },
})

// Bulk assign users to experiments (for backfill or migration)
export const bulkAssignUsers = mutation({
  args: {
    experimentId: v.id('experiments'),
    userIds: v.array(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const experiment = await ctx.db.get(args.experimentId)
    if (!experiment) {
      throw new Error('Experiment not found')
    }

    const results = []

    for (const userId of args.userIds) {
      try {
        const matchesTargeting = await checkUserTargeting(
          ctx,
          userId,
          experiment.targetingRules
        )

        if (!matchesTargeting) {
          results.push({
            userId,
            status: 'excluded',
            reason: 'Does not match targeting rules',
          })
          continue
        }

        const userBucket = getUserBucket(userId, args.experimentId)
        if (userBucket >= experiment.targetingRules.rolloutPercentage) {
          results.push({
            userId,
            status: 'excluded',
            reason: 'Outside rollout percentage',
          })
          continue
        }

        // Check if user already assigned
        const existingAssignment = await ctx.db
          .query('userExperimentAssignments')
          .withIndex('by_user_experiment', q =>
            q.eq('userId', userId).eq('experimentId', args.experimentId)
          )
          .filter(q => q.eq(q.field('isActive'), true))
          .first()

        if (existingAssignment) {
          results.push({
            userId,
            status: 'already_assigned',
            variantId: existingAssignment.variantId,
          })
          continue
        }

        // Determine variant
        const bucket = userBucket % 100
        let cumulativeAllocation = 0
        let selectedVariant = experiment.variants[0].id

        for (const variant of experiment.variants) {
          cumulativeAllocation += variant.trafficAllocation
          if (bucket < cumulativeAllocation) {
            selectedVariant = variant.id
            break
          }
        }

        if (!args.dryRun) {
          // Create assignment
          await ctx.db.insert('userExperimentAssignments', {
            userId,
            experimentId: args.experimentId,
            variantId: selectedVariant,
            assignmentMethod: 'targeting',
            assignedAt: Date.now(),
            isActive: true,
            metadata: {
              bucket: userBucket,
              bulkAssignment: true,
            },
          })

          // Log assignment event
          await ctx.db.insert('experimentEvents', {
            experimentId: args.experimentId,
            variantId: selectedVariant,
            userId,
            eventType: 'assignment',
            eventName: 'bulk_assigned',
            properties: {
              bucket: userBucket,
              bulkAssignment: true,
            },
            timestamp: Date.now(),
          })
        }

        results.push({
          userId,
          status: 'assigned',
          variantId: selectedVariant,
          bucket: userBucket,
        })
      } catch (error) {
        results.push({
          userId,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return {
      experimentId: args.experimentId,
      dryRun: args.dryRun ?? false,
      totalUsers: args.userIds.length,
      results,
      summary: {
        assigned: results.filter(r => r.status === 'assigned').length,
        excluded: results.filter(r => r.status === 'excluded').length,
        alreadyAssigned: results.filter(r => r.status === 'already_assigned')
          .length,
        errors: results.filter(r => r.status === 'error').length,
      },
    }
  },
})

// Get experiment assignment statistics
export const getExperimentStats = query({
  args: { experimentId: v.id('experiments') },
  handler: async (ctx, args) => {
    const experiment = await ctx.db.get(args.experimentId)
    if (!experiment) {
      throw new Error('Experiment not found')
    }

    // Get all assignments for this experiment
    const assignments = await ctx.db
      .query('userExperimentAssignments')
      .withIndex('by_experiment', q => q.eq('experimentId', args.experimentId))
      .filter(q => q.eq(q.field('isActive'), true))
      .collect()

    // Get event counts by variant
    const events = await ctx.db
      .query('experimentEvents')
      .withIndex('by_experiment', q => q.eq('experimentId', args.experimentId))
      .collect()

    const variantStats = experiment.variants.map(variant => {
      const variantAssignments = assignments.filter(
        a => a.variantId === variant.id
      )
      const variantEvents = events.filter(e => e.variantId === variant.id)

      return {
        variantId: variant.id,
        variantName: variant.name,
        isControl: variant.isControl,
        trafficAllocation: variant.trafficAllocation,
        assignedUsers: variantAssignments.length,
        exposureEvents: variantEvents.filter(e => e.eventType === 'exposure')
          .length,
        conversionEvents: variantEvents.filter(
          e => e.eventType === 'conversion'
        ).length,
        interactionEvents: variantEvents.filter(
          e => e.eventType === 'interaction'
        ).length,
      }
    })

    return {
      experiment: {
        id: experiment._id,
        name: experiment.name,
        status: experiment.status,
        type: experiment.experimentType,
      },
      totalAssignments: assignments.length,
      totalEvents: events.length,
      variantStats,
      assignmentsByMethod: assignments.reduce(
        (acc, assignment) => {
          acc[assignment.assignmentMethod] =
            (acc[assignment.assignmentMethod] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      ),
    }
  },
})
