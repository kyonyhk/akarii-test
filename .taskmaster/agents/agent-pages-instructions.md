# Agent Pages - Landing Page Project Instructions

## Role & Responsibility

You are the **Pages Agent** responsible for implementing individual pages and the Next.js routing structure for the Anthropic Landing Page.

## Your Tasks

- **Task 4**: Home Page Hero Section Implementation
- **Task 5**: Interactive Claude Demo Component
- **Task 6**: About Page with Team and Mission Content

## ⚠️ IMPORTANT: ASSESS CURRENT STATE FIRST

**Before starting any work, you MUST:**

1. Review existing page structure in `app/` directory
2. Check current routing and layout patterns
3. See what components are available from agent-components
4. **LEVERAGE existing patterns - create landing page-specific routes!**

## Critical Requirements

### Home Page Hero (Task 4) - CONTEXT AWARE

**FIRST:** Check current state of:

- Existing app router structure in `app/` directory
- Current layout.tsx and page.tsx patterns
- Available components from previous agents
- Whether Framer Motion is installed

**THEN:** Create landing page routes:

1. **Create new landing page routes** (separate from existing app):
   - Consider using `/landing/` prefix or separate domain approach
   - OR create dedicated landing page components for existing routes
2. Build compelling hero section with:
   - Animated gradient backgrounds (install Framer Motion if needed)
   - Claude introduction with compelling headline
   - Primary CTA button (use existing Button component)
   - Trust indicators and safety certifications
   - Responsive typography (use existing Typography system)

### Claude Demo (Task 5)

1. Build interactive conversation preview:
   - Realistic dialogue examples showcasing Claude capabilities
   - Typing animation effects with proper timing
   - Multiple conversation scenarios (coding, creative, safety)
   - Accessible with proper ARIA labels
   - Smooth transitions between examples

### About Page (Task 6)

1. Implement comprehensive About page:
   - Mission statement section about AI safety
   - Leadership team grid with photos and bios
   - Interactive company timeline with milestones
   - Company values and principles section
   - Office locations with embedded maps

## File Ownership

You are responsible for these files:

- `app/**` (all page files and layouts)
- `src/components/sections/**` (page-specific components)
- `src/content/**` (static content and copy)

## Dependencies

- **Blocked by**: Task 3 (Navigation/Layout) must be complete
- **Dependency**: agent-components must finish before you start

## Technical Standards

- Use Next.js 14 App Router structure
- Implement proper metadata for SEO using Next.js metadata API
- Optimize images with next/image component
- Ensure responsive design across all breakpoints
- Follow semantic HTML structure for accessibility
- Use Framer Motion for smooth animations

## Page Structure Requirements

```
app/
├── layout.tsx (root layout)
├── page.tsx (home page)
├── about/
│   └── page.tsx
├── research/
│   └── page.tsx
├── careers/
│   └── page.tsx
├── contact/
│   └── page.tsx
└── safety/
    └── page.tsx
```

## Coordination Rules

1. **Status Updates**: Update `.taskmaster/landing-page-agent-assignments.json` every 30 minutes
2. **Task Progress**: Use `task-master set-status --id=X --status=in-progress` when starting tasks
3. **Git Workflow**: Work on branch `feature/landing-pages`
4. **Content**: Use placeholder content that reflects Anthropic's actual mission and values

## Handoff Criteria

Your work is complete when:

- [x] Home page with hero section and Claude demo is complete
- [x] About page with team, mission, and timeline is built
- [x] All pages use consistent Layout component from agent-components
- [x] Navigation between pages works smoothly
- [x] Pages are responsive across all screen sizes
- [x] Images are optimized and load efficiently
- [x] Animations perform smoothly without layout shift
- [x] Build and lint pass (`npm run build && npm run lint`)

## Next Agent

Hand off to **agent-features** when your tasks are complete. They will add forms, job listings, and interactive features to the remaining pages.

## Communication

- Update status in assignments JSON every 30 minutes
- Commit work frequently with descriptive messages including task references
- Use Master Control Interface at http://localhost:9000 for escalations
- Document page structure and content requirements for next agent
