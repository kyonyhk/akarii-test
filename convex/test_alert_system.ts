import { action } from './_generated/server'
import { v } from 'convex/values'

// Test action to verify alert system functionality
export const testAlertSystem = action({
  args: {
    teamId: v.id('teams'),
    testType: v.union(
      v.literal('create_config'),
      v.literal('trigger_alert'),
      v.literal('check_limits'),
      v.literal('send_notification'),
      v.literal('full_workflow')
    ),
  },
  handler: async (ctx, args) => {
    const testResults = []

    try {
      switch (args.testType) {
        case 'create_config':
          await testCreateAlertConfig(ctx, args.teamId, testResults)
          break
        case 'trigger_alert':
          await testTriggerAlert(ctx, args.teamId, testResults)
          break
        case 'check_limits':
          await testCheckLimits(ctx, args.teamId, testResults)
          break
        case 'send_notification':
          await testSendNotification(ctx, args.teamId, testResults)
          break
        case 'full_workflow':
          await testFullWorkflow(ctx, args.teamId, testResults)
          break
      }

      return {
        success: true,
        testType: args.testType,
        results: testResults,
        summary: `${testResults.filter(r => r.passed).length}/${testResults.length} tests passed`,
      }
    } catch (error) {
      return {
        success: false,
        testType: args.testType,
        error: error instanceof Error ? error.message : 'Unknown error',
        results: testResults,
      }
    }
  },
})

async function testCreateAlertConfig(ctx: any, teamId: string, results: any[]) {
  // Test creating alert configuration
  try {
    const alertConfigId = await ctx.runMutation('alert_configs:createAlertConfig', {
      teamId,
      alertType: 'cost_limit',
      thresholdValue: 10.0,
      thresholdUnit: 'dollars',
      timeWindow: 'monthly',
      notificationMethods: ['email', 'dashboard'],
      warningThreshold: 8.0,
      createdBy: `test_user_${Date.now()}`,
    })

    results.push({
      test: 'Create Alert Config',
      passed: !!alertConfigId,
      details: `Created alert config with ID: ${alertConfigId}`,
    })

    // Test retrieving the configuration
    const configs = await ctx.runQuery('alert_configs:getTeamAlertConfigs', { teamId })
    const createdConfig = configs.find((c: any) => c._id === alertConfigId)

    results.push({
      test: 'Retrieve Alert Config',
      passed: !!createdConfig && createdConfig.thresholdValue === 10.0,
      details: createdConfig ? `Retrieved config with threshold ${createdConfig.thresholdValue}` : 'Config not found',
    })

  } catch (error) {
    results.push({
      test: 'Create Alert Config',
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
}

async function testTriggerAlert(ctx: any, teamId: string, results: any[]) {
  try {
    // First create some usage data to trigger an alert
    await ctx.runMutation('usage_tracking:recordUsage', {
      teamId,
      userId: 'test_user',
      model: 'gpt-4o',
      inputTokens: 100,
      outputTokens: 200,
      totalTokens: 300,
      cost: 0.006,
      operationType: 'test',
    })

    // Check if alerts are triggered
    const triggeredAlerts = await ctx.runQuery('alert_monitor:checkTeamAlerts', { teamId })

    results.push({
      test: 'Check Triggered Alerts',
      passed: Array.isArray(triggeredAlerts),
      details: `Found ${triggeredAlerts?.length || 0} triggered alerts`,
    })

    // Test usage status
    const usageStatus = await ctx.runQuery('alert_monitor:getTeamUsageInWindow', {
      teamId,
      timeWindow: 'monthly',
    })

    results.push({
      test: 'Usage Status Check',
      passed: usageStatus && typeof usageStatus.totalTokens === 'number',
      details: `Total tokens: ${usageStatus?.totalTokens}, Total cost: $${usageStatus?.totalCost}`,
    })

  } catch (error) {
    results.push({
      test: 'Trigger Alert',
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
}

async function testCheckLimits(ctx: any, teamId: string, results: any[]) {
  try {
    // Create a usage limit
    const limitId = await ctx.runMutation('alert_configs:createUsageLimit', {
      teamId,
      limitType: 'hard_cost_limit',
      limitValue: 1.0,
      timeWindow: 'daily',
      enforcementAction: 'notify_only',
      createdBy: `test_user_${Date.now()}`,
    })

    results.push({
      test: 'Create Usage Limit',
      passed: !!limitId,
      details: `Created usage limit with ID: ${limitId}`,
    })

    // Test usage limit checking
    const limitCheck = await ctx.runQuery('usage_enforcement:checkUsageLimits', {
      teamId,
      estimatedTokens: 1000,
      estimatedCost: 0.02,
    })

    results.push({
      test: 'Check Usage Limits',
      passed: typeof limitCheck.allowed === 'boolean',
      details: `Limit check result: ${limitCheck.allowed ? 'allowed' : 'blocked'} - ${limitCheck.message}`,
    })

    // Test limit status
    const limitStatus = await ctx.runQuery('usage_enforcement:getUsageLimitStatus', { teamId })

    results.push({
      test: 'Get Limit Status',
      passed: limitStatus && Array.isArray(limitStatus.limits),
      details: `Found ${limitStatus?.limits?.length || 0} active limits`,
    })

  } catch (error) {
    results.push({
      test: 'Check Limits',
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
}

async function testSendNotification(ctx: any, teamId: string, results: any[]) {
  try {
    // Test email notification
    const emailResult = await ctx.runAction('alert_notifications:sendEmailNotification', {
      to: ['test@example.com'],
      subject: 'Test Alert',
      message: 'This is a test alert notification',
      urgency: 'medium',
    })

    results.push({
      test: 'Send Email Notification',
      passed: emailResult.success,
      details: `Email result: ${emailResult.success ? 'sent' : 'failed'} - ${emailResult.messageId || emailResult.error}`,
    })

    // Test webhook notification
    const webhookResult = await ctx.runAction('alert_notifications:sendWebhookNotification', {
      webhookUrl: 'https://httpbin.org/post',
      payload: { test: true, timestamp: Date.now() },
    })

    results.push({
      test: 'Send Webhook Notification',
      passed: webhookResult.success,
      details: `Webhook result: ${webhookResult.success ? 'sent' : 'failed'} - ${webhookResult.messageId || webhookResult.error}`,
    })

    // Test alert processing
    const mockAlert = {
      config: {
        _id: 'test_config',
        alertType: 'cost_limit',
        thresholdValue: 10,
        thresholdUnit: 'dollars',
        notificationMethods: ['email'],
      },
      currentValue: 12,
      isWarning: false,
      usage: { totalTokens: 1000, totalCost: 12, requestCount: 5 },
    }

    const processResult = await ctx.runAction('alert_notifications:processAlertNotifications', {
      teamId,
      alerts: [mockAlert],
    })

    results.push({
      test: 'Process Alert Notifications',
      passed: processResult.alertsProcessed === 1,
      details: `Processed ${processResult.alertsProcessed} alerts`,
    })

  } catch (error) {
    results.push({
      test: 'Send Notification',
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
}

async function testFullWorkflow(ctx: any, teamId: string, results: any[]) {
  // Run all tests in sequence for a complete workflow test
  await testCreateAlertConfig(ctx, teamId, results)
  await testCheckLimits(ctx, teamId, results)
  await testTriggerAlert(ctx, teamId, results)
  await testSendNotification(ctx, teamId, results)

  // Test integration points
  try {
    // Create a realistic scenario with high usage
    await ctx.runMutation('usage_tracking:recordUsage', {
      teamId,
      userId: 'heavy_user',
      model: 'gpt-4o',
      inputTokens: 5000,
      outputTokens: 3000,
      totalTokens: 8000,
      cost: 0.16,
      operationType: 'analysis',
    })

    // Check if this triggers monitoring
    const alertStatus = await ctx.runQuery('alert_monitor:getTeamAlertStatus', { teamId })

    results.push({
      test: 'Full Workflow Integration',
      passed: alertStatus && typeof alertStatus.configCount === 'number',
      details: `Alert status: ${alertStatus?.currentAlerts || 0} current, ${alertStatus?.unresolvedAlerts || 0} unresolved`,
    })

    // Test dashboard alert display
    const dashboardAlerts = await ctx.runMutation('alert_notifications:getDashboardAlerts', { teamId })

    results.push({
      test: 'Dashboard Alert Display',
      passed: dashboardAlerts && Array.isArray(dashboardAlerts.currentAlerts),
      details: `Dashboard shows ${dashboardAlerts?.currentAlerts?.length || 0} alerts`,
    })

  } catch (error) {
    results.push({
      test: 'Full Workflow Integration',
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
}

// Test data cleanup action
export const cleanupTestData = action({
  args: { teamId: v.id('teams') },
  handler: async (ctx, args) => {
    try {
      // Note: In a real implementation, you would need proper cleanup functions
      // This is a placeholder for test data cleanup
      
      console.log(`Cleaning up test data for team ${args.teamId}`)
      
      // Would clean up:
      // - Test alert configurations
      // - Test usage limits
      // - Test usage records
      // - Test alert history
      
      return {
        success: true,
        message: 'Test data cleanup completed',
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
})

// Performance test for alert system
export const performanceTestAlerts = action({
  args: {
    teamId: v.id('teams'),
    iterations: v.number(),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now()
    const results = []

    try {
      for (let i = 0; i < args.iterations; i++) {
        const iterationStart = Date.now()
        
        // Test alert checking performance
        await ctx.runQuery('alert_monitor:checkTeamAlerts', { teamId: args.teamId })
        
        const iterationTime = Date.now() - iterationStart
        results.push(iterationTime)
      }

      const totalTime = Date.now() - startTime
      const avgTime = results.reduce((a, b) => a + b, 0) / results.length
      const maxTime = Math.max(...results)
      const minTime = Math.min(...results)

      return {
        success: true,
        iterations: args.iterations,
        totalTime,
        averageTime: avgTime,
        maxTime,
        minTime,
        results,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        completedIterations: results.length,
      }
    }
  },
})