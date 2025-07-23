#!/usr/bin/env python3
"""
Multi-Agent Development Dashboard
Real-time monitoring and management of Claude Code agents
"""

import json
import time
import subprocess
import os
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional

class AgentDashboard:
    def __init__(self, project_root: str):
        self.project_root = project_root
        self.assignments_file = os.path.join(project_root, '.taskmaster', 'agent-assignments.json')
        self.orchestrator_log = os.path.join(project_root, '.taskmaster', 'orchestrator.log')
        self.worktree_dir = os.path.join(os.path.dirname(project_root), 'akarii-worktrees')
        
    def load_assignments(self) -> Dict:
        """Load agent assignments from JSON file"""
        try:
            with open(self.assignments_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"agents": {}}
    
    def get_task_status(self, task_id: str) -> str:
        """Get task status using task-master command"""
        try:
            os.chdir(self.project_root)
            result = subprocess.run(
                ['task-master', 'show', task_id], 
                capture_output=True, 
                text=True, 
                timeout=10
            )
            if result.returncode == 0:
                # Parse the JSON output to get status
                for line in result.stdout.split('\n'):
                    if '"status"' in line:
                        return line.split('"')[3]
            return "unknown"
        except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError):
            return "unknown"
    
    def get_agent_git_status(self, agent_id: str) -> Dict:
        """Get git status for an agent's worktree"""
        worktree_path = os.path.join(self.worktree_dir, agent_id)
        if not os.path.exists(worktree_path):
            return {"status": "no-worktree", "commits": 0, "last_commit": "never"}
        
        try:
            os.chdir(worktree_path)
            
            # Get commit count
            result = subprocess.run(['git', 'rev-list', '--count', 'HEAD'], 
                                  capture_output=True, text=True)
            commits = int(result.stdout.strip()) if result.returncode == 0 else 0
            
            # Get last commit time
            result = subprocess.run(['git', 'log', '-1', '--format=%cr'], 
                                  capture_output=True, text=True)
            last_commit = result.stdout.strip() if result.returncode == 0 else "never"
            
            # Get branch name
            result = subprocess.run(['git', 'branch', '--show-current'], 
                                  capture_output=True, text=True)
            branch = result.stdout.strip() if result.returncode == 0 else "unknown"
            
            return {
                "status": "active",
                "commits": commits,
                "last_commit": last_commit,
                "branch": branch
            }
        except Exception as e:
            return {"status": "error", "commits": 0, "last_commit": f"error: {str(e)}"}
    
    def check_agent_process(self, agent_id: str) -> Dict:
        """Check if agent process is running"""
        worktree_path = os.path.join(self.worktree_dir, agent_id)
        pid_file = os.path.join(worktree_path, 'agent.pid')
        
        if not os.path.exists(pid_file):
            return {"running": False, "pid": None}
        
        try:
            with open(pid_file, 'r') as f:
                pid = int(f.read().strip())
            
            # Check if process exists
            try:
                os.kill(pid, 0)  # Signal 0 just checks if process exists
                return {"running": True, "pid": pid}
            except OSError:
                return {"running": False, "pid": pid, "status": "stopped"}
        except (ValueError, FileNotFoundError):
            return {"running": False, "pid": None}
    
    def get_recent_logs(self, agent_id: str, lines: int = 10) -> List[str]:
        """Get recent log entries for an agent"""
        worktree_path = os.path.join(self.worktree_dir, agent_id)
        log_file = os.path.join(worktree_path, 'agent.log')
        
        if not os.path.exists(log_file):
            return ["No log file found"]
        
        try:
            result = subprocess.run(['tail', '-n', str(lines), log_file], 
                                  capture_output=True, text=True)
            return result.stdout.split('\n') if result.returncode == 0 else ["Error reading log"]
        except Exception as e:
            return [f"Error: {str(e)}"]
    
    def display_dashboard(self):
        """Display real-time dashboard"""
        assignments = self.load_assignments()
        
        # Clear screen
        os.system('clear')
        
        print("=" * 80)
        print(" 🤖 MULTI-AGENT CLAUDE CODE DEVELOPMENT DASHBOARD")
        print("=" * 80)
        print(f" Project: Akarii | Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)
        
        # Phase status
        phases = assignments.get('execution_phases', {})
        for phase_key, phase in phases.items():
            phase_name = phase.get('name', phase_key)
            agents = phase.get('agents', [])
            duration = phase.get('duration', 'Unknown')
            
            # Count agent statuses in this phase
            statuses = {}
            for agent_id in agents:
                agent_info = assignments.get('agents', {}).get(agent_id, {})
                status = agent_info.get('status', 'unknown')
                statuses[status] = statuses.get(status, 0) + 1
            
            status_str = " | ".join([f"{k}: {v}" for k, v in statuses.items()])
            print(f"📋 {phase_name} ({duration}): {status_str}")
        
        print()
        
        # Agent details
        for agent_id, agent_info in assignments.get('agents', {}).items():
            name = agent_info.get('name', agent_id)
            status = agent_info.get('status', 'unknown')
            current_task = agent_info.get('current_task', 'None')
            estimated = agent_info.get('estimated_completion', 'Unknown')
            
            # Get additional status info
            git_info = self.get_agent_git_status(agent_id)
            process_info = self.check_agent_process(agent_id)
            
            # Status emoji
            status_emoji = {
                'ready': '🟢',
                'in-progress': '🔄', 
                'waiting': '🟡',
                'completed': '✅',
                'blocked': '🔴',
                'error': '❌'
            }.get(status, '❓')
            
            process_emoji = '🟢' if process_info['running'] else '🔴'
            
            print(f"{status_emoji} {name}")
            print(f"   Status: {status} | Task: {current_task} | ETA: {estimated}")
            print(f"   Process: {process_emoji} PID: {process_info.get('pid', 'N/A')} | " +
                  f"Commits: {git_info.get('commits', 0)} | Last: {git_info.get('last_commit', 'never')}")
            
            if status == 'in-progress':
                recent_logs = self.get_recent_logs(agent_id, 3)
                for log_line in recent_logs[-2:]:  # Show last 2 lines
                    if log_line.strip():
                        print(f"   📝 {log_line.strip()[:60]}...")
            
            print()
        
        # Task dependency status
        print("🔗 CRITICAL HANDOFF STATUS:")
        handoff_triggers = assignments.get('task_handoff_triggers', {})
        for trigger, actions in handoff_triggers.items():
            if '_complete' in trigger:
                task_id = trigger.replace('_complete', '').replace('task_', '')
                task_status = self.get_task_status(task_id)
                emoji = '✅' if task_status == 'done' else '⏳'
                print(f"   {emoji} Task {task_id}: {task_status}")
                if task_status == 'done':
                    for action in actions:
                        print(f"      → {action}")
        
        print()
        print("🎯 Commands: [s]tatus | [r]estart agent | [k]ill agent | [l]ogs | [q]uit")
        print("=" * 80)
    
    def interactive_mode(self):
        """Run interactive dashboard"""
        try:
            while True:
                self.display_dashboard()
                
                # Get user input with timeout
                try:
                    import select
                    i, _, _ = select.select([sys.stdin], [], [], 5)  # 5 second timeout
                    if i:
                        command = sys.stdin.readline().strip().lower()
                        self.handle_command(command)
                    # Auto-refresh every 5 seconds if no input
                except KeyboardInterrupt:
                    break
                except ImportError:
                    # Fallback for systems without select
                    time.sleep(5)
        except KeyboardInterrupt:
            print("\n👋 Dashboard shutting down...")
    
    def handle_command(self, command: str):
        """Handle interactive commands"""
        if command == 'q':
            sys.exit(0)
        elif command == 's':
            # Just refresh (do nothing, next loop will show status)
            pass
        elif command.startswith('r '):
            agent_id = command[2:]
            self.restart_agent(agent_id)
        elif command.startswith('k '):
            agent_id = command[2:]
            self.kill_agent(agent_id)
        elif command.startswith('l '):
            agent_id = command[2:]
            self.show_logs(agent_id)
    
    def restart_agent(self, agent_id: str):
        """Restart a specific agent"""
        print(f"🔄 Restarting {agent_id}...")
        # Implementation would call orchestrator to restart agent
        time.sleep(2)
    
    def kill_agent(self, agent_id: str):
        """Kill a specific agent"""
        print(f"💀 Killing {agent_id}...")
        process_info = self.check_agent_process(agent_id)
        if process_info['running']:
            try:
                os.kill(process_info['pid'], 15)  # SIGTERM
                print(f"✅ Killed process {process_info['pid']}")
            except OSError as e:
                print(f"❌ Error killing process: {e}")
        time.sleep(2)
    
    def show_logs(self, agent_id: str):
        """Show detailed logs for an agent"""
        os.system('clear')
        print(f"📋 LOGS FOR {agent_id}")
        print("=" * 80)
        
        logs = self.get_recent_logs(agent_id, 50)
        for log_line in logs:
            if log_line.strip():
                print(log_line)
        
        print("=" * 80)
        input("Press Enter to continue...")

def main():
    if len(sys.argv) > 1:
        project_root = sys.argv[1]
    else:
        project_root = "/Users/kuoloonchong/Desktop/akarii-test"
    
    dashboard = AgentDashboard(project_root)
    
    if '--once' in sys.argv:
        dashboard.display_dashboard()
    else:
        dashboard.interactive_mode()

if __name__ == "__main__":
    main()