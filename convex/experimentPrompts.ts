import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { Id } from './_generated/dataModel'
import {
  PromptVariant,
  PromptConfiguration,
  getSystemPrompt,
  getUserPrompt,
} from './promptConfig'
import { getVariantForUser } from './experimentAssignment'

// Extended prompt configuration for experiments
export interface ExperimentPromptConfig extends PromptConfiguration {
  experimentId: string
  variantId: string
  isControl: boolean
  metadata?: {
    version: string
    description: string
    hypothesis: string
    expectedImpact: string
  }
}

// Get experimental prompt configuration for a user
export const getExperimentPromptForUser = mutation({
  args: {
    userId: v.string(),
    messageContent: v.string(),
    defaultConfig: v.optional(v.any()), // Fallback config
  },
  handler: async (ctx, args) => {
    // Get all active prompt experiments
    const activePromptExperiments = await ctx.db
      .query('experiments')
      .filter(q =>
        q.and(
          q.eq(q.field('status'), 'active'),
          q.eq(q.field('experimentType'), 'prompt_variant')
        )
      )
      .collect()

    let finalPromptConfig: ExperimentPromptConfig | null = null
    let experimentData: any = null

    // Check each experiment for user eligibility and assignment
    for (const experiment of activePromptExperiments) {
      const variantData = await getVariantForUser(ctx, {
        userId: args.userId,
        experimentId: experiment._id,
      })

      if (variantData) {
        const { variant, assignment } = variantData

        // Parse variant config as prompt configuration
        const promptConfig = variant.config as PromptConfiguration

        finalPromptConfig = {
          ...promptConfig,
          experimentId: experiment._id,
          variantId: variant.id,
          isControl: variant.isControl,
          metadata: {
            version: variant.name,
            description: variant.description,
            hypothesis: experiment.description,
            expectedImpact: experiment.metrics.primaryMetric,
          },
        }

        experimentData = {
          experimentId: experiment._id,
          experimentName: experiment.name,
          variantId: variant.id,
          variantName: variant.name,
          isControl: variant.isControl,
          assignmentId: assignment._id,
        }

        // Use the first matching experiment (priority by creation order)
        break
      }
    }

    // Fallback to default configuration if no experiments apply
    if (!finalPromptConfig) {
      const defaultConfig = args.defaultConfig || {
        variant: 'standard',
        mode: 'production',
      }

      finalPromptConfig = {
        ...defaultConfig,
        experimentId: 'control',
        variantId: 'control',
        isControl: true,
      }
    }

    // Generate the actual prompts
    const systemPrompt = getSystemPrompt(finalPromptConfig)
    const userPrompt = getUserPrompt(args.messageContent, finalPromptConfig)

    return {
      promptConfig: finalPromptConfig,
      systemPrompt,
      userPrompt,
      experimentData,
    }
  },
})

// Create a new prompt experiment
export const createPromptExperiment = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    hypothesis: v.string(),
    promptVariants: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        description: v.string(),
        promptVariant: v.string(), // 'standard', 'question_focused', etc.
        systemPromptOverride: v.optional(v.string()),
        userPromptOverride: v.optional(v.string()),
        trafficAllocation: v.number(),
        isControl: v.boolean(),
        contextOptions: v.optional(v.any()),
      })
    ),
    targetingRules: v.object({
      userSegments: v.array(v.string()),
      teamIds: v.optional(v.array(v.id('teams'))),
      rolloutPercentage: v.number(),
    }),
    metrics: v.object({
      primaryMetric: v.string(),
      secondaryMetrics: v.array(v.string()),
      minimumSampleSize: v.number(),
    }),
    schedule: v.object({
      startDate: v.number(),
      endDate: v.optional(v.number()),
      duration: v.optional(v.number()),
    }),
    createdBy: v.id('users'),
  },
  handler: async (ctx, args) => {
    // Validate traffic allocations
    const totalAllocation = args.promptVariants.reduce(
      (sum, variant) => sum + variant.trafficAllocation,
      0
    )
    if (Math.abs(totalAllocation - 100) > 0.01) {
      throw new Error(
        `Traffic allocations must sum to 100%, got ${totalAllocation}%`
      )
    }

    // Ensure exactly one control variant
    const controlVariants = args.promptVariants.filter(v => v.isControl)
    if (controlVariants.length !== 1) {
      throw new Error('Exactly one variant must be marked as control')
    }

    // Convert prompt variants to experiment variants
    const experimentVariants = args.promptVariants.map(pv => ({
      id: pv.id,
      name: pv.name,
      description: pv.description,
      config: {
        variant: pv.promptVariant,
        mode: 'a_b_test',
        contextOptions: pv.contextOptions,
        systemPromptOverride: pv.systemPromptOverride,
        userPromptOverride: pv.userPromptOverride,
      } as PromptConfiguration,
      trafficAllocation: pv.trafficAllocation,
      isControl: pv.isControl,
    }))

    // Create the experiment
    const experimentId = await ctx.db.insert('experiments', {
      name: args.name,
      description: `${args.description}\n\nHypothesis: ${args.hypothesis}`,
      experimentType: 'prompt_variant',
      status: 'draft',
      variants: experimentVariants,
      targetingRules: args.targetingRules,
      metrics: {
        ...args.metrics,
        significanceThreshold: 0.05,
        minimumEffect: 0.05, // 5% minimum detectable effect
      },
      schedule: args.schedule,
      createdBy: args.createdBy,
      lastModifiedBy: args.createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    return experimentId
  },
})

// Get prompt experiment results with statistical analysis
export const getPromptExperimentResults = query({
  args: {
    experimentId: v.id('experiments'),
    timeWindow: v.optional(
      v.union(
        v.literal('daily'),
        v.literal('weekly'),
        v.literal('experiment_lifetime')
      )
    ),
  },
  handler: async (ctx, args) => {
    const experiment = await ctx.db.get(args.experimentId)
    if (!experiment || experiment.experimentType !== 'prompt_variant') {
      throw new Error('Prompt experiment not found')
    }

    const timeWindow = args.timeWindow || 'experiment_lifetime'

    // Get experiment results for each variant
    const results = await ctx.db
      .query('experimentResults')
      .withIndex('by_experiment', q => q.eq('experimentId', args.experimentId))
      .filter(q => q.eq(q.field('timeWindow'), timeWindow))
      .collect()

    // Group results by variant and metric
    const variantMetrics: Record<string, Record<string, any>> = {}

    for (const result of results) {
      if (!variantMetrics[result.variantId]) {
        variantMetrics[result.variantId] = {}
      }
      variantMetrics[result.variantId][result.metricName] = result
    }

    // Get variant details
    const variantResults = experiment.variants.map(variant => {
      const metrics = variantMetrics[variant.id] || {}

      return {
        variantId: variant.id,
        variantName: variant.name,
        isControl: variant.isControl,
        config: variant.config,
        metrics: {
          confidence_score: metrics.confidence_score || null,
          user_satisfaction: metrics.user_satisfaction || null,
          analysis_quality: metrics.analysis_quality || null,
          processing_time: metrics.processing_time || null,
          error_rate: metrics.error_rate || null,
        },
      }
    })

    // Calculate statistical comparisons to control
    const controlVariant = experiment.variants.find(v => v.isControl)
    const controlMetrics = controlVariant
      ? variantMetrics[controlVariant.id]
      : null

    const comparisons = variantResults
      .filter(v => !v.isControl)
      .map(variant => {
        const comparisons: Record<string, any> = {}

        if (controlMetrics) {
          Object.keys(variant.metrics).forEach(metricName => {
            const variantMetric = variant.metrics[metricName]
            const controlMetric = controlMetrics[metricName]

            if (variantMetric && controlMetric) {
              comparisons[metricName] = {
                variant: variantMetric.value,
                control: controlMetric.value,
                relativeLift:
                  variantMetric.comparisonToControl?.relativeLift || 0,
                absoluteDifference:
                  variantMetric.comparisonToControl?.absoluteDifference || 0,
                isSignificant:
                  variantMetric.comparisonToControl?.isSignificant || false,
                pValue: variantMetric.pValue,
                confidenceInterval: variantMetric.confidenceInterval,
              }
            }
          })
        }

        return {
          variantId: variant.variantId,
          variantName: variant.variantName,
          comparisons,
        }
      })

    return {
      experiment: {
        id: experiment._id,
        name: experiment.name,
        description: experiment.description,
        status: experiment.status,
        startDate: experiment.schedule.startDate,
        endDate: experiment.schedule.endDate,
      },
      variants: variantResults,
      comparisons,
      summary: {
        totalVariants: experiment.variants.length,
        hasStatisticallySignificantResults: comparisons.some(c =>
          Object.values(c.comparisons).some((comp: any) => comp.isSignificant)
        ),
        recommendedAction: determineRecommendedAction(comparisons),
      },
    }
  },
})

// Helper function to determine recommended action
function determineRecommendedAction(comparisons: any[]): string {
  if (comparisons.length === 0) {
    return 'Insufficient data for recommendation'
  }

  const significantWinners = comparisons.filter(c =>
    Object.values(c.comparisons).some(
      (comp: any) => comp.isSignificant && comp.relativeLift > 0
    )
  )

  if (significantWinners.length === 0) {
    return 'No significant improvements detected. Consider running longer or testing different variants.'
  }

  if (significantWinners.length === 1) {
    return `Roll out ${significantWinners[0].variantName} - shows significant improvement`
  }

  return `Multiple variants show improvement. Consider A/B testing the top ${significantWinners.length} variants.`
}

// Update experiment results with new metrics
export const updatePromptExperimentResults = mutation({
  args: {
    experimentId: v.id('experiments'),
    variantId: v.string(),
    metricName: v.string(),
    value: v.number(),
    sampleSize: v.number(),
    standardError: v.optional(v.number()),
    comparisonToControl: v.optional(
      v.object({
        relativeLift: v.number(),
        absoluteDifference: v.number(),
        isSignificant: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Check if result already exists for today
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const existingResult = await ctx.db
      .query('experimentResults')
      .withIndex('by_experiment_metric', q =>
        q
          .eq('experimentId', args.experimentId)
          .eq('metricName', args.metricName)
      )
      .filter(q =>
        q.and(
          q.eq(q.field('variantId'), args.variantId),
          q.eq(q.field('timeWindow'), 'daily'),
          q.gte(q.field('windowStart'), startOfDay.getTime()),
          q.lte(q.field('windowEnd'), endOfDay.getTime())
        )
      )
      .first()

    if (existingResult) {
      // Update existing result
      await ctx.db.patch(existingResult._id, {
        value: args.value,
        sampleSize: args.sampleSize,
        standardError: args.standardError,
        comparisonToControl: args.comparisonToControl,
        lastUpdated: now,
      })
      return existingResult._id
    } else {
      // Create new result
      return await ctx.db.insert('experimentResults', {
        experimentId: args.experimentId,
        variantId: args.variantId,
        metricName: args.metricName,
        aggregationType: 'average',
        timeWindow: 'daily',
        windowStart: startOfDay.getTime(),
        windowEnd: endOfDay.getTime(),
        value: args.value,
        sampleSize: args.sampleSize,
        standardError: args.standardError,
        comparisonToControl: args.comparisonToControl,
        lastUpdated: now,
      })
    }
  },
})

// List all prompt experiments
export const listPromptExperiments = query({
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
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('experiments')
      .filter(q => q.eq(q.field('experimentType'), 'prompt_variant'))

    if (args.status) {
      query = query.filter(q => q.eq(q.field('status'), args.status))
    }

    query = query.order('desc')

    if (args.limit) {
      query = query.take(args.limit)
    }

    const experiments = await query.collect()

    // Get assignment counts for each experiment
    const experimentsWithStats = await Promise.all(
      experiments.map(async experiment => {
        const assignments = await ctx.db
          .query('userExperimentAssignments')
          .withIndex('by_experiment', q => q.eq('experimentId', experiment._id))
          .filter(q => q.eq(q.field('isActive'), true))
          .collect()

        const variantCounts = experiment.variants.reduce(
          (acc, variant) => {
            acc[variant.id] = assignments.filter(
              a => a.variantId === variant.id
            ).length
            return acc
          },
          {} as Record<string, number>
        )

        return {
          ...experiment,
          stats: {
            totalAssignments: assignments.length,
            variantCounts,
          },
        }
      })
    )

    return experimentsWithStats
  },
})
