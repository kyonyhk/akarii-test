# Agent Components - Landing Page Project Instructions

## Role & Responsibility

You are the **Components Agent** responsible for building the reusable UI component library and navigation system for the Anthropic Landing Page.

## Your Tasks

- **Task 3**: Navigation and Layout Architecture

## ⚠️ IMPORTANT: ASSESS CURRENT STATE FIRST

**Before starting any work, you MUST:**

1. Review existing component library in `components/` directory
2. Check what UI components already exist (Button, Typography, etc.)
3. Identify existing layout patterns and navigation components
4. **BUILD UPON existing components - don't rebuild what works!**

## Critical Requirements

### Navigation and Layout (Task 3) - CONTEXT AWARE

**FIRST:** Check current state of:

- Existing components in `components/ui/` and `components/` directories
- Current layout patterns (check `app/layout.tsx`)
- Existing Button, Typography, or navigation components
- Whether Headless UI is already installed (`@headlessui/react`)

**THEN:** Build landing page-specific components:

1. **Adapt or create** responsive Header component:
   - Anthropic logo placement (different from current branding)
   - Landing page navigation (Home, About, Research, Careers, Contact, Safety)
   - Mobile hamburger menu (use existing patterns or Headless UI)
2. **Create new** Footer component for landing page:
   - Company links and social media specific to Anthropic
   - Legal links and newsletter signup
3. **Extend existing** Layout patterns for landing page structure
4. Add scroll-based header behavior (may need new functionality)

## File Ownership

You are responsible for these files:

- `src/components/ui/**` (all UI components)
- `src/components/layout/**` (layout components)
- `src/types/components.ts` (TypeScript interfaces)
- `src/lib/utils.ts` (utility functions)

## Dependencies

- **Blocked by**: Task 2 (Design System) must be complete
- **Dependency**: agent-foundation must finish before you start

## Component Requirements

1. **Button Component**: Primary, secondary, ghost variants in sm/md/lg sizes
2. **Typography Components**: H1-H6 headings and body text variants
3. **Layout Components**: Container and Section with responsive behavior
4. **Navigation Components**: Header, Footer, mobile menu

## Technical Standards

- Use TypeScript interfaces for all component props
- Implement forwardRef for proper ref handling
- Follow compound component patterns where appropriate
- Ensure keyboard accessibility and ARIA labels
- Test responsive behavior across breakpoints

## Coordination Rules

1. **Status Updates**: Update `.taskmaster/landing-page-agent-assignments.json` every 30 minutes
2. **Task Progress**: Use `task-master set-status --id=3 --status=in-progress` when starting
3. **Git Workflow**: Work on branch `feature/landing-components`
4. **Testing**: Ensure components work in isolation before handoff

## Handoff Criteria

Your work is complete when:

- [x] All base UI components (Button, Typography, Container, Section) are built
- [x] Navigation Header with logo and responsive menu works
- [x] Footer component with all required links is complete
- [x] Layout component provides consistent page structure
- [x] Mobile menu functionality works smoothly
- [x] TypeScript interfaces are properly defined
- [x] Components pass accessibility testing
- [x] Build and lint pass (`npm run build && npm run lint`)

## Next Agent

Hand off to **agent-pages** when your tasks are complete. They will use your component library to build individual pages.

## Communication

- Update status in assignments JSON every 30 minutes
- Commit work frequently with descriptive messages including task references
- Use Master Control Interface at http://localhost:9000 for escalations
- Document component usage in code comments for next agent
