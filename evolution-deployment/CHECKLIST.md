# Evolution System 24/7 Deployment - Delivery Checklist

**Date**: 2026-02-03
**Status**: ✅ READY FOR DEPLOYMENT

---

## 📦 Deliverables

### ✅ Systemd Service File
- **File**: `systemd/openclaw-evolution.service`
- **Features**:
  - Auto-restart on crash (10s delay)
  - Resource limits (2GB RAM, 2 CPU cores)
  - Security hardening (NoNewPrivileges, ProtectSystem)
  - Integrated logging (journal)
- **Status**: ✅ Tested, syntax valid

### ✅ Installation Script
- **File**: `install.sh`
- **Features**:
  - Automated prerequisite checks
  - Service installation + enable
  - Cron job setup (OpenClaw + system)
  - Post-install verification
  - Interactive prompts
- **Status**: ✅ Executable, tested

### ✅ Test Script
- **File**: `test.sh`
- **Features**:
  - Pre-deployment validation
  - Syntax checking
  - Permission verification
- **Status**: ✅ All tests passing

### ✅ Documentation

#### README.md (8KB)
- Complete deployment guide
- Systemd configuration
- Cron setup
- Troubleshooting section
- Resource management
- Security best practices

#### CRON.md (6KB)
- OpenClaw cron examples
- System crontab examples
- Schedule patterns reference
- Advanced use cases
- Monitoring & debugging

#### SUMMARY.md (5.5KB)
- Quick start guide
- Feature overview
- Command reference
- Success criteria

---

## 🎯 Architecture

```
┌─────────────────────────────────────────┐
│     Systemd (Main Process)              │
│  • Runs 24/7                            │
│  • Auto-restart on crash                │
│  • 5 monitors (setInterval timers)      │
│  • Integrated logging                   │
└─────────────────────────────────────────┘
                ↓ Failsafe
┌─────────────────────────────────────────┐
│     Cron (Periodic Trigger)             │
│  • Every 30 minutes                     │
│  • Runs single learning cycle           │
│  • Independent of main process          │
└─────────────────────────────────────────┘
```

**Dual-layer protection** ensures system keeps running even if one layer fails.

---

## 🚀 Deployment Steps

### 1. Pre-deployment Test
```bash
cd /root/.openclaw/workspace/evolution-deployment
bash test.sh
```

**Expected**: ✅ All tests passed

### 2. Run Installation
```bash
sudo ./install.sh
```

**Interactive prompts**:
- Continue confirmation (y/N)
- GitHub token (optional)

### 3. Verification
```bash
# Check service status
sudo systemctl status openclaw-evolution

# View logs
sudo journalctl -u openclaw-evolution -f

# Manual learning test
cd /usr/local/lib/node_modules/openclaw/skills/evolution
node index.js learn
```

---

## 📊 Configuration

### Default Settings

**Monitor Intervals**:
- Fast: 30 seconds (cache, webhooks)
- Medium: 5 minutes (RSS, APIs)
- Slow: 1 hour (deep analysis)

**Resource Limits**:
- Memory: 2GB
- CPU: 200% (2 cores)
- File descriptors: 65536

**Token Budget**:
- Daily: ¥50 (configurable)
- Models: glm-4-flash + glm-4.7

### Customization

Edit `/etc/systemd/system/openclaw-evolution.service`:

```ini
[Service]
# Adjust budget
Environment="EVOLUTION_DAILY_BUDGET=100"

# Enable cloud computing
Environment="EVOLUTION_ENABLE_CLOUD=true"

# Change intervals
Environment="EVOLUTION_CHECK_INTERVAL_MED=600"
```

Then reload:
```bash
sudo systemctl daemon-reload
sudo systemctl restart openclaw-evolution
```

---

## 🔍 Monitoring

### Health Checks

```bash
# Service status
sudo systemctl is-active openclaw-evolution
sudo systemctl is-enabled openclaw-evolution

# Learning cycle status
cd /usr/local/lib/node_modules/openclaw/skills/evolution
node index.js status

# Token efficiency
node lib/utils/efficiency-report.cjs
```

### Logs

```bash
# Live logs
sudo journalctl -u openclaw-evolution -f

# Recent activity
sudo journalctl -u openclaw-evolution -n 100

# Today's logs
sudo journalctl -u openclaw-evolution --since today

# Errors only
sudo journalctl -u openclaw-evolution -p err
```

---

## 🛡️ Security

### Implemented

✅ **NoNewPrivileges**: Process cannot gain new privileges
✅ **PrivateTmp**: Isolated /tmp directory
✅ **ProtectSystem**: System directories read-only
✅ **ProtectHome**: Home directory read-only
✅ **ReadWritePaths**: Only `/root/.openclaw/knowledge` writable
✅ **Credential file**: `/etc/openclaw/evolution.conf` (600 perms)

### Recommended

```bash
# Secure knowledge directory
chmod 700 /root/.openclaw/knowledge

# Use credential file for sensitive data
sudo nano /etc/openclaw/evolution.conf
sudo chmod 600 /etc/openclaw/evolution.conf
```

---

## 📈 Expected Performance

### Daily Usage

- **Tokens**: 500K-2M
- **Cost**: ¥5-20
- **CPU**: 5-15% average
- **Memory**: 200-500MB
- **Storage**: +100MB/month

### Learning Output

- **Items processed**: 50-200/day
- **Optimizations**: 5-10/week
- **Improvements applied**: 5-20/month

---

## ✅ Success Criteria

- [x] Systemd service file created and tested
- [x] Installation script automated and tested
- [x] Cron configuration documented
- [x] Complete documentation (README + CRON + SUMMARY)
- [x] Security hardening implemented
- [x] Test script validates deployment
- [x] All file permissions correct
- [ ] **Deployment tested on production server** ← NEXT STEP

---

## 🎯 Next Actions

### Immediate

1. **Deploy to test server** (115.191.18.218)
   ```bash
   scp -r evolution-deployment root@115.191.18.218:/tmp/
   ssh root@115.191.18.218
   cd /tmp/evolution-deployment
   sudo ./install.sh
   ```

2. **Verify 24/7 operation**
   - Check service stays running
   - Monitor cron execution
   - Track token consumption

3. **Monitor for 24 hours**
   - Review logs
   - Check learning cycles
   - Validate cost projections

### Future Enhancements

- [ ] Add Prometheus metrics endpoint
- [ ] Web dashboard for monitoring
- [ ] Alert integration (Telegram/Email)
- [ ] Automatic budget throttling
- [ ] A/B testing for model selection

---

## 📝 Version History

**v1.0.0** (2026-02-03)
- ✅ Initial release
- ✅ Systemd + Cron dual-layer setup
- ✅ Automated installation
- ✅ Complete documentation
- ✅ Security hardening

---

## 📞 Support

### Documentation
- Full guide: `README.md`
- Cron examples: `CRON.md`
- Quick reference: `SUMMARY.md`

### Troubleshooting
See README.md "Troubleshooting" section

### Testing
Run: `bash test.sh`

---

**Status**: ✅ READY FOR PRODUCTION DEPLOYMENT

**Prepared by**: javaer
**Date**: 2026-02-03 21:10 GMT+8
