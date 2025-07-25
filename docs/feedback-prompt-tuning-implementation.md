# Feedback-Based Prompt Tuning System Implementation

## Overview

This document provides a comprehensive guide to the feedback-based prompt tuning system that was implemented to automatically improve analysis quality through user feedback and AI-driven prompt optimization.

## System Architecture

### Core Components

1. **Feedback Collection Pipeline** - Real-time aggregation of user votes and feedback
2. **Threshold Monitoring System** - Automated detection of quality degradation
3. **Prompt Refinement Engine** - AI-powered improvement suggestion generation
4. **Human-in-the-Loop Approval** - Expert review and approval workflow
5. **Improvement Mapping** - Pattern detection and strategy application
6. **Continuous Learning Pipeline** - Automated orchestration and optimization

### Database Schema

The system extends the existing database with the following new tables:

```typescript
// Threshold monitoring
feedbackThresholds: {
  name: string,           // 'overall_approval', 'question_approval', etc.
  threshold: number,      // 0.7 for 70%
  window: string,         // '24h', '7d'
  metric: 'approval_rate' | 'vote_count' | 'confidence_gap',
  action: 'immediate' | 'batch' | 'scheduled',
  isActive: boolean
}

// Alert tracking
thresholdAlerts: {
  thresholdId: Id<"feedbackThresholds">,
  breachValue: number,
  breachTime: number,
  status: 'pending' | 'acknowledged' | 'resolved'
}

// Prompt versioning
promptVersions: {
  version: string,        // 'v1.0.0'
  promptType: 'system' | 'user' | 'examples',
  content: string,
  isActive: boolean,
  performanceBaseline: object
}

// Improvement proposals
promptProposals: {
  currentPromptId: Id<"promptVersions">,
  proposedContent: string,
  changeType: 'addition' | 'modification' | 'removal',
  rationale: string,
  expectedImprovement: number,
  status: 'pending' | 'approved' | 'rejected' | 'testing' | 'deployed'
}

// Pattern tracking
failurePatterns: {
  category: FailureCategory,
  pattern: string,
  frequency: number,
  impactScore: number,
  exampleAnalyses: Id<"analyses">[]
}

// Learning metrics
learningMetrics: {
  date: string,           // 'YYYY-MM-DD'
  improvementCycles: number,
  averageApprovalGain: number,
  overallApprovalRate: number,
  questionApprovalRate: number,
  confidenceCalibrationGap: number
}
```

## Implementation Details

### 1. Feedback Collection Pipeline

**Files:**

- `convex/feedbackMonitoring.ts` - Core monitoring functions
- `components/feedback/ThresholdMonitoringDashboard.tsx` - UI dashboard

**Key Features:**

- Real-time metric calculation across configurable time windows
- Automatic threshold breach detection
- Integration with existing vote aggregation system
- Support for different metric types (approval rate, confidence gap, vote count)

**Configuration:**

```typescript
// Default thresholds
{
  overall_approval_rate: { threshold: 0.70, window: "24h", action: "immediate" },
  question_approval_rate: { threshold: 0.50, window: "7d", action: "immediate" },
  confidence_calibration_gap: { threshold: 0.30, window: "24h", action: "batch" }
}
```

### 2. Automated Prompt Refinement

**Files:**

- `convex/promptRefinement.ts` - Pattern analysis and suggestion generation
- `components/feedback/PromptProposalReview.tsx` - Review interface

**Pattern Detection:**
The system identifies five main failure categories:

- `question_misinterpretation` - Questions with < 40% approval
- `belief_extraction_missing` - Analyses missing belief content
- `tradeoff_analysis_shallow` - Analyses missing trade-off content
- `confidence_overestimation` - High confidence with low approval
- `statement_type_misclassification` - Incorrect type classification

**Improvement Generation:**
Each pattern triggers specific prompt modifications:

- **Question Issues**: Enhanced question understanding guidelines
- **Missing Beliefs**: Explicit belief extraction requirements
- **Missing Trade-offs**: Trade-off detection framework
- **Confidence Issues**: Calibration guidelines
- **Classification**: Type definition clarification

### 3. Human-in-the-Loop Workflow

**Review Process:**

1. AI generates improvement proposal with evidence
2. Proposal queued for human review
3. Expert reviews rationale, evidence, and proposed changes
4. Approval/rejection with notes
5. Approved changes can trigger A/B testing

**Review Interface Features:**

- Side-by-side prompt comparison
- Evidence examples with approval rates
- Expected improvement predictions
- Review notes and audit trail

### 4. Continuous Learning Pipeline

**Files:**

- `convex/learningMetrics.ts` - Metrics calculation and trend analysis
- `convex/improvementMapping.ts` - Pattern mapping and strategy tracking
- `convex/crons.ts` - Automated scheduling

**Automation Schedule:**

- **Every 10 minutes**: Threshold monitoring
- **Every hour**: Failure pattern updates
- **Every 4 hours**: Complete learning pipeline
- **Daily**: Learning metrics calculation

**Pipeline Steps:**

1. Update failure patterns from recent analyses
2. Check threshold breaches and generate alerts
3. Generate improvement proposals for breaches
4. Update improvement mapping strategies
5. Calculate daily learning metrics
6. Generate insights and recommendations

## Usage Guide

### Initial Setup

1. **Initialize the system:**

```typescript
// Initialize default thresholds
await initializeThresholds({})

// Setup test data (optional)
await setupTestData({ reset: false })
```

2. **Configure thresholds:**

```typescript
// Update threshold values
await updateThreshold({
  thresholdId: 'threshold_id',
  threshold: 0.75, // 75%
  window: '12h', // 12 hour window
  isActive: true,
})
```

### Daily Operations

1. **Monitor dashboard:**
   - Check threshold status
   - Review pending alerts
   - Monitor system health score

2. **Review proposals:**
   - Examine AI-generated improvements
   - Review evidence and rationale
   - Approve/reject with notes

3. **Track progress:**
   - Monitor learning trends
   - Review pattern coverage
   - Check deployment success rates

### Manual Operations

```typescript
// Manual threshold check
await manualThresholdCheck({})

// Manual pattern analysis
await manualPatternAnalysis({ windowHours: 24 })

// Manual learning pipeline
await manualLearningPipeline({})

// Test complete system
await testCompletePipeline({})
```

## Performance Metrics

### Current Baseline (Pre-Implementation)

- **Overall approval rate**: 73%
- **Question approval rate**: 43.7%
- **Confidence calibration gap**: ~30%
- **Total analyses**: 1,247
- **Average votes per analysis**: 3.12

### Target Improvements

- **Overall approval rate**: 85%+ (12+ point improvement)
- **Question approval rate**: 70%+ (26+ point improvement)
- **Confidence calibration gap**: <15% (50% reduction)
- **Automated improvement coverage**: 80%

### Success Metrics

- **Time to improvement**: <2 hours for threshold breaches
- **Review time**: <15 minutes per proposal
- **Successful deployment rate**: >90%
- **Rollback rate**: <5%

## Dashboard Features

### Threshold Monitoring Dashboard

- Real-time threshold status with visual indicators
- Historical breach tracking
- Configurable threshold management
- Alert acknowledgment workflow

### Proposal Review Dashboard

- Pending proposal queue with priority sorting
- Evidence showcase with approval rate examples
- Side-by-side prompt comparison
- Review workflow with notes and approval tracking

### Learning Trends Dashboard

- 30-day performance trends
- Pattern detection and coverage rates
- System efficiency metrics
- Automated insights and recommendations

### Main Feedback Tuning Dashboard

- System health overview with color-coded status
- Combined metrics from all subsystems
- Quick action buttons for manual operations
- Executive summary with key improvements

## API Reference

### Core Functions

```typescript
// Monitoring
getMonitoringDashboard(): ThresholdDashboardData
checkThresholdBreaches(): BreachResult[]
acknowledgeAlert(alertId, acknowledgedBy): void

// Pattern Analysis
analyzeFailurePatternsAndGenerateRefinements(alertId?, windowHours?): RefinementResult
getPendingPromptProposals(): ProposalWithContext[]
reviewPromptProposal(proposalId, decision, notes, reviewer): void

// Learning Pipeline
calculateDailyMetrics(date?): LearningMetrics
getLearningTrends(daysBack?): TrendData
runLearningPipeline(): PipelineResult

// Improvement Mapping
updateFailurePatterns(windowHours?): PatternUpdate
getImprovementStrategies(): StrategyRecommendation[]
trackImprovementSuccess(proposalId, beforeMetrics, afterMetrics): void
```

### Testing Functions

```typescript
// Test data setup
setupTestData(reset?): SetupResult
createTestThresholdBreach(): BreachResult
testCompletePipeline(): PipelineTestResult
```

## Configuration

### Environment Variables

```bash
# Required for AI-powered analysis and refinement
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
PERPLEXITY_API_KEY=your_perplexity_key  # For research features
```

### Threshold Configuration

```typescript
interface ThresholdConfig {
  name: string // Unique identifier
  threshold: number // Trigger value (0.0-1.0)
  window: string // Time window ('1h', '24h', '7d')
  metric: MetricType // What to measure
  action: ActionType // Response urgency
  isActive: boolean // Enable/disable
}
```

### Cron Job Schedule

```typescript
// Configurable in convex/crons.ts
"threshold monitoring": { minutes: 10 },        // Every 10 minutes
"failure pattern update": { hourUTC: 30 },      // Every hour at :30
"learning pipeline": { hours: 4 },              // Every 4 hours
"daily learning metrics": { hourUTC: 1 }        // Daily at 1 AM UTC
```

## Security and Safety

### Safety Mechanisms

1. **Human approval required** for all prompt changes
2. **A/B testing framework** for controlled rollouts
3. **Automatic rollback capability** for failed deployments
4. **Audit trail** for all changes and decisions
5. **Conservative thresholds** to prevent over-reaction

### Access Control

- Proposal review requires authenticated user
- Threshold configuration requires admin access
- System monitoring available to all authenticated users
- Manual pipeline triggers logged with user attribution

## Troubleshooting

### Common Issues

1. **No proposals being generated:**
   - Check if thresholds are being breached
   - Verify AI API keys are configured
   - Run manual pattern analysis to test

2. **Thresholds not triggering:**
   - Verify threshold configuration is active
   - Check if enough data exists in time window
   - Review metric calculations

3. **Dashboard not loading:**
   - Check Convex connection status
   - Verify all required queries are available
   - Check browser console for errors

### Debug Commands

```typescript
// Check system status
const status = await getLearningStatus({})
const dashboard = await getMonitoringDashboard({})

// Manual testing
const testResult = await testCompletePipeline({})
const patterns = await manualPatternUpdate({ windowHours: 24 })
```

## Future Enhancements

### Planned Features

1. **A/B Testing Integration** - Automated testing of approved changes
2. **Multi-model Support** - Compare different AI models for analysis
3. **Advanced Pattern Detection** - ML-based pattern recognition
4. **Predictive Analytics** - Forecast potential issues before they occur
5. **Integration with External Tools** - Slack alerts, GitHub issues
6. **Custom Metrics** - User-defined quality metrics
7. **Batch Processing** - Efficient handling of large data volumes

### Performance Optimizations

1. **Caching Layer** - Cache frequently accessed metrics
2. **Incremental Updates** - Process only new data since last run
3. **Parallel Processing** - Concurrent pattern analysis
4. **Database Optimization** - Additional indexes for complex queries

This comprehensive system provides automated, continuous improvement of analysis quality through intelligent feedback processing, human oversight, and systematic prompt optimization.
