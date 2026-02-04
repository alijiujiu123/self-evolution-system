# Evolution System - Cron Job Examples

This file contains various cron configurations for the Evolution System.

---

## OpenClaw Cron (Recommended)

### Every 30 Minutes (Default)

```bash
openclaw cron add \
  --name "evolution-learning-cycle" \
  --schedule "*/30 * * * *" \
  --session "main" \
  --payload '{"kind":"systemEvent","text":"Run Evolution System learning cycle: cd /usr/local/lib/node_modules/openclaw/skills/evolution && node index.js learn"}'
```

### Every Hour

```bash
openclaw cron add \
  --name "evolution-hourly" \
  --schedule "0 * * * *" \
  --session "main" \
  --payload '{"kind":"systemEvent","text":"Run Evolution System learning cycle: cd /usr/local/lib/node_modules/openclaw/skills/evolution && node index.js learn"}'
```

### Every 6 Hours

```bash
openclaw cron add \
  --name "evolution-6hourly" \
  --schedule "0 */6 * * *" \
  --session "main" \
  --payload '{"kind":"systemEvent","text":"Run Evolution System learning cycle: cd /usr/local/lib/node_modules/openclaw/skills/evolution && node index.js learn"}'
```

### Custom Schedule (Business Hours Only)

```bash
# Every 15 minutes, 8am-8pm
openclaw cron add \
  --name "evolution-business-hours" \
  --schedule "*/15 8-20 * * *" \
  --session "main" \
  --payload '{"kind":"systemEvent","text":"Run Evolution System learning cycle: cd /usr/local/lib/node_modules/openclaw/skills/evolution && node index.js learn"}'
```

---

## System Crontab

If OpenClaw cron is unavailable, use the system crontab:

### Edit Root Crontab

```bash
sudo crontab -e
```

### Add Lines

```bash
# Every 30 minutes
*/30 * * * * cd /usr/local/lib/node_modules/openclaw/skills/evolution && /usr/bin/node index.js learn >> /var/log/evolution-cron.log 2>&1

# Every hour
0 * * * * cd /usr/local/lib/node_modules/openclaw/skills/evolution && /usr/bin/node index.js learn >> /var/log/evolution-cron.log 2>&1

# Every 6 hours
0 */6 * * * cd /usr/local/lib/node_modules/openclaw/skills/evolution && /usr/bin/node index.js learn >> /var/log/evolution-cron.log 2>&1
```

---

## Cron Schedule Reference

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, Sunday = 0 or 7)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

### Common Patterns

```bash
# Every N minutes
*/N * * * *     # Every N minutes

# Every hour at minute X
X * * * *       # At X minutes past the hour

# Every N hours
0 */N * * *     # At minute 0, every N hours

# Twice daily
0 0,12 * * *    # At midnight and noon

# Business hours (8am-6pm)
0 8-18 * * *    # Every hour from 8am to 6pm

# Weekdays only
0 9 * * 1-5     # 9am, Monday to Friday

# Weekends only
0 10 * * 6,0    # 10am, Saturday and Sunday
```

---

## Advanced Examples

### Weekly Full Analysis

```bash
# Sunday at 2am - run deep analysis
openclaw cron add \
  --name "evolution-weekly-deep" \
  --schedule "0 2 * * 0" \
  --session "main" \
  --payload '{"kind":"systemEvent","text":"Run Evolution System deep analysis: cd /usr/local/lib/node_modules/openclaw/skills/evolution && node index.js learn --deep"}'
```

### Daily Briefing

```bash
# Every day at 8am - send daily summary
openclaw cron add \
  --name "evolution-daily-briefing" \
  --schedule "0 8 * * *" \
  --session "main" \
  --payload '{"kind":"systemEvent","text":"Generate Evolution System daily briefing: cd /usr/local/lib/node_modules/openclaw/skills/evolution && node index.js report --briefing"}'
```

### Budget Check

```bash
# Every 6 hours - check token budget
openclaw cron add \
  --name "evolution-budget-check" \
  --schedule "0 */6 * * *" \
  --session "main" \
  --payload '{"kind":"systemEvent","text":"Check Evolution System budget: cd /usr/local/lib/node_modules/openclaw/skills/evolution && sqlite3 /root/.openclaw/knowledge/evolution.db \"SELECT SUM(tokens_consumed) as total FROM token_metrics WHERE timestamp > datetime(\"now\", \"-24 hours\")\""}'
```

### Maintenance Tasks

```bash
# Daily at 3am - database cleanup
openclaw cron add \
  --name "evolution-daily-maintenance" \
  --schedule "0 3 * * *" \
  --session "main" \
  --payload '{"kind":"systemEvent","text":"Evolution System maintenance: cd /usr/local/lib/node_modules/openclaw/skills/evolution && node index.js --maintenance"}'
```

---

## Monitoring Cron Jobs

### List OpenClaw Cron Jobs

```bash
openclaw cron list
```

### View System Crontab

```bash
sudo crontab -l
```

### Check Cron Logs

```bash
# OpenClaw cron logs
openclaw cron runs <job-name>

# System cron logs
sudo grep CRON /var/log/syslog | tail -20

# Evolution cron logs
tail -f /var/log/evolution-cron.log
```

---

## Troubleshooting

### Cron Job Not Running

```bash
# 1. Check if cron is running
sudo systemctl status cron

# 2. Verify crontab
sudo crontab -l

# 3. Check cron logs
sudo grep CRON /var/log/syslog

# 4. Test manual execution
cd /usr/local/lib/node_modules/openclaw/skills/evolution
node index.js learn
```

### Permission Issues

```bash
# Ensure script is executable
chmod +x /usr/local/lib/node_modules/openclaw/skills/evolution/index.js

# Check file ownership
ls -la /usr/local/lib/node_modules/openclaw/skills/evolution/
```

### Environment Variables Missing

```bash
# Add environment to crontab
sudo crontab -e

# Add at top:
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
EVOLUTION_DAILY_BUDGET=50
EVOLUTION_ENABLE_CLOUD=false

# Then your cron job:
*/30 * * * * cd /usr/local/lib/node_modules/openclaw/skills/evolution && /usr/bin/node index.js learn >> /var/log/evolution-cron.log 2>&1
```

---

## Best Practices

1. **Start Conservative**: Every 30 minutes → Every hour → Every 6 hours
2. **Monitor Logs**: Check `/var/log/evolution-cron.log` regularly
3. **Set Budgets**: Use `EVOLUTION_DAILY_BUDGET` to control costs
4. **Test First**: Run manually before automating
5. **Use Systemd as Primary**: Cron is backup, systemd should keep main process running

---

**Last Updated**: 2026-02-03
**Version**: 1.0.0
