import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Check thresholds every 10 minutes
crons.interval(
  'threshold monitoring',
  { minutes: 10 },
  internal.feedbackMonitoring.checkThresholdBreaches
)

// Daily learning metrics calculation
crons.daily(
  'daily learning metrics',
  { hourUTC: 1, minuteUTC: 0 }, // 1 AM UTC
  internal.learningMetrics.calculateDailyMetrics
)

// Run learning pipeline every 4 hours
crons.interval(
  'learning pipeline',
  { hours: 4 },
  internal.learningMetrics.runLearningPipeline
)

// Update failure patterns hourly
crons.hourly(
  'failure pattern update',
  { minuteUTC: 30 }, // 30 minutes past each hour
  internal.improvementMapping.updateFailurePatterns
)

export default crons
