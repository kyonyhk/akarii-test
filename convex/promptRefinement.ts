import { mutation, query, internalMutation } from './_generated/server'
import { v } from 'convex/values'

// Analyze failure patterns and generate improvement suggestions
export const analyzeFailurePatternsAndGenerateRefinements = internalMutation({
  args: {
    alertId: v.optional(v.id('thresholdAlerts')),
    windowHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const windowHours = args.windowHours || 24
    const windowStart = Date.now() - windowHours * 60 * 60 * 1000

    // Get low-performing analyses from the time window
    const analyses = await ctx.db
      .query('analyses')
      .withIndex('by_created_at', q => q.gte('createdAt', windowStart))
      .collect()

    // Filter for analyses with low approval rates (< 50%)
    const lowPerformingAnalyses = analyses.filter(analysis => {
      const totalVotes = analysis.thumbsUp + analysis.thumbsDown
      if (totalVotes === 0) return false
      const approvalRate = analysis.thumbsUp / totalVotes
      return approvalRate < 0.5
    })

    if (lowPerformingAnalyses.length === 0) {
      return { message: 'No low-performing analyses found', patterns: [] }
    }

    // Group by failure patterns
    const patterns = await identifyFailurePatterns(lowPerformingAnalyses)

    // Generate improvement suggestions for each pattern
    const refinements = []

    for (const pattern of patterns) {
      const refinement = await generatePromptRefinement(pattern)
      if (refinement) {
        // Get current active prompt version
        const currentPrompt = await ctx.db
          .query('promptVersions')
          .withIndex('by_active', q => q.eq('isActive', true))
          .first()

        if (currentPrompt) {
          const proposalId = await ctx.db.insert('promptProposals', {
            triggerId: args.alertId,
            currentPromptId: currentPrompt._id,
            proposedContent: refinement.proposedContent,
            changeType: refinement.changeType,
            rationale: refinement.rationale,
            evidenceAnalyses: pattern.exampleAnalyses,
            expectedImprovement: refinement.expectedImprovement,
            status: 'pending',
            createdAt: Date.now(),
          })

          refinements.push({
            proposalId,
            pattern: pattern.category,
            refinement,
          })
        }
      }
    }

    return {
      patterns,
      refinements,
      totalAnalyzed: lowPerformingAnalyses.length,
    }
  },
})

// Identify common failure patterns in low-performing analyses
async function identifyFailurePatterns(analyses: any[]): Promise<any[]> {
  const patterns: Map<string, any> = new Map()

  for (const analysis of analyses) {
    // Question misinterpretation pattern
    if (analysis.statementType === 'question') {
      const totalVotes = analysis.thumbsUp + analysis.thumbsDown
      const approvalRate = analysis.thumbsUp / totalVotes

      if (approvalRate < 0.4) {
        const key = 'question_misinterpretation'
        if (!patterns.has(key)) {
          patterns.set(key, {
            category: key,
            pattern: 'Questions being misunderstood or answered incorrectly',
            frequency: 0,
            impactScore: 0,
            exampleAnalyses: [],
          })
        }
        const pattern = patterns.get(key)!
        pattern.frequency += 1
        pattern.impactScore += (0.4 - approvalRate) * 100
        if (pattern.exampleAnalyses.length < 5) {
          pattern.exampleAnalyses.push(analysis._id)
        }
      }
    }

    // Missing belief extraction
    if (analysis.beliefs.length === 0) {
      const key = 'belief_extraction_missing'
      if (!patterns.has(key)) {
        patterns.set(key, {
          category: key,
          pattern: 'Analyses missing belief extraction',
          frequency: 0,
          impactScore: 0,
          exampleAnalyses: [],
        })
      }
      const pattern = patterns.get(key)!
      pattern.frequency += 1
      pattern.impactScore += 15 // Fixed penalty for missing beliefs
      if (pattern.exampleAnalyses.length < 5) {
        pattern.exampleAnalyses.push(analysis._id)
      }
    }

    // Shallow trade-off analysis
    if (analysis.tradeOffs.length === 0) {
      const key = 'tradeoff_analysis_shallow'
      if (!patterns.has(key)) {
        patterns.set(key, {
          category: key,
          pattern: 'Analyses missing trade-off identification',
          frequency: 0,
          impactScore: 0,
          exampleAnalyses: [],
        })
      }
      const pattern = patterns.get(key)!
      pattern.frequency += 1
      pattern.impactScore += 10 // Fixed penalty for missing trade-offs
      if (pattern.exampleAnalyses.length < 5) {
        pattern.exampleAnalyses.push(analysis._id)
      }
    }

    // Confidence overestimation
    if (analysis.confidenceLevel > 80) {
      const totalVotes = analysis.thumbsUp + analysis.thumbsDown
      if (totalVotes > 0) {
        const approvalRate = analysis.thumbsUp / totalVotes
        const confidenceGap = analysis.confidenceLevel / 100 - approvalRate

        if (confidenceGap > 0.3) {
          const key = 'confidence_overestimation'
          if (!patterns.has(key)) {
            patterns.set(key, {
              category: key,
              pattern: 'High confidence with low user approval',
              frequency: 0,
              impactScore: 0,
              exampleAnalyses: [],
            })
          }
          const pattern = patterns.get(key)!
          pattern.frequency += 1
          pattern.impactScore += confidenceGap * 100
          if (pattern.exampleAnalyses.length < 5) {
            pattern.exampleAnalyses.push(analysis._id)
          }
        }
      }
    }
  }

  return Array.from(patterns.values()).sort(
    (a, b) => b.impactScore - a.impactScore
  )
}

// Generate specific prompt refinement suggestions based on failure patterns
async function generatePromptRefinement(pattern: any): Promise<any> {
  const refinements: Record<string, any> = {
    question_misinterpretation: {
      changeType: 'modification',
      proposedContent: `When analyzing questions, follow these enhanced guidelines:

1. **Question Intent Recognition**: 
   - Identify whether the question is seeking information, clarification, opinion, or action
   - Consider the context and implied assumptions in the question
   - Look for hidden presuppositions that may affect the analysis

2. **Response Structure for Questions**:
   - Directly address what the question is asking
   - Identify any underlying beliefs or assumptions in the question itself
   - Consider alternative interpretations of ambiguous questions

3. **Enhanced Question Analysis Framework**:
   - What information is the questioner seeking?
   - What assumptions does the question contain?
   - What beliefs might influence how this question should be answered?
   - What trade-offs exist in different potential answers?`,
      rationale:
        'Question analyses are performing poorly (below 40% approval). Enhanced guidance for understanding question intent and context should improve accuracy.',
      expectedImprovement: 0.25, // 25% improvement expected
    },

    belief_extraction_missing: {
      changeType: 'addition',
      proposedContent: `**CRITICAL: Belief Extraction Requirements**

For EVERY analysis, you must identify and extract beliefs, even if subtle:

- **Explicit beliefs**: Direct statements of what someone thinks is true
- **Implicit beliefs**: Underlying assumptions or values reflected in the message
- **Cultural/contextual beliefs**: Beliefs implied by cultural or social context
- **Methodological beliefs**: Beliefs about how things should be done or approached

If a message seems to contain no beliefs, look deeper:
- What assumptions does the speaker make?
- What values are reflected in their choice of words?
- What do they take for granted as true?

Format beliefs as clear, declarative statements starting with "The person believes that..."`,
      rationale:
        'Many analyses are missing belief extraction entirely. Clear requirements and examples should improve identification.',
      expectedImprovement: 0.35, // 35% improvement expected
    },

    tradeoff_analysis_shallow: {
      changeType: 'addition',
      proposedContent: `**CRITICAL: Trade-off Analysis Requirements**

For EVERY analysis, identify relevant trade-offs even if not explicitly mentioned:

- **Direct trade-offs**: Explicitly mentioned competing priorities
- **Implicit trade-offs**: Competing values or priorities suggested by the context
- **Resource trade-offs**: Time, money, attention, or effort trade-offs
- **Value trade-offs**: Competing principles or priorities
- **Outcome trade-offs**: Different potential consequences

Trade-off identification framework:
1. What is being prioritized in this message?
2. What might be de-prioritized as a result?
3. What are the potential costs of this choice?
4. What alternative approaches might have different trade-offs?

Format as "Choosing X over Y involves trading off..."`,
      rationale:
        'Many analyses lack trade-off identification. Systematic framework should improve detection of implicit trade-offs.',
      expectedImprovement: 0.3, // 30% improvement expected
    },

    confidence_overestimation: {
      changeType: 'modification',
      proposedContent: `**Confidence Calibration Guidelines**

Your confidence score (0-100) should reflect the likelihood that users will find your analysis accurate and useful:

- **90-100**: Only for very clear, unambiguous messages with obvious analysis
- **80-89**: Clear analysis with high certainty, but some room for interpretation
- **70-79**: Good analysis with reasonable certainty, some subjective elements
- **60-69**: Moderate confidence, significant interpretation required
- **50-59**: Low confidence, highly subjective or ambiguous content
- **Below 50**: Very uncertain, unclear message content

**Calibration factors to consider**:
- Ambiguity in the original message
- Subjectivity of the analysis required
- Cultural or contextual factors that might affect interpretation
- Complexity of extracting beliefs and trade-offs

Be conservative with confidence scores - it's better to underestimate than overestimate.`,
      rationale:
        'Confidence scores are poorly calibrated with user approval. Better calibration guidelines should improve accuracy.',
      expectedImprovement: 0.2, // 20% improvement expected
    },
  }

  return refinements[pattern.category] || null
}

// Get pending prompt proposals for review
export const getPendingPromptProposals = query({
  args: {},
  handler: async ctx => {
    const proposals = await ctx.db
      .query('promptProposals')
      .withIndex('by_status', q => q.eq('status', 'pending'))
      .order('desc')
      .collect()

    const enrichedProposals = []
    for (const proposal of proposals) {
      const currentPrompt = await ctx.db.get(proposal.currentPromptId)
      let trigger = null
      if (proposal.triggerId) {
        trigger = await ctx.db.get(proposal.triggerId)
      }

      // Get evidence analyses
      const evidenceAnalyses = []
      for (const analysisId of proposal.evidenceAnalyses.slice(0, 3)) {
        // Limit to 3 examples
        const analysis = await ctx.db.get(analysisId)
        if (analysis) {
          const message = await ctx.db.get(analysis.messageId)
          evidenceAnalyses.push({
            analysis,
            message,
            approvalRate:
              analysis.thumbsUp / (analysis.thumbsUp + analysis.thumbsDown),
          })
        }
      }

      enrichedProposals.push({
        ...proposal,
        currentPrompt,
        trigger,
        evidenceAnalyses,
      })
    }

    return enrichedProposals
  },
})

// Approve or reject a prompt proposal
export const reviewPromptProposal = mutation({
  args: {
    proposalId: v.id('promptProposals'),
    decision: v.union(v.literal('approved'), v.literal('rejected')),
    reviewNotes: v.string(),
    reviewerName: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.proposalId, {
      status: args.decision,
      reviewer: args.reviewerName,
      reviewNotes: args.reviewNotes,
      reviewedAt: Date.now(),
    })

    // If approved, we could trigger A/B test setup here
    if (args.decision === 'approved') {
      // TODO: Set up A/B test for the approved proposal
      // This would be implemented in the A/B testing system
    }

    return { success: true, decision: args.decision }
  },
})

// Get prompt refinement analytics
export const getPromptRefinementAnalytics = query({
  args: {
    daysBack: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysBack = args.daysBack || 7
    const windowStart = Date.now() - daysBack * 24 * 60 * 60 * 1000

    const proposals = await ctx.db
      .query('promptProposals')
      .withIndex('by_created_at', q => q.gte('createdAt', windowStart))
      .collect()

    const analytics = {
      totalProposals: proposals.length,
      pendingReview: proposals.filter(p => p.status === 'pending').length,
      approved: proposals.filter(p => p.status === 'approved').length,
      rejected: proposals.filter(p => p.status === 'rejected').length,
      testing: proposals.filter(p => p.status === 'testing').length,
      deployed: proposals.filter(p => p.status === 'deployed').length,
      averageExpectedImprovement:
        proposals.length > 0
          ? proposals.reduce((sum, p) => sum + p.expectedImprovement, 0) /
            proposals.length
          : 0,
      proposalsByChangeType: {
        addition: proposals.filter(p => p.changeType === 'addition').length,
        modification: proposals.filter(p => p.changeType === 'modification')
          .length,
        removal: proposals.filter(p => p.changeType === 'removal').length,
      },
    }

    return analytics
  },
})

// Manually trigger pattern analysis (for testing)
export const manualPatternAnalysis = mutation({
  args: {
    windowHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await analyzeFailurePatternsAndGenerateRefinements(ctx, {
      windowHours: args.windowHours,
    })
  },
})
