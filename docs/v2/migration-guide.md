# v1 → v2 迁移指南

> **最后更新**: 2025-02-04
> **状态**: 进行中

本指南帮助你从 v1 架构平滑迁移到 v2 架构。

---

## 目录

1. [迁移策略](#迁移策略)
2. [前置准备](#前置准备)
3. [阶段 1：环境准备](#阶段-1环境准备)
4. [阶段 2：Tool 层迁移](#阶段-2tool-层迁移)
5. [阶段 3：Skill 层迁移](#阶段-3skill-层迁移)
6. [阶段 4：Agent Core 实现](#阶段-4agent-core-实现)
7. [阶段 5：数据迁移](#阶段-5数据迁移)
8. [阶段 6：完全切换](#阶段-6完全切换)
9. [回滚方案](#回滚方案)

---

## 迁移策略

### 三阶段迁移

```
阶段 1: 并行运行（当前）
  ┌─────────┐    ┌─────────┐
  │   v1    │    │   v2    │
  │ (Node)  │    │ (Node)  │
  └────┬────┘    └────┬────┘
       │              │
       └──────┬───────┘
              ↓
         共享数据库

阶段 2: 逐步迁移
  v1 模块 → v2 Tools/Skills → 逐步切换

阶段 3: 完全切换
  废弃 v1，使用 v2
```

### 兼容性原则

1. **数据库兼容**：v1 和 v2 共享 SQLite 数据库
2. **API 兼容**：v2 能调用 v1 的模块（通过 adapter）
3. **独立部署**：v1 和 v2 可作为独立进程运行
4. **可回滚**：任何阶段都可以回退到 v1

---

## 前置准备

### 1. 环境检查

```bash
# 检查 Node 版本
node --version  # 需要 >= 18

# 检查现有 v1 安装
cd skill
npm list --depth=0

# 检查数据库
sqlite3 /root/.openclaw/knowledge/evolution.db ".tables"
```

### 2. 备份数据

```bash
# 备份数据库
cp /root/.openclaw/knowledge/evolution.db \
   /root/.openclaw/knowledge/evolution.db.backup.$(date +%Y%m%d)

# 备份配置
cp -r skill/lib/config.cjs skill/lib/config.cjs.backup
```

### 3. 创建迁移分支

```bash
git checkout -b migration/v2-architecture
```

---

## 阶段 1：环境准备

### 任务清单

- [ ] 1.1 安装 v2 依赖
- [ ] 1.2 创建目录结构
- [ ] 1.3 初始化 v2 配置
- [ ] 1.4 运行 v1/v2 兼容性测试

### 1.1 安装 v2 依赖

```bash
# 在项目根目录（不是 skill/ 目录）
npm init -y

# 安装 TypeScript
npm install --save-dev typescript @types/node tsx

# 安装 v2 核心依赖
npm install zod yaml  # 配置验证
npm install langchain  # Agent 框架
```

### 1.2 创建目录结构

```bash
# 创建 v2 目录
mkdir -p agent/{core,skills,tools,memory,sandbox,evaluation,config}

# 创建 v2 子目录
mkdir -p agent/skills/{experimental,production,retired}
mkdir -p docs/v2

# 创建 TypeScript 配置
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./agent",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["agent/**/*"],
  "exclude": ["node_modules", "dist", "skill"]
}
EOF
```

### 1.3 初始化 v2 配置

```yaml
# agent/config/agent.yaml
agent:
  name: "self-evolution-agent-v2"
  version: "2.0.0"

v1:
  enabled: true
  path: ./skill

v2:
  enabled: true
  path: ./agent

migration:
  mode: "parallel"  # parallel | phased | full_switch
  data_sync: true
  fallback_to_v1: true
```

### 1.4 兼容性测试

```bash
# 运行 v1 确保基线正常
cd skill
node index.cjs learn

# 如果 v1 正常，继续下一步
```

---

## 阶段 2：Tool 层迁移

### 目标

将 v1 的执行器、计算引擎等封装为 v2 Tools。

### 迁移映射

| v1 模块 | v2 Tool | 优先级 |
|---------|---------|--------|
| `lib/executor/github-api.cjs` | `agent/tools/github.ts` | P0 |
| `lib/compute/local.cjs` | `agent/tools/shell.ts` | P0 |
| LLM 调用（分散） | `agent/tools/llm.ts` | P0 |
| `lib/monitors/` | `agent/tools/monitor.ts` | P1 |

### 实现步骤

#### 2.1 创建 GitHub Tool

```typescript
// agent/tools/github.ts
import { Tool, ToolResult } from './base.js';

export class GitHubTool implements Tool {
  name = 'github';
  description = 'GitHub API integration tool';

  async execute(input: {
    action: string;
    params: Record<string, unknown>;
  }): Promise<ToolResult> {
    // 复用 v1 的 github-api.cjs
    const v1GitHub = await import('../../skill/lib/executor/github-api.cjs');

    try {
      const data = await v1GitHub.default[input.action](input.params);

      return {
        success: true,
        data,
        metrics: {
          cost: this.estimateCost(input.action),
          latency: Date.now() - startTime
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error
      };
    }
  }

  private estimateCost(action: string): number {
    // 估算 API 调用成本
    const costs = {
      'get-pr-diff': 0.01,
      'create-pr': 0.05,
      'merge-pr': 0.02
    };
    return costs[action] || 0.01;
  }
}
```

#### 2.2 创建 Shell Tool

```typescript
// agent/tools/shell.ts
export class ShellTool implements Tool {
  name = 'shell';
  description = 'Execute shell commands with safety checks';

  async execute(input: {
    command: string;
    args?: string[];
    cwd?: string;
  }): Promise<ToolResult> {
    const { spawn } = await import('child_process');

    return new Promise((resolve) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';

      const proc = spawn(input.command, input.args || [], {
        cwd: input.cwd || process.cwd(),
        timeout: 30000
      });

      proc.stdout?.on('data', (data) => { stdout += data; });
      proc.stderr?.on('data', (data) => { stderr += data; });

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          data: { stdout, stderr, exitCode: code },
          metrics: {
            cost: 0,
            latency: Date.now() - startTime
          }
        });
      });
    });
  }
}
```

#### 2.3 创建 LLM Tool

```typescript
// agent/tools/llm.ts
import { ChatOpenAI } from 'langchain/chat_models/openai';

export class LLMTool implements Tool {
  name = 'llm';
  description = 'LLM inference tool';

  private llm: ChatOpenAI;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: 'claude-sonnet-4-20250515',
      temperature: 0.7,
      openAIApiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  async execute(input: {
    prompt: string;
    maxTokens?: number;
  }): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const response = await this.llm.invoke(input.prompt, {
        maxTokens: input.maxTokens || 2000
      });

      const content = response.content;
      const tokensUsed = response.usage?.total_tokens || 0;

      return {
        success: true,
        data: { content },
        metrics: {
          cost: this.estimateCost(tokensUsed),
          latency: Date.now() - startTime,
          tokensUsed
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error
      };
    }
  }

  private estimateCost(tokens: number): number {
    // Claude Sonnet 4 定价: $3/1M input, $15/1M output
    return (tokens / 1000000) * 9; // 平均
  }
}
```

### 测试

```typescript
// agent/tools/__tests__/github.test.ts
import { GitHubTool } from '../github.js';

describe('GitHub Tool', () => {
  it('should fetch PR diff', async () => {
    const tool = new GitHubTool();
    const result = await tool.execute({
      action: 'get-pr-diff',
      params: { prNumber: 123 }
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});
```

---

## 阶段 3：Skill 层迁移

### 目标

将 v1 的分析器、优化器等重构为 v2 Skills。

### 迁移映射

| v1 模块 | v2 Skill | intent |
|---------|----------|--------|
| `lib/analyzer/classifier.cjs` | `classifier-skill` | `classify-content` |
| `lib/analyzer/risk-rater.cjs` | `risk-rater-skill` | `assess-risk` |
| `lib/deployment/optimizer.cjs` | `optimizer-skill` | `generate-optimization` |
| `lib/executor/auto-apply.cjs` | `auto-apply-skill` | `apply-change` |

### 实现步骤

#### 3.1 创建 Classifier Skill

```typescript
// agent/skills/experimental/classifier-skill/index.ts
import { Skill, SkillContext, SkillResult } from '../../base.js';
import { LLMTool } from '../../tools/llm.js';

export class ClassifierSkill implements Skill {
  metadata = {
    name: 'llm-classifier',
    version: '2.0.0',
    intent: 'classify-content',
    author: 'agent',
    created_at: new Date().toISOString(),
    description: '使用 LLM 对内容进行分类',
    tags: ['llm', 'classification', 'nlp'],
    dependencies: ['llm'],
    cost_estimate: 0.1,
    success_threshold: 0.85
  };

  async execute(context: SkillContext): Promise<SkillResult> {
    const llm = context.tools.get('llm') as LLMTool;

    const startTime = Date.now();

    // 调用 LLM 分类
    const result = await llm.execute({
      prompt: this.buildPrompt(context.input),
      maxTokens: 100
    });

    const category = this.parseCategory(result.data.content);

    return {
      success: true,
      data: { category },
      metrics: {
        cost: result.metrics.cost,
        latency: Date.now() - startTime
      }
    };
  }

  private buildPrompt(input: unknown): string {
    const { title, content } = input as { title: string; content: string };
    return `Classify the following content into one of these categories:
    - release
    - api
    - blog
    - issue
    - social
    - performance

    Title: ${title}
    Content: ${content.substring(0, 500)}

    Respond with only the category name.`;
  }

  private parseCategory(llmOutput: string): string {
    return llmOutput.trim().toLowerCase();
  }

  validate(input: unknown): boolean {
    const obj = input as Record<string, unknown>;
    return typeof obj.title === 'string' && typeof obj.content === 'string';
  }
}
```

#### 3.2 创建 meta.json

```json
// agent/skills/experimental/classifier-skill/meta.json
{
  "name": "llm-classifier",
  "version": "2.0.0",
  "intent": "classify-content",
  "author": "agent",
  "created_at": "2025-02-04T10:00:00Z",
  "description": "使用 LLM 对内容进行分类",
  "tags": ["llm", "classification", "nlp"],
  "dependencies": ["llm"],
  "cost_estimate": 0.1,
  "success_threshold": 0.85,
  "permissions": "read-only"
}
```

---

## 阶段 4：Agent Core 实现

### 目标

实现 v2 的 Agent Core，整合 Tools 和 Skills。

### 实现步骤

#### 4.1 实现 Agent 主循环

```typescript
// agent/core/agent.ts
import { Planner } from './planner.js';
import { Scheduler } from './scheduler.js';
import { Policy } from './policy.js';
import { Reflection } from './reflection.js';
import { SkillRegistry } from '../skills/registry.js';
import { Sandbox } from '../sandbox/executor.js';

export class Agent {
  private planner: Planner;
  private scheduler: Scheduler;
  private policy: Policy;
  private reflection: Reflection;
  private registry: SkillRegistry;
  private sandbox: Sandbox;
  private running = false;

  constructor() {
    this.planner = new Planner();
    this.scheduler = new Scheduler();
    this.policy = new Policy('agent/config/policy.yaml');
    this.reflection = new Reflection();
    this.registry = new SkillRegistry();
    this.sandbox = new Sandbox();
  }

  async start(): Promise<void> {
    this.running = true;

    // 加载所有 skills
    await this.registry.loadFromDirectory('agent/skills/production');
    await this.registry.loadFromDirectory('agent/skills/experimental');

    logger.info('Agent started', {
      productionSkills: this.registry.list({ status: 'production' }).length,
      experimentalSkills: this.registry.list({ status: 'experimental' }).length
    });

    // 主循环
    while (this.running) {
      try {
        await this.tick();
      } catch (error) {
        logger.error('Tick error', { error });
        await sleep(5000);
      }
    }
  }

  async tick(): Promise<void> {
    // 1. 获取目标（从 v1 的 knowledge 表）
    const goal = await this.getGoal();
    if (!goal) {
      await sleep(5000);
      return;
    }

    // 2. 拆解任务
    const plan = await this.planner.decompose(goal);

    // 3. 调度执行
    const tasks = this.scheduler.schedule(plan);

    // 4. 执行任务
    for (const task of tasks) {
      await this.executeTask(task);
    }
  }

  async executeTask(task: Task): Promise<void> {
    // 查找合适的 skills
    const skills = await this.registry.list({ intent: task.intent });
    const bestSkill = this.selectBestSkill(skills);

    // 风控检查
    const allowed = await this.policy.allow(bestSkill, task);
    if (!allowed) {
      logger.warn('Blocked by policy', { skill: bestSkill.name, task: task.id });
      return;
    }

    // 沙箱执行
    const result = await this.sandbox.run(bestSkill, task, {
      mode: 'limited',
      timeout: 30000
    });

    // 反思观察
    await this.reflection.observe(bestSkill, result, task);

    // 记录统计
    await this.memory.record(bestSkill.name, result);
  }

  stop(): void {
    this.running = false;
  }
}
```

#### 4.2 创建运行入口

```typescript
// agent/run.ts
import { Agent } from './core/agent.js';

async function main() {
  const agent = new Agent();

  // 优雅退出
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down...');
    agent.stop();
    process.exit(0);
  });

  // 启动 Agent
  await agent.start();
}

main().catch(console.error);
```

---

## 阶段 5：数据迁移

### 目标

将 v1 的数据迁移到 v2 的表结构。

### 数据库 schema

```sql
-- v2 新增表

CREATE TABLE IF NOT EXISTS skill_stats_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_name TEXT NOT NULL,
  skill_version TEXT NOT NULL,
  intent TEXT NOT NULL,
  execution_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  total_cost REAL DEFAULT 0,
  avg_cost REAL DEFAULT 0,
  total_latency INTEGER DEFAULT 0,
  avg_latency INTEGER DEFAULT 0,
  rollback_count INTEGER DEFAULT 0,
  rollback_rate REAL DEFAULT 0,
  stability_score REAL DEFAULT 0,
  current_score REAL DEFAULT 0,
  first_execution_at TIMESTAMP,
  last_execution_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(skill_name, skill_version)
);

CREATE TABLE IF NOT EXISTS execution_log_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_name TEXT NOT NULL,
  task_id TEXT NOT NULL,
  intent TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  cost REAL,
  latency INTEGER,
  tokens_used INTEGER,
  input_json TEXT,
  output_json TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

### 迁移脚本

```typescript
// agent/scripts/migrate-data.ts
import Database from 'better-sqlite3';

export async function migrateV1ToV2(dbPath: string): Promise<void> {
  const db = new Database(dbPath);

  // 1. 迁移 learning_log 到 execution_log_v2
  const learningLogs = db.prepare('SELECT * FROM learning_log').all();

  const insertLog = db.prepare(`
    INSERT INTO execution_log_v2 (
      skill_name, task_id, intent, success,
      cost, tokens_used, started_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const log of learningLogs) {
    insertLog.run(
      'v1-legacy',
      `v1-${log.id}`,
      'learn',
      true,
      log.cost_yuan,
      log.tokens_used,
      log.timestamp,
      log.timestamp
    );
  }

  // 2. 创建 v1 skill 的统计记录
  const v1Stats = db.prepare(`
    INSERT OR REPLACE INTO skill_stats_v2 (
      skill_name, skill_version, intent,
      execution_count, total_cost, avg_cost,
      first_execution_at, last_execution_at
    )
    SELECT
      'v1-learner',
      '1.0.0',
      'learn',
      COUNT(*),
      SUM(cost_yuan),
      AVG(cost_yuan),
      MIN(timestamp),
      MAX(timestamp)
    FROM learning_log
  `);

  v1Stats.run();

  logger.info('Data migration completed', {
    learningLogsMigrated: learningLogs.length
  });

  db.close();
}
```

---

## 阶段 6：完全切换

### 前置条件

- [ ] v2 所有核心模块实现完成
- [ ] v2 运行稳定，无重大 bug
- [ ] 性能指标与 v1 持平或更好
- [ ] 数据迁移完成

### 切换步骤

#### 6.1 更新 systemd 服务

```bash
# 停止 v1 服务
sudo systemctl stop openclaw-evolution

# 备份 v1 服务配置
sudo cp /etc/systemd/system/openclaw-evolution.service \
         /etc/systemd/system/openclaw-evolution.service.v1.backup

# 创建 v2 服务配置
sudo cat > /etc/systemd/system/openclaw-evolution.service << 'EOF'
[Unit]
Description=OpenClaw Self-Evolution Agent v2
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/self-evolution-system
ExecStart=/usr/bin/node agent/dist/run.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/root/.openclaw/config/evolution.env

[Install]
WantedBy=multi-user.target
EOF

# 重新加载并启动 v2
sudo systemctl daemon-reload
sudo systemctl enable openclaw-evolution
sudo systemctl start openclaw-evolution

# 检查状态
sudo systemctl status openclaw-evolution
```

#### 6.2 更新 cron 任务（如果有）

```bash
# 编辑 crontab
crontab -e

# 将 v1 命令替换为 v2
# 旧: */30 * * * * cd /path/to/skill && /usr/bin/node index.cjs learn
# 新: */30 * * * * cd /path/to && /usr/bin/node agent/dist/run.js --task=learn
```

#### 6.3 监控验证

```bash
# 查看日志
sudo journalctl -u openclaw-evolution -f

# 检查数据库
sqlite3 /root/.openclaw/knowledge/evolution.db "
  SELECT skill_name, execution_count, current_score
  FROM skill_stats_v2
  ORDER BY current_score DESC
"

# 运行监控脚本
./evolution-monitor.sh
```

---

## 回滚方案

### 何时回滚

- v2 出现严重 bug
- 性能严重下降
- 数据丢失或损坏
- 安全问题

### 回滚步骤

```bash
# 1. 停止 v2
sudo systemctl stop openclaw-evolution

# 2. 恢复 v1 服务配置
sudo cp /etc/systemd/system/openclaw-evolution.service.v1.backup \
         /etc/systemd/system/openclaw-evolution.service

# 3. 重新加载并启动 v1
sudo systemctl daemon-reload
sudo systemctl start openclaw-evolution

# 4. 验证 v1 正常运行
sudo systemctl status openclaw-evolution
sqlite3 /root/.openclaw/knowledge/evolution.db "SELECT COUNT(*) FROM learning_log"

# 5. 如果需要恢复数据
cp /root/.openclaw/knowledge/evolution.db.backup.YYYYMMDD \
   /root/.openclaw/knowledge/evolution.db
```

---

## 检查清单

### 阶段 1 完成

- [ ] v2 目录结构创建
- [ ] TypeScript 配置完成
- [ ] 依赖安装成功
- [ ] v1 仍能正常运行

### 阶段 2 完成

- [ ] GitHub Tool 实现
- [ ] Shell Tool 实现
- [ ] LLM Tool 实现
- [ ] Tool 测试通过

### 阶段 3 完成

- [ ] 至少 2 个 Skill 迁移完成
- [ ] meta.json 验证通过
- [ ] Skill Registry 能加载 skills

### 阶段 4 完成

- [ ] Agent Core 实现
- [ ] 主循环运行正常
- [ ] Policy 检查生效
- [ ] Sandbox 执行成功

### 阶段 5 完成

- [ ] 数据库 schema 创建
- [ ] v1 数据迁移完成
- [ ] 数据验证通过

### 阶段 6 完成

- [ ] systemd 服务切换
- [ ] cron 任务更新
- [ ] 监控验证
- [ ] v1 代码标记为 legacy

---

## 常见问题

### Q1: v1 和 v2 可以同时运行吗？

**答**: 可以，但需要注意：
- 使用不同的进程
- 通过数据库共享状态
- 避免同时修改同一资源

### Q2: 如何确保数据一致性？

**答**:
- 使用 SQLite 的事务机制
- v1 和 v2 使用不同的表（v2 表带 `_v2` 后缀）
- 定期同步关键数据

### Q3: 迁移需要多久？

**答**:
- 阶段 1-2: 2-3 天
- 阶段 3-4: 5-7 天
- 阶段 5-6: 2-3 天
- 总计: 约 2 周

### Q4: 迁移期间 v1 还能使用吗？

**答**: 可以，迁移采用并行运行策略，v1 和 v2 互不影响。

---

## 获取帮助

- 查看 [v2 架构文档](./architecture.md)
- 查看 [GitHub Issues](../github-issues-v2.md)
- 提交 Issue 到 GitHub

---

**祝迁移顺利！** 🚀
