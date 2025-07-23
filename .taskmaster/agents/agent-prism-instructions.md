# Agent Prism - UI Components & Analysis Display Specialist

## Agent Identity

- **ID**: agent-prism
- **Specialization**: UI Components & Analysis Display
- **Branch**: `feature/prism-components` (create from `multi-agent-parallel-dev`)
- **Estimated Time**: 2 hours

## Mission

Build the core analysis display components for the Prism Panel, focusing on UI/UX and visual presentation of analysis data.

## Assigned Tasks

- **5.2**: Build analysis row components ⭐ **START HERE**
- **5.3**: Implement collapsible functionality (after 5.2)
- **5.4**: Create raw JSON drawer component (after 5.2)

## Setup Instructions

1. **Branch Setup**

   ```bash
   cd /Users/kuoloonchong/Desktop/akarii-test
   git checkout multi-agent-parallel-dev
   git pull origin multi-agent-parallel-dev
   git checkout -b feature/prism-components
   ```

2. **Load Context**
   ```bash
   task-master show 5.2  # Start with this task
   task-master show 5.3  # Next task
   task-master show 5.4  # Final task
   ```

## Task 5.2: Build Analysis Row Components

### Requirements

- Create `components/analysis/analysis-row.tsx` component
- Display statement type, beliefs, trade-offs, confidence
- Implement confidence-based styling (grey out <0.4)
- Use shadcn/ui components for consistency
- Proper spacing and typography

### Technical Specs

- Import types from `types/analysis.ts`
- Use existing PrismPanel component structure (check `components/analysis/`)
- Confidence thresholding: `opacity: confidence < 0.4 ? 0.5 : 1`
- Statement type colors: question(blue), opinion(purple), fact(green), request(orange)

### Dependencies Ready

- ✅ Task 5.1 completed (PrismPanel structure exists)
- ✅ Analysis types defined in `types/analysis.ts`
- ✅ shadcn/ui components available

## Task 5.3: Implement Collapsible Functionality

### Requirements (After 5.2)

- Add collapsible behavior to analysis rows
- Use shadcn/ui Collapsible component
- Expand/collapse animations
- Manage open/closed state

## Task 5.4: Create Raw JSON Drawer Component

### Requirements (After 5.2)

- Build drawer using shadcn/ui Drawer component
- JSON syntax highlighting
- Copy-to-clipboard functionality
- Toggle button integration

## File Ownership

You own:

- `components/analysis/*.tsx` (except prism-panel.tsx - be careful with edits)
- Any new analysis UI components

Shared files (coordinate):

- `types/analysis.ts` (read-only for you)
- `app/page.tsx` (minimal changes only)

## Status Updates

Update your status in `.taskmaster/agent-assignments.json`:

```bash
# When starting a task
task-master set-status --id=5.2 --status=in-progress

# When completing a task
task-master set-status --id=5.2 --status=done
# Update agent-assignments.json status to "completed" for that task
```

## Handoff Instructions

When you complete **Task 5.2**:

1. Update status in both task-master and agent-assignments.json
2. This unblocks `agent-quality` to start Task 7.1
3. Continue with your 5.3 and 5.4 tasks

## Testing

- Test components in isolation with mock data
- Verify responsive design on mobile/desktop
- Test confidence-based styling works correctly
- Run `npm run lint` before commits

## Communication

- Update `.taskmaster/agent-assignments.json` every 30 minutes
- If blocked, document in task using `task-master update-subtask`
- Commit frequently with descriptive messages

## Next Agent Coordination

- Your completion of 5.2 enables `agent-quality` to start
- Work in parallel with `agent-realtime` and `agent-auth`
- All agents merge to `multi-agent-parallel-dev` when complete

Good luck! Focus on clean, reusable components with excellent UX.
