import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

// Create a new alert configuration for a team
export const createAlertConfig = mutation({
  args: {
    teamId: v.id('teams'),
    alertType: v.union(
      v.literal('token_limit'),
      v.literal('cost_limit'),
      v.literal('daily_usage'),
      v.literal('monthly_usage')
    ),
    thresholdValue: v.number(),
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
    notificationMethods: v.array(
      v.union(v.literal('email'), v.literal('dashboard'), v.literal('webhook'))
    ),
    warningThreshold: v.optional(v.number()),
    createdBy: v.id('users'),
  },
  handler: async (ctx, args) => {
    const alertConfigId = await ctx.db.insert('alertConfigurations', {
      teamId: args.teamId,
      alertType: args.alertType,
      thresholdValue: args.thresholdValue,
      thresholdUnit: args.thresholdUnit,
      timeWindow: args.timeWindow,
      isActive: true,
      notificationMethods: args.notificationMethods,
      warningThreshold: args.warningThreshold,
      createdBy: args.createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    return alertConfigId
  },
})

// Get all alert configurations for a team
export const getTeamAlertConfigs = query({
  args: { teamId: v.id('teams') },
  handler: async (ctx, args) => {
    const configs = await ctx.db
      .query('alertConfigurations')
      .withIndex('by_team', q => q.eq('teamId', args.teamId))
      .collect()

    return configs
  },
})

// Get active alert configurations for a team
export const getActiveAlertConfigs = query({
  args: { teamId: v.id('teams') },
  handler: async (ctx, args) => {
    const configs = await ctx.db
      .query('alertConfigurations')
      .withIndex('by_team', q => q.eq('teamId', args.teamId))
      .filter(q => q.eq(q.field('isActive'), true))
      .collect()

    return configs
  },
})

// Update an alert configuration
export const updateAlertConfig = mutation({
  args: {
    alertConfigId: v.id('alertConfigurations'),
    thresholdValue: v.optional(v.number()),
    warningThreshold: v.optional(v.number()),
    notificationMethods: v.optional(
      v.array(
        v.union(
          v.literal('email'),
          v.literal('dashboard'),
          v.literal('webhook')
        )
      )
    ),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { alertConfigId, ...updates } = args

    const updateData: any = {
      ...updates,
      updatedAt: Date.now(),
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })

    await ctx.db.patch(alertConfigId, updateData)

    return await ctx.db.get(alertConfigId)
  },
})

// Delete an alert configuration
export const deleteAlertConfig = mutation({
  args: { alertConfigId: v.id('alertConfigurations') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.alertConfigId)
    return { success: true }
  },
})

// Create or update notification preferences for a user
export const upsertNotificationPreferences = mutation({
  args: {
    userId: v.id('users'),
    teamId: v.optional(v.id('teams')),
    emailEnabled: v.boolean(),
    dashboardEnabled: v.boolean(),
    webhookUrl: v.optional(v.string()),
    alertTypes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if preferences already exist
    const existing = await ctx.db
      .query('notificationPreferences')
      .withIndex('by_user_team', q =>
        q.eq('userId', args.userId).eq('teamId', args.teamId)
      )
      .first()

    if (existing) {
      // Update existing preferences
      await ctx.db.patch(existing._id, {
        emailEnabled: args.emailEnabled,
        dashboardEnabled: args.dashboardEnabled,
        webhookUrl: args.webhookUrl,
        alertTypes: args.alertTypes,
        updatedAt: Date.now(),
      })
      return existing._id
    } else {
      // Create new preferences
      const preferencesId = await ctx.db.insert('notificationPreferences', {
        userId: args.userId,
        teamId: args.teamId,
        emailEnabled: args.emailEnabled,
        dashboardEnabled: args.dashboardEnabled,
        webhookUrl: args.webhookUrl,
        alertTypes: args.alertTypes,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      return preferencesId
    }
  },
})

// Get notification preferences for a user
export const getUserNotificationPreferences = query({
  args: {
    userId: v.id('users'),
    teamId: v.optional(v.id('teams')),
  },
  handler: async (ctx, args) => {
    const preferences = await ctx.db
      .query('notificationPreferences')
      .withIndex('by_user_team', q =>
        q.eq('userId', args.userId).eq('teamId', args.teamId)
      )
      .first()

    return preferences
  },
})

// Create usage limit for a team
export const createUsageLimit = mutation({
  args: {
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
    enforcementAction: v.union(
      v.literal('block_requests'),
      v.literal('require_approval'),
      v.literal('notify_only')
    ),
    createdBy: v.id('users'),
  },
  handler: async (ctx, args) => {
    const limitId = await ctx.db.insert('usageLimits', {
      teamId: args.teamId,
      limitType: args.limitType,
      limitValue: args.limitValue,
      timeWindow: args.timeWindow,
      isActive: true,
      enforcementAction: args.enforcementAction,
      createdBy: args.createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    return limitId
  },
})

// Get usage limits for a team
export const getTeamUsageLimits = query({
  args: { teamId: v.id('teams') },
  handler: async (ctx, args) => {
    const limits = await ctx.db
      .query('usageLimits')
      .withIndex('by_team', q => q.eq('teamId', args.teamId))
      .collect()

    return limits
  },
})

// Get active usage limits for a team
export const getActiveUsageLimits = query({
  args: { teamId: v.id('teams') },
  handler: async (ctx, args) => {
    const limits = await ctx.db
      .query('usageLimits')
      .withIndex('by_team', q => q.eq('teamId', args.teamId))
      .filter(q => q.eq(q.field('isActive'), true))
      .collect()

    return limits
  },
})

// Update usage limit
export const updateUsageLimit = mutation({
  args: {
    limitId: v.id('usageLimits'),
    limitValue: v.optional(v.number()),
    enforcementAction: v.optional(
      v.union(
        v.literal('block_requests'),
        v.literal('require_approval'),
        v.literal('notify_only')
      )
    ),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { limitId, ...updates } = args

    const updateData: any = {
      ...updates,
      updatedAt: Date.now(),
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })

    await ctx.db.patch(limitId, updateData)

    return await ctx.db.get(limitId)
  },
})

// Get count of all alert configurations
export const getAlertConfigCount = query({
  args: {},
  handler: async ctx => {
    const configs = await ctx.db.query('alertConfigurations').collect()
    return configs.length
  },
})
