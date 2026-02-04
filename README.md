# OpenClaw Self-Evolution System

一个智能自我进化的 AI 系统，能够自动学习、分析、优化和部署 OpenClaw 生态系统的改进建议。

## 📢 版本说明

**当前支持两个架构版本：**

- **v1（稳定版）**：生产就绪的 Node.js 系统，已部署并运行中
- **v2（开发中）**：重构的 TypeScript 架构，支持完整的 Skill 生命周期和自动演化

### 如何选择版本？

| 场景 | 推荐版本 |
|------|---------|
| 生产环境部署 | **v1** (`skill/` 目录) |
| 新功能开发 | **v2** (`agent/` 目录) |
| 学习架构 | 先看 v1，再了解 v2 |
| 贡献代码 | 查看 [GitHub Issues](docs/github-issues-v2.md) |

**📖 文档导航：**
- [v1 文档](docs/v1/README.md) - 当前生产系统
- [v2 架构设计](docs/v2/architecture.md) - 新架构设计
- [v1 → v2 迁移指南](docs/v2/migration-guide.md) - 迁移步骤
- [v2 GitHub Issues](docs/github-issues-v2.md) - 开发任务

---

## 🌟 核心特性（v1）

- **自动化学习**: 从多个数据源（AI 前沿、OpenClaw 生态、创业趋势、技术栈）持续学习
- **智能分析**: 使用 AI 对收集的信息进行分类、风险评估和优先级排序
- **自动优化**: 生成可执行的优化建议，包括代码重构、性能改进、安全加固
- **智能部署**: 自动应用低风险优化，通过 GitHub API 提交 PR
- **24/7 监控**: 多维度监控系统状态，及时发现和响应问题
- **资源管理**: 智能调度计算资源，支持本地和云端执行

## 📁 项目结构

```
self-evolution-system/
├── skill/                     # v1: Evolution Skill 核心代码（稳定版）
│   ├── lib/
│   │   ├── analyzer/        # 分析器（分类、风险评估）
│   │   ├── compute/         # 计算引擎（本地/云端）
│   │   ├── deployment/      # 部署器（自动应用、PR）
│   │   ├── executor/        # 执行器（GitHub API）
│   │   ├── monitors/        # 监控器（5个维度）
│   │   ├── optimizer/       # 优化器（效率、模型选择）
│   │   ├── storage/         # 存储层（SQLite）
│   │   └── utils/           # 工具库（日志、队列）
│   ├── tests/               # 功能测试
│   ├── index.cjs            # 主入口
│   ├── SKILL.md             # Skill 文档
│   ├── package.json         # 依赖配置
│   └── README.md            # 原始 README
│
├── agent/                     # v2: 新架构（开发中）
│   ├── core/                # Agent Core（Planner, Scheduler, Policy）
│   ├── skills/              # Skill 层（experimental, production, retired）
│   ├── tools/               # Tool 层（Shell, GitHub, LLM）
│   ├── memory/              # Memory 层（短期、长期、统计）
│   ├── sandbox/             # 沙箱执行环境
│   ├── evaluation/          # 评估系统
│   └── config/              # 配置文件
│
├── evolution-deployment/    # 部署脚本和文档
│   ├── install.sh           # 安装脚本
│   ├── systemd/             # Systemd 服务配置
│   ├── CHECKLIST.md         # 部署检查清单
│   ├── DEPLOYMENT-SUCCESS.md
│   ├── SUMMARY.md
│   ├── CRON.md              # Cron 配置
│   └── GITHUB-TOKEN-SETUP.md
│
├── docs/                    # 文档目录
│   ├── v1/                  # v1 文档
│   ├── v2/                  # v2 文档
│   │   ├── architecture.md  # 架构设计
│   │   └── migration-guide.md # 迁移指南
│   └── github-issues-v2.md  # v2 开发任务
│
├── evolution-monitor.sh     # 完整监控脚本
├── evolution-quick-monitor.sh  # 快速监控脚本
└── evolution-analysis-report.md # 分析报告示例
```

## 🚀 快速开始

### 前置要求

- Node.js 22+
- SQLite3
- GitHub Token（用于 PR）
- OpenClaw CLI（可选，用于集成）

### 安装

```bash
# 1. 克隆仓库
git clone https://github.com/your-username/self-evolution-system.git
cd self-evolution-system/skill

# 2. 安装依赖
npm install

# 3. 配置环境变量
export EVOLUTION_GITHUB_TOKEN=ghp_xxx
export EVOLUTION_DAILY_BUDGET=50

# 4. 初始化数据库
node index.cjs init
```

### 运行

```bash
# 手动运行学习周期
node index.cjs learn

# 生成优化建议
node index.cjs optimize

# 应用优化（低风险自动应用）
node index.cjs apply

# 生成报告
node index.cjs report
```

## 🔧 部署为 24/7 服务

### Systemd 部署

```bash
cd evolution-deployment

# 运行安装脚本
sudo ./install.sh

# 检查服务状态
sudo systemctl status openclaw-evolution

# 查看日志
sudo journalctl -u openclaw-evolution -f
```

### Cron 任务（备用）

```bash
# 每 30 分钟运行一次学习周期
*/30 * * * * cd /path/to/skill && /usr/bin/node index.cjs learn >> /var/log/evolution.log 2>&1
```

## 📊 监控和管理

### 使用监控脚本

```bash
# 完整监控（包含服务检查、错误检查、新内容检查）
./evolution-monitor.sh

# 快速监控（仅服务状态）
./evolution-quick-monitor.sh
```

### 查看数据

```bash
# 查看知识库统计
sqlite3 /root/.openclaw/knowledge/evolution.db "SELECT source, COUNT(*) as count FROM knowledge GROUP BY source"

# 查看待处理优化
sqlite3 /root/.openclaw/knowledge/evolution.db "SELECT * FROM optimizations WHERE status = 'PENDING' LIMIT 10"

# 查看 Token 使用情况
sqlite3 /root/.openclaw/knowledge/evolution.db "SELECT * FROM token_metrics ORDER BY timestamp DESC LIMIT 10"
```

## 🧠 核心模块说明

### 1. Analyzer（分析器）

- **classifier.cjs**: 使用 AI 对知识项进行分类（release, api, blog, issue, social, performance 等）
- **risk-rater.cjs**: 评估优化建议的风险等级（LOW, MEDIUM, HIGH）
- **analyzer.cjs**: 主分析逻辑

### 2. Compute（计算引擎）

- **local.cjs**: 本地计算执行
- **cloud.cjs**: 云端计算执行（AWS Docker）
- **dispatcher.cjs**: 任务分发器
- **scaler.cjs**: 自动扩展器

### 3. Deployment（部署）

- **deploy.cjs**: 部署管理器
- **optimizer.cjs**: 优化应用器
- **tuner.cjs**: 系统调优器

### 4. Executor（执行器）

- **github-api.cjs**: GitHub API 集成
- **auto-apply.cjs**: 自动应用低风险优化
- **push-system.cjs**: 推送系统变更

### 5. Monitors（监控器）

- **monitor-ai.cjs**: 监控 AI 模型状态
- **monitor-internal.cjs**: 监控内部改进
- **monitor-openclaw.cjs**: 监控 OpenClaw 生态
- **monitor-startup.cjs**: 监控启动信息
- **monitor-tech.cjs**: 监控技术栈变化

### 6. Optimizer（优化器）

- **efficiency.cjs**: 效率优化
- **model-selector.cjs**: 模型选择器
- **throughput.cjs**: 吞吐量优化

### 7. Storage（存储）

- **sql-store.cjs**: SQLite 存储层

## 📈 数据模型

### knowledge 表

```sql
CREATE TABLE knowledge (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,           -- 数据源
  type TEXT,                      -- 类型（release, api, blog 等）
  title TEXT NOT NULL,            -- 标题
  content TEXT,                   -- 内容
  url TEXT,                       -- 链接
  risk_level TEXT,                 -- 风险等级
  priority INTEGER,               -- 优先级
  action_taken TEXT,              -- 已采取的行动
  status TEXT,                    -- 状态
  discovered_at TIMESTAMP,         -- 发现时间
  updated_at TIMESTAMP            -- 更新时间
)
```

### optimizations 表

```sql
CREATE TABLE optimizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_id INTEGER,           -- 关联的知识 ID
  type TEXT,                      -- 类型（refactor, feature, fix 等）
  title TEXT,                     -- 标题
  description TEXT,                -- 描述
  risk_level TEXT,                 -- 风险等级
  priority INTEGER,               -- 优先级
  status TEXT,                    -- 状态
  created_at TIMESTAMP,           -- 创建时间
  updated_at TIMESTAMP            -- 更新时间
)
```

### learning_log 表

```sql
CREATE TABLE learning_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TIMESTAMP,
  items_processed INTEGER,
  optimizations_generated INTEGER,
  tokens_used INTEGER,
  cost_yuan REAL
)
```

## 🔐 安全考虑

- 所有 GitHub Token 通过环境变量传递
- 高风险优化不会自动应用，需要人工审核
- 数据库文件权限设置为 700
- Systemd 服务使用受限用户运行

## 💰 成本控制

系统默认配置：
- 每日预算：50 元人民币
- 保守模式：10 元/天
- 实际成本：根据 LLM 使用量动态调整

## 📚 相关文档

### v1 文档（当前生产系统）

- [部署指南](evolution-deployment/README.md)
- [部署检查清单](evolution-deployment/CHECKLIST.md)
- [Cron 配置](evolution-deployment/CRON.md)
- [GitHub Token 设置](evolution-deployment/GITHUB-TOKEN-SETUP.md)
- [分析报告示例](evolution-analysis-report.md)

### v2 文档（新架构）

- [v2 架构设计文档](docs/v2/architecture.md) - 完整的架构设计
- [v1 → v2 迁移指南](docs/v2/migration-guide.md) - 详细的迁移步骤
- [v2 GitHub Issues](docs/github-issues-v2.md) - 16 个开发任务

### 快速导航

| 我想... | 查看文档 |
|---------|---------|
| 部署 v1 到生产环境 | [部署指南](evolution-deployment/README.md) |
| 了解新架构设计 | [v2 架构设计](docs/v2/architecture.md) |
| 从 v1 迁移到 v2 | [迁移指南](docs/v2/migration-guide.md) |
| 参与 v2 开发 | [GitHub Issues](docs/github-issues-v2.md) |
| 监控运行状态 | [evolution-monitor.sh](evolution-monitor.sh) |

## 🤝 贡献

欢迎贡献！请：
1. Fork 本仓库
2. 创建特性分支
3. 提交变更
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License

## 🔗 相关链接

- [OpenClaw](https://github.com/openclaw/openclaw)
- [OpenClaw 文档](https://docs.openclaw.ai)

---

## 🚀 v2 新架构预览

v2 正在开发中，将带来以下重大改进：

### 核心改进

- **明确的抽象边界**: Tool / Skill / Agent Core 职责清晰
- **完整的生命周期**: Skill 从创建、评估、晋升到淘汰的闭环
- **数据驱动决策**: 基于量化指标的自动演化
- **增强的安全性**: 沙箱执行、细粒度权限控制
- **可演化性**: Agent 不需要"变聪明"也能持续优化

### 关键特性

- **Skill Registry**: 动态加载和比较 Skills
- **自动评估**: 5 个核心指标（成功率、成本、延迟等）
- **生命周期管理**: 自动晋升/淘汰机制
- **Sandbox 执行**: dry-run、read-only、limited 模式
- **Policy 风控**: 危险命令拦截、权限检查

### 开发进度

- **Phase 0**: 共识与安全底座（规划中）
- **Phase 1**: Skill 基础设施（规划中）
- **Phase 2**: 生命周期与评估（规划中）
- **Phase 3**: Sandbox 与风控（规划中）
- **Phase 4**: Agent Core 解耦（规划中）
- **Phase 5**: Memory & 演化闭环（规划中）
- **Phase 6**: 首个真实演化 Demo（规划中）

查看 [v2 架构设计](docs/v2/architecture.md) 了解详情。

---

**注意**:
- v1 是稳定的生产版本，已充分测试
- v2 正在积极开发中，欢迎参与贡献
- 两个版本将长期共存，你可以根据需求选择
