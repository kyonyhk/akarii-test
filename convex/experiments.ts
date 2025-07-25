import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { Id } from './_generated/dataModel'

// Create a new experiment
export const createExperiment = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    experimentType: v.union(
      v.literal('prompt_variant'),
      v.literal('feature_flag'),
      v.literal('algorithm')
    ),
    variants: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        description: v.string(),
        config: v.any(),
        trafficAllocation: v.number(),
        isControl: v.boolean(),
      })
    ),
    targetingRules: v.object({
      userSegments: v.array(v.string()),
      teamIds: v.optional(v.array(v.id('teams'))),
      excludeUserIds: v.optional(v.array(v.string())),
      rolloutPercentage: v.number(),
      geoRestrictions: v.optional(v.array(v.string())),
    }),
    metrics: v.object({
      primaryMetric: v.string(),
      secondaryMetrics: v.array(v.string()),
      minimumSampleSize: v.number(),
      significanceThreshold: v.number(),
      minimumEffect: v.number(),
    }),
    schedule: v.object({
      startDate: v.number(),
      endDate: v.optional(v.number()),
      duration: v.optional(v.number()),
      rampUpPeriod: v.optional(v.number()),
    }),
    createdBy: v.id('users'),
  },
  handler: async (ctx, args) => {
    // Validate that traffic allocations sum to 100%
    const totalAllocation = args.variants.reduce(
      (sum, variant) => sum + variant.trafficAllocation,
      0
    )
    if (Math.abs(totalAllocation - 100) > 0.01) {
      throw new Error(
        `Traffic allocations must sum to 100%, got ${totalAllocation}%`
      )
    }

    // Validate that exactly one variant is marked as control
    const controlVariants = args.variants.filter(v => v.isControl)
    if (controlVariants.length !== 1) {
      throw new Error('Exactly one variant must be marked as control')
    }

    // Validate variant IDs are unique
    const variantIds = args.variants.map(v => v.id)
    if (new Set(variantIds).size !== variantIds.length) {
      throw new Error('Variant IDs must be unique')
    }

    const now = Date.now()
    const experimentId = await ctx.db.insert('experiments', {
      name: args.name,
      description: args.description,
      experimentType: args.experimentType,
      status: 'draft',
      variants: args.variants,
      targetingRules: args.targetingRules,
      metrics: args.metrics,
      schedule: args.schedule,
      createdBy: args.createdBy,
      lastModifiedBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    })

    return experimentId
  },
})

// Get experiment by ID
export const getExperiment = query({
  args: { experimentId: v.id('experiments') },
  handler: async (ctx, args) => {
    const experiment = await ctx.db.get(args.experimentId)
    if (!experiment) {
      throw new Error('Experiment not found')
    }
    return experiment
  },
})

// List all experiments with optional filtering
export const listExperiments = query({
  args: {
    status: v.optional(
      v.union(
        v.literal('draft'),
        v.literal('active'),
        v.literal('paused'),
        v.literal('completed'),
        v.literal('cancelled')
      )
    ),
    experimentType: v.optional(
      v.union(
        v.literal('prompt_variant'),
        v.literal('feature_flag'),
        v.literal('algorithm')
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query('experiments')

    if (args.status) {
      query = query.filter(q => q.eq(q.field('status'), args.status))
    }

    if (args.experimentType) {
      query = query.filter(q =>
        q.eq(q.field('experimentType'), args.experimentType)
      )
    }

    query = query.order('desc')

    if (args.limit) {
      query = query.take(args.limit)
    }

    return await query.collect()
  },
})

// Update experiment status
export const updateExperimentStatus = mutation({
  args: {
    experimentId: v.id('experiments'),
    status: v.union(
      v.literal('draft'),
      v.literal('active'),
      v.literal('paused'),
      v.literal('completed'),
      v.literal('cancelled')
    ),
    updatedBy: v.id('users'),
  },
  handler: async (ctx, args) => {
    const experiment = await ctx.db.get(args.experimentId)
    if (!experiment) {
      throw new Error('Experiment not found')
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      draft: ['active', 'cancelled'],
      active: ['paused', 'completed', 'cancelled'],
      paused: ['active', 'completed', 'cancelled'],
      completed: [],
      cancelled: [],
    }

    if (!validTransitions[experiment.status].includes(args.status)) {
      throw new Error(
        `Invalid status transition from ${experiment.status} to ${args.status}`
      )
    }

    await ctx.db.patch(args.experimentId, {
      status: args.status,
      lastModifiedBy: args.updatedBy,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

// Get user's experiment assignment
export const getUserExperimentAssignment = query({
  args: {
    userId: v.string(),
    experimentId: v.id('experiments'),
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db
      .query('userExperimentAssignments')
      .withIndex('by_user_experiment', q =>
        q.eq('userId', args.userId).eq('experimentId', args.experimentId)
      )
      .filter(q => q.eq(q.field('isActive'), true))
      .first()

    return assignment
  },
})

// Assign user to experiment variant
export const assignUserToExperiment = mutation({
  args: {
    userId: v.string(),
    experimentId: v.id('experiments'),
    variantId: v.string(),
    assignmentMethod: v.union(
      v.literal('random'),
      v.literal('manual'),
      v.literal('override'),
      v.literal('targeting')
    ),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const experiment = await ctx.db.get(args.experimentId)
    if (!experiment) {
      throw new Error('Experiment not found')
    }

    // Validate variant exists
    const variant = experiment.variants.find(v => v.id === args.variantId)
    if (!variant) {
      throw new Error(`Variant ${args.variantId} not found in experiment`)
    }

    // Check if user already has an active assignment
    const existingAssignment = await ctx.db
      .query('userExperimentAssignments')
      .withIndex('by_user_experiment', q =>
        q.eq('userId', args.userId).eq('experimentId', args.experimentId)
      )
      .filter(q => q.eq(q.field('isActive'), true))
      .first()

    if (existingAssignment) {
      // Update existing assignment
      await ctx.db.patch(existingAssignment._id, {
        variantId: args.variantId,
        assignmentMethod: args.assignmentMethod,
        lastInteraction: Date.now(),
        metadata: args.metadata,
      })
      return existingAssignment._id
    } else {
      // Create new assignment
      const assignmentId = await ctx.db.insert('userExperimentAssignments', {
        userId: args.userId,
        experimentId: args.experimentId,
        variantId: args.variantId,
        assignmentMethod: args.assignmentMethod,
        assignedAt: Date.now(),
        isActive: true,
        metadata: args.metadata,
      })

      // Log assignment event
      await ctx.db.insert('experimentEvents', {
        experimentId: args.experimentId,
        variantId: args.variantId,
        userId: args.userId,
        eventType: 'assignment',
        eventName: 'user_assigned',
        properties: {
          assignmentMethod: args.assignmentMethod,
          metadata: args.metadata,
        },
        timestamp: Date.now(),
      })

      return assignmentId
    }
  },
})

// Log experiment event
export const logExperimentEvent = mutation({
  args: {
    experimentId: v.id('experiments'),
    variantId: v.string(),
    userId: v.string(),
    eventType: v.union(
      v.literal('assignment'),
      v.literal('exposure'),
      v.literal('interaction'),
      v.literal('conversion'),
      v.literal('error')
    ),
    eventName: v.string(),
    properties: v.any(),
    messageId: v.optional(v.id('messages')),
    analysisId: v.optional(v.id('analyses')),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert('experimentEvents', {
      experimentId: args.experimentId,
      variantId: args.variantId,
      userId: args.userId,
      eventType: args.eventType,
      eventName: args.eventName,
      properties: args.properties,
      messageId: args.messageId,
      analysisId: args.analysisId,
      timestamp: Date.now(),
      sessionId: args.sessionId,
    })

    // Update user assignment last interaction time
    const assignment = await ctx.db
      .query('userExperimentAssignments')
      .withIndex('by_user_experiment', q =>
        q.eq('userId', args.userId).eq('experimentId', args.experimentId)
      )
      .filter(q => q.eq(q.field('isActive'), true))
      .first()

    if (assignment) {
      await ctx.db.patch(assignment._id, {
        lastInteraction: Date.now(),
        firstInteraction: assignment.firstInteraction ?? Date.now(),
      })
    }

    return eventId
  },
})

// Get experiment events for analysis
export const getExperimentEvents = query({
  args: {
    experimentId: v.id('experiments'),
    variantId: v.optional(v.string()),
    eventType: v.optional(
      v.union(
        v.literal('assignment'),
        v.literal('exposure'),
        v.literal('interaction'),
        v.literal('conversion'),
        v.literal('error')
      )
    ),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('experimentEvents')
      .withIndex('by_experiment', q => q.eq('experimentId', args.experimentId))

    if (args.variantId) {
      query = query.filter(q => q.eq(q.field('variantId'), args.variantId))
    }

    if (args.eventType) {
      query = query.filter(q => q.eq(q.field('eventType'), args.eventType))
    }

    if (args.startTime) {
      query = query.filter(q => q.gte(q.field('timestamp'), args.startTime))
    }

    if (args.endTime) {
      query = query.filter(q => q.lte(q.field('timestamp'), args.endTime))
    }

    query = query.order('desc')

    if (args.limit) {
      query = query.take(args.limit)
    }

    return await query.collect()
  },
})

// Get active experiments for a user
export const getActiveExperimentsForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Get all active assignments for user
    const assignments = await ctx.db
      .query('userExperimentAssignments')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .filter(q => q.eq(q.field('isActive'), true))
      .collect()

    // Get experiment details for each assignment
    const experiments = await Promise.all(
      assignments.map(async assignment => {
        const experiment = await ctx.db.get(assignment.experimentId)
        if (!experiment || experiment.status !== 'active') {
          return null
        }

        const variant = experiment.variants.find(
          v => v.id === assignment.variantId
        )

        return {
          experiment,
          assignment,
          variant,
        }
      })
    )

    // Filter out null results (inactive experiments)
    return experiments.filter(Boolean)
  },
})
