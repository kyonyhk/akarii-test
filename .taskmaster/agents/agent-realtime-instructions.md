# Agent Realtime - Real-time Data Specialist

## Agent Identity

- **ID**: agent-realtime
- **Specialization**: Convex Subscriptions & Data Flow
- **Branch**: `feature/realtime-subscriptions` (create from `multi-agent-parallel-dev`)
- **Estimated Time**: 3 hours

## Mission

Implement real-time data subscriptions, synchronization, and mobile responsiveness for the Prism Panel system.

## Assigned Tasks

- **5.5**: Implement real-time data subscription ⭐ **START HERE**
- **5.6**: Add auto-scroll synchronization with chat (after 5.5)
- **5.7**: Implement mobile responsiveness and panel controls (after 5.6)

## Setup Instructions

1. **Branch Setup**

   ```bash
   cd /Users/kuoloonchong/Desktop/akarii-test
   git checkout multi-agent-parallel-dev
   git pull origin multi-agent-parallel-dev
   git checkout -b feature/realtime-subscriptions
   ```

2. **Load Context**
   ```bash
   task-master show 5.5  # Start here
   task-master show 5.6  # Next task
   task-master show 5.7  # Final task
   ```

## Task 5.5: Implement Real-time Data Subscription

### Requirements

- Connect Prism Panel to live analyses data using Convex queries
- Implement real-time updates when new analyses arrive
- Add loading states during analysis processing
- Ensure data fetching linked to current messageId

### Technical Specs

- Use Convex `useQuery` hook for analyses table subscription
- Implement proper query optimization for performance
- Add connection state handling
- Handle loading/error states gracefully

### Key Files to Work With

- `convex/queries.ts` - May need to add/modify analysis queries
- `components/analysis/prism-panel.tsx` - Add real-time subscription logic
- `hooks/` - Create custom hooks for analysis subscriptions

### Dependencies Ready

- ✅ Task 5.1 completed (PrismPanel structure)
- ✅ Convex setup complete (Task 2)
- ✅ Analysis pipeline complete (Task 4)

## Task 5.6: Add Auto-scroll Synchronization

### Requirements (After 5.5)

- Implement synchronized scrolling between chat and analysis panel
- Add smooth scrolling to active analysis
- Visual indicators for currently selected message/analysis pair
- Handle edge cases for rapid message sending

### Technical Specs

- Create scroll synchronization logic
- Implement smooth scrolling animations
- Add message-analysis linking
- Handle concurrent scroll events

## Task 5.7: Implement Mobile Responsiveness

### Requirements (After 5.6)

- Add mobile-responsive design with responsive breakpoints
- Panel hide/show toggle functionality
- Latency indicator in corner showing analysis processing time
- Touch-friendly interactions on mobile devices

### Technical Specs

- Responsive breakpoints: mobile (<768px), tablet (768-1024px), desktop (>1024px)
- Panel collapse/expand animations
- Performance indicators
- Touch gesture support

## File Ownership

You own:

- `hooks/use-analysis-subscription.ts` (create)
- `components/analysis/scroll-sync.tsx` (create)
- Mobile responsiveness modifications to existing components

Shared files (coordinate):

- `convex/queries.ts` (add queries, coordinate with others)
- `components/analysis/prism-panel.tsx` (add subscription logic)
- `app/page.tsx` (responsive layout changes)

## Status Updates

```bash
# When starting a task
task-master set-status --id=5.5 --status=in-progress

# When completing a task
task-master set-status --id=5.5 --status=done
# Update agent-assignments.json status to "completed"
```

## Critical Dependencies

- Your Task 5.7 completion unlocks `agent-review` to start Task 10.1
- Work in parallel with `agent-prism` and `agent-auth`
- No blocking dependencies for your start

## Testing Requirements

- Test real-time updates with multiple browser tabs
- Verify scroll synchronization works smoothly
- Test mobile responsiveness on different screen sizes
- Validate performance with rapid message updates
- Test offline/online state transitions

## Performance Considerations

- Optimize Convex query subscriptions to prevent excessive re-renders
- Implement proper cleanup for subscriptions
- Use React.memo and useMemo for expensive computations
- Debounce scroll events for performance

## Communication Protocol

- Update `.taskmaster/agent-assignments.json` every 30 minutes
- Document any Convex schema changes needed
- Coordinate shared file changes via comments
- Notify when Task 5.7 completes (enables agent-review)

## Handoff Triggers

- **Task 5.7 Complete**: Enables `agent-review` to start Task 10.1
- **All Task 5 Complete**: Enables full review mode development

## Technical Notes

- Convex subscriptions auto-update - ensure proper dependency arrays
- Consider using Intersection Observer for scroll synchronization
- Mobile touch events may need different handling than desktop mouse events
- Latency indicators should show real-time analysis processing time

Focus on smooth, performant real-time experiences across all devices!
