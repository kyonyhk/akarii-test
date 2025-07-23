# Agent Review - Review Mode Specialist

## Agent Identity

- **ID**: agent-review
- **Specialization**: Review Interface & Export Features
- **Branch**: `feature/review-mode` (create from `multi-agent-parallel-dev`)
- **Estimated Time**: 5 hours
- **Status**: WAITING for agent-realtime to complete Task 5.7

## Mission

Build comprehensive Review Mode for async conversation analysis with export and sharing capabilities.

## Assigned Tasks

- **10.1**: Create Review Mode Component ⭐ **START WHEN UNBLOCKED**
- **10.2**: Implement Message History with Scrollable Timeline
- **10.3**: Integrate Inline Analysis Display
- **10.4**: Build Search and Filtering Functionality
- **10.5**: Create Export Functionality
- **10.6**: Implement Shareable Link System
- **10.7**: Build Conversation Archiving System

## BLOCKING DEPENDENCY

⚠️ **BLOCKED BY**: agent-realtime Task 5.7 (mobile responsiveness complete)
✅ **READY WHEN**: Full Prism Panel system is complete

## Setup Instructions (DO WHEN UNBLOCKED)

1. **Wait for Signal**
   - Monitor agent-realtime completion of Task 5.7
   - This ensures complete Prism Panel foundation

2. **Branch Setup**
   ```bash
   cd /Users/kuoloonchong/Desktop/akarii-test
   git checkout multi-agent-parallel-dev
   git pull origin multi-agent-parallel-dev  # Get all Prism Panel work
   git checkout -b feature/review-mode
   ```

## Task 10.1: Create Review Mode Component

### Requirements

- Build main Review Mode component with navigation
- Toggle between Review and Live modes
- Responsive layout with proper routing
- Breadcrumb navigation for conversation selection

### Technical Implementation

```typescript
// New route: app/review/[conversationId]/page.tsx
// Components: components/review/review-mode.tsx
```

## Key Features to Implement

### Message History (10.2)

- Virtualized scrolling for performance
- Conversation timeline with timestamps
- Message grouping by time periods

### Inline Analysis (10.3)

- Embedded analysis in message components
- Expandable analysis cards
- Hover states for quick preview

### Search & Filtering (10.4)

- Full-text search across messages and analyses
- Date range filters
- Analysis confidence filters
- Boolean search operators

### Export System (10.5)

- PDF, JSON, Markdown export formats
- Customizable export templates
- Selective export of filtered results

### Sharing & Archiving (10.6, 10.7)

- Shareable conversation URLs
- Access permissions and expiration
- Archiving with metadata preservation
- Analysis summary generation

## File Ownership

You own:

- `app/review/` directory (create)
- `components/review/` directory (create)
- `lib/export-utils.ts` (create)
- All review mode functionality

Shared files (coordinate):

- `app/layout.tsx` - add review mode navigation
- Navigation components - add review mode toggle

## Integration Requirements

- **Uses**: Completed Prism Panel components from agent-prism
- **Uses**: Real-time subscription system from agent-realtime
- **Uses**: Authentication from agent-auth
- **May use**: Voting data from agent-quality (if complete)

## Performance Considerations

- Implement virtualized scrolling for large conversations
- Optimize search indexing for fast results
- Efficient export generation for large datasets
- Proper caching for conversation metadata

## Testing Requirements

- Test Review Mode navigation and display
- Verify export functionality across formats
- Test search performance with large conversations
- Validate shareable link access controls

## Status Updates

```bash
# When unblocked and ready to start
task-master set-status --id=10.1 --status=in-progress
```

## Success Criteria

- Smooth navigation between Live and Review modes
- Fast search across conversations and analyses
- High-quality exports for decision documentation
- Secure sharing with proper access controls

You're the final piece - focus on creating a polished, professional review experience!
