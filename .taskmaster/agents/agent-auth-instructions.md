# Agent Auth - Authentication Specialist

## Agent Identity

- **ID**: agent-auth
- **Specialization**: Clerk Integration & User Management
- **Branch**: `feature/clerk-auth` (create from `multi-agent-parallel-dev`)
- **Estimated Time**: 4 hours

## Mission

Implement complete Clerk magic-link authentication system with user management and team collaboration features.

## Assigned Tasks

- **6.1**: Install and Configure Clerk SDK ⭐ **START HERE**
- **6.2**: Create Authentication Components (after 6.1)
- **6.3**: Integrate Clerk with Convex Backend (after 6.1, 6.2)
- **6.4**: Implement Protected Route System (after 6.3)
- **6.5**: Add User Context to Messages and Conversations (after 6.3)
- **6.6**: Create Invite Link Functionality (after 6.4, 6.5)

## Setup Instructions

1. **Branch Setup**

   ```bash
   cd /Users/kuoloonchong/Desktop/akarii-test
   git checkout multi-agent-parallel-dev
   git pull origin multi-agent-parallel-dev
   git checkout -b feature/clerk-auth
   ```

2. **Load Context**
   ```bash
   task-master show 6.1  # Start here
   task-master show 6.2  # Next
   task-master show 6.3  # Continue...
   task-master show 6.4
   task-master show 6.5
   task-master show 6.6
   ```

## Task 6.1: Install and Configure Clerk SDK

### Requirements

- Install @clerk/nextjs package
- Configure environment variables
- Set up Clerk dashboard with magic-link authentication
- Configure email templates and branding

### Technical Steps

```bash
npm install @clerk/nextjs
```

### Environment Variables Needed

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Clerk Dashboard Setup

- Enable magic-link authentication
- Configure email templates
- Set up domain and redirects
- Configure branding to match Akarii

## Task 6.2: Create Authentication Components

### Requirements

- Build SignIn and SignUp components using Clerk's pre-built components
- Configure routing for authentication pages
- Implement authentication redirects and fallbacks
- Style components to match application design

### Files to Create

- `app/sign-in/[[...sign-in]]/page.tsx`
- `app/sign-up/[[...sign-up]]/page.tsx`
- `components/auth/auth-wrapper.tsx`

## Task 6.3: Integrate Clerk with Convex Backend

### Requirements ⭐ **CRITICAL - UNBLOCKS OTHER AGENTS**

- Install @convex-dev/auth package
- Wrap app with ConvexProviderWithClerk
- Configure Convex authentication middleware
- Set up user synchronization between Clerk and Convex

### Critical Dependencies

- Your completion of 6.3 unblocks `agent-analytics` and `agent-quality`
- This is a high-priority handoff point

## Task 6.4: Implement Protected Route System

### Requirements

- Create ProtectedRoute component
- Implement middleware for route protection
- Redirect unauthenticated users to sign-in
- Handle loading states during authentication check

## Task 6.5: Add User Context to Messages and Conversations

### Requirements

- Update Convex schema to include user ID
- Modify sendMessage mutation for authenticated users
- Display user information in message components
- Implement user-specific conversation filtering

### Schema Changes Needed

```typescript
// convex/schema.ts additions
messages: defineTable({
  // existing fields...
  userId: v.id('users'), // Add this
})
```

## Task 6.6: Create Invite Link Functionality

### Requirements

- Create invite link generation system
- Implement invite acceptance flow
- Build team/workspace management components
- Handle invite link validation and expiration

## File Ownership

You own:

- `app/sign-in/` and `app/sign-up/` directories
- `components/auth/` directory (create)
- `middleware.ts` (create)
- Authentication-related hooks

Shared files (coordinate):

- `convex/schema.ts` - coordinate user table additions
- `convex/mutations.ts` - coordinate user context additions
- `app/layout.tsx` - add Clerk providers
- `.env.local` - add your environment variables

## Status Updates & Critical Handoffs

```bash
# Mark 6.3 complete immediately when done - this unblocks other agents!
task-master set-status --id=6.3 --status=done
```

### Critical Handoff Points

- **6.3 Complete**: Unblocks `agent-analytics` (Task 9.1) and `agent-quality` (Task 7.1)
- **Task 6 Complete**: Enables full analytics and quality features

## Testing Requirements

- Test magic-link email delivery and authentication flow
- Verify protected routes work correctly
- Test user context in messages
- Validate invite link functionality
- Test authentication state persistence
- Verify Convex integration works correctly

## Security Considerations

- Ensure environment variables are properly secured
- Validate user permissions at API level
- Implement proper session management
- Test authorization edge cases
- Secure invite link generation and validation

## Communication Protocol

- Update `.taskmaster/agent-assignments.json` every 30 minutes
- **Critical**: Immediately notify when 6.3 is complete
- Document any schema changes needed in Convex
- Coordinate shared file changes via comments

## Integration Points

- Your auth context will be used by all other agents
- Message sending will require your user context
- Analytics agent needs your user management
- Quality agent needs your user voting context

## Performance Notes

- Minimize Clerk component re-renders
- Optimize authentication checks
- Cache user data appropriately
- Handle offline authentication gracefully

## Troubleshooting Common Issues

- Clerk webhook configuration for Convex sync
- Environment variable visibility in different environments
- Authentication redirects in development vs production
- Magic-link email delivery testing

Focus on getting 6.3 done quickly to unblock other agents!
