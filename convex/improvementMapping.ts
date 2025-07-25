import { mutation, query, internalMutation } from './_generated/server'
import { v } from 'convex/values'

// Update failure patterns based on new analysis data
export const updateFailurePatterns = internalMutation({
  args: {
    windowHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const windowHours = args.windowHours || 24
    const windowStart = Date.now() - windowHours * 60 * 60 * 1000

    // Get recent analyses for pattern detection
    const analyses = await ctx.db
      .query('analyses')
      .withIndex('by_created_at', q => q.gte('createdAt', windowStart))
      .collect()

    // Calculate current failure categories
    const categoryStats = {
      question_misinterpretation: {
        count: 0,
        totalImpact: 0,
        examples: [] as any[],
      },
      belief_extraction_missing: {
        count: 0,
        totalImpact: 0,
        examples: [] as any[],
      },
      tradeoff_analysis_shallow: {
        count: 0,
        totalImpact: 0,
        examples: [] as any[],
      },
      confidence_overestimation: {
        count: 0,
        totalImpact: 0,
        examples: [] as any[],
      },
      statement_type_misclassification: {
        count: 0,
        totalImpact: 0,
        examples: [] as any[],
      },
    }

    for (const analysis of analyses) {
      const totalVotes = analysis.thumbsUp + analysis.thumbsDown
      if (totalVotes === 0) continue

      const approvalRate = analysis.thumbsUp / totalVotes

      // Question misinterpretation
      if (analysis.statementType === 'question' && approvalRate < 0.5) {
        categoryStats.question_misinterpretation.count++
        categoryStats.question_misinterpretation.totalImpact +=
          (0.5 - approvalRate) * 100
        if (categoryStats.question_misinterpretation.examples.length < 5) {
          categoryStats.question_misinterpretation.examples.push(analysis._id)
        }
      }

      // Missing belief extraction
      if (analysis.beliefs.length === 0 && approvalRate < 0.7) {
        categoryStats.belief_extraction_missing.count++
        categoryStats.belief_extraction_missing.totalImpact += 15
        if (categoryStats.belief_extraction_missing.examples.length < 5) {
          categoryStats.belief_extraction_missing.examples.push(analysis._id)
        }
      }

      // Shallow trade-off analysis
      if (analysis.tradeOffs.length === 0 && approvalRate < 0.7) {
        categoryStats.tradeoff_analysis_shallow.count++
        categoryStats.tradeoff_analysis_shallow.totalImpact += 10
        if (categoryStats.tradeoff_analysis_shallow.examples.length < 5) {
          categoryStats.tradeoff_analysis_shallow.examples.push(analysis._id)
        }
      }

      // Confidence overestimation
      if (analysis.confidenceLevel > 70) {
        const confidenceGap = analysis.confidenceLevel / 100 - approvalRate
        if (confidenceGap > 0.2) {
          categoryStats.confidence_overestimation.count++
          categoryStats.confidence_overestimation.totalImpact +=
            confidenceGap * 100
          if (categoryStats.confidence_overestimation.examples.length < 5) {
            categoryStats.confidence_overestimation.examples.push(analysis._id)
          }
        }
      }
    }

    // Update or create failure pattern records
    const now = Date.now()
    const updatedPatterns = []

    for (const [category, stats] of Object.entries(categoryStats)) {
      if (stats.count > 0) {
        // Check if pattern already exists
        const existingPattern = await ctx.db
          .query('failurePatterns')
          .withIndex('by_category', q => q.eq('category', category as any))
          .first()

        const impactScore = Math.min(100, stats.totalImpact / stats.count)

        if (existingPattern) {
          // Update existing pattern
          await ctx.db.patch(existingPattern._id, {
            frequency: stats.count,
            impactScore,
            exampleAnalyses: stats.examples,
            lastDetected: now,
            updatedAt: now,
          })
          updatedPatterns.push({
            ...existingPattern,
            frequency: stats.count,
            impactScore,
          })
        } else {
          // Create new pattern
          const patternId = await ctx.db.insert('failurePatterns', {
            category: category as any,
            pattern: getPatternDescription(category),
            frequency: stats.count,
            impactScore,
            exampleAnalyses: stats.examples,
            lastDetected: now,
            createdAt: now,
            updatedAt: now,
          })
          updatedPatterns.push({
            _id: patternId,
            category,
            frequency: stats.count,
            impactScore,
          })
        }
      }
    }

    return {
      windowAnalyzed: windowHours,
      totalAnalyses: analyses.length,
      patternsDetected: updatedPatterns.length,
      patterns: updatedPatterns,
    }
  },
})

// Get improvement strategy recommendations based on current patterns
export const getImprovementStrategies = query({
  args: {},
  handler: async ctx => {
    const patterns = await ctx.db
      .query('failurePatterns')
      .withIndex('by_impact', q => q.gte('impactScore', 5))
      .order('desc')
      .collect()

    const strategies = []

    for (const pattern of patterns) {
      const strategy = getImprovementStrategy(pattern.category)
      if (strategy) {
        // Check if improvement has been applied recently
        const recentProposal = pattern.improvementApplied
          ? await ctx.db.get(pattern.improvementApplied)
          : null

        strategies.push({
          pattern,
          strategy,
          recentImprovement: recentProposal,
          priority: calculatePriority(pattern.frequency, pattern.impactScore),
        })
      }
    }

    return strategies.sort((a, b) => b.priority - a.priority)
  },
})

// Apply an improvement strategy to a failure pattern
export const applyImprovementStrategy = mutation({
  args: {
    patternId: v.id('failurePatterns'),
    proposalId: v.id('promptProposals'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.patternId, {
      improvementApplied: args.proposalId,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

// Track improvement success rates
export const trackImprovementSuccess = mutation({
  args: {
    proposalId: v.id('promptProposals'),
    beforeMetrics: v.object({
      approvalRate: v.number(),
      voteCount: v.number(),
      confidenceAccuracy: v.number(),
    }),
    afterMetrics: v.object({
      approvalRate: v.number(),
      voteCount: v.number(),
      confidenceAccuracy: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId)
    if (!proposal) return { success: false, error: 'Proposal not found' }

    // Calculate actual improvement
    const actualImprovement =
      args.afterMetrics.approvalRate - args.beforeMetrics.approvalRate
    const expectedImprovement = proposal.expectedImprovement
    const improvementAccuracy = Math.abs(
      actualImprovement - expectedImprovement
    )

    // Update the proposal with actual results
    await ctx.db.patch(args.proposalId, {
      status: 'deployed',
      // Could add actual results field to schema
    })

    // Find related failure patterns and update their success tracking
    const patterns = await ctx.db
      .query('failurePatterns')
      .withIndex('by_category', q =>
        q.eq('improvementApplied', args.proposalId)
      )
      .collect()

    for (const pattern of patterns) {
      // Update pattern with success metrics (could extend schema for this)
      await ctx.db.patch(pattern._id, {
        updatedAt: Date.now(),
      })
    }

    return {
      success: true,
      actualImprovement,
      expectedImprovement,
      improvementAccuracy,
      affectedPatterns: patterns.length,
    }
  },
})

// Get improvement mapping dashboard data
export const getImprovementMappingDashboard = query({
  args: {},
  handler: async ctx => {
    const patterns = await ctx.db.query('failurePatterns').collect()
    const proposals = await ctx.db.query('promptProposals').collect()

    // Calculate success rates by category
    const categorySuccess: Record<string, any> = {}

    for (const pattern of patterns) {
      if (!categorySuccess[pattern.category]) {
        categorySuccess[pattern.category] = {
          totalPatterns: 0,
          withImprovements: 0,
          averageImpact: 0,
          recentFrequency: 0,
        }
      }

      const cat = categorySuccess[pattern.category]
      cat.totalPatterns++
      cat.averageImpact += pattern.impactScore
      cat.recentFrequency += pattern.frequency

      if (pattern.improvementApplied) {
        cat.withImprovements++
      }
    }

    // Finalize averages
    Object.values(categorySuccess).forEach((cat: any) => {
      if (cat.totalPatterns > 0) {
        cat.averageImpact /= cat.totalPatterns
        cat.coverageRate = cat.withImprovements / cat.totalPatterns
      }
    })

    // Get recent improvement trends
    const last30Days = Date.now() - 30 * 24 * 60 * 60 * 1000
    const recentProposals = proposals.filter(p => p.createdAt >= last30Days)

    return {
      totalPatterns: patterns.length,
      activePatterns: patterns.filter(p => p.frequency > 0).length,
      coveredPatterns: patterns.filter(p => p.improvementApplied).length,
      categoryBreakdown: categorySuccess,
      recentActivity: {
        proposalsCreated: recentProposals.length,
        approved: recentProposals.filter(p => p.status === 'approved').length,
        deployed: recentProposals.filter(p => p.status === 'deployed').length,
        avgExpectedImprovement:
          recentProposals.length > 0
            ? recentProposals.reduce(
                (sum, p) => sum + p.expectedImprovement,
                0
              ) / recentProposals.length
            : 0,
      },
      topPatterns: patterns
        .sort((a, b) => b.impactScore - a.impactScore)
        .slice(0, 5)
        .map(p => ({
          category: p.category,
          impact: p.impactScore,
          frequency: p.frequency,
          hasImprovement: !!p.improvementApplied,
        })),
    }
  },
})

// Manual trigger for pattern update (for testing)
export const manualPatternUpdate = mutation({
  args: {
    windowHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await updateFailurePatterns(ctx, { windowHours: args.windowHours })
  },
})

// Helper functions
function getPatternDescription(category: string): string {
  const descriptions: Record<string, string> = {
    question_misinterpretation:
      'Questions being misunderstood or answered incorrectly',
    belief_extraction_missing: 'Analyses missing belief extraction',
    tradeoff_analysis_shallow: 'Analyses missing trade-off identification',
    confidence_overestimation: 'High confidence with low user approval',
    statement_type_misclassification:
      'Incorrect classification of statement types',
  }
  return descriptions[category] || 'Unknown pattern'
}

function getImprovementStrategy(category: string): any {
  const strategies: Record<string, any> = {
    question_misinterpretation: {
      type: 'prompt_modification',
      focus: 'question_understanding',
      techniques: [
        'intent_recognition',
        'context_analysis',
        'assumption_identification',
      ],
      expectedTimeframe: '1-2 weeks',
      successMetrics: ['question_approval_rate', 'user_satisfaction'],
    },
    belief_extraction_missing: {
      type: 'prompt_addition',
      focus: 'belief_identification',
      techniques: [
        'explicit_belief_prompts',
        'assumption_detection',
        'value_inference',
      ],
      expectedTimeframe: '3-5 days',
      successMetrics: ['belief_extraction_rate', 'belief_accuracy'],
    },
    tradeoff_analysis_shallow: {
      type: 'prompt_addition',
      focus: 'tradeoff_detection',
      techniques: [
        'competing_priorities',
        'resource_analysis',
        'outcome_comparison',
      ],
      expectedTimeframe: '3-5 days',
      successMetrics: ['tradeoff_identification_rate', 'tradeoff_relevance'],
    },
    confidence_overestimation: {
      type: 'prompt_modification',
      focus: 'confidence_calibration',
      techniques: [
        'uncertainty_assessment',
        'evidence_weighting',
        'conservative_scoring',
      ],
      expectedTimeframe: '1 week',
      successMetrics: ['confidence_accuracy', 'calibration_error'],
    },
    statement_type_misclassification: {
      type: 'prompt_modification',
      focus: 'classification_accuracy',
      techniques: [
        'type_definitions',
        'example_clarification',
        'boundary_specification',
      ],
      expectedTimeframe: '1 week',
      successMetrics: ['classification_accuracy', 'type_consistency'],
    },
  }
  return strategies[category] || null
}

function calculatePriority(frequency: number, impactScore: number): number {
  // Priority = frequency * impact, with frequency weighted more heavily
  return frequency * 2 + impactScore
}
