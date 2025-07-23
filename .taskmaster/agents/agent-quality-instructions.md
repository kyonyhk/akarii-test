# Agent Quality - Quality & Feedback Specialist

## Agent Identity

- **ID**: agent-quality
- **Specialization**: Voting System & Analysis Quality
- **Branch**: `feature/voting-quality` (create from `multi-agent-parallel-dev`)
- **Estimated Time**: 6 hours
- **Status**: WAITING for agent-auth (6.3) AND agent-prism (5.2)

## Mission

Implement thumb voting feedback system and optimize analysis quality to achieve ≥70% approval rate.

## Assigned Tasks

### Phase 1: Voting System (Tasks 7.1-7.6)

- **7.1**: Update database schema for voting ⭐ **START WHEN UNBLOCKED**
- **7.2**: Create thumbVote mutation
- **7.3**: Build vote button UI components
- **7.4**: Implement duplicate vote prevention
- **7.5**: Add real-time vote updates
- **7.6**: Create vote aggregation queries

### Phase 2: Quality Improvements (Tasks 8.1-8.7)

- **8.1**: Analyze feedback data patterns
- **8.2**: Engineer improved prompts
- **8.3**: Implement confidence thresholding
- **8.4**: Create prompt guardrails
- **8.5**: Build A/B testing framework
- **8.6**: Implement feedback-based tuning
- **8.7**: Add quality validation rules

## BLOCKING DEPENDENCIES

⚠️ **BLOCKED BY**:

- agent-auth Task 6.3 (user context for voting)
- agent-prism Task 5.2 (analysis components for vote UI)

## Setup Instructions (DO WHEN UNBLOCKED)

1. **Wait for Both Signals**
   - Monitor both agent-auth 6.3 AND agent-prism 5.2 completion
   - Both must be done before you can start

2. **Branch Setup**
   ```bash
   cd /Users/kuoloonchong/Desktop/akarii-test
   git checkout multi-agent-parallel-dev
   git pull origin multi-agent-parallel-dev  # Get latest changes
   git checkout -b feature/voting-quality
   ```

## Critical Integration Points

- **Voting UI**: Integrates with agent-prism's analysis rows
- **User Context**: Requires agent-auth's user management
- **Quality Metrics**: Feeds back into analysis pipeline

## File Ownership

You own:

- `components/voting/` (create)
- `convex/voting.ts` (create)
- `lib/prompt-engineering.ts` (create)
- Quality analysis and testing infrastructure

Shared files (coordinate):

- `convex/schema.ts` - add voting fields to analyses table
- `convex/actions.ts` - modify for quality improvements
- Analysis components - integrate voting buttons

## High-Impact Sequence

1. **Voting System First** (7.1-7.6) - Enables feedback collection
2. **Quality Analysis** (8.1) - Use voting data to identify patterns
3. **Iterative Improvements** (8.2-8.7) - Systematic quality enhancement

## Success Metrics

- Achieve ≥70% thumbs-up approval rate
- Reduce low-confidence analysis display
- Improve prompt consistency and accuracy
- Implement effective A/B testing for prompts

## Status Updates

```bash
# When both dependencies complete and you start
task-master set-status --id=7.1 --status=in-progress
```

This is the longest task sequence - focus on systematic quality improvement!
