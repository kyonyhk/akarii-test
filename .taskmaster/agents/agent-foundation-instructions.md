# Agent Foundation - Landing Page Project Instructions

## Role & Responsibility

You are the **Foundation Agent** responsible for setting up the development environment and design system foundation for the Anthropic Landing Page project.

## Your Tasks

- **Task 1**: Project Setup and Development Environment
- **Task 2**: Design System and Component Library Foundation

## ⚠️ IMPORTANT: ASSESS CURRENT STATE FIRST

**Before starting any work, you MUST:**

1. Review existing project structure with `ls -la` and `cat package.json`
2. Check what's already configured in `tailwind.config.js`, `tsconfig.json`, etc.
3. Identify what needs adaptation vs. what's already done
4. **ADAPT your tasks based on current state - don't rebuild what exists!**

## Critical Requirements

### Project Setup (Task 1) - CONTEXT AWARE

**FIRST:** Check current state of:

- Next.js project structure (likely already exists)
- TypeScript configuration (check `tsconfig.json`)
- ESLint/Prettier setup (check `.eslintrc.json`, `.prettierrc.json`)
- Package.json scripts (likely already configured)
- Git setup (already initialized)

**THEN:** Only implement what's missing:

1. ✅ Next.js 14 project likely exists - verify and document
2. ✅ TypeScript likely configured - review and enhance if needed
3. ✅ ESLint + Prettier likely set up - verify configuration
4. ✅ Package.json scripts likely exist - add any missing ones
5. ✅ Git already initialized - verify .gitignore is complete

### Design System (Task 2) - CONTEXT AWARE

**FIRST:** Check current state of:

- Existing Tailwind configuration in `tailwind.config.js`
- Current color palette and design tokens
- Existing component library (check `components/` directory)
- Font configuration (check if Inter or other fonts are set up)

**THEN:** Adapt Tailwind for Anthropic branding:

1. **Extend existing** Tailwind config with Anthropic brand colors:
   - Primary blues: #1E3A8A, #3B82F6
   - Accent orange: #F97316
   - Neutral grays for hierarchy
2. Configure Inter font family (may already be done - check first)
3. Create landing page-specific design tokens
4. Verify @tailwindcss/typography is installed (likely already is)

## File Ownership

You are responsible for these files:

- `package.json`
- `tsconfig.json`
- `tailwind.config.js`
- `.eslintrc.json`
- `.prettierrc`
- `src/styles/globals.css`
- `src/lib/fonts.ts`

## Coordination Rules

1. **Status Updates**: Update `.taskmaster/landing-page-agent-assignments.json` every 30 minutes
2. **Task Progress**: Use `task-master set-status --id=X --status=in-progress` when starting tasks
3. **Completion**: Use `task-master set-status --id=X --status=done` when tasks are complete
4. **Git Workflow**: Work on branch `feature/landing-foundation`

## Handoff Criteria

Your work is complete when:

- [x] Next.js project builds successfully (`npm run build`)
- [x] TypeScript compilation passes without errors
- [x] Development server runs on localhost:3000
- [x] Tailwind design system is configured and working
- [x] All linting passes (`npm run lint`)

## Next Agent

Hand off to **agent-components** when your tasks are complete. They will build the component library using your design system foundation.

## Communication

- Update status in assignments JSON every 30 minutes
- Commit work frequently with descriptive messages
- Use Master Control Interface at http://localhost:9000 for escalations
