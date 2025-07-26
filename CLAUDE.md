# Claude Code Instructions

## Task Master AI Instructions

**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md

## Flexible Development Workflow

**This project supports both single-worktree and parallel-worktree development modes. The current configuration is managed in `.taskmaster/worktree-config.json`.**

### 🔧 Check Current Workflow Mode

```bash
# Check your current workflow status and assignments
./scripts/workflow-helper.sh status

# See your assigned tasks for this worktree
./scripts/workflow-helper.sh tasks

# Verify you're on the correct branch
./scripts/workflow-helper.sh check
```

### 🏗️ Current Worktree Structure (Tasks 11-17)

**⚠️ This configuration is specific to the current task range and will be updated for future work phases.**

```bash
# View current worktree assignments
cat .taskmaster/worktree-config.json
```

### 📋 Centralized Task Management

**CRITICAL: Claude Code agents MUST use ./tm commands, NOT MCP task-master tools in worktrees.**

**For Claude Code Agents:**

```bash
# ✅ ALWAYS use these commands in worktrees:
./tm list                                        # View all tasks
./tm show 11.1                                  # See specific task
./tm set-status --id=11.1 --status=in-progress  # Start task
./tm set-status --id=11.1 --status=done         # Complete task

# ❌ NEVER use MCP task-master tools in worktrees - they create conflicts:
# mcp__task-master-ai__set_task_status         # DON'T USE
# mcp__task-master-ai__get_tasks               # DON'T USE
# mcp__task-master-ai__update_task             # DON'T USE
```

**Why ./tm instead of MCP:**

- MCP tools operate on local worktree files → sync conflicts
- ./tm script always operates on main worktree → centralized updates
- Environment variable TASKMASTER_PROJECT_ROOT forces MCP to main worktree

**For manual command line:**

```bash
# Or work directly in main worktree:
cd /Users/kuoloonchong/Desktop/akarii-test
task-master next
task-master set-status --id=12.1 --status=done
```

### 🔄 Development Workflow per Worktree

**CRITICAL: Each individual task gets its own branch off the feature branch**

**Branch Structure & Naming Convention:**

```
main
├── feature/role-based-access (base branch for Task 12)
│   ├── feature/task-12.1-configure-user-roles     ← Descriptive task branches
│   ├── feature/task-12.2-access-middleware
│   └── feature/task-12.3-admin-dashboard-access
├── feature/ui-redesign (base branch for Tasks 11 & 17)
│   ├── feature/task-11.1-message-bubble-component ← Descriptive task branches
│   ├── feature/task-11.2-responsive-chat-layout
│   └── feature/task-17.1-enhanced-chat-input
```

**Branch Naming Rules:**

- Format: `feature/task-[ID]-[brief-description]`
- Use kebab-case for descriptions (lowercase, hyphens)
- Keep descriptions concise but descriptive (3-5 words)
- Examples: `feature/task-14.1-multi-model-provider-setup`

**Workflow for each task:**

```bash
# 1. Check which tasks are assigned to your worktree
./tm show 12  # Role access tasks
./tm show 11  # UI tasks

# 2. Create descriptive task branch off the feature branch (NOT off main)
git checkout feature/role-based-access  # Your worktree's base feature branch

# Create descriptive branch name: feature/task-[ID]-[brief-description]
git checkout -b feature/task-12.1-configure-user-roles    # Descriptive task branch

# Branch naming examples:
# feature/task-11.1-message-bubble-component
# feature/task-11.2-responsive-chat-layout
# feature/task-12.1-configure-user-roles
# feature/task-12.2-access-middleware
# feature/task-14.1-multi-model-provider-setup
# feature/task-14.2-model-selection-ui

# 3. Mark task as in-progress (centrally)
./tm set-status --id=12.1 --status=in-progress

# 4. Do your work (code, test, etc.)
# ... implement task 12.1 ...

# 5. Commit to your TASK branch
git add .
git commit -m "feat: Complete Task 12.1 - Configure User Roles

- Implemented role assignment in Clerk metadata
- Added admin/user role validation
- Created role-based access middleware

Resolves: Task 12.1

🤖 Generated with [Claude Code](https://claude.ai/code)
Co-Authored-By: Claude <noreply@anthropic.com>"

# 6. Push to your descriptive TASK branch
git push origin feature/task-12.1-configure-user-roles

# 7. Create PR: task branch → feature branch (NOT main)
gh pr create --base feature/role-based-access --title "Complete Task 12.1 - Configure User Roles" --body "$(cat <<'EOF'
## Summary
- ✅ Implemented role assignment in Clerk metadata
- ✅ Added role validation middleware
- ✅ Created admin/user access controls

## Test Plan
- [x] Role assignment works in Clerk dashboard
- [x] Middleware properly validates roles
- [x] Access controls function correctly

Ready to merge into feature/role-based-access

🤖 Generated with [Claude Code](https://claude.ai/code)
EOF
)"

# 8. Merge task branch into feature branch
git checkout feature/role-based-access
git merge feature/task-12.1-configure-user-roles
git push origin feature/role-based-access

# 9. Delete task branch (cleanup)
git branch -d feature/task-12.1-configure-user-roles
git push origin --delete feature/task-12.1-configure-user-roles

# 10. Mark task as complete (centrally)
./tm set-status --id=12.1 --status=done

# 11. When ALL tasks in your group are done, create final PR
gh pr create --base main --title "Complete Role-Based Access Control (Tasks 12.1-12.5)" --body "$(cat <<'EOF'
## Summary
- ✅ Complete RBAC implementation
- ✅ All role-based access features working
- ✅ Comprehensive testing completed

## Tasks Completed
- Task 12.1: Configure User Roles
- Task 12.2: Implement Access Middleware
- Task 12.3: Admin Dashboard Access
- Task 12.4: User Permission Checks
- Task 12.5: Integration Testing

Ready to merge into main

🤖 Generated with [Claude Code](https://claude.ai/code)
EOF
)"
```

### 🎯 Worktree Task Assignments

**UI Redesign Worktree** (`../akarii-ui-redesign/`)

- Task 11: Redesign Core Chat UI Layout
- Task 17: Interactive Chat Input Features

**Multi-Model Worktree** (`../akarii-multi-model/`)

- Task 14: Multi-Model AI Provider Backend and UI

**Role Access Worktree** (`../akarii-role-access/`)

- Task 12: Role-Based Access Control (RBAC)

**Share Feature Worktree** (`../akarii-share-feature/`)

- Task 13: Real-time Collaboration and Sharing

**Conversational AI Worktree** (`../akarii-conversational-ai/`)

- Task 15: Conversational, Context-Aware Responses

**Analytics Worktree** (`../akarii-real-analytics/`)

- Task 16: Real Analytics Data Integration

### ⚠️ Critical Branch Management Rules

**🚨 NEVER COMMIT DIRECTLY TO MAIN OR BASE FEATURE BRANCHES 🚨**

1. **Task Branches Only**: Each task MUST be on its own `feature/task-X.Y` branch
2. **No Direct Feature Branch Commits**: NEVER commit directly to `feature/role-based-access`
3. **No Direct Main Commits**: NEVER `git checkout main` or commit to main
4. **Two-Level PR Process**: task branch → feature branch → main (via PRs)
5. **Task Management**: Use `./tm` (not direct task-master) to avoid conflicts
6. **CLAUDE.md Reference**: Always read from main worktree (this file is always current)

### 🔄 Branch Verification Commands

**Before starting work on ANY task:**

```bash
# 1. ALWAYS verify you're on a TASK branch (not base feature branch)
git branch --show-current

# ✅ CORRECT descriptive task branch patterns:
# feature/task-11.1-message-bubble-component
# feature/task-11.2-responsive-chat-layout
# feature/task-12.1-configure-user-roles
# feature/task-12.2-access-middleware
# feature/task-14.1-multi-model-provider-setup
# feature/task-17.1-enhanced-chat-input

# ❌ WRONG - never work directly on these:
# feature/ui-redesign, feature/role-based-access, main

# 2. If on wrong branch, create proper descriptive task branch:
git checkout feature/role-based-access  # Base feature branch
git checkout -b feature/task-12.1-configure-user-roles  # Descriptive task branch

# 3. Never work directly on base branches:
# git checkout feature/role-based-access  # ❌ DON'T WORK HERE
# git checkout main                       # ❌ DON'T WORK HERE
```

### 🔧 Dynamic Startup Checklist

```bash
# Smart workflow checklist for task-based development:

# 1. Check your workflow status and assignments
./w status

# 2. See your assigned tasks for this worktree
./tm show 12  # Replace with your assigned task group number

# 3. Create descriptive task branch for specific subtask
git checkout feature/role-based-access  # Your base feature branch

# Get task details first to create descriptive branch name
./tm show 12.1  # Check task title and description

# Create descriptive branch: feature/task-[ID]-[brief-description]
git checkout -b feature/task-12.1-configure-user-roles  # Descriptive task branch

# 4. Mark task as in-progress
./tm set-status --id=12.1 --status=in-progress

# 5. Do your development work...

# 6. Commit to your TASK branch (not base feature branch)
git add .
git commit -m "feat: Complete Task 12.1 - Configure User Roles

- Implemented role assignment in Clerk metadata
- Added validation and middleware

Resolves: Task 12.1"

# 7. Push to your descriptive TASK branch
git push origin feature/task-12.1-configure-user-roles

# 8. Create PR: task branch → feature branch
gh pr create --base feature/role-based-access --title "Complete Task 12.1 - Configure User Roles" --body "Ready for review"

# 9. Merge task branch into feature branch
git checkout feature/role-based-access
git merge feature/task-12.1-configure-user-roles
git push origin feature/role-based-access

# 10. Mark task complete
./tm set-status --id=12.1 --status=done

# 11. When ALL group tasks done, create final PR to main
gh pr create --base main --title "Complete Role-Based Access Control" --body "All RBAC tasks completed"
```

### 🛡️ Safety Checks

**If you accidentally switch to main:**

```bash
# Emergency: Get back to your feature branch immediately
git checkout feature/your-assigned-branch
# Never commit anything to main!
```

**Before any commit, verify branch:**

```bash
git branch --show-current
# Must show feature/xxx, NEVER main
```

### 🔄 Switching Between Workflow Modes

**To revert to single-worktree mode after completing parallel tasks:**

```bash
# 1. Update configuration
sed -i 's/"workflowMode": "parallel-worktrees"/"workflowMode": "single-worktree"/' .taskmaster/worktree-config.json

# 2. Clean up completed worktrees (after merging PRs)
git worktree remove ../akarii-ui-redesign
git worktree remove ../akarii-share-feature
# ... etc for completed worktrees

# 3. Continue working normally in main worktree
# All task management returns to standard task-master commands
```

**To setup new parallel worktrees for future work:**

```bash
# 1. Update worktree-config.json with new task ranges and worktree paths
# 2. Create new worktrees: git worktree add ../new-feature feature/new-feature
# 3. Copy tm and workflow-helper scripts to new worktrees
# 4. Update CLAUDE.md if needed (this section will guide you)
```

**This ensures:**

- Flexible workflow that adapts to project needs
- Easy transition between single and parallel development
- Configuration-driven approach for future scalability
- Clear task ownership and progress tracking
- Clean integration via Pull Requests
- No lost work between sessions

## Package Manager

**ALWAYS use bun instead of npm for all package management operations.**

```bash
# Use bun for installing packages
bun add package-name
bun add -d dev-package-name

# Use bun for running scripts
bun run dev
bun run build
bun run test
```

## Convex Development Commands

**IMPORTANT: Use the correct Convex commands - NOT package.json scripts.**

```bash
# Start Convex development server (generates types)
bunx convex dev

# Deploy Convex functions
bunx convex deploy

# Run Convex functions locally
bunx convex run functionName

# Reset Convex database (development only)
bunx convex run --prod=false clearAll

# Check Convex status
bunx convex status
```

**Common mistakes to avoid:**

- ❌ `bun run dev:convex` (this script doesn't exist)
- ❌ `npm run convex:dev` (use bun, not npm)
- ✅ `bunx convex dev` (correct command)

**Development workflow:**

1. Start Convex dev server: `bunx convex dev`
2. Start Next.js dev server: `bun run dev`
3. Both servers should run simultaneously for full functionality
