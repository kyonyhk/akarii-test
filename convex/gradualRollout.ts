import { v } from 'convex/values'
import { mutation, query, internalMutation } from './_generated/server'
import { Id } from './_generated/dataModel'

// Rollout strategy types
export type RolloutStrategy =
  | 'immediate' // Jump directly to target percentage
  | 'linear' // Increase linearly over time
  | 'exponential' // Start slow, accelerate quickly
  | 'stepped' // Increase in fixed steps

// Rollout configuration interface
interface RolloutConfig {
  strategy: RolloutStrategy
  targetPercentage: number
  duration: number // Duration in milliseconds
  stepSize?: number // For stepped rollout
  checkInterval: number // How often to check for rollout updates (in milliseconds)
  safetyThresholds: {
    maxErrorRate: number // Stop rollout if error rate exceeds this
    minConfidenceScore: number // Stop rollout if confidence drops below this
  }
}

// Create or update a gradual rollout configuration for an experiment
export const configureGradualRollout = mutation({
  args: {
    experimentId: v.id('experiments'),
    rolloutConfig: v.object({
      strategy: v.union(
        v.literal('immediate'),
        v.literal('linear'),
        v.literal('exponential'),
        v.literal('stepped')
      ),
      targetPercentage: v.number(),
      duration: v.number(),
      stepSize: v.optional(v.number()),
      checkInterval: v.number(),
      safetyThresholds: v.object({
        maxErrorRate: v.number(),
        minConfidenceScore: v.number(),
      }),
    }),
    triggeredBy: v.id('users'),
  },
  handler: async (ctx, args) => {
    const experiment = await ctx.db.get(args.experimentId)
    if (!experiment) {
      throw new Error('Experiment not found')
    }

    // Validate rollout configuration
    if (
      args.rolloutConfig.targetPercentage < 0 ||
      args.rolloutConfig.targetPercentage > 100
    ) {
      throw new Error('Target percentage must be between 0 and 100')
    }

    if (args.rolloutConfig.duration <= 0) {
      throw new Error('Duration must be positive')
    }

    if (
      args.rolloutConfig.strategy === 'stepped' &&
      !args.rolloutConfig.stepSize
    ) {
      throw new Error('Step size is required for stepped rollout strategy')
    }

    // Update experiment with rollout configuration
    await ctx.db.patch(args.experimentId, {
      targetingRules: {
        ...experiment.targetingRules,
        rolloutPercentage: experiment.targetingRules.rolloutPercentage, // Keep current
        gradualRollout: {
          ...args.rolloutConfig,
          startTime: Date.now(),
          currentPercentage: experiment.targetingRules.rolloutPercentage,
          isActive: true,
          lastUpdated: Date.now(),
        },
      },
      lastModifiedBy: args.triggeredBy,
      updatedAt: Date.now(),
    })

    // Log rollout configuration event
    await ctx.db.insert('experimentEvents', {
      experimentId: args.experimentId,
      variantId: 'rollout_system',
      userId: args.triggeredBy,
      eventType: 'interaction',
      eventName: 'rollout_configured',
      properties: {
        strategy: args.rolloutConfig.strategy,
        targetPercentage: args.rolloutConfig.targetPercentage,
        duration: args.rolloutConfig.duration,
        currentPercentage: experiment.targetingRules.rolloutPercentage,
      },
      timestamp: Date.now(),
    })

    return { success: true, message: 'Gradual rollout configured successfully' }
  },
})

// Calculate the current rollout percentage based on strategy and elapsed time
function calculateRolloutPercentage(config: any, elapsedTime: number): number {
  const { strategy, targetPercentage, duration, stepSize, currentPercentage } =
    config

  if (elapsedTime >= duration) {
    return targetPercentage
  }

  const progress = elapsedTime / duration
  const startPercentage = currentPercentage || 0

  switch (strategy) {
    case 'immediate':
      return targetPercentage

    case 'linear':
      return startPercentage + (targetPercentage - startPercentage) * progress

    case 'exponential':
      // Exponential curve: slow start, fast finish
      const exponentialProgress = Math.pow(progress, 0.3)
      return (
        startPercentage +
        (targetPercentage - startPercentage) * exponentialProgress
      )

    case 'stepped':
      if (!stepSize) return startPercentage
      const totalSteps = Math.ceil(
        (targetPercentage - startPercentage) / stepSize
      )
      const currentStep = Math.floor(progress * totalSteps)
      return Math.min(
        startPercentage + currentStep * stepSize,
        targetPercentage
      )

    default:
      return startPercentage
  }
}

// Update rollout percentages for all active experiments (called by scheduler)
export const updateGradualRollouts = internalMutation({
  args: {},
  handler: async ctx => {
    // Get all experiments with active gradual rollouts
    const experiments = await ctx.db
      .query('experiments')
      .filter(q => q.eq(q.field('status'), 'active'))
      .collect()

    const now = Date.now()
    const results = []

    for (const experiment of experiments) {
      const gradualRollout = experiment.targetingRules.gradualRollout

      if (!gradualRollout || !gradualRollout.isActive) {
        continue
      }

      const elapsedTime = now - gradualRollout.startTime
      const newPercentage = calculateRolloutPercentage(
        gradualRollout,
        elapsedTime
      )

      // Check if percentage has changed significantly (avoid unnecessary updates)
      const currentPercentage = experiment.targetingRules.rolloutPercentage
      if (Math.abs(newPercentage - currentPercentage) < 0.1) {
        continue
      }

      // Get recent experiment performance to check safety thresholds
      const recentEvents = await ctx.db
        .query('experimentEvents')
        .withIndex('by_experiment_timestamp', q =>
          q.eq('experimentId', experiment._id)
        )
        .filter(q => q.gte(q.field('timestamp'), now - 60 * 60 * 1000)) // Last hour
        .collect()

      // Calculate error rate
      const totalEvents = recentEvents.filter(
        e => e.eventType === 'exposure' || e.eventType === 'conversion'
      ).length
      const errorEvents = recentEvents.filter(
        e => e.eventType === 'error'
      ).length
      const errorRate = totalEvents > 0 ? (errorEvents / totalEvents) * 100 : 0

      // Calculate average confidence score
      const conversionEvents = recentEvents.filter(
        e =>
          e.eventType === 'conversion' && e.eventName === 'analysis_completed'
      )
      const avgConfidence =
        conversionEvents.length > 0
          ? conversionEvents.reduce(
              (sum, e) => sum + (e.properties?.confidenceLevel || 0),
              0
            ) / conversionEvents.length
          : 0

      // Check safety thresholds
      const safetyThresholds = gradualRollout.safetyThresholds
      let shouldPause = false
      let pauseReason = ''

      if (errorRate > safetyThresholds.maxErrorRate) {
        shouldPause = true
        pauseReason = `Error rate (${errorRate.toFixed(1)}%) exceeds threshold (${safetyThresholds.maxErrorRate}%)`
      } else if (
        avgConfidence > 0 &&
        avgConfidence < safetyThresholds.minConfidenceScore
      ) {
        shouldPause = true
        pauseReason = `Confidence score (${avgConfidence.toFixed(1)}%) below threshold (${safetyThresholds.minConfidenceScore}%)`
      }

      if (shouldPause) {
        // Pause the rollout due to safety threshold violation
        await ctx.db.patch(experiment._id, {
          targetingRules: {
            ...experiment.targetingRules,
            gradualRollout: {
              ...gradualRollout,
              isActive: false,
              pausedAt: now,
              pauseReason,
              lastUpdated: now,
            },
          },
          updatedAt: now,
        })

        // Log pause event
        await ctx.db.insert('experimentEvents', {
          experimentId: experiment._id,
          variantId: 'rollout_system',
          userId: 'system',
          eventType: 'error',
          eventName: 'rollout_paused',
          properties: {
            reason: pauseReason,
            errorRate,
            avgConfidence,
            currentPercentage,
            targetPercentage: gradualRollout.targetPercentage,
          },
          timestamp: now,
        })

        results.push({
          experimentId: experiment._id,
          experimentName: experiment.name,
          action: 'paused',
          reason: pauseReason,
          errorRate,
          avgConfidence,
        })

        continue
      }

      // Update rollout percentage
      const rolloutCompleted = newPercentage >= gradualRollout.targetPercentage

      await ctx.db.patch(experiment._id, {
        targetingRules: {
          ...experiment.targetingRules,
          rolloutPercentage: newPercentage,
          gradualRollout: {
            ...gradualRollout,
            currentPercentage: newPercentage,
            isActive: !rolloutCompleted,
            completedAt: rolloutCompleted ? now : undefined,
            lastUpdated: now,
          },
        },
        updatedAt: now,
      })

      // Log rollout update event
      await ctx.db.insert('experimentEvents', {
        experimentId: experiment._id,
        variantId: 'rollout_system',
        userId: 'system',
        eventType: 'interaction',
        eventName: rolloutCompleted ? 'rollout_completed' : 'rollout_updated',
        properties: {
          previousPercentage: currentPercentage,
          newPercentage,
          targetPercentage: gradualRollout.targetPercentage,
          strategy: gradualRollout.strategy,
          elapsedTime,
          totalDuration: gradualRollout.duration,
          progress: elapsedTime / gradualRollout.duration,
          errorRate,
          avgConfidence,
        },
        timestamp: now,
      })

      results.push({
        experimentId: experiment._id,
        experimentName: experiment.name,
        action: rolloutCompleted ? 'completed' : 'updated',
        previousPercentage: currentPercentage,
        newPercentage,
        targetPercentage: gradualRollout.targetPercentage,
        errorRate,
        avgConfidence,
      })
    }

    return {
      processedExperiments: results.length,
      results,
      processedAt: now,
    }
  },
})

// Manually pause or resume a gradual rollout
export const controlGradualRollout = mutation({
  args: {
    experimentId: v.id('experiments'),
    action: v.union(v.literal('pause'), v.literal('resume'), v.literal('stop')),
    reason: v.optional(v.string()),
    triggeredBy: v.id('users'),
  },
  handler: async (ctx, args) => {
    const experiment = await ctx.db.get(args.experimentId)
    if (!experiment) {
      throw new Error('Experiment not found')
    }

    const gradualRollout = experiment.targetingRules.gradualRollout
    if (!gradualRollout) {
      throw new Error('No gradual rollout configuration found')
    }

    const now = Date.now()
    let updatedRollout = { ...gradualRollout }

    switch (args.action) {
      case 'pause':
        updatedRollout.isActive = false
        updatedRollout.pausedAt = now
        updatedRollout.pauseReason = args.reason || 'Manually paused'
        break

      case 'resume':
        if (!gradualRollout.pausedAt) {
          throw new Error('Rollout is not currently paused')
        }
        // Adjust start time to account for pause duration
        const pauseDuration = now - gradualRollout.pausedAt
        updatedRollout.startTime = gradualRollout.startTime + pauseDuration
        updatedRollout.isActive = true
        updatedRollout.pausedAt = undefined
        updatedRollout.pauseReason = undefined
        break

      case 'stop':
        updatedRollout.isActive = false
        updatedRollout.completedAt = now
        updatedRollout.stoppedAt = now
        updatedRollout.stopReason = args.reason || 'Manually stopped'
        break
    }

    updatedRollout.lastUpdated = now

    await ctx.db.patch(args.experimentId, {
      targetingRules: {
        ...experiment.targetingRules,
        gradualRollout: updatedRollout,
      },
      lastModifiedBy: args.triggeredBy,
      updatedAt: now,
    })

    // Log control event
    await ctx.db.insert('experimentEvents', {
      experimentId: args.experimentId,
      variantId: 'rollout_system',
      userId: args.triggeredBy,
      eventType: 'interaction',
      eventName: `rollout_${args.action}d`,
      properties: {
        reason: args.reason,
        currentPercentage: experiment.targetingRules.rolloutPercentage,
        targetPercentage: gradualRollout.targetPercentage,
      },
      timestamp: now,
    })

    return {
      success: true,
      message: `Gradual rollout ${args.action}d successfully`,
      currentPercentage: experiment.targetingRules.rolloutPercentage,
    }
  },
})

// Get rollout status and progress for an experiment
export const getRolloutStatus = query({
  args: { experimentId: v.id('experiments') },
  handler: async (ctx, args) => {
    const experiment = await ctx.db.get(args.experimentId)
    if (!experiment) {
      throw new Error('Experiment not found')
    }

    const gradualRollout = experiment.targetingRules.gradualRollout
    if (!gradualRollout) {
      return {
        hasGradualRollout: false,
        currentPercentage: experiment.targetingRules.rolloutPercentage,
      }
    }

    const now = Date.now()
    const elapsedTime = now - gradualRollout.startTime
    const totalDuration = gradualRollout.duration
    const progress = Math.min(1, elapsedTime / totalDuration)

    // Calculate what percentage should be at this point in time
    const projectedPercentage = calculateRolloutPercentage(
      gradualRollout,
      elapsedTime
    )

    // Get recent rollout events
    const rolloutEvents = await ctx.db
      .query('experimentEvents')
      .withIndex('by_experiment', q => q.eq('experimentId', args.experimentId))
      .filter(q =>
        q.and(
          q.eq(q.field('variantId'), 'rollout_system'),
          q.gte(q.field('timestamp'), gradualRollout.startTime)
        )
      )
      .order('desc')
      .take(20)
      .collect()

    return {
      hasGradualRollout: true,
      config: {
        strategy: gradualRollout.strategy,
        targetPercentage: gradualRollout.targetPercentage,
        duration: gradualRollout.duration,
        stepSize: gradualRollout.stepSize,
      },
      status: {
        isActive: gradualRollout.isActive,
        currentPercentage: experiment.targetingRules.rolloutPercentage,
        projectedPercentage,
        progress,
        elapsedTime,
        remainingTime: Math.max(0, totalDuration - elapsedTime),
        isPaused: !!gradualRollout.pausedAt,
        pauseReason: gradualRollout.pauseReason,
        isCompleted: !!gradualRollout.completedAt,
        isStopped: !!gradualRollout.stoppedAt,
      },
      safetyThresholds: gradualRollout.safetyThresholds,
      timeline: rolloutEvents.map(event => ({
        timestamp: event.timestamp,
        eventName: event.eventName,
        properties: event.properties,
      })),
    }
  },
})

// Get all experiments with active rollouts (for monitoring dashboard)
export const getActiveRollouts = query({
  args: {},
  handler: async ctx => {
    const experiments = await ctx.db
      .query('experiments')
      .filter(q => q.eq(q.field('status'), 'active'))
      .collect()

    const activeRollouts = experiments
      .filter(
        exp =>
          exp.targetingRules.gradualRollout &&
          exp.targetingRules.gradualRollout.isActive
      )
      .map(exp => {
        const rollout = exp.targetingRules.gradualRollout!
        const now = Date.now()
        const elapsedTime = now - rollout.startTime
        const progress = Math.min(1, elapsedTime / rollout.duration)

        return {
          experimentId: exp._id,
          experimentName: exp.name,
          strategy: rollout.strategy,
          currentPercentage: exp.targetingRules.rolloutPercentage,
          targetPercentage: rollout.targetPercentage,
          progress,
          elapsedTime,
          remainingTime: Math.max(0, rollout.duration - elapsedTime),
          safetyThresholds: rollout.safetyThresholds,
          lastUpdated: rollout.lastUpdated,
        }
      })

    return {
      activeRollouts,
      totalActive: activeRollouts.length,
    }
  },
})
