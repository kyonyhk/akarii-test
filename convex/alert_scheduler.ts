import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

// Schedule alert monitoring to run every 5 minutes
const crons = cronJobs()

crons.interval(
  'alert monitoring',
  { minutes: 5 }, // Run every 5 minutes
  internal.alert_scheduler.runAlertMonitoring,
)

export { crons as default }

// Internal function to run alert monitoring
export const runAlertMonitoring = internal.action({
  handler: async (ctx) => {
    console.log('Starting scheduled alert monitoring...')
    
    try {
      // Get all teams to check
      const teams = await ctx.runQuery('teams:getAllTeams')
      
      if (!teams || teams.length === 0) {
        console.log('No teams found for alert monitoring')
        return { processed: 0, alerts: 0 }
      }

      let totalAlerts = 0
      let processedTeams = 0

      // Check alerts for each team
      for (const team of teams) {
        try {
          // Check for triggered alerts
          const triggeredAlerts = await ctx.runQuery('alert_monitor:checkTeamAlerts', {
            teamId: team._id,
          })

          if (triggeredAlerts && triggeredAlerts.length > 0) {
            console.log(`Found ${triggeredAlerts.length} alerts for team ${team.name}`)
            
            // Process notifications for this team
            const notificationResult = await ctx.runAction('alert_notifications:processAlertNotifications', {
              teamId: team._id,
              alerts: triggeredAlerts,
            })

            totalAlerts += triggeredAlerts.length
            
            console.log(`Processed notifications for team ${team.name}: ${notificationResult.alertsProcessed} alerts`)
          }

          processedTeams++
        } catch (teamError) {
          console.error(`Error processing alerts for team ${team.name}:`, teamError)
        }
      }

      console.log(`Alert monitoring completed: ${processedTeams} teams processed, ${totalAlerts} alerts triggered`)
      
      return {
        success: true,
        processed: processedTeams,
        alerts: totalAlerts,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error('Alert monitoring failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }
    }
  },
})

// Internal function to check and clean up old alert history
export const cleanupOldAlerts = internal.action({
  handler: async (ctx) => {
    console.log('Starting alert history cleanup...')
    
    try {
      // Delete alert history older than 90 days
      const cutoffTime = Date.now() - (90 * 24 * 60 * 60 * 1000)
      
      // Get old alert records
      const oldAlerts = await ctx.runQuery('alert_monitor:getAllAlertHistory', {
        beforeTimestamp: cutoffTime,
      })

      if (!oldAlerts || oldAlerts.length === 0) {
        console.log('No old alerts to clean up')
        return { deleted: 0 }
      }

      let deletedCount = 0
      
      // Delete old alerts in batches
      for (const alert of oldAlerts) {
        try {
          await ctx.runMutation('alert_monitor:deleteAlertHistory', {
            alertId: alert._id,
          })
          deletedCount++
        } catch (deleteError) {
          console.error(`Error deleting alert ${alert._id}:`, deleteError)
        }
      }

      console.log(`Alert cleanup completed: ${deletedCount} old alerts deleted`)
      
      return {
        success: true,
        deleted: deletedCount,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error('Alert cleanup failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }
    }
  },
})

// Schedule cleanup to run daily at 2 AM
crons.daily(
  'alert cleanup',
  { hourUTC: 2, minuteUTC: 0 }, // 2:00 AM UTC
  internal.alert_scheduler.cleanupOldAlerts,
)

// Health check function for alert system
export const healthCheck = internal.action({
  handler: async (ctx) => {
    const checks = []
    
    try {
      // Check if alert configurations table is accessible
      const configCount = await ctx.runQuery('alert_configs:getAlertConfigCount')
      checks.push({
        component: 'Alert Configurations',
        status: 'healthy',
        details: `${configCount} configurations found`,
      })
    } catch (error) {
      checks.push({
        component: 'Alert Configurations',
        status: 'error',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    try {
      // Check if usage tracking is working
      const recentUsage = await ctx.runQuery('usage_tracking:getRecentUsage', {
        limit: 1,
      })
      checks.push({
        component: 'Usage Tracking',
        status: 'healthy',
        details: recentUsage ? 'Recent usage data available' : 'No recent usage data',
      })
    } catch (error) {
      checks.push({
        component: 'Usage Tracking',
        status: 'error',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    try {
      // Check if notification system is working
      const testNotification = await ctx.runAction('alert_notifications:sendEmailNotification', {
        to: ['health-check@example.com'],
        subject: 'Alert System Health Check',
        message: 'This is a health check notification',
        urgency: 'low',
      })
      checks.push({
        component: 'Notification System',
        status: testNotification.success ? 'healthy' : 'warning',
        details: testNotification.success ? 'Notifications working' : 'Notification test failed',
      })
    } catch (error) {
      checks.push({
        component: 'Notification System',
        status: 'error',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    const healthyCount = checks.filter(c => c.status === 'healthy').length
    const overallStatus = healthyCount === checks.length ? 'healthy' : 
                         healthyCount > 0 ? 'degraded' : 'unhealthy'

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      summary: `${healthyCount}/${checks.length} components healthy`,
    }
  },
})

// Schedule health check to run every hour
crons.hourly(
  'alert system health check',
  { minuteUTC: 0 }, // Top of every hour
  internal.alert_scheduler.healthCheck,
)