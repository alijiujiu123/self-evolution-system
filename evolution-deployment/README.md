# OpenClaw Evolution System - Deployment Guide

## 🚀 Production Deployment

This guide covers deploying the Evolution System for 24/7 operation.

---

## Architecture

**Two-layer approach**:

1. **Systemd Service**: Keeps the main process running and auto-restarts on crash
2. **Cron Jobs**: Periodic learning cycles (failsafe even if main process dies)

```
┌─────────────────────────────────────────┐
│     Systemd (Main Process)              │
│  • Runs 24/7                            │
│  • Auto-restart on crash                │
│  • 5 monitors (setInterval timers)      │
└─────────────────────────────────────────┘
                ↓ Failsafe
┌─────────────────────────────────────────┐
│     Cron (Periodic Trigger)             │
│  • Every 30 minutes                     │
│  • Runs single learning cycle           │
│  • Independent of main process          │
└─────────────────────────────────────────┘
```

---

## Step 1: Systemd Service

### 1.1 Install Service File

```bash
# Copy service file
sudo cp systemd/openclaw-evolution.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable openclaw-evolution

# Start service
sudo systemctl start openclaw-evolution

# Check status
sudo systemctl status openclaw-evolution
```

### 1.2 Service Management

```bash
# View logs
sudo journalctl -u openclaw-evolution -f

# Restart service
sudo systemctl restart openclaw-evolution

# Stop service
sudo systemctl stop openclaw-evolution

# Disable (don't start on boot)
sudo systemctl disable openclaw-evolution
```

### 1.3 Environment Configuration

Edit the service file to customize:

```ini
[Service]
# AI Models
Environment="EVOLUTION_MODEL_CLASSIFIER=glm-4-flash"
Environment="EVOLUTION_MODEL_ANALYZER=glm-4.7"

# Daily Budget (Yuan)
Environment="EVOLUTION_DAILY_BUDGET=50"

# Cloud Computing (disable to save cost)
Environment="EVOLUTION_ENABLE_CLOUD=false"

# Monitor Intervals (seconds)
Environment="EVOLUTION_CHECK_INTERVAL_FAST=30"
Environment="EVOLUTION_CHECK_INTERVAL_MED=300"
Environment="EVOLUTION_CHECK_INTERVAL_SLOW=3600"
```

**After editing**:
```bash
sudo systemctl daemon-reload
sudo systemctl restart openclaw-evolution
```

---

## Step 2: OpenClaw Cron Jobs

### 2.1 Create Cron Job

```bash
# Using OpenClaw CLI
openclaw cron add \
  --name "evolution-learning-cycle" \
  --schedule "*/30 * * * *" \
  --session "main" \
  --payload '{"kind":"systemEvent","text":"Run Evolution System learning cycle: cd /usr/local/lib/node_modules/openclaw/skills/evolution && node index.js learn"}'
```

### 2.2 Alternative: System Crontab

If OpenClaw cron is unavailable:

```bash
# Edit crontab
sudo crontab -e

# Add line:
*/30 * * * * cd /usr/local/lib/node_modules/openclaw/skills/evolution && /usr/bin/node index.js learn >> /var/log/evolution-cron.log 2>&1
```

### 2.3 Cron Schedule Options

```bash
# Every 30 minutes (recommended)
*/30 * * * *

# Every hour
0 * * * *

# Every 6 hours
0 */6 * * *

# Custom schedule
*/15 8-20 * * *  # Every 15 min, 8am-8pm only
```

---

## Step 3: Monitoring & Logs

### 3.1 Systemd Logs

```bash
# Live logs
sudo journalctl -u openclaw-evolution -f

# Last 100 lines
sudo journalctl -u openclaw-evolution -n 100

# Since today
sudo journalctl -u openclaw-evolution --since today

# Logs with priority
sudo journalctl -u openclaw-evolution -p err
```

### 3.2 Evolution Logs

```bash
# System log
tail -f /root/.openclaw/evolution-log.json

# Learning results
node /usr/local/lib/node_modules/openclaw/skills/evolution/index.js report
```

### 3.3 Status Check

```bash
# Systemd service status
sudo systemctl status openclaw-evolution

# Evolution system status
cd /usr/local/lib/node_modules/openclaw/skills/evolution
node index.js status
```

---

## Step 4: Resource Limits

### 4.1 Adjust Systemd Limits

Edit `/etc/systemd/system/openclaw-evolution.service`:

```ini
[Service]
# Memory (default: 2GB)
MemoryMax=2G

# CPU (default: 200% = 2 cores)
CPUQuota=200%

# File descriptors
LimitNOFILE=65536

# Process timeout
TimeoutStartSec=60
TimeoutStopSec=30
```

After changes:
```bash
sudo systemctl daemon-reload
sudo systemctl restart openclaw-evolution
```

### 4.2 Budget Control

```bash
# Daily token budget (Yuan)
export EVOLUTION_DAILY_BUDGET=50

# Conservative mode (lower cost)
export EVOLUTION_DAILY_BUDGET=10
export EVOLUTION_MODE="conservative"
```

---

## Step 5: Troubleshooting

### Service won't start

```bash
# Check logs
sudo journalctl -u openclaw-evolution -n 50

# Common issues:
# 1. Node.js not found → Fix ExecStart path
# 2. Permission denied → Check ReadWritePaths
# 3. Missing dependencies → Run: cd /usr/local/lib/node_modules/openclaw/skills/evolution && npm install
```

### High memory usage

```bash
# Check memory
sudo systemctl status openclaw-evolution

# Reduce limits in service file:
MemoryMax=1G
CPUQuota=100%

# Restart
sudo systemctl restart openclaw-evolution
```

### Missing GitHub integration

```bash
# Edit service file
sudo nano /etc/systemd/system/openclaw-evolution.service

# Add GitHub token
Environment="EVOLUTION_GITHUB_TOKEN=ghp_xxx"

# Reload
sudo systemctl daemon-reload
sudo systemctl restart openclaw-evolution
```

---

## Step 6: Verification

### 6.1 Check Service is Running

```bash
sudo systemctl is-active openclaw-evolution
# Should output: active

sudo systemctl is-enabled openclaw-evolution
# Should output: enabled
```

### 6.2 Run Learning Cycle Manually

```bash
cd /usr/local/lib/node_modules/openclaw/skills/evolution
node index.js learn

# Expected output:
# ✅ Learning cycle complete
# Items processed: X
# Optimizations generated: Y
```

### 6.3 Verify Cron Job

```bash
# Check OpenClaw cron
openclaw cron list

# Or system crontab
sudo crontab -l | grep evolution
```

### 6.4 Monitor Token Consumption

```bash
# Check efficiency report
cd /usr/local/lib/node_modules/openclaw/skills/evolution
node lib/utils/efficiency-report.cjs

# Database query
sqlite3 /root/.openclaw/knowledge/evolution.db "SELECT * FROM token_metrics ORDER BY timestamp DESC LIMIT 10"
```

---

## 🔒 Security Considerations

### File Permissions

```bash
# Lock down knowledge directory
chmod 700 /root/.openclaw/knowledge

# Service file permissions
chmod 644 /etc/systemd/system/openclaw-evolution.service
```

### GitHub Token Security

```bash
# Don't hardcode in service file
# Use systemd credentials:

# 1. Create credential file
sudo mkdir -p /etc/openclaw
sudo nano /etc/openclaw/evolution.conf
# Add: EVOLUTION_GITHUB_TOKEN=ghp_xxx

# 2. Edit service file
EnvironmentFile=/etc/openclaw/evolution.conf

# 3. Lock file
sudo chmod 600 /etc/openclaw/evolution.conf
```

---

## 📊 Expected Resource Usage

**Daily (conservative estimate)**:
- Tokens: 500K-2M
- Cost: ¥5-20
- CPU: Low (5-15% avg)
- Memory: 200-500MB
- Storage growth: ~100MB/month

**With cloud computing enabled**:
- Additional: ¥5-50/day (AWS/Docker)
- Faster processing (2-5x)

---

## 🎯 Success Criteria

✅ Service runs 24/7 without crashes  
✅ Auto-restarts after failure  
✅ Cron job runs every 30 minutes  
✅ Learning cycles complete successfully  
✅ Token consumption within budget  
✅ Optimizations generated periodically  

---

## 📝 Quick Reference

```bash
# Start/Stop
sudo systemctl start openclaw-evolution
sudo systemctl stop openclaw-evolution
sudo systemctl restart openclaw-evolution

# Logs
sudo journalctl -u openclaw-evolution -f

# Status
sudo systemctl status openclaw-evolution

# Manual learning cycle
cd /usr/local/lib/node_modules/openclaw/skills/evolution
node index.js learn

# Report
node index.js report
```

---

**Last Updated**: 2026-02-03
**Version**: 1.0.0
**Status**: Production Ready ✅
