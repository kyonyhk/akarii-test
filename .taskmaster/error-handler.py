#!/usr/bin/env python3
"""
Error Handler and Escalation System for Multi-Agent System
Monitors for critical issues and escalates to human intervention when needed
"""

import json
import os
import time
import threading
import subprocess
from datetime import datetime, timedelta
from enum import Enum
import psutil

PROJECT_ROOT = "/Users/kuoloonchong/Desktop/akarii-test"
ERROR_LOG = os.path.join(PROJECT_ROOT, '.taskmaster', 'errors.log')
ESCALATION_LOG = os.path.join(PROJECT_ROOT, '.taskmaster', 'escalations.log')
WORKTREE_DIR = os.path.join(os.path.dirname(PROJECT_ROOT), 'akarii-worktrees')

class ErrorSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ErrorType(Enum):
    AGENT_CRASH = "agent_crash"
    RESOURCE_EXHAUSTION = "resource_exhaustion" 
    FILE_CONFLICT = "file_conflict"
    DEPENDENCY_FAILURE = "dependency_failure"
    TASK_TIMEOUT = "task_timeout"
    CONTEXT_DRIFT = "context_drift"
    SYSTEM_OVERLOAD = "system_overload"

class ErrorHandler:
    def __init__(self):
        self.error_counts = {}
        self.escalation_triggers = {
            ErrorType.AGENT_CRASH: {"threshold": 3, "time_window": 300},  # 3 crashes in 5 minutes
            ErrorType.RESOURCE_EXHAUSTION: {"threshold": 2, "time_window": 120},  # 2 in 2 minutes
            ErrorType.FILE_CONFLICT: {"threshold": 5, "time_window": 600},  # 5 in 10 minutes
            ErrorType.SYSTEM_OVERLOAD: {"threshold": 1, "time_window": 60},  # Immediate
        }
        self.recent_errors = []
        self.escalated_issues = []
        
    def log_error(self, error_type, severity, message, agent_id=None, details=None):
        """Log an error with timestamp and context"""
        error_entry = {
            "timestamp": datetime.now().isoformat(),
            "type": error_type.value,
            "severity": severity.value,
            "message": message,
            "agent_id": agent_id,
            "details": details or {}
        }
        
        # Add to recent errors
        self.recent_errors.append(error_entry)
        if len(self.recent_errors) > 100:
            self.recent_errors.pop(0)
        
        # Write to log
        with open(ERROR_LOG, 'a') as f:
            f.write(json.dumps(error_entry) + "\n")
        
        # Check for escalation
        if self.should_escalate(error_type, error_entry):
            self.escalate_error(error_entry)
        
        print(f"[ERROR] {error_type.value}: {message}")
        
    def should_escalate(self, error_type, error_entry):
        """Determine if error should be escalated based on frequency and severity"""
        if error_entry["severity"] == ErrorSeverity.CRITICAL.value:
            return True
            
        if error_type not in self.escalation_triggers:
            return False
            
        trigger = self.escalation_triggers[error_type]
        threshold = trigger["threshold"]
        time_window = trigger["time_window"]
        
        # Count recent errors of this type
        now = datetime.now()
        cutoff = now - timedelta(seconds=time_window)
        
        recent_count = sum(1 for err in self.recent_errors 
                          if err["type"] == error_type.value and 
                          datetime.fromisoformat(err["timestamp"]) > cutoff)
        
        return recent_count >= threshold
    
    def escalate_error(self, error_entry):
        """Escalate error to human intervention"""
        escalation = {
            "timestamp": datetime.now().isoformat(),
            "original_error": error_entry,
            "escalation_reason": "Threshold exceeded or critical severity",
            "suggested_actions": self.get_suggested_actions(error_entry),
            "system_state": self.get_system_snapshot()
        }
        
        self.escalated_issues.append(escalation)
        
        # Write to escalation log
        with open(ESCALATION_LOG, 'a') as f:
            f.write(json.dumps(escalation, indent=2) + "\n")
        
        # Send alert to master control
        self.send_escalation_alert(escalation)
        
        print(f"🚨 ESCALATED: {error_entry['type']} - {error_entry['message']}")
    
    def get_suggested_actions(self, error_entry):
        """Get suggested actions based on error type"""
        error_type = ErrorType(error_entry["type"])
        
        suggestions = {
            ErrorType.AGENT_CRASH: [
                "Check agent logs for specific error messages",
                "Verify system resources are sufficient",
                "Consider reducing agent workload",
                "Check for file permission issues",
                "Restart agent with preserved context"
            ],
            ErrorType.RESOURCE_EXHAUSTION: [
                "Kill non-essential processes",
                "Increase system swap space",
                "Pause some agents temporarily",
                "Monitor memory usage patterns",
                "Consider upgrading hardware"
            ],
            ErrorType.FILE_CONFLICT: [
                "Review recent commits for conflicts",
                "Check git status in agent worktrees", 
                "Manually resolve merge conflicts",
                "Implement file locking mechanism",
                "Review agent file ownership rules"
            ],
            ErrorType.DEPENDENCY_FAILURE: [
                "Check task completion status",
                "Verify dependency chain integrity",
                "Consider alternative dependency paths",
                "Update task status manually if needed",
                "Review agent coordination logic"
            ],
            ErrorType.SYSTEM_OVERLOAD: [
                "Emergency stop all agents",
                "Check system CPU and memory usage",
                "Close unnecessary applications",
                "Restart system if needed",
                "Reduce number of concurrent agents"
            ]
        }
        
        return suggestions.get(error_type, ["Manual investigation required"])
    
    def get_system_snapshot(self):
        """Get current system state for debugging"""
        snapshot = {
            "timestamp": datetime.now().isoformat(),
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_usage": psutil.disk_usage('/').percent,
            "active_processes": len([p for p in psutil.process_iter() if 'claude' in p.name().lower()]),
        }
        
        # Add agent status
        agents = ['agent-prism', 'agent-realtime', 'agent-auth', 'agent-analytics', 'agent-quality', 'agent-review']
        snapshot["agents"] = {}
        
        for agent in agents:
            pid_file = os.path.join(WORKTREE_DIR, agent, 'agent.pid')
            running = False
            cpu_usage = 0
            memory_usage = 0
            
            if os.path.exists(pid_file):
                try:
                    with open(pid_file, 'r') as f:
                        pid = int(f.read().strip())
                    
                    process = psutil.Process(pid)
                    running = process.is_running()
                    if running:
                        cpu_usage = process.cpu_percent()
                        memory_usage = process.memory_percent()
                except:
                    running = False
            
            snapshot["agents"][agent] = {
                "running": running,
                "cpu_percent": cpu_usage,
                "memory_percent": memory_usage
            }
        
        return snapshot
    
    def send_escalation_alert(self, escalation):
        """Send escalation alert to master control interface"""
        alert_file = os.path.join(PROJECT_ROOT, '.taskmaster', 'alerts.json')
        
        # Load existing alerts
        alerts = []
        if os.path.exists(alert_file):
            try:
                with open(alert_file, 'r') as f:
                    alerts = json.load(f)
            except:
                alerts = []
        
        # Add new alert
        alert = {
            "id": len(alerts) + 1,
            "timestamp": escalation["timestamp"],
            "type": "escalation",
            "severity": "high",
            "title": f"Error Escalated: {escalation['original_error']['type']}",
            "message": escalation['original_error']['message'],
            "details": escalation,
            "acknowledged": False
        }
        
        alerts.append(alert)
        
        # Keep only last 50 alerts
        if len(alerts) > 50:
            alerts = alerts[-50:]
        
        # Save alerts
        with open(alert_file, 'w') as f:
            json.dump(alerts, f, indent=2)
    
    def monitor_system_health(self):
        """Continuously monitor system health"""
        while True:
            try:
                # Check CPU usage
                cpu_percent = psutil.cpu_percent(interval=1)
                if cpu_percent > 90:
                    self.log_error(
                        ErrorType.SYSTEM_OVERLOAD,
                        ErrorSeverity.HIGH,
                        f"CPU usage critically high: {cpu_percent}%",
                        details={"cpu_percent": cpu_percent}
                    )
                
                # Check memory usage
                memory = psutil.virtual_memory()
                if memory.percent > 85:
                    self.log_error(
                        ErrorType.RESOURCE_EXHAUSTION,
                        ErrorSeverity.HIGH,
                        f"Memory usage critically high: {memory.percent}%",
                        details={"memory_percent": memory.percent, "available_mb": memory.available // (1024*1024)}
                    )
                
                # Check agent processes
                agents = ['agent-prism', 'agent-realtime', 'agent-auth', 'agent-analytics', 'agent-quality', 'agent-review']
                for agent in agents:
                    pid_file = os.path.join(WORKTREE_DIR, agent, 'agent.pid')
                    
                    if os.path.exists(pid_file):
                        try:
                            with open(pid_file, 'r') as f:
                                pid = int(f.read().strip())
                            
                            if not psutil.pid_exists(pid):
                                self.log_error(
                                    ErrorType.AGENT_CRASH,
                                    ErrorSeverity.MEDIUM,
                                    f"Agent {agent} process crashed (PID: {pid})",
                                    agent_id=agent,
                                    details={"crashed_pid": pid}
                                )
                        except:
                            pass
                
                # Check for file conflicts
                self.check_file_conflicts()
                
                time.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                print(f"Error in health monitoring: {str(e)}")
                time.sleep(60)  # Wait longer on error
    
    def check_file_conflicts(self):
        """Check for git conflicts in agent worktrees"""
        agents = ['agent-prism', 'agent-realtime', 'agent-auth', 'agent-analytics', 'agent-quality', 'agent-review']
        
        for agent in agents:
            worktree_path = os.path.join(WORKTREE_DIR, agent)
            if os.path.exists(worktree_path):
                try:
                    # Check git status for conflicts
                    result = subprocess.run(['git', 'status', '--porcelain'], 
                                          cwd=worktree_path, capture_output=True, text=True)
                    
                    if result.returncode == 0:
                        lines = result.stdout.strip().split('\n') if result.stdout.strip() else []
                        conflicts = [line for line in lines if line.startswith('UU ') or line.startswith('AA ')]
                        
                        if conflicts:
                            self.log_error(
                                ErrorType.FILE_CONFLICT,
                                ErrorSeverity.MEDIUM,
                                f"Git conflicts detected in {agent}",
                                agent_id=agent,
                                details={"conflicts": conflicts}
                            )
                except:
                    pass
    
    def get_recent_errors(self, count=20):
        """Get recent errors for display"""
        return self.recent_errors[-count:]
    
    def get_escalated_issues(self):
        """Get all escalated issues"""
        return self.escalated_issues
    
    def clear_escalated_issue(self, issue_id):
        """Clear an escalated issue (mark as resolved)"""
        if 0 <= issue_id < len(self.escalated_issues):
            self.escalated_issues[issue_id]["resolved"] = True
            self.escalated_issues[issue_id]["resolved_at"] = datetime.now().isoformat()

# Global error handler instance
error_handler = ErrorHandler()

def start_error_monitoring():
    """Start error monitoring in background thread"""
    monitor_thread = threading.Thread(target=error_handler.monitor_system_health, daemon=True)
    monitor_thread.start()
    print("🚨 Error monitoring system started")

if __name__ == '__main__':
    print("🚨 Starting Error Handler and Escalation System...")
    start_error_monitoring()
    
    # Keep the script running
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        print("\n🛑 Error handler stopped")