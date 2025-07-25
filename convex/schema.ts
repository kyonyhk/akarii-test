import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  messages: defineTable({
    content: v.string(),
    userId: v.string(), // Keep as string for compatibility with existing functions
    conversationId: v.string(), // Keep as string for compatibility with existing functions
    timestamp: v.number(),
    analysisId: v.optional(v.id('analyses')),
  })
    .index('by_conversation', ['conversationId'])
    .index('by_user', ['userId'])
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
    thumbsUp: v.number(),
    thumbsDown: v.number(),
    userVotes: v.array(
      v.object({
        userId: v.string(),
        voteType: v.union(v.literal('up'), v.literal('down')),
        timestamp: v.number(),
      })
    ),
    createdAt: v.number(),
  })
    .index('by_message', ['messageId'])
    .index('by_created_at', ['createdAt'])
    .index('by_thumbs_up', ['thumbsUp'])
    .index('by_thumbs_down', ['thumbsDown']),

  conversations: defineTable({
    title: v.string(),
    participants: v.array(v.string()), // Keep as string for compatibility with existing functions
    createdAt: v.number(),
    updatedAt: v.number(),
    isActive: v.boolean(),
  })
    .index('by_created_at', ['createdAt'])
    .index('by_active', ['isActive']),

  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    avatar: v.optional(v.string()),
    role: v.union(v.literal('member'), v.literal('admin')),
    joinedAt: v.number(),
  })
    .index('by_clerk_id', ['clerkId'])
    .index('by_email', ['email'])
    .index('by_role', ['role']),

  teams: defineTable({
    name: v.string(),
    members: v.array(v.id('users')), // User IDs
    createdAt: v.number(),
  }).index('by_created_at', ['createdAt']),

  inviteLinks: defineTable({
    teamId: v.id('teams'),
    token: v.string(),
    expiresAt: v.number(),
    createdBy: v.id('users'),
    isActive: v.boolean(),
  })
    .index('by_team', ['teamId'])
    .index('by_token', ['token'])
    .index('by_active', ['isActive']),

  usageMetrics: defineTable({
    messageId: v.optional(v.id('messages')),
    teamId: v.optional(v.id('teams')),
    userId: v.string(), // Keep as string for compatibility with existing functions
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    totalTokens: v.number(),
    cost: v.number(),
    operationType: v.union(
      v.literal('analysis'),
      v.literal('bulk_analysis'),
      v.literal('test')
    ),
    timestamp: v.number(),
  })
    .index('by_message', ['messageId'])
    .index('by_team', ['teamId'])
    .index('by_user', ['userId'])
    .index('by_timestamp', ['timestamp'])
    .index('by_operation', ['operationType']),

  usage: defineTable({
    messageId: v.id('messages'),
    teamId: v.id('teams'),
    tokensUsed: v.number(),
    cost: v.number(),
    timestamp: v.number(),
    model: v.string(),
    actionType: v.union(
      v.literal('analysis'),
      v.literal('bulk_analysis'),
      v.literal('test')
    ),
  })
    .index('by_team_timestamp', ['teamId', 'timestamp'])
    .index('by_message', ['messageId'])
    .index('by_timestamp', ['timestamp']),

  alertConfigurations: defineTable({
    teamId: v.id('teams'),
    alertType: v.union(
      v.literal('token_limit'),
      v.literal('cost_limit'),
      v.literal('daily_usage'),
      v.literal('monthly_usage')
    ),
    thresholdValue: v.number(), // Token count or cost amount
    thresholdUnit: v.union(
      v.literal('tokens'),
      v.literal('dollars'),
      v.literal('percentage')
    ),
    timeWindow: v.union(
      v.literal('daily'),
      v.literal('weekly'),
      v.literal('monthly'),
      v.literal('total')
    ),
    isActive: v.boolean(),
    notificationMethods: v.array(
      v.union(v.literal('email'), v.literal('dashboard'), v.literal('webhook'))
    ),
    warningThreshold: v.optional(v.number()), // For soft warnings at % of limit
    createdBy: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_team', ['teamId'])
    .index('by_alert_type', ['alertType'])
    .index('by_active', ['isActive']),

  alertHistory: defineTable({
    alertConfigId: v.id('alertConfigurations'),
    teamId: v.id('teams'),
    alertType: v.string(),
    thresholdValue: v.number(),
    actualValue: v.number(),
    isWarning: v.boolean(), // true for soft warnings, false for hard limits
    notificationsSent: v.array(v.string()), // Methods used to send alert
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_alert_config', ['alertConfigId'])
    .index('by_team', ['teamId'])
    .index('by_created_at', ['createdAt'])
    .index('by_resolved', ['resolvedAt']),

  notificationPreferences: defineTable({
    userId: v.id('users'),
    teamId: v.optional(v.id('teams')),
    emailEnabled: v.boolean(),
    dashboardEnabled: v.boolean(),
    webhookUrl: v.optional(v.string()),
    alertTypes: v.array(v.string()), // Which alert types user wants to receive
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_team', ['teamId'])
    .index('by_user_team', ['userId', 'teamId']),

  usageLimits: defineTable({
    teamId: v.id('teams'),
    limitType: v.union(
      v.literal('hard_token_limit'),
      v.literal('hard_cost_limit'),
      v.literal('rate_limit')
    ),
    limitValue: v.number(),
    timeWindow: v.union(
      v.literal('daily'),
      v.literal('weekly'),
      v.literal('monthly'),
      v.literal('total')
    ),
    isActive: v.boolean(),
    enforcementAction: v.union(
      v.literal('block_requests'),
      v.literal('require_approval'),
      v.literal('notify_only')
    ),
    createdBy: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_team', ['teamId'])
    .index('by_limit_type', ['limitType'])
    .index('by_active', ['isActive']),

  conversationLinks: defineTable({
    conversationId: v.string(), // Keep as string for compatibility with existing conversation IDs
    token: v.string(), // Unique token for the shareable link
    accessType: v.union(
      v.literal('public'), // Anyone with the link can view
      v.literal('private') // Only specific users can view (for future use)
    ),
    permissions: v.union(
      v.literal('view'), // Read-only access to conversation
      v.literal('comment') // Can view and add messages (for future use)
    ),
    expiresAt: v.optional(v.number()), // Optional expiration timestamp
    createdBy: v.string(), // User ID who created the link (keep as string for compatibility)
    isActive: v.boolean(), // Whether the link is currently active
    viewCount: v.number(), // Track how many times the link has been accessed
    lastAccessedAt: v.optional(v.number()), // When the link was last used
    title: v.optional(v.string()), // Optional custom title for shared link
    description: v.optional(v.string()), // Optional description for the shared content
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_conversation', ['conversationId'])
    .index('by_token', ['token'])
    .index('by_creator', ['createdBy'])
    .index('by_active', ['isActive'])
    .index('by_expires_at', ['expiresAt'])
    .index('by_created_at', ['createdAt']),

  // Conversation Archives - Main archive entries
  conversationArchives: defineTable({
    conversationId: v.string(), // Original conversation ID
    title: v.string(), // Preserved conversation title
    originalParticipants: v.array(v.string()), // Original participant IDs
    archivedBy: v.string(), // User who initiated the archive
    archiveReason: v.optional(v.string()), // Optional reason for archiving
    archiveType: v.union(
      v.literal('manual'), // User-initiated archive
      v.literal('automatic'), // System-triggered archive (inactive conversations)
      v.literal('bulk') // Bulk archive operation
    ),
    status: v.union(
      v.literal('archived'), // Successfully archived
      v.literal('processing'), // Archive in progress
      v.literal('failed') // Archive failed
    ),
    messageCount: v.number(), // Total messages archived
    analysisCount: v.number(), // Total analyses archived
    timeRange: v.object({
      startDate: v.number(), // First message timestamp
      endDate: v.number(), // Last message timestamp
      duration: v.number(), // Conversation duration in milliseconds
    }),
    metadata: v.object({
      tags: v.array(v.string()), // User-defined tags for categorization
      category: v.optional(v.string()), // Archive category (project, meeting, etc.)
      priority: v.union(
        v.literal('low'),
        v.literal('medium'),
        v.literal('high'),
        v.literal('critical')
      ),
      retentionPeriod: v.optional(v.number()), // How long to keep archive (days)
      accessLevel: v.union(
        v.literal('private'), // Only archiver can access
        v.literal('participants'), // Original participants can access
        v.literal('team'), // Team members can access
        v.literal('public') // Anyone can access
      ),
    }),
    archivedAt: v.number(),
    lastAccessedAt: v.optional(v.number()),
    accessCount: v.number(),
  })
    .index('by_conversation', ['conversationId'])
    .index('by_archived_by', ['archivedBy'])
    .index('by_archive_type', ['archiveType'])
    .index('by_status', ['status'])
    .index('by_archived_at', ['archivedAt'])
    .index('by_category', ['metadata.category'])
    .index('by_priority', ['metadata.priority']),

  // Archive Summaries - AI-generated analysis summaries
  archiveSummaries: defineTable({
    archiveId: v.id('conversationArchives'),
    summaryType: v.union(
      v.literal('overview'), // High-level conversation summary
      v.literal('decisions'), // Key decisions made
      v.literal('insights'), // Key insights and patterns
      v.literal('sentiment'), // Sentiment analysis
      v.literal('topics') // Topic extraction and categorization
    ),
    content: v.string(), // Generated summary content
    keyPoints: v.array(v.string()), // Extracted key points
    participants: v.array(
      v.object({
        userId: v.string(),
        name: v.optional(v.string()),
        messageCount: v.number(),
        participationLevel: v.union(
          v.literal('low'),
          v.literal('medium'),
          v.literal('high')
        ),
      })
    ),
    statistics: v.object({
      totalMessages: v.number(),
      avgMessageLength: v.number(),
      questionCount: v.number(),
      opinionCount: v.number(),
      factCount: v.number(),
      requestCount: v.number(),
      sentimentScore: v.optional(v.number()), // -1 to 1 sentiment score
      confidenceLevel: v.number(), // AI confidence in summary accuracy
    }),
    generatedAt: v.number(),
    generatedBy: v.string(), // AI model used for generation
    version: v.string(), // Summary version for tracking updates
  })
    .index('by_archive', ['archiveId'])
    .index('by_summary_type', ['summaryType'])
    .index('by_generated_at', ['generatedAt']),

  // Archive Insights - Pattern analysis and decision tracking
  archiveInsights: defineTable({
    archiveId: v.id('conversationArchives'),
    insightType: v.union(
      v.literal('decision_pattern'), // How decisions were made
      v.literal('communication_pattern'), // Communication styles/patterns
      v.literal('topic_evolution'), // How topics evolved over time
      v.literal('conflict_resolution'), // How conflicts were resolved
      v.literal('consensus_building'), // How consensus was reached
      v.literal('knowledge_sharing') // Knowledge transfer patterns
    ),
    title: v.string(), // Insight title
    description: v.string(), // Detailed insight description
    evidence: v.array(
      v.object({
        messageId: v.string(), // Supporting message
        excerpt: v.string(), // Relevant excerpt
        timestamp: v.number(),
        relevanceScore: v.number(), // 0-1 relevance to insight
      })
    ),
    patterns: v.array(
      v.object({
        pattern: v.string(), // Pattern description
        frequency: v.number(), // How often this pattern occurred
        significance: v.union(
          v.literal('low'),
          v.literal('medium'),
          v.literal('high')
        ),
      })
    ),
    recommendations: v.array(v.string()), // Actionable recommendations
    confidence: v.number(), // AI confidence in insight accuracy (0-1)
    impact: v.union(
      v.literal('low'),
      v.literal('medium'),
      v.literal('high'),
      v.literal('critical')
    ),
    generatedAt: v.number(),
    validatedBy: v.optional(v.string()), // User who validated the insight
    validatedAt: v.optional(v.number()),
    isActive: v.boolean(), // Whether insight is still relevant
  })
    .index('by_archive', ['archiveId'])
    .index('by_insight_type', ['insightType'])
    .index('by_impact', ['impact'])
    .index('by_generated_at', ['generatedAt'])
    .index('by_active', ['isActive']),

  // Archive Search Index - For fast search across archived content
  archiveSearchIndex: defineTable({
    archiveId: v.id('conversationArchives'),
    content: v.string(), // Searchable content (messages, summaries, insights)
    contentType: v.union(
      v.literal('message'),
      v.literal('summary'),
      v.literal('insight'),
      v.literal('metadata')
    ),
    sourceId: v.string(), // ID of the source item (message, summary, etc.)
    keywords: v.array(v.string()), // Extracted keywords for search
    createdAt: v.number(),
  })
    .index('by_archive', ['archiveId'])
    .index('by_content_type', ['contentType'])
    .index('by_keywords', ['keywords'])
    .searchIndex('search_content', {
      searchField: 'content',
      filterFields: ['archiveId', 'contentType'],
    }),

  // Confidence Thresholds - Team/user settings for confidence score filtering
  confidenceThresholds: defineTable({
    teamId: v.optional(v.id('teams')), // null for global defaults
    userId: v.optional(v.id('users')), // null for team-wide settings
    thresholdType: v.union(
      v.literal('display_threshold'), // Minimum confidence to show normally
      v.literal('hide_threshold'), // Minimum confidence to show at all
      v.literal('warning_threshold') // Confidence level to show warning indicators
    ),
    confidenceValue: v.number(), // 0-100 confidence threshold
    uiTreatment: v.union(
      v.literal('hide'), // Hide completely
      v.literal('grey_out'), // Show greyed out
      v.literal('warning'), // Show with warning indicator
      v.literal('normal') // Show normally
    ),
    isActive: v.boolean(),
    createdBy: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_team', ['teamId'])
    .index('by_user', ['userId'])
    .index('by_threshold_type', ['thresholdType'])
    .index('by_active', ['isActive'])
    .index('by_team_user', ['teamId', 'userId']),

  // A/B Testing Experiments - Configuration and management of prompt experiments
  experiments: defineTable({
    name: v.string(), // Human-readable experiment name
    description: v.string(), // Experiment description and goals
    experimentType: v.union(
      v.literal('prompt_variant'), // Testing different prompt variations
      v.literal('feature_flag'), // Feature enablement testing
      v.literal('algorithm') // Algorithm comparison testing
    ),
    status: v.union(
      v.literal('draft'), // Being configured
      v.literal('active'), // Currently running
      v.literal('paused'), // Temporarily stopped
      v.literal('completed'), // Finished running
      v.literal('cancelled') // Cancelled before completion
    ),
    variants: v.array(
      v.object({
        id: v.string(), // Variant identifier (e.g., 'control', 'treatment_a')
        name: v.string(), // Human-readable variant name
        description: v.string(), // What this variant does
        config: v.any(), // Variant-specific configuration (prompt template, feature flags, etc.)
        trafficAllocation: v.number(), // Percentage of traffic (0-100)
        isControl: v.boolean(), // Whether this is the control group
      })
    ),
    targetingRules: v.object({
      userSegments: v.array(v.string()), // User segments to include ('new_users', 'power_users', etc.)
      teamIds: v.optional(v.array(v.id('teams'))), // Specific teams to include
      excludeUserIds: v.optional(v.array(v.string())), // Users to exclude
      rolloutPercentage: v.number(), // Overall experiment rollout percentage (0-100)
      geoRestrictions: v.optional(v.array(v.string())), // Geographic restrictions
    }),
    metrics: v.object({
      primaryMetric: v.string(), // Primary success metric ('confidence_score', 'user_satisfaction', etc.)
      secondaryMetrics: v.array(v.string()), // Additional metrics to track
      minimumSampleSize: v.number(), // Minimum sample size for statistical significance
      significanceThreshold: v.number(), // P-value threshold (e.g., 0.05)
      minimumEffect: v.number(), // Minimum detectable effect size
    }),
    schedule: v.object({
      startDate: v.number(), // Experiment start timestamp
      endDate: v.optional(v.number()), // Experiment end timestamp (null for indefinite)
      duration: v.optional(v.number()), // Duration in milliseconds
      rampUpPeriod: v.optional(v.number()), // Gradual rollout period in milliseconds
    }),
    createdBy: v.id('users'),
    lastModifiedBy: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_status', ['status'])
    .index('by_experiment_type', ['experimentType'])
    .index('by_created_by', ['createdBy'])
    .index('by_created_at', ['createdAt'])
    .index('by_start_date', ['schedule.startDate']),

  // User Experiment Assignments - Track which users are in which experiments
  userExperimentAssignments: defineTable({
    userId: v.string(), // User identifier (Clerk ID)
    experimentId: v.id('experiments'),
    variantId: v.string(), // Which variant the user is assigned to
    assignmentMethod: v.union(
      v.literal('random'), // Randomly assigned
      v.literal('manual'), // Manually assigned by admin
      v.literal('override'), // Override for testing purposes
      v.literal('targeting') // Assigned based on targeting rules
    ),
    assignedAt: v.number(), // When user was assigned
    firstInteraction: v.optional(v.number()), // First time user interacted with experiment
    lastInteraction: v.optional(v.number()), // Last interaction timestamp
    isActive: v.boolean(), // Whether assignment is still active
    metadata: v.optional(v.any()), // Additional assignment metadata
  })
    .index('by_user', ['userId'])
    .index('by_experiment', ['experimentId'])
    .index('by_variant', ['variantId'])
    .index('by_assignment_method', ['assignmentMethod'])
    .index('by_user_experiment', ['userId', 'experimentId'])
    .index('by_active', ['isActive']),

  // Experiment Events - Track interactions and outcomes for experiments
  experimentEvents: defineTable({
    experimentId: v.id('experiments'),
    variantId: v.string(),
    userId: v.string(),
    eventType: v.union(
      v.literal('assignment'), // User assigned to experiment
      v.literal('exposure'), // User exposed to experiment variant
      v.literal('interaction'), // User interacted with experiment feature
      v.literal('conversion'), // User performed target action
      v.literal('error') // Error occurred during experiment
    ),
    eventName: v.string(), // Specific event name ('message_analyzed', 'thumbs_up', etc.)
    properties: v.any(), // Event-specific properties and metrics
    messageId: v.optional(v.id('messages')), // Associated message if applicable
    analysisId: v.optional(v.id('analyses')), // Associated analysis if applicable
    timestamp: v.number(),
    sessionId: v.optional(v.string()), // User session identifier
  })
    .index('by_experiment', ['experimentId'])
    .index('by_variant', ['variantId'])
    .index('by_user', ['userId'])
    .index('by_event_type', ['eventType'])
    .index('by_timestamp', ['timestamp'])
    .index('by_experiment_timestamp', ['experimentId', 'timestamp'])
    .index('by_user_experiment', ['userId', 'experimentId']),

  // Experiment Results - Aggregated metrics and statistical analysis
  experimentResults: defineTable({
    experimentId: v.id('experiments'),
    variantId: v.string(),
    metricName: v.string(), // Name of the metric being measured
    aggregationType: v.union(
      v.literal('count'), // Simple count
      v.literal('rate'), // Conversion rate
      v.literal('average'), // Average value
      v.literal('percentile'), // Percentile value
      v.literal('sum') // Sum of values
    ),
    timeWindow: v.union(
      v.literal('daily'), // Daily aggregation
      v.literal('weekly'), // Weekly aggregation
      v.literal('experiment_lifetime') // Entire experiment duration
    ),
    windowStart: v.number(), // Start of time window
    windowEnd: v.number(), // End of time window
    sampleSize: v.number(), // Number of users/events in sample
    value: v.number(), // Metric value
    confidence: v.optional(v.number()), // Statistical confidence level
    standardError: v.optional(v.number()), // Standard error of measurement
    statisticalSignificance: v.optional(v.boolean()), // Whether result is statistically significant
    pValue: v.optional(v.number()), // P-value for significance testing
    confidenceInterval: v.optional(
      v.object({
        lower: v.number(),
        upper: v.number(),
        level: v.number(), // Confidence level (e.g., 0.95 for 95%)
      })
    ),
    comparisonToControl: v.optional(
      v.object({
        relativeLift: v.number(), // Percentage improvement over control
        absoluteDifference: v.number(), // Absolute difference from control
        isSignificant: v.boolean(), // Whether difference is statistically significant
      })
    ),
    lastUpdated: v.number(),
  })
    .index('by_experiment', ['experimentId'])
    .index('by_variant', ['variantId'])
    .index('by_metric', ['metricName'])
    .index('by_time_window', ['timeWindow'])
    .index('by_window_start', ['windowStart'])
    .index('by_experiment_metric', ['experimentId', 'metricName']),
})
