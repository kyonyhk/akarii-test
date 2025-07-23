# Agent Analytics - Analytics & Cost Specialist

## Agent Identity

- **ID**: agent-analytics
- **Specialization**: Usage Tracking & Dashboard
- **Branch**: `feature/cost-dashboard` (create from `multi-agent-parallel-dev`)
- **Estimated Time**: 3 hours
- **Status**: WAITING for agent-auth to complete Task 6.3

## Mission

Implement comprehensive token usage tracking and cost dashboard for team-level analytics and billing preparation.

## Assigned Tasks

- **9.1**: Implement token usage tracking (START when unblocked)
- **9.2**: Create usage analytics database schema
- **9.3**: Build cost dashboard UI components
- **9.4**: Implement usage aggregation queries
- **9.5**: Add cost calculation logic
- **9.6**: Create usage alert system

## BLOCKING DEPENDENCY

⚠️ **BLOCKED BY**: agent-auth Task 6.3 (Clerk-Convex integration)
✅ **READY WHEN**: agent-auth completes authentication setup

## Setup Instructions (DO WHEN UNBLOCKED)

1. **Wait for Signal**
   - Monitor `.taskmaster/agent-assignments.json` for agent-auth 6.3 completion
   - Check task-master status: `task-master show 6.3`

2. **Branch Setup**
   ```bash
   cd /Users/kuoloonchong/Desktop/akarii-test
   git checkout multi-agent-parallel-dev
   git pull origin multi-agent-parallel-dev  # Get auth changes
   git checkout -b feature/cost-dashboard
   ```

## Task 9.1: Token Usage Tracking

### Requirements

- Add token counting to analyzeMessage action
- Store usage data with messageId, teamId, tokensUsed, cost, timestamp
- Integrate with existing OpenAI pipeline

### Technical Implementation

- Modify `convex/actions.ts` analyzeMessage function
- Add token counting for both input prompts and responses
- Store data in new usage table

## Task 9.2: Usage Analytics Schema

### Requirements

- Create usage table in Convex schema
- Add proper indexes for querying
- Define relationships with messages and teams

### Schema Structure

```typescript
usage: defineTable({
  messageId: v.id('messages'),
  teamId: v.id('teams'), // From auth system
  tokensUsed: v.number(),
  cost: v.number(),
  timestamp: v.number(),
  model: v.string(),
  actionType: v.string(),
})
```

## File Ownership

You own:

- `convex/usage.ts` (create)
- `components/dashboard/` (create)
- Usage-related queries and mutations

Shared files (coordinate):

- `convex/schema.ts` - add usage table
- `convex/actions.ts` - modify analyzeMessage

## Dependencies & Coordination

- **Requires**: User/team context from agent-auth
- **Works with**: OpenAI integration from completed Task 4
- **Enables**: Future billing system

## Testing Requirements

- Verify accurate token counting
- Test cost calculations
- Validate team-level aggregations
- Test dashboard performance with large datasets

## Status Updates

```bash
# When unblocked and starting
task-master set-status --id=9.1 --status=in-progress
```

Stay ready to start immediately when agent-auth signals completion!
