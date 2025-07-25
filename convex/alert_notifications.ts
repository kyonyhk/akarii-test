import { action, mutation } from './_generated/server'
import { v } from 'convex/values'

// Types for alert data
interface AlertData {
  config: any
  currentValue: number
  isWarning: boolean
  usage: any
}

interface TeamData {
  name: string
  _id: string
}

// Format alert message for different notification methods
function formatAlertMessage(alert: AlertData, team: TeamData): {
  subject: string
  message: string
  urgency: 'low' | 'medium' | 'high'
} {
  const { config, currentValue, isWarning, usage } = alert
  const urgency = isWarning ? 'medium' : 'high'
  const alertLevel = isWarning ? 'Warning' : 'Alert'
  
  let unit = ''
  let thresholdDescription = ''
  
  switch (config.thresholdUnit) {
    case 'tokens':
      unit = 'tokens'
      break
    case 'dollars':
      unit = '$'
      break
    case 'percentage':
      unit = '%'
      break
  }

  switch (config.alertType) {
    case 'token_limit':
      thresholdDescription = `Token limit ${alertLevel.toLowerCase()}`
      break
    case 'cost_limit':
      thresholdDescription = `Cost limit ${alertLevel.toLowerCase()}`
      break
    case 'daily_usage':
      thresholdDescription = `Daily usage ${alertLevel.toLowerCase()}`
      break
    case 'monthly_usage':
      thresholdDescription = `Monthly usage ${alertLevel.toLowerCase()}`
      break
  }

  const subject = `${alertLevel}: ${team.name} - ${thresholdDescription}`
  
  const message = `
Team: ${team.name}
Alert Type: ${config.alertType}
Threshold: ${config.thresholdValue} ${unit}
Current Usage: ${currentValue.toFixed(2)} ${unit}
Time Window: ${config.timeWindow}
${isWarning ? 'Warning Level' : 'CRITICAL LEVEL'}

Usage Summary:
- Total Tokens: ${usage.totalTokens.toLocaleString()}
- Total Cost: $${usage.totalCost.toFixed(2)}
- Request Count: ${usage.requestCount}
- Time Period: ${config.timeWindow}

${isWarning 
  ? 'This is a warning alert. Usage is approaching the configured limit.' 
  : 'This is a critical alert. Usage has exceeded the configured limit.'}

Please review your team's usage and take appropriate action.
  `.trim()

  return { subject, message, urgency }
}

// Send email notification (placeholder - would integrate with email service)
export const sendEmailNotification = action({
  args: {
    to: v.array(v.string()),
    subject: v.string(),
    message: v.string(),
    urgency: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
  },
  handler: async (ctx, args) => {
    // This would integrate with an actual email service like SendGrid, SES, etc.
    // For now, we'll log the email and mark it as sent
    
    console.log('EMAIL NOTIFICATION:', {
      to: args.to,
      subject: args.subject,
      message: args.message,
      urgency: args.urgency,
      timestamp: new Date().toISOString(),
    })

    // In a real implementation, you would:
    // 1. Use environment variables for email service credentials
    // 2. Format the message as HTML email
    // 3. Handle email delivery failures
    // 4. Track delivery status
    
    return {
      success: true,
      method: 'email',
      recipients: args.to.length,
      messageId: `email_${Date.now()}`,
    }
  },
})

// Send webhook notification
export const sendWebhookNotification = action({
  args: {
    webhookUrl: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    try {
      console.log('WEBHOOK NOTIFICATION:', {
        url: args.webhookUrl,
        payload: args.payload,
        timestamp: new Date().toISOString(),
      })

      // In a real implementation, you would make an HTTP POST request:
      // const response = await fetch(args.webhookUrl, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(args.payload),
      // })

      return {
        success: true,
        method: 'webhook',
        url: args.webhookUrl,
        messageId: `webhook_${Date.now()}`,
      }
    } catch (error) {
      console.error('Webhook notification failed:', error)
      return {
        success: false,
        method: 'webhook',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
})

// Process and send alert notifications
export const processAlertNotifications = action({
  args: {
    teamId: v.id('teams'),
    alerts: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const { teamId, alerts } = args
    
    // Get team data
    const team = await ctx.runQuery('teams:getTeam', { teamId })
    if (!team) {
      throw new Error('Team not found')
    }

    // Get team members with notification preferences
    const teamMembers = []
    for (const memberId of team.members) {
      const user = await ctx.runQuery('users:getUserById', { userId: memberId })
      if (user) {
        const preferences = await ctx.runQuery('alert_configs:getUserNotificationPreferences', {
          userId: memberId,
          teamId,
        })
        teamMembers.push({ user, preferences })
      }
    }

    const notificationResults = []

    for (const alert of alerts) {
      const { subject, message, urgency } = formatAlertMessage(alert, team)
      const notificationsSent = []

      // Determine who should receive notifications
      const emailRecipients = []
      const webhookUrls = []

      for (const member of teamMembers) {
        const { user, preferences } = member
        
        // Check if user wants this type of alert
        if (preferences && preferences.alertTypes.includes(alert.config.alertType)) {
          if (preferences.emailEnabled && alert.config.notificationMethods.includes('email')) {
            emailRecipients.push(user.email)
          }
          
          if (preferences.webhookUrl && alert.config.notificationMethods.includes('webhook')) {
            webhookUrls.push(preferences.webhookUrl)
          }
        }
      }

      // Send email notifications
      if (emailRecipients.length > 0 && alert.config.notificationMethods.includes('email')) {
        const emailResult = await ctx.runAction('alert_notifications:sendEmailNotification', {
          to: emailRecipients,
          subject,
          message,
          urgency,
        })
        
        if (emailResult.success) {
          notificationsSent.push('email')
        }
      }

      // Send webhook notifications
      if (webhookUrls.length > 0 && alert.config.notificationMethods.includes('webhook')) {
        const webhookPayload = {
          alertType: alert.config.alertType,
          teamId: teamId,
          teamName: team.name,
          thresholdValue: alert.config.thresholdValue,
          currentValue: alert.currentValue,
          isWarning: alert.isWarning,
          urgency,
          timestamp: new Date().toISOString(),
          usage: alert.usage,
        }

        for (const webhookUrl of webhookUrls) {
          const webhookResult = await ctx.runAction('alert_notifications:sendWebhookNotification', {
            webhookUrl,
            payload: webhookPayload,
          })
          
          if (webhookResult.success && !notificationsSent.includes('webhook')) {
            notificationsSent.push('webhook')
          }
        }
      }

      // Dashboard notifications are always "sent" if enabled
      if (alert.config.notificationMethods.includes('dashboard')) {
        notificationsSent.push('dashboard')
      }

      // Record the alert in history
      const alertHistoryId = await ctx.runMutation('alert_monitor:recordAlert', {
        alertConfigId: alert.config._id,
        teamId,
        alertType: alert.config.alertType,
        thresholdValue: alert.config.thresholdValue,
        actualValue: alert.currentValue,
        isWarning: alert.isWarning,
        notificationsSent,
      })

      notificationResults.push({
        alertConfigId: alert.config._id,
        alertHistoryId,
        notificationsSent,
        emailRecipients: emailRecipients.length,
        webhooksSent: webhookUrls.length,
      })
    }

    return {
      teamId,
      alertsProcessed: alerts.length,
      notificationResults,
    }
  },
})

// Get dashboard alerts for a team (for UI display)
export const getDashboardAlerts = mutation({
  args: { teamId: v.id('teams') },
  handler: async (ctx, args) => {
    // Get current triggered alerts
    const currentAlerts = await ctx.runQuery('alert_monitor:checkTeamAlerts', {
      teamId: args.teamId,
    })

    // Get recent alert history for dashboard display
    const recentAlerts = await ctx.runQuery('alert_monitor:getTeamAlertHistory', {
      teamId: args.teamId,
      limit: 10,
    })

    // Get unresolved alerts
    const unresolvedAlerts = await ctx.runQuery('alert_monitor:getUnresolvedAlerts', {
      teamId: args.teamId,
    })

    // Format for dashboard display
    const dashboardAlerts = currentAlerts.map(alert => ({
      id: `current_${alert.config._id}`,
      type: alert.config.alertType,
      level: alert.isWarning ? 'warning' : 'critical',
      message: formatAlertMessage(alert, { name: 'Current Team', _id: args.teamId }).subject,
      currentValue: alert.currentValue,
      thresholdValue: alert.config.thresholdValue,
      unit: alert.config.thresholdUnit,
      timestamp: Date.now(),
      isActive: true,
    }))

    return {
      currentAlerts: dashboardAlerts,
      recentAlerts,
      unresolvedCount: unresolvedAlerts.length,
      hasActiveCritical: currentAlerts.some(a => !a.isWarning),
    }
  },
})

// Manual alert test function for admin use
export const testAlertNotification = action({
  args: {
    teamId: v.id('teams'),
    alertType: v.string(),
    testMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const team = await ctx.runQuery('teams:getTeam', { teamId: args.teamId })
    if (!team) {
      throw new Error('Team not found')
    }

    const testAlert = {
      config: {
        _id: 'test',
        alertType: args.alertType,
        thresholdValue: 1000,
        thresholdUnit: 'tokens',
        notificationMethods: ['email', 'dashboard'],
      },
      currentValue: 1200,
      isWarning: false,
      usage: {
        totalTokens: 1200,
        totalCost: 0.12,
        requestCount: 5,
      },
    }

    return await ctx.runAction('alert_notifications:processAlertNotifications', {
      teamId: args.teamId,
      alerts: [testAlert],
    })
  },
})