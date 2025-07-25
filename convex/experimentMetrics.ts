import { v } from 'convex/values'
import { internalMutation, internalQuery } from './_generated/server'
import { Id } from './_generated/dataModel'

// Statistical helper functions
function calculateMean(values: number[]): number {
  return values.length > 0
    ? values.reduce((sum, val) => sum + val, 0) / values.length
    : 0
}

function calculateStandardDeviation(values: number[], mean?: number): number {
  if (values.length < 2) return 0

  const avg = mean ?? calculateMean(values)
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
    (values.length - 1)
  return Math.sqrt(variance)
}

function calculateStandardError(
  standardDeviation: number,
  sampleSize: number
): number {
  return sampleSize > 0 ? standardDeviation / Math.sqrt(sampleSize) : 0
}

// Two-sample t-test for statistical significance
function calculateTTest(
  mean1: number,
  mean2: number,
  std1: number,
  std2: number,
  n1: number,
  n2: number
): { tStatistic: number; pValue: number; isSignificant: boolean } {
  if (n1 < 2 || n2 < 2) {
    return { tStatistic: 0, pValue: 1, isSignificant: false }
  }

  const se1 = std1 / Math.sqrt(n1)
  const se2 = std2 / Math.sqrt(n2)
  const standardError = Math.sqrt(se1 * se1 + se2 * se2)

  if (standardError === 0) {
    return { tStatistic: 0, pValue: 1, isSignificant: false }
  }

  const tStatistic = (mean1 - mean2) / standardError

  // Degrees of freedom (Welch's t-test approximation)
  const df = Math.max(
    1,
    Math.floor(
      Math.pow(se1 * se1 + se2 * se2, 2) /
        (Math.pow(se1, 4) / (n1 - 1) + Math.pow(se2, 4) / (n2 - 1))
    )
  )

  // Simplified p-value approximation (for a more accurate implementation, use a statistical library)
  const absTStat = Math.abs(tStatistic)
  let pValue: number

  if (absTStat < 1) {
    pValue = 0.5
  } else if (absTStat < 2) {
    pValue = 0.1
  } else if (absTStat < 2.5) {
    pValue = 0.05
  } else if (absTStat < 3) {
    pValue = 0.01
  } else {
    pValue = 0.001
  }

  return {
    tStatistic,
    pValue,
    isSignificant: pValue < 0.05,
  }
}

// Collect and aggregate experiment metrics
export const aggregateExperimentMetrics = internalMutation({
  args: {
    experimentId: v.id('experiments'),
    timeWindow: v.union(
      v.literal('daily'),
      v.literal('weekly'),
      v.literal('experiment_lifetime')
    ),
  },
  handler: async (ctx, args) => {
    const experiment = await ctx.db.get(args.experimentId)
    if (!experiment) {
      throw new Error('Experiment not found')
    }

    // Determine time window boundaries
    const now = Date.now()
    let windowStart: number
    let windowEnd: number

    switch (args.timeWindow) {
      case 'daily':
        const startOfToday = new Date()
        startOfToday.setHours(0, 0, 0, 0)
        windowStart = startOfToday.getTime()
        windowEnd = now
        break
      case 'weekly':
        const startOfWeek = new Date()
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
        startOfWeek.setHours(0, 0, 0, 0)
        windowStart = startOfWeek.getTime()
        windowEnd = now
        break
      case 'experiment_lifetime':
        windowStart = experiment.schedule.startDate
        windowEnd = experiment.schedule.endDate || now
        break
    }

    // Get all experiment events within the time window
    const events = await ctx.db
      .query('experimentEvents')
      .withIndex('by_experiment_timestamp', q =>
        q.eq('experimentId', args.experimentId)
      )
      .filter(q =>
        q.and(
          q.gte(q.field('timestamp'), windowStart),
          q.lte(q.field('timestamp'), windowEnd)
        )
      )
      .collect()

    // Group events by variant
    const variantEvents: Record<string, any[]> = {}
    experiment.variants.forEach(variant => {
      variantEvents[variant.id] = events.filter(e => e.variantId === variant.id)
    })

    // Calculate metrics for each variant
    const variantMetrics: Record<string, any> = {}

    for (const variant of experiment.variants) {
      const variantEventList = variantEvents[variant.id] || []

      // Get analysis completion events
      const analysisEvents = variantEventList.filter(
        e =>
          e.eventType === 'conversion' && e.eventName === 'analysis_completed'
      )

      // Calculate confidence score metrics
      const confidenceScores = analysisEvents
        .map(e => e.properties?.confidenceLevel)
        .filter(
          score => typeof score === 'number' && score >= 0 && score <= 100
        )

      const avgConfidenceScore = calculateMean(confidenceScores)
      const confidenceStdDev = calculateStandardDeviation(
        confidenceScores,
        avgConfidenceScore
      )

      // Calculate processing time metrics
      const processingTimes = analysisEvents
        .map(e => e.properties?.processingTimeMs)
        .filter(time => typeof time === 'number' && time > 0)

      const avgProcessingTime = calculateMean(processingTimes)
      const processingTimeStdDev = calculateStandardDeviation(
        processingTimes,
        avgProcessingTime
      )

      // Calculate quality score metrics
      const qualityScores = analysisEvents
        .map(e => e.properties?.qualityScore)
        .filter(
          score => typeof score === 'number' && score >= 0 && score <= 100
        )

      const avgQualityScore = calculateMean(qualityScores)
      const qualityStdDev = calculateStandardDeviation(
        qualityScores,
        avgQualityScore
      )

      // Calculate error rate
      const errorEvents = variantEventList.filter(e => e.eventType === 'error')
      const totalInteractions = variantEventList.filter(
        e => e.eventType === 'exposure' || e.eventType === 'conversion'
      ).length
      const errorRate =
        totalInteractions > 0
          ? (errorEvents.length / totalInteractions) * 100
          : 0

      // Calculate engagement metrics
      const exposureEvents = variantEventList.filter(
        e => e.eventType === 'exposure'
      )
      const conversionEvents = variantEventList.filter(
        e => e.eventType === 'conversion'
      )
      const conversionRate =
        exposureEvents.length > 0
          ? (conversionEvents.length / exposureEvents.length) * 100
          : 0

      // Store metrics for this variant
      variantMetrics[variant.id] = {
        sampleSize: analysisEvents.length,
        confidence_score: {
          mean: avgConfidenceScore,
          standardDeviation: confidenceStdDev,
          standardError: calculateStandardError(
            confidenceStdDev,
            confidenceScores.length
          ),
          values: confidenceScores,
        },
        processing_time: {
          mean: avgProcessingTime,
          standardDeviation: processingTimeStdDev,
          standardError: calculateStandardError(
            processingTimeStdDev,
            processingTimes.length
          ),
        },
        quality_score: {
          mean: avgQualityScore,
          standardDeviation: qualityStdDev,
          standardError: calculateStandardError(
            qualityStdDev,
            qualityScores.length
          ),
        },
        error_rate: {
          rate: errorRate,
          errorCount: errorEvents.length,
          totalInteractions,
        },
        conversion_rate: {
          rate: conversionRate,
          conversions: conversionEvents.length,
          exposures: exposureEvents.length,
        },
        events: {
          total: variantEventList.length,
          exposure: exposureEvents.length,
          conversion: conversionEvents.length,
          error: errorEvents.length,
        },
      }
    }

    // Find control variant for comparisons
    const controlVariant = experiment.variants.find(v => v.isControl)
    const controlMetrics = controlVariant
      ? variantMetrics[controlVariant.id]
      : null

    // Calculate statistical comparisons to control
    for (const variant of experiment.variants) {
      if (variant.isControl || !controlMetrics) continue

      const variantData = variantMetrics[variant.id]
      const metrics = [
        'confidence_score',
        'processing_time',
        'quality_score',
        'error_rate',
      ]

      for (const metricName of metrics) {
        const variantMetric = variantData[metricName]
        const controlMetric = controlMetrics[metricName]

        if (!variantMetric || !controlMetric) continue

        let comparison: any = {}

        if (metricName === 'error_rate') {
          // For error rate, compare rates directly
          const variantRate = variantMetric.rate
          const controlRate = controlMetric.rate

          comparison = {
            relativeLift:
              controlRate > 0
                ? ((variantRate - controlRate) / controlRate) * 100
                : 0,
            absoluteDifference: variantRate - controlRate,
            isSignificant: false, // Simplified - would need more complex test for rates
          }
        } else {
          // For continuous metrics, use t-test
          const tTest = calculateTTest(
            variantMetric.mean,
            controlMetric.mean,
            variantMetric.standardDeviation,
            controlMetric.standardDeviation,
            variantData.sampleSize,
            controlMetrics.sampleSize
          )

          comparison = {
            relativeLift:
              controlMetric.mean > 0
                ? ((variantMetric.mean - controlMetric.mean) /
                    controlMetric.mean) *
                  100
                : 0,
            absoluteDifference: variantMetric.mean - controlMetric.mean,
            isSignificant: tTest.isSignificant,
            pValue: tTest.pValue,
            tStatistic: tTest.tStatistic,
          }
        }

        // Store or update experiment result
        await ctx.db.insert('experimentResults', {
          experimentId: args.experimentId,
          variantId: variant.id,
          metricName,
          aggregationType: 'average',
          timeWindow: args.timeWindow,
          windowStart,
          windowEnd,
          sampleSize: variantData.sampleSize,
          value: variantMetric.mean || variantMetric.rate,
          standardError: variantMetric.standardError,
          comparisonToControl: comparison,
          lastUpdated: now,
        })
      }
    }

    return {
      experimentId: args.experimentId,
      timeWindow: args.timeWindow,
      windowStart,
      windowEnd,
      variantMetrics,
      processedAt: now,
    }
  },
})

// Get experiment performance summary
export const getExperimentPerformanceSummary = internalQuery({
  args: { experimentId: v.id('experiments') },
  handler: async (ctx, args) => {
    const experiment = await ctx.db.get(args.experimentId)
    if (!experiment) {
      throw new Error('Experiment not found')
    }

    // Get latest results for each metric
    const results = await ctx.db
      .query('experimentResults')
      .withIndex('by_experiment', q => q.eq('experimentId', args.experimentId))
      .filter(q => q.eq(q.field('timeWindow'), 'experiment_lifetime'))
      .collect()

    // Group results by variant and metric
    const performanceData: Record<string, Record<string, any>> = {}

    results.forEach(result => {
      if (!performanceData[result.variantId]) {
        performanceData[result.variantId] = {}
      }
      performanceData[result.variantId][result.metricName] = result
    })

    // Calculate overall experiment health
    const totalAssignments = await ctx.db
      .query('userExperimentAssignments')
      .withIndex('by_experiment', q => q.eq('experimentId', args.experimentId))
      .filter(q => q.eq(q.field('isActive'), true))
      .collect()

    const totalEvents = await ctx.db
      .query('experimentEvents')
      .withIndex('by_experiment', q => q.eq('experimentId', args.experimentId))
      .collect()

    // Determine experiment status and recommendations
    const controlVariant = experiment.variants.find(v => v.isControl)
    const hasStatisticallySignificantResults = Object.values(
      performanceData
    ).some(variantData =>
      Object.values(variantData).some(
        (result: any) => result.comparisonToControl?.isSignificant
      )
    )

    const runningDays = Math.ceil(
      (Date.now() - experiment.schedule.startDate) / (24 * 60 * 60 * 1000)
    )

    let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy'
    const healthIssues: string[] = []

    // Check for health issues
    if (totalAssignments.length < experiment.metrics.minimumSampleSize) {
      healthStatus = 'warning'
      healthIssues.push(
        `Low sample size: ${totalAssignments.length} of ${experiment.metrics.minimumSampleSize} minimum`
      )
    }

    const errorRate =
      totalEvents.filter(e => e.eventType === 'error').length /
      Math.max(1, totalEvents.length)
    if (errorRate > 0.05) {
      // More than 5% error rate
      healthStatus = 'critical'
      healthIssues.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`)
    }

    if (runningDays > 30 && !hasStatisticallySignificantResults) {
      healthStatus = 'warning'
      healthIssues.push('No significant results after 30 days')
    }

    return {
      experiment: {
        id: experiment._id,
        name: experiment.name,
        status: experiment.status,
        type: experiment.experimentType,
        runningDays,
        variants: experiment.variants.length,
      },
      performance: performanceData,
      summary: {
        totalAssignments: totalAssignments.length,
        totalEvents: totalEvents.length,
        hasSignificantResults: hasStatisticallySignificantResults,
        healthStatus,
        healthIssues,
      },
      recommendations: generateExperimentRecommendations(
        experiment,
        performanceData,
        totalAssignments.length,
        hasStatisticallySignificantResults,
        runningDays
      ),
    }
  },
})

// Generate experiment recommendations based on performance
function generateExperimentRecommendations(
  experiment: any,
  performanceData: Record<string, Record<string, any>>,
  totalAssignments: number,
  hasSignificantResults: boolean,
  runningDays: number
): string[] {
  const recommendations: string[] = []

  // Sample size recommendations
  if (totalAssignments < experiment.metrics.minimumSampleSize) {
    const remaining = experiment.metrics.minimumSampleSize - totalAssignments
    recommendations.push(
      `Increase traffic to reach minimum sample size (${remaining} more assignments needed)`
    )
  }

  // Duration recommendations
  if (runningDays < 7) {
    recommendations.push(
      'Continue running for at least 7 days to account for weekly patterns'
    )
  } else if (runningDays > 30 && !hasSignificantResults) {
    recommendations.push(
      'Consider stopping experiment - no significant results after 30 days'
    )
  }

  // Performance-based recommendations
  const winningVariants = Object.entries(performanceData)
    .filter(([variantId, data]) => {
      const confidenceResult = data.confidence_score
      return (
        confidenceResult?.comparisonToControl?.isSignificant &&
        confidenceResult?.comparisonToControl?.relativeLift > 0
      )
    })
    .map(([variantId]) => variantId)

  if (winningVariants.length === 1) {
    const winnerVariant = experiment.variants.find(
      (v: any) => v.id === winningVariants[0]
    )
    recommendations.push(
      `Roll out ${winnerVariant?.name} - shows significant improvement`
    )
  } else if (winningVariants.length > 1) {
    recommendations.push(
      'Multiple variants show improvement - consider additional testing'
    )
  }

  // Quality recommendations
  const qualityIssues = Object.entries(performanceData).filter(
    ([variantId, data]) => {
      const qualityScore = data.quality_score?.value || 0
      return qualityScore < 70 // Below 70% quality threshold
    }
  )

  if (qualityIssues.length > 0) {
    recommendations.push(
      'Some variants show quality issues - review prompt configurations'
    )
  }

  return recommendations
}

// Schedule regular metric aggregation (to be called by a cron job)
export const scheduleMetricAggregation = internalMutation({
  args: {},
  handler: async ctx => {
    // Get all active experiments
    const activeExperiments = await ctx.db
      .query('experiments')
      .filter(q => q.eq(q.field('status'), 'active'))
      .collect()

    const results = []

    for (const experiment of activeExperiments) {
      try {
        // Aggregate daily metrics
        const dailyResult = await aggregateExperimentMetrics(ctx, {
          experimentId: experiment._id,
          timeWindow: 'daily',
        })

        // Aggregate lifetime metrics
        const lifetimeResult = await aggregateExperimentMetrics(ctx, {
          experimentId: experiment._id,
          timeWindow: 'experiment_lifetime',
        })

        results.push({
          experimentId: experiment._id,
          experimentName: experiment.name,
          dailyMetrics: dailyResult,
          lifetimeMetrics: lifetimeResult,
        })
      } catch (error) {
        console.error(
          `Failed to aggregate metrics for experiment ${experiment._id}:`,
          error
        )
        results.push({
          experimentId: experiment._id,
          experimentName: experiment.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return {
      processedExperiments: results.length,
      results,
      processedAt: Date.now(),
    }
  },
})
