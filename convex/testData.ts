import { mutation } from './_generated/server'
import { v } from 'convex/values'

// Setup test data for the feedback-based prompt tuning system
export const setupTestData = mutation({
  args: {
    reset: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.reset) {
      // Clear existing test data
      const thresholds = await ctx.db.query('feedbackThresholds').collect()
      const alerts = await ctx.db.query('thresholdAlerts').collect()
      const proposals = await ctx.db.query('promptProposals').collect()
      const patterns = await ctx.db.query('failurePatterns').collect()
      const metrics = await ctx.db.query('learningMetrics').collect()

      for (const item of [
        ...thresholds,
        ...alerts,
        ...proposals,
        ...patterns,
        ...metrics,
      ]) {
        await ctx.db.delete(item._id)
      }
    }

    const now = Date.now()
    const results = {
      thresholds: 0,
      promptVersions: 0,
      patterns: 0,
      metrics: 0,
    }

    // Create test prompt versions
    const systemPromptId = await ctx.db.insert('promptVersions', {
      version: 'v1.0.0',
      promptType: 'system',
      content: `You are an AI assistant that analyzes user messages for:
1. Statement type classification
2. Belief extraction
3. Trade-off identification
4. Confidence assessment

Provide structured analysis with high accuracy.`,
      isActive: true,
      performanceBaseline: {
        approvalRate: 0.73,
        voteCount: 1247,
        confidenceAccuracy: 0.67,
      },
      createdAt: now,
      createdBy: 'system_admin',
    })

    results.promptVersions++

    // Initialize default thresholds
    const defaultThresholds = [
      {
        name: 'overall_approval_rate',
        threshold: 0.7,
        window: '24h',
        metric: 'approval_rate' as const,
        action: 'immediate' as const,
        isActive: true,
      },
      {
        name: 'question_approval_rate',
        threshold: 0.5,
        window: '7d',
        metric: 'approval_rate' as const,
        action: 'immediate' as const,
        isActive: true,
      },
      {
        name: 'confidence_calibration_gap',
        threshold: 0.3,
        window: '24h',
        metric: 'confidence_gap' as const,
        action: 'batch' as const,
        isActive: true,
      },
    ]

    for (const threshold of defaultThresholds) {
      await ctx.db.insert('feedbackThresholds', {
        ...threshold,
        createdAt: now,
        updatedAt: now,
      })
      results.thresholds++
    }

    // Create test failure patterns
    const testPatterns = [
      {
        category: 'question_misinterpretation' as const,
        pattern: 'Questions being misunderstood or answered incorrectly',
        frequency: 23,
        impactScore: 45.2,
        lastDetected: now - 2 * 60 * 60 * 1000, // 2 hours ago
      },
      {
        category: 'belief_extraction_missing' as const,
        pattern: 'Analyses missing belief extraction',
        frequency: 18,
        impactScore: 32.8,
        lastDetected: now - 1 * 60 * 60 * 1000, // 1 hour ago
      },
      {
        category: 'confidence_overestimation' as const,
        pattern: 'High confidence with low user approval',
        frequency: 15,
        impactScore: 28.5,
        lastDetected: now - 30 * 60 * 1000, // 30 minutes ago
      },
    ]

    for (const pattern of testPatterns) {
      await ctx.db.insert('failurePatterns', {
        ...pattern,
        exampleAnalyses: [], // Would need actual analysis IDs
        createdAt: now,
        updatedAt: now,
      })
      results.patterns++
    }

    // Create test learning metrics for the last 7 days
    const dates = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      dates.push(date.toISOString().split('T')[0])
    }

    const baseApproval = 0.68
    const baseQuestionApproval = 0.44

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i]
      const trend = i * 0.01 // Slight upward trend

      await ctx.db.insert('learningMetrics', {
        date,
        improvementCycles: Math.floor(Math.random() * 3) + 1,
        averageApprovalGain: 0.02 + Math.random() * 0.03,
        successfulChanges: Math.floor(Math.random() * 2),
        rollbackCount: Math.random() < 0.1 ? 1 : 0,
        timeToImprovement: 45 + Math.random() * 60, // 45-105 minutes
        overallApprovalRate: Math.min(
          0.85,
          baseApproval + trend + (Math.random() * 0.02 - 0.01)
        ),
        questionApprovalRate: Math.min(
          0.7,
          baseQuestionApproval + trend + (Math.random() * 0.03 - 0.015)
        ),
        confidenceCalibrationGap: Math.max(
          0.1,
          0.25 - trend * 0.5 + (Math.random() * 0.04 - 0.02)
        ),
        createdAt: new Date(`${date}T12:00:00.000Z`).getTime(),
      })
      results.metrics++
    }

    // Create a test prompt proposal
    await ctx.db.insert('promptProposals', {
      currentPromptId: systemPromptId,
      proposedContent: `Enhanced question analysis guidelines:

When analyzing questions, follow these steps:
1. Identify the question type (information-seeking, opinion, clarification)
2. Extract any assumptions embedded in the question
3. Consider multiple interpretation angles
4. Provide structured belief and trade-off analysis

This should improve question analysis accuracy from 44% to ~65%.`,
      changeType: 'modification',
      rationale:
        'Question analysis is performing poorly at 44% approval. Enhanced guidance should improve understanding of question intent and context.',
      evidenceAnalyses: [],
      expectedImprovement: 0.21,
      status: 'pending',
      createdAt: now,
    })

    return {
      success: true,
      message: 'Test data setup complete',
      results,
      timestamp: now,
    }
  },
})

// Create test threshold breach
export const createTestThresholdBreach = mutation({
  args: {},
  handler: async ctx => {
    const questionThreshold = await ctx.db
      .query('feedbackThresholds')
      .withIndex('by_name', q => q.eq('name', 'question_approval_rate'))
      .first()

    if (!questionThreshold) {
      throw new Error('Question threshold not found - run setupTestData first')
    }

    const now = Date.now()
    const alertId = await ctx.db.insert('thresholdAlerts', {
      thresholdId: questionThreshold._id,
      breachValue: 0.43, // Below 50% threshold
      breachTime: now,
      windowStart: now - 7 * 24 * 60 * 60 * 1000, // 7 days ago
      windowEnd: now,
      affectedAnalyses: [], // Would need actual analysis IDs
      status: 'pending',
      createdAt: now,
    })

    return {
      success: true,
      alertId,
      breachValue: 0.43,
      threshold: questionThreshold.threshold,
    }
  },
})

// Test the complete pipeline
export const testCompletePipeline = mutation({
  args: {},
  handler: async ctx => {
    const results = []

    try {
      // Step 1: Setup test data
      const setupResult = await setupTestData(ctx, { reset: true })
      results.push({ step: 'setup', success: true, data: setupResult })

      // Step 2: Create threshold breach
      const breachResult = await createTestThresholdBreach(ctx, {})
      results.push({ step: 'create_breach', success: true, data: breachResult })

      // Step 3: Run threshold check
      const thresholdResult = await ctx.runMutation(
        'feedbackMonitoring:checkThresholdBreaches',
        {}
      )
      results.push({
        step: 'check_thresholds',
        success: true,
        data: thresholdResult,
      })

      // Step 4: Generate refinements
      if (thresholdResult.breaches && thresholdResult.breaches.length > 0) {
        const refinementResult = await ctx.runMutation(
          'promptRefinement:analyzeFailurePatternsAndGenerateRefinements',
          {
            alertId: thresholdResult.breaches[0].alertId,
          }
        )
        results.push({
          step: 'generate_refinements',
          success: true,
          data: refinementResult,
        })
      }

      // Step 5: Update patterns
      const patternResult = await ctx.runMutation(
        'improvementMapping:updateFailurePatterns',
        {}
      )
      results.push({
        step: 'update_patterns',
        success: true,
        data: patternResult,
      })

      // Step 6: Calculate metrics
      const metricsResult = await ctx.runMutation(
        'learningMetrics:calculateDailyMetrics',
        {}
      )
      results.push({
        step: 'calculate_metrics',
        success: true,
        data: metricsResult,
      })

      return {
        success: true,
        message: 'Complete pipeline test successful',
        steps: results,
        timestamp: Date.now(),
      }
    } catch (error) {
      results.push({
        step: 'error',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      return {
        success: false,
        message: 'Pipeline test failed',
        steps: results,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      }
    }
  },
})
