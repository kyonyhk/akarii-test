import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

// This would be added to schema.ts:
// Track historical accuracy for confidence calibration
/*
export const confidenceAccuracyMetrics = defineTable({
  confidenceRange: v.string(), // e.g., "80-90", "70-80"
  statementType: v.union(
    v.literal('question'),
    v.literal('opinion'),
    v.literal('fact'),
    v.literal('request'),
    v.literal('other')
  ),
  predictedConfidence: v.number(), // Original AI confidence
  actualAccuracy: v.number(), // Measured accuracy (0-100)
  sampleCount: v.number(), // Number of samples in this range
  calibrationOffset: v.number(), // Calculated adjustment needed
  lastUpdated: v.number(),
  version: v.string(), // Track calibration model version
})
  .index('by_range_type', ['confidenceRange', 'statementType'])
  .index('by_updated', ['lastUpdated'])
*/

interface CalibrationMetrics {
  confidenceRange: string
  statementType: string
  predictedConfidence: number
  actualAccuracy: number
  sampleCount: number
  calibrationOffset: number
}

// Get calibration adjustments based on historical accuracy
export const getConfidenceCalibration = query({
  args: {
    confidenceLevel: v.number(),
    statementType: v.union(
      v.literal('question'),
      v.literal('opinion'),
      v.literal('fact'),
      v.literal('request'),
      v.literal('other')
    ),
  },
  handler: async (ctx, args) => {
    const confidenceRange = getConfidenceRange(args.confidenceLevel)

    // Get historical calibration data
    const calibrationData = await ctx.db
      .query('confidenceAccuracyMetrics')
      .withIndex('by_range_type')
      .filter(q =>
        q.and(
          q.eq(q.field('confidenceRange'), confidenceRange),
          q.eq(q.field('statementType'), args.statementType)
        )
      )
      .first()

    if (!calibrationData || calibrationData.sampleCount < 10) {
      // Not enough data for calibration, use defaults
      return getDefaultCalibration(args.confidenceLevel, args.statementType)
    }

    return {
      originalConfidence: args.confidenceLevel,
      calibratedConfidence: Math.max(
        0,
        Math.min(100, args.confidenceLevel + calibrationData.calibrationOffset)
      ),
      adjustment: calibrationData.calibrationOffset,
      basedOnSamples: calibrationData.sampleCount,
      historicalAccuracy: calibrationData.actualAccuracy,
    }
  },
})

// Record accuracy feedback for calibration
export const recordAccuracyFeedback = mutation({
  args: {
    analysisId: v.id('analyses'),
    wasAccurate: v.boolean(),
    actualConfidence: v.optional(v.number()), // User's assessment of actual confidence
    feedbackType: v.union(
      v.literal('thumbs_up'),
      v.literal('thumbs_down'),
      v.literal('expert_review'),
      v.literal('user_correction')
    ),
  },
  handler: async (ctx, args) => {
    // Get the analysis
    const analysis = await ctx.db.get(args.analysisId)
    if (!analysis) {
      throw new Error('Analysis not found')
    }

    const confidenceRange = getConfidenceRange(analysis.confidenceLevel)

    // Find or create calibration record
    let calibrationRecord = await ctx.db
      .query('confidenceAccuracyMetrics')
      .withIndex('by_range_type')
      .filter(q =>
        q.and(
          q.eq(q.field('confidenceRange'), confidenceRange),
          q.eq(q.field('statementType'), analysis.statementType)
        )
      )
      .first()

    const accuracyScore = args.wasAccurate ? 100 : 0
    const confidenceScore =
      args.actualConfidence ||
      (args.wasAccurate
        ? analysis.confidenceLevel
        : Math.max(0, analysis.confidenceLevel - 30))

    if (calibrationRecord) {
      // Update existing record with weighted average
      const totalSamples = calibrationRecord.sampleCount + 1
      const newAccuracy =
        (calibrationRecord.actualAccuracy * calibrationRecord.sampleCount +
          accuracyScore) /
        totalSamples

      // Calculate new calibration offset
      const newOffset = calculateCalibrationOffset(
        calibrationRecord.predictedConfidence,
        newAccuracy,
        totalSamples
      )

      await ctx.db.patch(calibrationRecord._id, {
        actualAccuracy: newAccuracy,
        sampleCount: totalSamples,
        calibrationOffset: newOffset,
        lastUpdated: Date.now(),
      })
    } else {
      // Create new calibration record
      await ctx.db.insert('confidenceAccuracyMetrics', {
        confidenceRange,
        statementType: analysis.statementType,
        predictedConfidence: analysis.confidenceLevel,
        actualAccuracy: accuracyScore,
        sampleCount: 1,
        calibrationOffset: calculateCalibrationOffset(
          analysis.confidenceLevel,
          accuracyScore,
          1
        ),
        lastUpdated: Date.now(),
        version: '1.0',
      })
    }

    return { success: true }
  },
})

// Enhanced confidence calibration with historical data
export function applyHistoricalCalibration(
  confidenceLevel: number,
  statementType: string,
  calibrationData?: CalibrationMetrics
): number {
  let adjustedConfidence = confidenceLevel

  // Apply existing rule-based calibrations first
  switch (statementType) {
    case 'question':
      adjustedConfidence = Math.max(0, adjustedConfidence - 15)
      break
    case 'other':
      adjustedConfidence = Math.min(60, adjustedConfidence)
      break
  }

  // Apply historical calibration if available
  if (calibrationData && calibrationData.sampleCount >= 10) {
    adjustedConfidence = Math.max(
      0,
      Math.min(100, adjustedConfidence + calibrationData.calibrationOffset)
    )
  }

  return Math.round(adjustedConfidence)
}

// Helper functions
function getConfidenceRange(confidence: number): string {
  const ranges = [
    [0, 20],
    [20, 40],
    [40, 60],
    [60, 80],
    [80, 100],
  ]

  for (const [min, max] of ranges) {
    if (confidence >= min && confidence < max) {
      return `${min}-${max}`
    }
  }

  return '80-100' // fallback for 100%
}

function getDefaultCalibration(confidence: number, statementType: string) {
  // Default calibrations based on existing rules
  let adjustment = 0

  switch (statementType) {
    case 'question':
      adjustment = -15
      break
    case 'other':
      adjustment = Math.min(0, 60 - confidence)
      break
  }

  return {
    originalConfidence: confidence,
    calibratedConfidence: Math.max(0, Math.min(100, confidence + adjustment)),
    adjustment,
    basedOnSamples: 0,
    historicalAccuracy: null,
  }
}

function calculateCalibrationOffset(
  predictedConfidence: number,
  actualAccuracy: number,
  sampleCount: number
): number {
  // Simple calibration: if predicted confidence is higher than actual accuracy,
  // adjust downward, and vice versa
  const rawOffset = actualAccuracy - predictedConfidence

  // Apply confidence based on sample count (more samples = more confident adjustment)
  const confidenceFactor = Math.min(1, sampleCount / 100) // Full confidence at 100 samples

  return Math.round(rawOffset * confidenceFactor)
}

// Get calibration statistics for admin/debugging
export const getCalibrationStats = query({
  args: {},
  handler: async ctx => {
    const allMetrics = await ctx.db.query('confidenceAccuracyMetrics').collect()

    const stats = {
      totalRecords: allMetrics.length,
      totalSamples: allMetrics.reduce((sum, m) => sum + m.sampleCount, 0),
      averageAccuracy:
        allMetrics.reduce((sum, m) => sum + m.actualAccuracy, 0) /
        allMetrics.length,
      calibrationsByType: {} as Record<string, any>,
    }

    // Group by statement type
    for (const metric of allMetrics) {
      if (!stats.calibrationsByType[metric.statementType]) {
        stats.calibrationsByType[metric.statementType] = {
          records: 0,
          samples: 0,
          avgAccuracy: 0,
          avgOffset: 0,
        }
      }

      const typeStats = stats.calibrationsByType[metric.statementType]
      typeStats.records++
      typeStats.samples += metric.sampleCount
      typeStats.avgAccuracy += metric.actualAccuracy
      typeStats.avgOffset += metric.calibrationOffset
    }

    // Calculate averages
    for (const type in stats.calibrationsByType) {
      const typeStats = stats.calibrationsByType[type]
      typeStats.avgAccuracy /= typeStats.records
      typeStats.avgOffset /= typeStats.records
    }

    return stats
  },
})
