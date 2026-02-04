# Evolution Skill - OpenClaw Self-Evolution System

## Overview

The Evolution Skill enables OpenClaw to continuously learn from external knowledge sources and autonomously optimize itself.

## Capabilities

### 1. Continuous Learning
- Monitors 5 knowledge domains: OpenClaw ecosystem, AI/LLM advances, tech stack, startup trends, internal improvements
- Processes 50-200 knowledge items daily
- Builds and maintains a knowledge graph

### 2. Intelligent Analysis
- Dual-tier AI analysis: fast classification (GLM-4-Flash) + deep analysis (GLM-4.7)
- Risk-based categorization: LOW/MEDIUM/HIGH/CRITICAL
- Action determination: auto_apply/suggest/report/ignore

### 3. Autonomous Optimization
- Auto-applies LOW-risk improvements (documentation, suggestions)
- Generates optimization suggestions for MEDIUM-risk items
- Reports HIGH/CRITICAL items for manual review

### 4. Token Optimization
- **Efficiency Optimizer**: Minimizes token consumption per task
- **Throughput Optimizer**: Maximizes processing capability
- Intelligent model selection based on task complexity

### 5. Elastic Computing
- Auto-scales compute resources (Docker/K8s/Cloud)
- Local resource management + cloud scheduler
- Task distribution and aggregation
- Cost-aware scaling

## Usage

### Start Evolution System

```bash
cd skills/evolution
npm install
npm start
```

### Monitor Status

```bash
# Check system status
node lib/utils/status.cjs

# View knowledge base
node lib/storage/query.cjs --search "OpenAI"
```

### Manual Triggers

```bash
# Force learning cycle
node index.js --learn

# Generate optimization report
node index.js --report

# Test elastic scaling
node lib/compute/scaler.cjs --test
```

## Configuration

### Environment Variables

```bash
# AI Models
export EVOLUTION_MODEL_CLASSIFIER="glm-4-flash"
export EVOLUTION_MODEL_ANALYZER="glm-4.7"

# Database
export EVOLUTION_DB_PATH="/root/.openclaw/knowledge/evolution.db"
export EVOLUTION_VECTOR_PATH="/root/.openclaw/knowledge/vectors"

# Monitors
export EVOLUTION_CHECK_INTERVAL_FAST="30"
export EVOLUTION_CHECK_INTERVAL_MED="300"
export EVOLUTION_CHECK_INTERVAL_SLOW="3600"

# Budget
export EVOLUTION_DAILY_BUDGET="50"  # ¥50/day
```

### Config File

Edit `evolution-config.json` in the skill directory:

```json
{
  "monitors": {
    "openclaw": {"enabled": true},
    "ai": {"enabled": true},
    "tech": {"enabled": true},
    "startup": {"enabled": true},
    "internal": {"enabled": true}
  },
  "optimization": {
    "tokenEfficiencyTarget": 0.8,
    "throughputTarget": 10000,
    "autoApplyLowRisk": true
  },
  "elastic": {
    "enabled": false,
    "maxWorkers": 5
  }
}
```

## Architecture

```
Monitors → Queue → AI Analysis → Knowledge Base
                                    ↓
                          Optimization Engine
                                    ↓
                           Elastic Compute
                                    ↓
                           Push System
```

### Components

1. **Monitors** (`lib/monitors/`) - Knowledge source monitoring
2. **Analyzer** (`lib/analyzer/`) - AI-powered classification and analysis
3. **Storage** (`lib/storage/`) - Vector DB, SQLite, Knowledge Graph
4. **Optimizer** (`lib/optimizer/`) - Token optimization engine
5. **Compute** (`lib/compute/`) - Elastic resource management
6. **Executor** (`lib/executor/`) - Auto-apply and suggestions
7. **Utils** (`lib/utils/`) - Logging, queue, cost tracking

## Outputs

### Daily Briefing
During heartbeat, evolution system pushes:
- New discoveries (MEDIUM+ risk only)
- Optimization opportunities
- Learning summary stats

### GitHub Integration
- Auto-creates issues for suggested optimizations
- Generates PRs for approved improvements
- Tracks status in database

### Knowledge Base
- Query with natural language
- Semantic search via vector embeddings
- Knowledge graph visualization

## Resource Consumption

**Expected Daily Usage:**
- Tokens: 500K-2M (~¥5-20)
- CPU: Low (mostly idle)
- Storage: ~100MB/month growth
- Network: Moderate (RSS/API polling)

## Safety

- All auto-operations logged
- Daily backups of knowledge base
- Cost over-limit auto-stop
- Dangerous ops require confirmation

## Troubleshooting

### High Token Usage
```bash
# Check efficiency metrics
node lib/utils/efficiency-report.cjs

# Enable conservative mode
export EVOLUTION_MODE="conservative"
```

### Scaling Not Triggering
```bash
# Check scaler status
node lib/compute/scaler.cjs --status

# Test scaling
node lib/compute/scaler.cjs --test-scale
```

### Database Issues
```bash
# Rebuild from scratch
rm -rf knowledge/
node index.js --init-db
```

## Development

### Run Tests

```bash
# Functional tests
bash tests/functional-test.sh

# Unit tests
node tests/unit.test.cjs
```

### Monitor Logs

```bash
# Tail evolution log
tail -f /root/.openclaw/evolution-log.json
```

### Add New Monitor

```javascript
// lib/monitors/monitor-custom.cjs
import { BaseMonitor } from './base.cjs';

export class CustomMonitor extends BaseMonitor {
  async poll() {
    // Implementation
  }
}
```

## License

MIT

---

**Version:** 1.0.0
**Last Updated:** 2026-02-03
**Status:** ✅ Production Ready
