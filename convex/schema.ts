import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // User management
  users: defineTable({
    clerkId: v.string(),
    name: v.optional(v.string()),
    email: v.string(),
    avatar: v.optional(v.string()),
    role: v.union(
      v.literal('admin'),
      v.literal('user'),
      v.literal('guest'),
      v.literal('member')
    ),
    teamId: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    joinedAt: v.optional(v.number()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index('by_clerk_id', ['clerkId'])
    .index('by_email', ['email'])
    .index('by_team', ['teamId']),

  // Teams for multi-user workspaces
  teams: defineTable({
    name: v.string(),
    slug: v.string(),
    ownerId: v.string(),
    settings: v.optional(v.any()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_owner', ['ownerId'])
    .index('by_slug', ['slug']),

  // Conversations
  conversations: defineTable({
    title: v.optional(v.string()),
    participants: v.array(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_created_at', ['createdAt'])
    .index('by_updated_at', ['updatedAt']),

  messages: defineTable({
    content: v.string(),
    userId: v.string(),
    username: v.optional(v.string()),
    timestamp: v.number(),
    conversationId: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_conversation', ['conversationId'])
    .index('by_timestamp', ['timestamp']),

  analyses: defineTable({
    messageId: v.id('messages'),
    statementType: v.union(
      v.literal('question'),
      v.literal('opinion'),
      v.literal('fact'),
      v.literal('request'),
      v.literal('other')
    ),
    beliefs: v.array(v.string()),
    tradeOffs: v.array(v.string()),
    confidenceLevel: v.number(),
    rawData: v.any(),
    createdAt: v.number(),
    thumbsUp: v.number(),
    thumbsDown: v.number(),
    userVotes: v.array(
      v.object({
        userId: v.string(),
        voteType: v.union(v.literal('up'), v.literal('down')),
        timestamp: v.number(),
      })
    ),
  })
    .index('by_message', ['messageId'])
    .index('by_thumbs_up', ['thumbsUp'])
    .index('by_thumbs_down', ['thumbsDown'])
    .index('by_created_at', ['createdAt']),

  // New tables for feedback-based prompt tuning

  // Feedback threshold monitoring
  feedbackThresholds: defineTable({
    name: v.string(), // 'overall_approval', 'question_approval', 'confidence_gap'
    threshold: v.number(), // 0.7 for 70%
    window: v.string(), // '1h', '24h', '7d'
    metric: v.union(
      v.literal('approval_rate'),
      v.literal('vote_count'),
      v.literal('confidence_gap')
    ),
    action: v.union(
      v.literal('immediate'),
      v.literal('batch'),
      v.literal('scheduled')
    ),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_name', ['name'])
    .index('by_active', ['isActive']),

  // Threshold breach alerts
  thresholdAlerts: defineTable({
    thresholdId: v.id('feedbackThresholds'),
    breachValue: v.number(),
    breachTime: v.number(),
    windowStart: v.number(),
    windowEnd: v.number(),
    affectedAnalyses: v.array(v.id('analyses')),
    status: v.union(
      v.literal('pending'),
      v.literal('acknowledged'),
      v.literal('resolved')
    ),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_threshold', ['thresholdId'])
    .index('by_status', ['status'])
    .index('by_created_at', ['createdAt']),

  // Prompt versions and changes
  promptVersions: defineTable({
    version: v.string(), // 'v1.0.0', 'v1.0.1', etc.
    promptType: v.union(
      v.literal('system'),
      v.literal('user'),
      v.literal('examples')
    ),
    content: v.string(),
    isActive: v.boolean(),
    performanceBaseline: v.optional(
      v.object({
        approvalRate: v.number(),
        voteCount: v.number(),
        confidenceAccuracy: v.number(),
      })
    ),
    createdAt: v.number(),
    createdBy: v.string(),
  })
    .index('by_version', ['version'])
    .index('by_type', ['promptType'])
    .index('by_active', ['isActive']),

  // Prompt improvement proposals
  promptProposals: defineTable({
    triggerId: v.optional(v.id('thresholdAlerts')),
    currentPromptId: v.id('promptVersions'),
    proposedContent: v.string(),
    changeType: v.union(
      v.literal('addition'),
      v.literal('modification'),
      v.literal('removal')
    ),
    rationale: v.string(),
    evidenceAnalyses: v.array(v.id('analyses')),
    expectedImprovement: v.number(), // Expected approval rate improvement
    status: v.union(
      v.literal('pending'),
      v.literal('approved'),
      v.literal('rejected'),
      v.literal('testing'),
      v.literal('deployed')
    ),
    reviewer: v.optional(v.string()),
    reviewNotes: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_trigger', ['triggerId'])
    .index('by_status', ['status'])
    .index('by_created_at', ['createdAt']),

  // A/B testing for prompt changes
  promptAbTests: defineTable({
    proposalId: v.id('promptProposals'),
    name: v.string(),
    controlPromptId: v.id('promptVersions'),
    testPromptId: v.id('promptVersions'),
    trafficSplit: v.number(), // 0.5 for 50/50 split
    startTime: v.number(),
    endTime: v.optional(v.number()),
    status: v.union(
      v.literal('running'),
      v.literal('completed'),
      v.literal('stopped')
    ),
    results: v.optional(
      v.object({
        controlApprovalRate: v.number(),
        testApprovalRate: v.number(),
        controlVoteCount: v.number(),
        testVoteCount: v.number(),
        statisticalSignificance: v.number(),
        winner: v.union(
          v.literal('control'),
          v.literal('test'),
          v.literal('inconclusive')
        ),
      })
    ),
    createdAt: v.number(),
  })
    .index('by_proposal', ['proposalId'])
    .index('by_status', ['status'])
    .index('by_start_time', ['startTime']),

  // Failure pattern tracking
  failurePatterns: defineTable({
    category: v.union(
      v.literal('question_misinterpretation'),
      v.literal('belief_extraction_missing'),
      v.literal('tradeoff_analysis_shallow'),
      v.literal('confidence_overestimation'),
      v.literal('statement_type_misclassification')
    ),
    pattern: v.string(),
    frequency: v.number(),
    impactScore: v.number(), // 0-100
    exampleAnalyses: v.array(v.id('analyses')),
    lastDetected: v.number(),
    improvementApplied: v.optional(v.id('promptProposals')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_category', ['category'])
    .index('by_frequency', ['frequency'])
    .index('by_impact', ['impactScore']),

  // Learning metrics tracking
  learningMetrics: defineTable({
    date: v.string(), // 'YYYY-MM-DD'
    improvementCycles: v.number(),
    averageApprovalGain: v.number(),
    successfulChanges: v.number(),
    rollbackCount: v.number(),
    timeToImprovement: v.number(), // in minutes
    overallApprovalRate: v.number(),
    questionApprovalRate: v.number(),
    confidenceCalibrationGap: v.number(),
    createdAt: v.number(),
  })
    .index('by_date', ['date'])
    .index('by_created_at', ['createdAt']),

  // Human review queue for borderline analysis cases
  humanReviewQueue: defineTable({
    messageId: v.id('messages'),
    analysisId: v.optional(v.id('analyses')), // Set after analysis is approved
    originalContent: v.string(),
    proposedAnalysis: v.object({
      statementType: v.union(
        v.literal('question'),
        v.literal('opinion'),
        v.literal('fact'),
        v.literal('request'),
        v.literal('other')
      ),
      beliefs: v.array(v.string()),
      tradeOffs: v.array(v.string()),
      confidenceLevel: v.number(),
      reasoning: v.string(),
    }),
    qualityMetrics: v.object({
      overallScore: v.number(),
      qualityGrade: v.union(
        v.literal('A'),
        v.literal('B'),
        v.literal('C'),
        v.literal('D'),
        v.literal('F')
      ),
      dimensionScores: v.any(), // Record<string, number>
      flagCount: v.number(),
      blockingReasons: v.array(v.string()),
    }),
    reviewTriggers: v.array(v.string()), // Reasons why human review was triggered
    priority: v.union(
      v.literal('low'),
      v.literal('medium'),
      v.literal('high'),
      v.literal('urgent')
    ),
    status: v.union(
      v.literal('pending'),
      v.literal('in_review'),
      v.literal('approved'),
      v.literal('rejected'),
      v.literal('needs_revision'),
      v.literal('escalated')
    ),
    assignedReviewer: v.optional(v.string()),
    reviewStartedAt: v.optional(v.number()),
    reviewCompletedAt: v.optional(v.number()),
    reviewDecision: v.optional(
      v.object({
        action: v.union(
          v.literal('approve'),
          v.literal('reject'),
          v.literal('revise'),
          v.literal('escalate')
        ),
        revisedAnalysis: v.optional(
          v.object({
            statementType: v.union(
              v.literal('question'),
              v.literal('opinion'),
              v.literal('fact'),
              v.literal('request'),
              v.literal('other')
            ),
            beliefs: v.array(v.string()),
            tradeOffs: v.array(v.string()),
            confidenceLevel: v.number(),
            reasoning: v.string(),
          })
        ),
        reviewerNotes: v.string(),
        improvementSuggestions: v.optional(v.array(v.string())),
      })
    ),
    escalationReason: v.optional(v.string()),
    userContext: v.object({
      userId: v.string(),
      teamId: v.optional(v.string()),
      conversationId: v.string(),
      userTier: v.union(
        v.literal('free'),
        v.literal('pro'),
        v.literal('enterprise')
      ),
    }),
    automatedFlags: v.array(
      v.object({
        type: v.string(),
        severity: v.union(
          v.literal('low'),
          v.literal('medium'),
          v.literal('high')
        ),
        description: v.string(),
        suggestion: v.optional(v.string()),
      })
    ),
    slaDeadline: v.number(), // When review should be completed
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_message', ['messageId'])
    .index('by_status', ['status'])
    .index('by_priority', ['priority'])
    .index('by_reviewer', ['assignedReviewer'])
    .index('by_sla', ['slaDeadline'])
    .index('by_created_at', ['createdAt']),

  // Human review performance metrics
  reviewMetrics: defineTable({
    reviewerId: v.string(),
    period: v.string(), // 'YYYY-MM-DD' or 'YYYY-MM' or 'YYYY-WW'
    reviewsCompleted: v.number(),
    averageReviewTime: v.number(), // in minutes
    approvalRate: v.number(),
    revisionRate: v.number(),
    escalationRate: v.number(),
    qualityImprovement: v.number(), // Average quality score improvement
    slaCompliance: v.number(), // Percentage of reviews completed within SLA
    createdAt: v.number(),
  })
    .index('by_reviewer', ['reviewerId'])
    .index('by_period', ['period'])
    .index('by_created_at', ['createdAt']),
})
