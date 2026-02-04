# Self-Evolution System v1 文档

> **状态**: ✅ 稳定生产版本
> **技术栈**: Node.js (CommonJS)
> **部署状态**: 已在多个服务器运行

---

## 概述

v1 是当前的生产就绪版本，已经过充分测试并在实际环境中运行。它提供了完整的自动化学习、分析和部署能力。

## 核心特性

- **自动化学习**: 从多个数据源持续学习
- **智能分析**: AI 驱动的分类和风险评估
- **自动优化**: 生成可执行的优化建议
- **智能部署**: 通过 GitHub API 自动提交 PR
- **24/7 监控**: 多维度系统监控
- **资源管理**: 支持本地和云端计算

## 快速开始

### 安装

```bash
cd skill
npm install
```

### 配置

```bash
export EVOLUTION_GITHUB_TOKEN=ghp_xxx
export EVOLUTION_DAILY_BUDGET=50
```

### 运行

```bash
# 学习周期
node index.cjs learn

# 生成优化
node index.cjs optimize

# 应用优化
node index.cjs apply

# 生成报告
node index.cjs report
```

## 核心模块

### 1. Analyzer（分析器）
- `classifier.cjs`: AI 内容分类
- `risk-rater.cjs`: 风险评估

### 2. Compute（计算引擎）
- `local.cjs`: 本地执行
- `cloud.cjs`: 云端执行

### 3. Deployment（部署）
- `deploy.cjs`: 部署管理
- `optimizer.cjs`: 优化应用

### 4. Executor（执行器）
- `github-api.cjs`: GitHub API
- `auto-apply.cjs`: 自动应用

### 5. Monitors（监控器）
- 5 个维度的监控：AI、内部、OpenClaw、启动、技术

## 数据模型

### knowledge 表
存储从各数据源收集的知识项。

### optimizations 表
存储生成的优化建议。

### learning_log 表
记录学习周期的日志和成本。

## 部署指南

详细的部署指南请参考项目根目录：

- [部署指南](../../evolution-deployment/README.md)
- [部署检查清单](../../evolution-deployment/CHECKLIST.md)
- [Cron 配置](../../evolution-deployment/CRON.md)

## 监控

### 使用监控脚本

```bash
# 完整监控
../../evolution-monitor.sh

# 快速监控
../../evolution-quick-monitor.sh
```

### 查看数据

```bash
# 查看知识库统计
sqlite3 /root/.openclaw/knowledge/evolution.db "
  SELECT source, COUNT(*) as count
  FROM knowledge
  GROUP BY source
"

# 查看待处理优化
sqlite3 /root/.openclaw/knowledge/evolution.db "
  SELECT * FROM optimizations
  WHERE status = 'PENDING'
  LIMIT 10
"
```

## 安全考虑

- GitHub Token 通过环境变量传递
- 高风险优化需要人工审核
- 数据库文件权限 700
- Systemd 服务使用受限用户

## 成本控制

- 默认每日预算：50 元
- 保守模式：10 元/天
- 实际成本根据 LLM 使用量动态调整

## v1 → v2 迁移

如果你正在考虑迁移到 v2，请查看：

- [v2 架构设计](../v2/architecture.md)
- [迁移指南](../v2/migration-guide.md)
- [GitHub Issues](../github-issues-v2.md)

## 常见问题

### Q: v1 会被废弃吗？

A: 不会。v1 继续作为稳定版本维护。v2 稳定后，你可以选择迁移。

### Q: v1 和 v2 可以同时运行吗？

A: 可以。它们通过数据库共享状态，互不影响。

### Q: 如何贡献代码？

A:
- 对于 v1：直接提交 PR 到 `skill/` 目录
- 对于 v2：查看 [GitHub Issues](../github-issues-v2.md) 并认领任务

## 获取帮助

- 提交 Issue 到 GitHub
- 查看 [v2 文档](../v2/) 了解新架构
- 阅读项目根目录的主 [README](../../README.md)

---

**v1 稳定可靠，适合生产环境！** 🚀
