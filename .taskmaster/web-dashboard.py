#!/usr/bin/env python3
"""
Multi-Agent Development Web Dashboard
Real-time web-based monitoring of Claude Code agents
"""

from flask import Flask, render_template, jsonify
import json
import subprocess
import os
import time
from datetime import datetime
from threading import Thread

app = Flask(__name__)
app.secret_key = 'multi-agent-dashboard-key'

PROJECT_ROOT = "/Users/kuoloonchong/Desktop/akarii-test"
ASSIGNMENTS_FILE = os.path.join(PROJECT_ROOT, '.taskmaster', 'agent-assignments.json')
WORKTREE_DIR = os.path.join(os.path.dirname(PROJECT_ROOT), 'akarii-worktrees')

class AgentMonitor:
    def __init__(self):
        self.data = {}
        self.last_update = None
        
    def load_assignments(self):
        """Load agent assignments from JSON file"""
        try:
            with open(ASSIGNMENTS_FILE, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"agents": {}}
    
    def get_task_status(self, task_id):
        """Get task status using task-master command"""
        try:
            os.chdir(PROJECT_ROOT)
            result = subprocess.run(
                ['task-master', 'show', task_id], 
                capture_output=True, 
                text=True, 
                timeout=5
            )
            if result.returncode == 0:
                for line in result.stdout.split('\n'):
                    if '"status"' in line:
                        return line.split('"')[3]
            return "unknown"
        except Exception:
            return "unknown"
    
    def get_agent_git_status(self, agent_id):
        """Get git status for an agent's worktree"""
        worktree_path = os.path.join(WORKTREE_DIR, agent_id)
        if not os.path.exists(worktree_path):
            return {"status": "no-worktree", "commits": 0, "last_commit": "never", "branch": "none"}
        
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
            
            # Get file changes
            result = subprocess.run(['git', 'status', '--porcelain'], 
                                  capture_output=True, text=True)
            changes = len(result.stdout.strip().split('\n')) if result.stdout.strip() else 0
            
            return {
                "status": "active",
                "commits": commits,
                "last_commit": last_commit,
                "branch": branch,
                "changes": changes
            }
        except Exception as e:
            return {"status": "error", "commits": 0, "last_commit": f"error: {str(e)}", "branch": "error"}
    
    def check_agent_process(self, agent_id):
        """Check if agent process is running"""
        worktree_path = os.path.join(WORKTREE_DIR, agent_id)
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
    
    def get_recent_logs(self, agent_id, lines=5):
        """Get recent log entries for an agent"""
        worktree_path = os.path.join(WORKTREE_DIR, agent_id)
        log_file = os.path.join(worktree_path, 'agent.log')
        
        if not os.path.exists(log_file):
            return ["No log file found"]
        
        try:
            result = subprocess.run(['tail', '-n', str(lines), log_file], 
                                  capture_output=True, text=True)
            lines_list = result.stdout.split('\n') if result.returncode == 0 else ["Error reading log"]
            return [line for line in lines_list if line.strip()]
        except Exception as e:
            return [f"Error: {str(e)}"]
    
    def update_data(self):
        """Update all monitoring data"""
        assignments = self.load_assignments()
        
        self.data = {
            'timestamp': datetime.now().isoformat(),
            'agents': {},
            'phases': {},
            'handoffs': {}
        }
        
        # Process agents
        for agent_id, agent_info in assignments.get('agents', {}).items():
            git_info = self.get_agent_git_status(agent_id)
            process_info = self.check_agent_process(agent_id)
            logs = self.get_recent_logs(agent_id, 3)
            
            self.data['agents'][agent_id] = {
                'name': agent_info.get('name', agent_id),
                'status': agent_info.get('status', 'unknown'),
                'current_task': agent_info.get('current_task', 'None'),
                'assigned_tasks': agent_info.get('assigned_tasks', []),
                'estimated_completion': agent_info.get('estimated_completion', 'Unknown'),
                'specialization': agent_info.get('specialization', ''),
                'blocked_by': agent_info.get('blocked_by', []),
                'git': git_info,
                'process': process_info,
                'recent_logs': logs
            }
        
        # Process phases
        for phase_key, phase in assignments.get('execution_phases', {}).items():
            phase_agents = phase.get('agents', [])
            statuses = {}
            for agent_id in phase_agents:
                if agent_id in self.data['agents']:
                    status = self.data['agents'][agent_id]['status']
                    statuses[status] = statuses.get(status, 0) + 1
            
            self.data['phases'][phase_key] = {
                'name': phase.get('name', phase_key),
                'duration': phase.get('duration', 'Unknown'),
                'agents': phase_agents,
                'status_counts': statuses
            }
        
        # Process handoff triggers
        handoff_triggers = assignments.get('task_handoff_triggers', {})
        for trigger, actions in handoff_triggers.items():
            if '_complete' in trigger:
                task_id = trigger.replace('_complete', '').replace('task_', '')
                task_status = self.get_task_status(task_id)
                self.data['handoffs'][trigger] = {
                    'task_id': task_id,
                    'status': task_status,
                    'actions': actions,
                    'completed': task_status == 'done'
                }
        
        self.last_update = datetime.now()

monitor = AgentMonitor()

@app.route('/')
def dashboard():
    """Main dashboard page"""
    return render_template('dashboard.html')

@app.route('/api/data')
def get_data():
    """API endpoint for dashboard data"""
    monitor.update_data()
    return jsonify(monitor.data)

@app.route('/api/agent/<agent_id>')
def get_agent_details(agent_id):
    """Get detailed information about a specific agent"""
    monitor.update_data()
    if agent_id in monitor.data['agents']:
        agent_data = monitor.data['agents'][agent_id]
        # Get more detailed logs
        agent_data['detailed_logs'] = monitor.get_recent_logs(agent_id, 20)
        return jsonify(agent_data)
    return jsonify({'error': 'Agent not found'}), 404

@app.route('/api/control/<agent_id>/<action>')
def control_agent(agent_id, action):
    """Control agent (restart, kill, etc.)"""
    if action == 'kill':
        process_info = monitor.check_agent_process(agent_id)
        if process_info['running']:
            try:
                os.kill(process_info['pid'], 15)  # SIGTERM
                return jsonify({'success': True, 'message': f'Killed agent {agent_id}'})
            except OSError as e:
                return jsonify({'success': False, 'error': str(e)})
        return jsonify({'success': False, 'error': 'Agent not running'})
    return jsonify({'success': False, 'error': 'Unknown action'})

# Create templates directory and HTML template
def create_template():
    """Create the HTML template for the dashboard"""
    templates_dir = os.path.join(os.path.dirname(__file__), 'templates')
    os.makedirs(templates_dir, exist_ok=True)
    
    template_content = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Multi-Agent Development Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #e2e8f0; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; padding: 20px; background: #1e293b; border-radius: 10px; }
        .header h1 { color: #60a5fa; font-size: 2.5rem; margin-bottom: 10px; }
        .header .subtitle { color: #94a3b8; font-size: 1.1rem; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .stat-card { background: #1e293b; padding: 15px; border-radius: 8px; text-align: center; }
        .stat-number { font-size: 2rem; font-weight: bold; margin-bottom: 5px; }
        .stat-label { color: #94a3b8; font-size: 0.9rem; }
        .phases { margin-bottom: 30px; }
        .phase { background: #1e293b; border-radius: 10px; padding: 20px; margin-bottom: 15px; }
        .phase-header { display: flex; justify-content: between; align-items: center; margin-bottom: 15px; }
        .phase-title { color: #60a5fa; font-size: 1.2rem; font-weight: bold; }
        .phase-duration { color: #94a3b8; font-size: 0.9rem; }
        .agents-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; }
        .agent-card { background: #2d3748; border-radius: 10px; padding: 20px; position: relative; }
        .agent-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .agent-name { font-size: 1.1rem; font-weight: bold; color: #f1f5f9; }
        .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; }
        .status-ready { background: #16a34a; color: white; }
        .status-in-progress { background: #2563eb; color: white; }
        .status-waiting { background: #eab308; color: black; }
        .status-completed { background: #059669; color: white; }
        .status-blocked { background: #dc2626; color: white; }
        .agent-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
        .detail-item { font-size: 0.9rem; }
        .detail-label { color: #94a3b8; }
        .detail-value { color: #e2e8f0; font-weight: 500; }
        .process-indicator { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; }
        .process-running { background: #16a34a; }
        .process-stopped { background: #dc2626; }
        .logs { background: #0f172a; border-radius: 5px; padding: 10px; margin-top: 10px; font-family: monospace; font-size: 0.8rem; max-height: 100px; overflow-y: auto; }
        .log-line { margin-bottom: 2px; color: #94a3b8; }
        .handoffs { margin-top: 30px; }
        .handoff-item { background: #1e293b; padding: 15px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
        .handoff-trigger { font-weight: bold; }
        .handoff-status { padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; }
        .handoff-complete { background: #16a34a; color: white; }
        .handoff-pending { background: #64748b; color: white; }
        .auto-refresh { position: fixed; top: 20px; right: 20px; background: #1e293b; padding: 10px; border-radius: 5px; font-size: 0.9rem; }
        .loading { text-align: center; color: #94a3b8; padding: 40px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Multi-Agent Development Dashboard</h1>
            <p class="subtitle">Real-time monitoring of Claude Code agents working on Akarii project</p>
        </div>
        
        <div class="auto-refresh">
            🔄 Auto-refresh: <span id="countdown">5</span>s
        </div>
        
        <div id="dashboard-content">
            <div class="loading">
                <p>Loading dashboard data...</p>
            </div>
        </div>
    </div>

    <script>
        let countdownTimer;
        let refreshInterval = 5000; // 5 seconds
        
        async function loadDashboard() {
            try {
                const response = await fetch('/api/data');
                const data = await response.json();
                renderDashboard(data);
            } catch (error) {
                console.error('Error loading dashboard:', error);
                document.getElementById('dashboard-content').innerHTML = 
                    '<div class="loading"><p>Error loading dashboard data</p></div>';
            }
        }
        
        function renderDashboard(data) {
            const agents = data.agents || {};
            const phases = data.phases || {};
            const handoffs = data.handoffs || {};
            
            // Calculate stats
            const totalAgents = Object.keys(agents).length;
            const activeAgents = Object.values(agents).filter(a => a.status === 'in-progress').length;
            const completedAgents = Object.values(agents).filter(a => a.status === 'completed').length;
            const totalCommits = Object.values(agents).reduce((sum, a) => sum + (a.git?.commits || 0), 0);
            
            let html = `
                <div class="stats">
                    <div class="stat-card">
                        <div class="stat-number" style="color: #60a5fa;">${totalAgents}</div>
                        <div class="stat-label">Total Agents</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" style="color: #2563eb;">${activeAgents}</div>
                        <div class="stat-label">Active Now</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" style="color: #16a34a;">${completedAgents}</div>
                        <div class="stat-label">Completed</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" style="color: #f59e0b;">${totalCommits}</div>
                        <div class="stat-label">Total Commits</div>
                    </div>
                </div>
                
                <div class="phases">
                    <h2 style="color: #60a5fa; margin-bottom: 20px;">📋 Development Phases</h2>
            `;
            
            // Render phases
            Object.entries(phases).forEach(([phaseKey, phase]) => {
                const statusStr = Object.entries(phase.status_counts)
                    .map(([status, count]) => `${status}: ${count}`)
                    .join(' | ');
                
                html += `
                    <div class="phase">
                        <div class="phase-header">
                            <div class="phase-title">${phase.name}</div>
                            <div class="phase-duration">${phase.duration}</div>
                        </div>
                        <div style="color: #94a3b8; font-size: 0.9rem;">${statusStr}</div>
                    </div>
                `;
            });
            
            html += `</div><div class="agents-grid">`;
            
            // Render agents
            Object.entries(agents).forEach(([agentId, agent]) => {
                const statusClass = `status-${agent.status.replace('-', '')}`;
                const processClass = agent.process?.running ? 'process-running' : 'process-stopped';
                
                html += `
                    <div class="agent-card">
                        <div class="agent-header">
                            <div class="agent-name">${agent.name}</div>
                            <div class="status-badge ${statusClass}">${agent.status}</div>
                        </div>
                        
                        <div class="agent-details">
                            <div class="detail-item">
                                <span class="detail-label">Current Task:</span><br>
                                <span class="detail-value">${agent.current_task}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">ETA:</span><br>
                                <span class="detail-value">${agent.estimated_completion}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Process:</span><br>
                                <span class="detail-value">
                                    <span class="process-indicator ${processClass}"></span>
                                    PID: ${agent.process?.pid || 'N/A'}
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Commits:</span><br>
                                <span class="detail-value">${agent.git?.commits || 0}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Branch:</span><br>
                                <span class="detail-value">${agent.git?.branch || 'none'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Last Commit:</span><br>
                                <span class="detail-value">${agent.git?.last_commit || 'never'}</span>
                            </div>
                        </div>
                        
                        <div style="font-size: 0.9rem; color: #94a3b8; margin-bottom: 10px;">
                            <strong>Specialization:</strong> ${agent.specialization}
                        </div>
                        
                        <div class="logs">
                            ${agent.recent_logs.map(log => `<div class="log-line">${log}</div>`).join('')}
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
            
            // Render handoffs
            html += `
                <div class="handoffs">
                    <h2 style="color: #60a5fa; margin-bottom: 20px;">🔗 Critical Handoff Status</h2>
            `;
            
            Object.entries(handoffs).forEach(([trigger, handoff]) => {
                const statusClass = handoff.completed ? 'handoff-complete' : 'handoff-pending';
                const statusText = handoff.completed ? 'COMPLETE' : 'PENDING';
                
                html += `
                    <div class="handoff-item">
                        <div>
                            <div class="handoff-trigger">Task ${handoff.task_id}</div>
                            <div style="font-size: 0.8rem; color: #94a3b8;">
                                ${handoff.actions.join(', ')}
                            </div>
                        </div>
                        <div class="handoff-status ${statusClass}">${statusText}</div>
                    </div>
                `;
            });
            
            html += `</div>`;
            
            document.getElementById('dashboard-content').innerHTML = html;
        }
        
        function startCountdown() {
            let count = 5;
            countdownTimer = setInterval(() => {
                count--;
                document.getElementById('countdown').textContent = count;
                if (count <= 0) {
                    clearInterval(countdownTimer);
                    loadDashboard();
                    startCountdown();
                }
            }, 1000);
        }
        
        // Initial load
        loadDashboard();
        startCountdown();
    </script>
</body>
</html>'''
    
    template_path = os.path.join(templates_dir, 'dashboard.html')
    with open(template_path, 'w') as f:
        f.write(template_content)

if __name__ == '__main__':
    create_template()
    print("🚀 Starting Multi-Agent Dashboard...")
    print("📊 Open http://localhost:5000 in your browser")
    print("🔄 Dashboard auto-refreshes every 5 seconds")
    app.run(host='0.0.0.0', port=5000, debug=False)