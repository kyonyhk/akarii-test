# 🤖 Multi-Agent Development Dashboard Guide

## Overview

The Multi-Agent Development Dashboard provides comprehensive real-time monitoring of Claude Code agents working on the Akarii project. You can choose between two dashboard interfaces:

## 🌐 Web Dashboard (Recommended)

### Features

- **Real-time Agent Monitoring**: Live status updates every 5 seconds
- **Visual Status Indicators**: Color-coded agent states and progress
- **Git Commit Tracking**: Monitor code changes and commits in real-time
- **Process Health Monitoring**: Track CPU usage and process status
- **Phase Management**: View development phases and dependencies
- **Handoff Tracking**: Monitor critical task handoffs between agents

### How to Use

```bash
./launch-agents.sh dashboard
# Choose option 1 (Web Dashboard)
# Open http://localhost:5000 in your browser
```

### Dashboard Sections

#### 📊 Stats Overview

- **Total Agents**: Number of configured agents
- **Active Now**: Agents currently working
- **Completed**: Agents that finished their tasks
- **Total Commits**: Combined git commits across all agents

#### 📋 Development Phases

- **Phase 1**: Immediate start agents (prism, realtime, auth)
- **Phase 2**: Mid-tier agents (analytics, quality)
- **Phase 3**: Final integration agents (review)

#### 🤖 Agent Cards

Each agent shows:

- **Status**: ready, in-progress, waiting, completed, blocked
- **Current Task**: Which task the agent is working on
- **Process Info**: PID and running status
- **Git Info**: Commits, branch, last commit time
- **Recent Logs**: Latest activity from the agent
- **Specialization**: Agent's area of expertise

#### 🔗 Critical Handoffs

- **Task Dependencies**: Which tasks must complete to unblock others
- **Status Tracking**: Real-time status of dependency tasks
- **Auto-triggers**: When dependencies complete, waiting agents auto-start

### Status Colors

- 🟢 **Ready**: Agent is ready to start
- 🔄 **In-Progress**: Agent is actively working
- 🟡 **Waiting**: Agent is waiting for dependencies
- ✅ **Completed**: Agent finished all tasks
- 🔴 **Blocked**: Agent encountered an issue

## 📱 Terminal Dashboard

### Features

- **Command-line Interface**: Works in any terminal
- **Real-time Updates**: Auto-refresh every 5 seconds
- **Interactive Commands**: Control agents directly
- **Log Viewing**: Detailed agent logs

### How to Use

```bash
./launch-agents.sh dashboard
# Choose option 2 (Terminal Dashboard)
```

### Commands

- **s**: Manual status refresh
- **r <agent-id>**: Restart specific agent
- **k <agent-id>**: Kill specific agent
- **l <agent-id>**: View detailed logs
- **q**: Quit dashboard

## 🚀 Quick Start Guide

### 1. Start the Multi-Agent System

```bash
./launch-agents.sh start
```

### 2. Open the Dashboard

```bash
./launch-agents.sh dashboard
```

### 3. Monitor Progress

- Watch agents transition from "ready" → "in-progress" → "completed"
- Monitor git commits to see code changes
- Watch for critical handoff triggers
- Check process health indicators

### 4. Typical Workflow

1. **Phase 1** starts immediately (3 agents)
2. **agent-auth** completes Task 6.3 → unblocks analytics & quality
3. **agent-prism** completes Task 5.2 → unblocks quality
4. **agent-realtime** completes Task 5.7 → unblocks review
5. All agents complete → project finished

## 🔍 Troubleshooting

### Agent Stuck or Not Progressing

1. Check process status (should show running PID)
2. Look at recent logs for errors
3. Check git commits (should increase over time)
4. Use terminal dashboard to restart: `r agent-name`

### No Git Commits

- Agent may be in planning/analysis phase
- Check recent logs for activity
- Some tasks require longer initial setup

### Dependencies Not Triggering

- Verify prerequisite tasks show "done" status
- Check handoff section for trigger status
- Critical handoffs auto-activate when dependencies complete

### Dashboard Not Loading

- Ensure Flask is installed: `pip3 install flask`
- Check port 5000 is available
- Use terminal dashboard as backup

## 📈 Expected Timeline

### Typical Development Flow

- **0-30min**: System initialization and agent startup
- **30min-2h**: Phase 1 agents active (prism, realtime, auth)
- **2h-4h**: Phase 2 agents activate (analytics, quality)
- **4h-8h**: Phase 3 agents activate (review)
- **8-10h**: All agents complete, system finished

### Success Indicators

- All agents show "completed" status
- High number of git commits across agents
- All handoff triggers show "COMPLETE"
- No blocked or error states

## 🎯 Dashboard URLs

### Web Dashboard

- **Main Dashboard**: http://localhost:5000
- **API Endpoint**: http://localhost:5000/api/data
- **Agent Details**: http://localhost:5000/api/agent/{agent-id}

### Agent Control (via API)

- **Kill Agent**: http://localhost:5000/api/control/{agent-id}/kill

## 🛠️ Advanced Usage

### Custom Monitoring

```bash
# Check specific agent status
curl http://localhost:5000/api/agent/agent-prism

# Get raw dashboard data
curl http://localhost:5000/api/data | jq .
```

### Log Analysis

```bash
# View agent logs directly
tail -f ../akarii-worktrees/agent-prism/agent.log

# Check orchestrator logs
tail -f .taskmaster/orchestrator-main.log
```

The dashboard is your command center for managing the multi-agent development process. Use it to monitor progress, identify issues, and ensure smooth parallel development across all agents!
