import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { Id } from './_generated/dataModel'

// Statistical constants
const CONFIDENCE_LEVELS = {
  '90%': 1.645,
  '95%': 1.96,
  '99%': 2.576,
} as const

// Interface for statistical test results
interface StatisticalTestResult {
  metric: string
  controlMean: number
  treatmentMean: number
  controlStdDev: number
  treatmentStdDev: number
  controlSampleSize: number
  treatmentSampleSize: number
  effectSize: number
  relativeImprovement: number
  standardError: number
  tStatistic: number
  pValue: number
  isStatisticallySignificant: boolean
  confidenceInterval: {
    lower: number
    upper: number
    level: number
  }
  powerAnalysis: {
    statisticalPower: number
    minimumDetectableEffect: number
    recommendedSampleSize: number
  }
}

// Advanced statistical functions
function calculatePooledStandardDeviation(
  std1: number,
  n1: number,
  std2: number,
  n2: number
): number {
  if (n1 <= 1 || n2 <= 1) return 0

  const pooledVariance =
    ((n1 - 1) * std1 * std1 + (n2 - 1) * std2 * std2) / (n1 + n2 - 2)
  return Math.sqrt(pooledVariance)
}

function calculateWelchTTest(
  mean1: number,
  mean2: number,
  std1: number,
  std2: number,
  n1: number,
  n2: number
): { tStatistic: number; degreesOfFreedom: number; pValue: number } {
  if (n1 < 2 || n2 < 2) {
    return { tStatistic: 0, degreesOfFreedom: 0, pValue: 1 }
  }

  const se1Squared = (std1 * std1) / n1
  const se2Squared = (std2 * std2) / n2
  const standardError = Math.sqrt(se1Squared + se2Squared)

  if (standardError === 0) {
    return { tStatistic: 0, degreesOfFreedom: 0, pValue: 1 }
  }

  const tStatistic = (mean1 - mean2) / standardError

  // Welch-Satterthwaite equation for degrees of freedom
  const degreesOfFreedom = Math.max(
    1,
    Math.floor(
      Math.pow(se1Squared + se2Squared, 2) /
        (Math.pow(se1Squared, 2) / (n1 - 1) +
          Math.pow(se2Squared, 2) / (n2 - 1))
    )
  )

  // Approximate p-value calculation (for production use, consider a proper statistical library)
  const absTStat = Math.abs(tStatistic)
  let pValue: number

  if (degreesOfFreedom >= 30) {
    // Use normal approximation for large degrees of freedom
    if (absTStat < 1.28) pValue = 0.2
    else if (absTStat < 1.645) pValue = 0.1
    else if (absTStat < 1.96) pValue = 0.05
    else if (absTStat < 2.326) pValue = 0.02
    else if (absTStat < 2.576) pValue = 0.01
    else if (absTStat < 3.09) pValue = 0.002
    else pValue = 0.001
  } else {
    // More conservative for smaller samples
    if (absTStat < 1.5) pValue = 0.2
    else if (absTStat < 2.0) pValue = 0.1
    else if (absTStat < 2.5) pValue = 0.05
    else if (absTStat < 3.0) pValue = 0.01
    else pValue = 0.005
  }

  return { tStatistic, degreesOfFreedom, pValue }
}

function calculateConfidenceInterval(
  mean1: number,
  mean2: number,
  standardError: number,
  confidenceLevel: number = 0.95
): { lower: number; upper: number } {
  const zScore =
    CONFIDENCE_LEVELS[
      `${Math.round(confidenceLevel * 100)}%` as keyof typeof CONFIDENCE_LEVELS
    ] || 1.96
  const marginOfError = zScore * standardError
  const difference = mean1 - mean2

  return {
    lower: difference - marginOfError,
    upper: difference + marginOfError,
  }
}

function calculateCohenD(
  mean1: number,
  mean2: number,
  std1: number,
  std2: number,
  n1: number,
  n2: number
): number {
  const pooledStd = calculatePooledStandardDeviation(std1, n1, std2, n2)
  return pooledStd > 0 ? (mean1 - mean2) / pooledStd : 0
}

function calculateStatisticalPower(
  effectSize: number,
  sampleSize: number,
  alpha: number = 0.05
): number {
  // Simplified power calculation - in production, use proper statistical libraries
  const ncp = effectSize * Math.sqrt(sampleSize / 2) // Non-centrality parameter

  // Approximate power calculation
  if (ncp < 1.28) return 0.1
  else if (ncp < 1.645) return 0.2
  else if (ncp < 1.96) return 0.3
  else if (ncp < 2.576) return 0.5
  else if (ncp < 3.09) return 0.7
  else if (ncp < 3.719) return 0.8
  else if (ncp < 4.265) return 0.9
  else return 0.95
}

function calculateRequiredSampleSize(
  effect: number,
  power: number = 0.8,
  alpha: number = 0.05
): number {
  // Simplified sample size calculation
  const zAlpha = CONFIDENCE_LEVELS['95%'] // 1.96 for alpha = 0.05
  const zBeta = 0.84 // Approximate z-score for 80% power

  if (Math.abs(effect) < 0.01) return 10000 // Very small effect needs large sample

  const requiredN = Math.ceil(
    (2 * Math.pow(zAlpha + zBeta, 2)) / (effect * effect)
  )

  return Math.max(30, Math.min(10000, requiredN))
}

// Perform comprehensive statistical analysis for an experiment
export const performStatisticalAnalysis = mutation({
  args: {
    experimentId: v.id('experiments'),
    confidenceLevel: v.optional(v.number()), // 0.90, 0.95, 0.99
    minimumDetectableEffect: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    experiment: any
    results: StatisticalTestResult[]
    summary: {
      hasStatisticallySignificantResults: boolean
      winningVariants: string[]
      recommendedAction: string
      overallPower: number
      isAdequatelyPowered: boolean
    }
  }> => {
    const experiment = await ctx.db.get(args.experimentId)
    if (!experiment) {
      throw new Error('Experiment not found')
    }

    const confidenceLevel = args.confidenceLevel || 0.95
    const minimumDetectableEffect =
      args.minimumDetectableEffect || experiment.metrics.minimumEffect || 0.05

    // Get experiment results for lifetime window
    const experimentResults = await ctx.db
      .query('experimentResults')
      .withIndex('by_experiment', q => q.eq('experimentId', args.experimentId))
      .filter(q => q.eq(q.field('timeWindow'), 'experiment_lifetime'))
      .collect()

    // Group results by variant and metric
    const resultsByVariant: Record<string, Record<string, any>> = {}
    experimentResults.forEach(result => {
      if (!resultsByVariant[result.variantId]) {
        resultsByVariant[result.variantId] = {}
      }
      resultsByVariant[result.variantId][result.metricName] = result
    })

    // Find control variant
    const controlVariant = experiment.variants.find((v: any) => v.isControl)
    if (!controlVariant) {
      throw new Error('No control variant found')
    }

    const controlResults = resultsByVariant[controlVariant.id] || {}

    // Analyze each treatment variant against control
    const statisticalResults: StatisticalTestResult[] = []
    const winningVariants: string[] = []

    for (const variant of experiment.variants) {
      if (variant.isControl) continue

      const treatmentResults = resultsByVariant[variant.id] || {}
      const metrics = [
        'confidence_score',
        'processing_time',
        'quality_score',
        'error_rate',
      ]

      for (const metricName of metrics) {
        const controlMetric = controlResults[metricName]
        const treatmentMetric = treatmentResults[metricName]

        if (!controlMetric || !treatmentMetric) continue

        // Extract raw values from aggregated events
        const controlValues = await getMetricValues(
          ctx,
          args.experimentId,
          controlVariant.id,
          metricName
        )
        const treatmentValues = await getMetricValues(
          ctx,
          args.experimentId,
          variant.id,
          metricName
        )

        if (controlValues.length < 5 || treatmentValues.length < 5) {
          console.warn(
            `Insufficient data for ${variant.id} ${metricName}: control=${controlValues.length}, treatment=${treatmentValues.length}`
          )
          continue
        }

        // Calculate descriptive statistics
        const controlMean =
          controlValues.reduce((sum, val) => sum + val, 0) /
          controlValues.length
        const treatmentMean =
          treatmentValues.reduce((sum, val) => sum + val, 0) /
          treatmentValues.length

        const controlVariance =
          controlValues.reduce(
            (sum, val) => sum + Math.pow(val - controlMean, 2),
            0
          ) /
          (controlValues.length - 1)
        const treatmentVariance =
          treatmentValues.reduce(
            (sum, val) => sum + Math.pow(val - treatmentMean, 2),
            0
          ) /
          (treatmentValues.length - 1)

        const controlStdDev = Math.sqrt(controlVariance)
        const treatmentStdDev = Math.sqrt(treatmentVariance)

        // Perform Welch's t-test
        const tTest = calculateWelchTTest(
          treatmentMean,
          controlMean,
          treatmentStdDev,
          controlStdDev,
          treatmentValues.length,
          controlValues.length
        )

        // Calculate effect size (Cohen's d)
        const effectSize = calculateCohenD(
          treatmentMean,
          controlMean,
          treatmentStdDev,
          controlStdDev,
          treatmentValues.length,
          controlValues.length
        )

        // Calculate relative improvement
        const relativeImprovement =
          controlMean !== 0
            ? ((treatmentMean - controlMean) / Math.abs(controlMean)) * 100
            : 0

        // Calculate standard error for confidence interval
        const se1Squared =
          (treatmentStdDev * treatmentStdDev) / treatmentValues.length
        const se2Squared =
          (controlStdDev * controlStdDev) / controlValues.length
        const standardError = Math.sqrt(se1Squared + se2Squared)

        // Calculate confidence interval
        const confidenceInterval = calculateConfidenceInterval(
          treatmentMean,
          controlMean,
          standardError,
          confidenceLevel
        )

        // Calculate statistical power
        const combinedSampleSize = treatmentValues.length + controlValues.length
        const statisticalPower = calculateStatisticalPower(
          Math.abs(effectSize),
          combinedSampleSize / 2
        )
        const recommendedSampleSize = calculateRequiredSampleSize(
          minimumDetectableEffect,
          0.8
        )

        const result: StatisticalTestResult = {
          metric: metricName,
          controlMean,
          treatmentMean,
          controlStdDev,
          treatmentStdDev,
          controlSampleSize: controlValues.length,
          treatmentSampleSize: treatmentValues.length,
          effectSize,
          relativeImprovement,
          standardError,
          tStatistic: tTest.tStatistic,
          pValue: tTest.pValue,
          isStatisticallySignificant: tTest.pValue < 1 - confidenceLevel,
          confidenceInterval: {
            ...confidenceInterval,
            level: confidenceLevel,
          },
          powerAnalysis: {
            statisticalPower,
            minimumDetectableEffect,
            recommendedSampleSize,
          },
        }

        statisticalResults.push(result)

        // Check if this variant is winning for this metric
        if (
          result.isStatisticallySignificant &&
          result.relativeImprovement > 0
        ) {
          if (!winningVariants.includes(variant.id)) {
            winningVariants.push(variant.id)
          }
        }
      }
    }

    // Calculate overall experiment power
    const overallPower =
      statisticalResults.length > 0
        ? statisticalResults.reduce(
            (sum, result) => sum + result.powerAnalysis.statisticalPower,
            0
          ) / statisticalResults.length
        : 0

    const isAdequatelyPowered = overallPower >= 0.8

    // Generate recommendations
    let recommendedAction: string
    if (winningVariants.length === 0) {
      if (overallPower < 0.8) {
        recommendedAction =
          'Continue experiment - insufficient statistical power. Collect more data.'
      } else {
        recommendedAction =
          'No significant improvements detected. Consider alternative variants or stop experiment.'
      }
    } else if (winningVariants.length === 1) {
      const winnerVariant = experiment.variants.find(
        (v: any) => v.id === winningVariants[0]
      )
      recommendedAction = `Roll out ${winnerVariant?.name} - statistically significant improvement detected.`
    } else {
      recommendedAction = `Multiple variants show promise: ${winningVariants.join(', ')}. Consider further testing or multi-armed bandit approach.`
    }

    // Store analysis results
    await ctx.db.insert('experimentResults', {
      experimentId: args.experimentId,
      variantId: 'statistical_analysis',
      metricName: 'overall_significance',
      aggregationType: 'count',
      timeWindow: 'experiment_lifetime',
      windowStart: experiment.schedule.startDate,
      windowEnd: Date.now(),
      sampleSize: statisticalResults.reduce(
        (sum, r) => sum + r.treatmentSampleSize + r.controlSampleSize,
        0
      ),
      value: winningVariants.length,
      confidence: overallPower,
      statisticalSignificance: winningVariants.length > 0,
      lastUpdated: Date.now(),
    })

    return {
      experiment: {
        id: experiment._id,
        name: experiment.name,
        status: experiment.status,
        variants: experiment.variants.length,
        runningDays: Math.ceil(
          (Date.now() - experiment.schedule.startDate) / (24 * 60 * 60 * 1000)
        ),
      },
      results: statisticalResults,
      summary: {
        hasStatisticallySignificantResults: winningVariants.length > 0,
        winningVariants,
        recommendedAction,
        overallPower,
        isAdequatelyPowered,
      },
    }
  },
})

// Helper function to extract metric values from experiment events
async function getMetricValues(
  ctx: any,
  experimentId: Id<'experiments'>,
  variantId: string,
  metricName: string
): Promise<number[]> {
  const events = await ctx.db
    .query('experimentEvents')
    .withIndex('by_experiment', q => q.eq('experimentId', experimentId))
    .filter(q =>
      q.and(
        q.eq(q.field('variantId'), variantId),
        q.eq(q.field('eventType'), 'conversion'),
        q.eq(q.field('eventName'), 'analysis_completed')
      )
    )
    .collect()

  const values: number[] = []

  for (const event of events) {
    let value: number | undefined

    switch (metricName) {
      case 'confidence_score':
        value = event.properties?.confidenceLevel
        break
      case 'processing_time':
        value = event.properties?.processingTimeMs
        break
      case 'quality_score':
        value = event.properties?.qualityScore
        break
      case 'error_rate':
        // For error rate, we need to calculate from error events vs total events
        continue // Handle separately
    }

    if (typeof value === 'number' && !isNaN(value) && value >= 0) {
      values.push(value)
    }
  }

  return values
}

// Get experiment statistical dashboard data
export const getExperimentStatistics = query({
  args: { experimentId: v.id('experiments') },
  handler: async (ctx, args) => {
    const experiment = await ctx.db.get(args.experimentId)
    if (!experiment) {
      throw new Error('Experiment not found')
    }

    // Get the latest statistical analysis
    const latestAnalysis = await ctx.db
      .query('experimentResults')
      .withIndex('by_experiment', q => q.eq('experimentId', args.experimentId))
      .filter(q =>
        q.and(
          q.eq(q.field('variantId'), 'statistical_analysis'),
          q.eq(q.field('metricName'), 'overall_significance')
        )
      )
      .order('desc')
      .first()

    // Get all current experiment results
    const currentResults = await ctx.db
      .query('experimentResults')
      .withIndex('by_experiment', q => q.eq('experimentId', args.experimentId))
      .filter(q => q.eq(q.field('timeWindow'), 'experiment_lifetime'))
      .collect()

    // Get assignment statistics
    const assignments = await ctx.db
      .query('userExperimentAssignments')
      .withIndex('by_experiment', q => q.eq('experimentId', args.experimentId))
      .filter(q => q.eq(q.field('isActive'), true))
      .collect()

    const assignmentsByVariant = assignments.reduce(
      (acc, assignment) => {
        acc[assignment.variantId] = (acc[assignment.variantId] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Get event statistics
    const events = await ctx.db
      .query('experimentEvents')
      .withIndex('by_experiment', q => q.eq('experimentId', args.experimentId))
      .collect()

    const eventsByVariant = events.reduce(
      (acc, event) => {
        if (!acc[event.variantId]) {
          acc[event.variantId] = {
            exposure: 0,
            conversion: 0,
            error: 0,
            total: 0,
          }
        }
        acc[event.variantId][event.eventType as keyof (typeof acc)[string]] += 1
        acc[event.variantId].total += 1
        return acc
      },
      {} as Record<string, Record<string, number>>
    )

    return {
      experiment: {
        id: experiment._id,
        name: experiment.name,
        description: experiment.description,
        status: experiment.status,
        type: experiment.experimentType,
        createdAt: experiment.createdAt,
        startDate: experiment.schedule.startDate,
        endDate: experiment.schedule.endDate,
        variants: experiment.variants,
      },
      statistics: {
        totalAssignments: assignments.length,
        totalEvents: events.length,
        assignmentsByVariant,
        eventsByVariant,
        hasStatisticalAnalysis: !!latestAnalysis,
        lastAnalysisDate: latestAnalysis?.lastUpdated,
        overallSignificance: latestAnalysis?.statisticalSignificance || false,
        statisticalPower: latestAnalysis?.confidence || 0,
      },
      metrics: currentResults.reduce(
        (acc, result) => {
          if (!acc[result.variantId]) {
            acc[result.variantId] = {}
          }
          acc[result.variantId][result.metricName] = {
            value: result.value,
            sampleSize: result.sampleSize,
            standardError: result.standardError,
            isSignificant: result.statisticalSignificance,
            comparisonToControl: result.comparisonToControl,
          }
          return acc
        },
        {} as Record<string, Record<string, any>>
      ),
    }
  },
})

// Batch statistical analysis for multiple experiments
export const batchStatisticalAnalysis = mutation({
  args: {
    experimentIds: v.optional(v.array(v.id('experiments'))),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let experiments

    if (args.experimentIds) {
      experiments = await Promise.all(
        args.experimentIds.map(id => ctx.db.get(id))
      ).then(results => results.filter(Boolean))
    } else {
      let query = ctx.db.query('experiments')

      if (!args.includeInactive) {
        query = query.filter(q => q.eq(q.field('status'), 'active'))
      }

      experiments = await query.collect()
    }

    const analysisResults = []

    for (const experiment of experiments) {
      try {
        const result = await performStatisticalAnalysis(ctx, {
          experimentId: experiment._id,
          confidenceLevel: 0.95,
          minimumDetectableEffect: experiment.metrics.minimumEffect || 0.05,
        })

        analysisResults.push({
          experimentId: experiment._id,
          experimentName: experiment.name,
          success: true,
          result,
        })
      } catch (error) {
        console.error(
          `Statistical analysis failed for experiment ${experiment._id}:`,
          error
        )
        analysisResults.push({
          experimentId: experiment._id,
          experimentName: experiment.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return {
      processedExperiments: analysisResults.length,
      successfulAnalyses: analysisResults.filter(r => r.success).length,
      results: analysisResults,
      processedAt: Date.now(),
    }
  },
})
