# Multi-Agent Parallel Development Coordination

## Project Overview

- **Project**: Akarii AI-powered real-time chat application
- **Strategy**: 6 specialized agents working in parallel to maximize development velocity
- **Branch**: `multi-agent-parallel-dev`
- **Coordinator**: Master Agent (this session)

## Agent Deployment Plan

### Phase 1: Immediate Start (Can begin now)

```
🟢 agent-prism    -> Tasks 5.2, 5.3, 5.4     [2h] (UI Components)
🟢 agent-realtime -> Tasks 5.5, 5.6, 5.7     [3h] (Real-time Data)
🟢 agent-auth     -> Tasks 6.1-6.6           [4h] (Authentication)
```

### Phase 2: Mid-tier (Wait for dependencies)

```
🟡 agent-analytics -> Tasks 9.1-9.6          [3h] (Blocked by agent-auth 6.3)
🟡 agent-quality   -> Tasks 7.1-7.6, 8.1-8.7 [6h] (Blocked by agent-auth 6.3 + agent-prism 5.2)
```

### Phase 3: Final Integration (Wait for foundation)

```
🔴 agent-review    -> Tasks 10.1-10.7        [5h] (Blocked by agent-realtime 5.7)
```

## Critical Handoff Points

### 🚨 HIGH PRIORITY UNBLOCKS

1. **agent-auth Task 6.3** → Unblocks agent-analytics + agent-quality
2. **agent-prism Task 5.2** → Unblocks agent-quality
3. **agent-realtime Task 5.7** → Unblocks agent-review

## File Conflict Prevention

### Directory Ownership

```
components/analysis/     → agent-prism (except prism-panel.tsx)
components/auth/         → agent-auth
components/dashboard/    → agent-analytics
components/voting/       → agent-quality
components/review/       → agent-review
hooks/                   → agent-realtime
app/sign-in|sign-up/     → agent-auth
app/review/              → agent-review
convex/auth.ts           → agent-auth
convex/usage.ts          → agent-analytics
convex/voting.ts         → agent-quality
```

### Shared Files (Coordinate Changes)

```
convex/schema.ts         → All agents (coordinate via comments)
convex/mutations.ts      → Multiple agents (coordinate via comments)
convex/queries.ts        → Multiple agents (coordinate via comments)
app/layout.tsx           → agent-auth + others (minimal changes)
app/page.tsx             → Multiple agents (minimal changes)
types/                   → Shared (read-only for most)
```

## Branch Strategy

### Feature Branches

```
multi-agent-parallel-dev (main coordination branch)
├── feature/prism-components      (agent-prism)
├── feature/realtime-subscriptions (agent-realtime)
├── feature/clerk-auth            (agent-auth)
├── feature/cost-dashboard        (agent-analytics)
├── feature/voting-quality        (agent-quality)
└── feature/review-mode           (agent-review)
```

### Merge Protocol

1. **Individual work**: Each agent works in their feature branch
2. **Regular sync**: Agents pull from `multi-agent-parallel-dev` frequently
3. **Merge back**: Complete features merge to `multi-agent-parallel-dev`
4. **Final merge**: `multi-agent-parallel-dev` → `main` when all work complete

## Communication Protocol

### Status Updates (Every 30 min)

Agents update `.taskmaster/agent-assignments.json`:

```json
{
  "agents": {
    "agent-prism": {
      "status": "in-progress", // ready|in-progress|completed|blocked
      "current_task": "5.2",
      "last_update": "2025-07-23T22:30:00Z",
      "progress": "50%",
      "notes": "Analysis row component structure complete"
    }
  }
}
```

### Blocking Issues

- Document blocks in task-master: `task-master update-subtask --id=5.2 --prompt="Blocked by missing types"`
- Update agent-assignments.json status to "blocked"
- Notify coordinator (this session) immediately

### Completion Notifications

- Mark task complete in task-master: `task-master set-status --id=5.2 --status=done`
- Update agent-assignments.json task status to "completed"
- If critical handoff, notify dependent agents

## Agent Startup Instructions

### For Immediate Start Agents

```bash
# Clone new session in terminal
cd /Users/kuoloonchong/Desktop/akarii-test
git checkout multi-agent-parallel-dev

# Load appropriate agent instructions
cat .taskmaster/agents/agent-prism-instructions.md     # For UI agent
cat .taskmaster/agents/agent-realtime-instructions.md  # For real-time agent
cat .taskmaster/agents/agent-auth-instructions.md      # For auth agent

# Create feature branch and begin work
git checkout -b feature/[your-branch-name]
```

### For Waiting Agents

- Monitor `.taskmaster/agent-assignments.json` for dependency completion
- Stay ready to start immediately when unblocked
- Review instruction files to prepare

## Success Metrics

### Velocity Targets

- **Phase 1**: 3 agents complete in ~4 hours (parallel work)
- **Phase 2**: 2 agents complete in ~6 hours after handoffs
- **Phase 3**: 1 agent complete in ~5 hours after foundation
- **Total**: ~15 hours of work completed in ~8-10 hours wall time

### Quality Gates

- All features pass individual testing before merge
- No merge conflicts due to coordination protocols
- Shared files properly coordinated
- Full integration testing before main branch merge

## Risk Mitigation

### Common Risks

1. **Shared file conflicts** → Strict ownership + coordination protocol
2. **Dependency delays** → Clear blocking identification + parallel alternatives
3. **Integration issues** → Regular sync from main branch + integration testing
4. **Communication gaps** → Mandatory status updates + clear handoff triggers

### Contingency Plans

- **Agent blocked**: Coordinate with master agent for alternative work
- **Critical dependency delayed**: Identify parallel work or assist blocked dependency
- **Integration conflicts**: Master agent mediates and coordinates resolution

## Coordination Commands

### Master Agent Monitoring

```bash
# Check all agent status
cat .taskmaster/agent-assignments.json | jq '.agents[] | {id: .id, status: .status, current_task: .current_task}'

# Check task-master overall status
task-master list

# Monitor git branch activity
git branch -a
git log --oneline --graph --all
```

### Agent Self-Monitoring

```bash
# Update your status
vim .taskmaster/agent-assignments.json  # Update your section

# Sync with latest changes
git checkout multi-agent-parallel-dev
git pull origin multi-agent-parallel-dev
git checkout your-feature-branch
git merge multi-agent-parallel-dev

# Check for handoff triggers
task-master show [dependency-task-id]
```

## Ready to Deploy!

**IMMEDIATE START AGENTS**: `agent-prism`, `agent-realtime`, `agent-auth` can begin now.
**COORDINATOR**: Monitor progress and manage handoffs.
**WAITING AGENTS**: Stand by for dependency completion signals.

The system is designed for maximum parallel efficiency while preventing conflicts. Let's build Akarii rapidly with multiple specialized agents!
