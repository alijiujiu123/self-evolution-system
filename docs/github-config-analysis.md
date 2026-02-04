# OpenClaw .github 配置分析与复用方案

> **分析日期**: 2025-02-04
> **源仓库**: alijiujiu123/openclaw
> **目标仓库**: alijiujiu123/self-evolution-system

---

## 📊 概览

OpenClaw 项目的 `.github` 目录包含以下内容：

```
.github/
├── FUNDING.yml              # GitHub 赞助配置
├── ISSUE_TEMPLATE/          # Issue 模板
│   ├── bug_report.md
│   ├── config.yml
│   └── feature_request.md
├── actionlint.yaml          # GitHub Actions lint 配置
├── dependabot.yml           # 依赖自动更新
├── labeler.yml              # 自动标签配置（6093 行！）
└── workflows/               # GitHub Actions 工作流
    ├── auto-response.yml
    ├── ci.yml
    ├── docker-image.yml
    ├── docker-release.yml
    ├── formal-conformance.yml
    ├── install-smoke.yml
    ├── labeler.yml
    └── workflow-sanity.yml
```

---

## ✅ 可直接复用的配置

### 1. actionlint.yaml

**适用性**: ⭐⭐⭐⭐⭐ (直接复用)

**原因**: 配置通用，适用于任何使用 GitHub Actions 的项目。

**复用方式**: 完全复制，无需修改。

```yaml
# actionlint configuration
# https://github.com/rhysd/actionlint/blob/main/docs/config.md

self-hosted-runner:
  labels:
    # 如果使用 self-hosted runner，添加标签
    # - ubuntu-latest

# Ignore patterns for known issues
paths:
  .github/workflows/**/*.yml:
    ignore:
      # Ignore shellcheck warnings (we run shellcheck separately)
      - "shellcheck reported issue.+"
      # Ignore intentional if: false for disabled jobs
      - 'constant expression "false" in condition'
```

---

### 2. FUNDING.yml

**适用性**: ⭐⭐⭐⭐⭐ (直接复用，修改链接)

**原因**: 如果项目需要接受赞助，可以启用此功能。

**复用方式**: 修改赞助链接。

```yaml
custom: ["https://github.com/sponsors/alijiujiu123"]
```

或者使用其他赞助方式：

```yaml
github: [你的 GitHub 用户名]
patreon: 你的用户名
open_collective: 你的组织名
ko_fi: 你的用户名
tidelift: # 你在 tidelift 上的包名
community_bridge: # 你的项目名
liberapay: 你的用户名
issuehunt: 你的仓库
otechie: 你的用户名
custom: ["https://你的赞助链接"]
```

---

## 🔧 需要改造的配置

### 3. dependabot.yml

**适用性**: ⭐⭐⭐⭐ (改造复用)

**原配置分析**:
- 支持 npm、GitHub Actions、Swift、Gradle
- 按目录分组更新
- 每周检查一次
- 自动分组 minor/patch 更新

**改造方案**:

```yaml
# .github/dependabot.yml
# Dependabot configuration for self-evolution-system

version: 2

registries:
  npm-npmjs:
    type: npm-registry
    url: https://registry.npmjs.org
    replaces-base: true

updates:
  # v1: npm dependencies (skill/ directory)
  - package-ecosystem: npm
    directory: /skill
    schedule:
      interval: weekly
      day: monday
      time: "09:00"
    cooldown:
      default-days: 7
    groups:
      production:
        dependency-type: production
        update-types:
          - minor
          - patch
      development:
        dependency-type: development
        update-types:
          - minor
          - patch
    open-pull-requests-limit: 10
    registries:
      - npm-npmjs
    labels:
      - dependencies
      - v1
      - skill

  # v2: npm dependencies (root, for TypeScript)
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      day: monday
      time: "09:00"
    cooldown:
      default-days: 7
    groups:
      production:
        dependency-type: production
        update-types:
          - minor
          - patch
      development:
        dependency-type: development
        update-types:
          - minor
          - patch
    open-pull-requests-limit: 10
    registries:
      - npm-npmjs
    labels:
      - dependencies
      - v2
      - agent

  # GitHub Actions
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
      day: monday
      time: "09:00"
    cooldown:
      default-days: 7
    groups:
      actions:
        patterns:
          - "*"
        update-types:
          - minor
          - patch
    open-pull-requests-limit: 5
    labels:
      - dependencies
      - github-actions
```

**关键改造点**:
1. ✂️ 删除 Swift 和 Gradle 配置（本项目不需要）
2. ✅ 添加两个 npm 配置：一个 for v1 (`/skill`)，一个 for v2 (`/`)
3. 🏷️ 添加 `labels` 字段，自动标记 PR
4. 📅 统一调度时间（每周一上午 9 点）

---

### 4. labeler.yml

**适用性**: ⭐⭐⭐⭐ (大幅精简后复用)

**原配置分析**:
- 超过 6093 行！
- 定义了大量的 channel 标签（discord、slack、telegram 等）
- 定义了平台标签（android、ios、macos、web-ui）
- 定义了组件标签（gateway、cli、agents、extensions）

**改造方案**:

```yaml
# .github/labeler.yml
# 自动标签配置（基于文件变化）

# v1 / v2 架构
"v1":
  - changed-files:
      - any-glob-to-any-file:
          - "skill/**"
          - "docs/v1/**"
"v2":
  - changed-files:
      - any-glob-to-any-file:
          - "agent/**"
          - "docs/v2/**"

# 核心模块
"agent: core":
  - changed-files:
      - any-glob-to-any-file:
          - "agent/core/**"
          - "docs/v2/architecture.md"

"agent: skills":
  - changed-files:
      - any-glob-to-any-file:
          - "agent/skills/**"

"agent: tools":
  - changed-files:
      - any-glob-to-any-file:
          - "agent/tools/**"

"agent: memory":
  - changed-files:
      - any-glob-to-any-file:
          - "agent/memory/**"

"agent: sandbox":
  - changed-files:
      - any-glob-to-any-file:
          - "agent/sandbox/**"

"agent: evaluation":
  - changed-files:
      - any-glob-to-any-file:
          - "agent/evaluation/**"

# v1 模块（保留）
"v1: analyzer":
  - changed-files:
      - any-glob-to-any-file:
          - "skill/lib/analyzer/**"

"v1: compute":
  - changed-files:
      - any-glob-to-any-file:
          - "skill/lib/compute/**"

"v1: deployment":
  - changed-files:
      - any-glob-to-any-file:
          - "skill/lib/deployment/**"

"v1: executor":
  - changed-files:
      - any-glob-to-any-file:
          - "skill/lib/executor/**"

"v1: monitors":
  - changed-files:
      - any-glob-to-any-file:
          - "skill/lib/monitors/**"

"v1: optimizer":
  - changed-files:
      - any-glob-to-any-file:
          - "skill/lib/optimizer/**"

# 部署相关
"deployment":
  - changed-files:
      - any-glob-to-any-file:
          - "evolution-deployment/**"
          - "*.sh"

# 文档
"documentation":
  - changed-files:
      - any-glob-to-any-file:
          - "docs/**"
          - "*.md"
          - "README*"

# 配置
"configuration":
  - changed-files:
      - any-glob-to-any-file:
          - "*.yaml"
          - "*.yml"
          - ".github/**"
          - "agent/config/**"

# GitHub 相关
"github":
  - changed-files:
      - any-glob-to-any-file:
          - ".github/**"

# TypeScript 相关
"typescript":
  - changed-files:
      - any-glob-to-any-file:
          - "tsconfig.json"
          - "**/*.ts"
          - "**/*.tsx"

# 测试
"tests":
  - changed-files:
      - any-glob-to-any-file:
          - "**/*.test.ts"
          - "**/*.test.js"
          - "**/*.spec.ts"
          - "**/*.spec.js"
          - "tests/**"
          - "test/**"

# 数据库
"database":
  - changed-files:
      - any-glob-to-any-file:
          - "**/*.sql"
          - "skill/lib/storage/**"
          - "agent/memory/**"

# 安全
"security":
  - changed-files:
      - any-glob-to-any-file:
          - "agent/sandbox/**"
          - "agent/config/policy.yaml"
          - "docs/**/*security*"

# 依赖管理
"dependencies":
  - changed-files:
      - any-glob-to-any-file:
          - "package.json"
          - "package-lock.json"
          - "pnpm-lock.yaml"
          - "**/package.json"

# CI/CD
"ci":
  - changed-files:
      - any-glob-to-any-file:
          - ".github/workflows/**"
```

**关键改造点**:
1. ✂️ 删除所有 OpenClaw 特定的标签（channel、platform、extensions）
2. ✅ 添加 v1/v2 架构标签
3. ✅ 添加 Agent Core 模块标签
4. ✅ 保留通用的标签（documentation、tests、security 等）
5. 📦 从 6093 行精简到约 200 行

---

## 🆕 需要新增的配置

### 5. ISSUE_TEMPLATE

**适用性**: ⭐⭐⭐⭐⭐ (新建，参考 OpenClaw)

**建议模板**:

#### bug_report.md

```markdown
---
name: Bug Report
about: 报告问题帮助我们改进
title: '[BUG] '
labels: bug
assignees: ''
---

## Bug 描述
简洁清晰地描述这个 bug。

## 复现步骤
1. 转到 '...'
2. 点击 '....'
3. 滚动到 '....'
4. 看到错误

## 期望行为
简洁清晰地描述你期望发生的行为。

## 截图
如果适用，添加截图来帮助解释你的问题。

## 环境
- 版本: [例如: v1.0.0, v2.0.0-alpha]
- Node 版本: [例如: v18.0.0, v22.0.0]
- 操作系统: [例如: macOS, Ubuntu, Windows]
- 部署方式: [例如: systemd, cron, docker]

## 附加信息
添加任何其他关于问题的信息。
```

#### feature_request.md

```markdown
---
name: Feature Request
about: 为这个项目提出一个想法
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

## 你的功能请求是否与问题相关？
清晰简洁地描述问题所在。例如：我总是受限于 [...]

## 描述你想要的解决方案
清晰简洁地描述你想要发生的事情。

## 描述你考虑过的替代方案
清晰简洁地描述你考虑过的任何替代解决方案或功能。

## 附加信息
添加任何其他关于功能请求的信息或截图。
```

#### config.yml (通用 Issue 模板)

```yaml
blank_issues_enabled: true
contact_links:
  - name: 需要帮助？
    url: https://github.com/alijiujiu123/self-evolution-system/discussions
    about: 请使用 GitHub Discussions 寻求帮助
  - name: 安全漏洞
    url: https://github.com/alijiujiu123/self-evolution-system/security/advisories
    about: 请使用 GitHub Security Advisories 报告安全漏洞
```

---

### 6. workflows/

**适用性**: ⭐⭐⭐⭐ (新建，参考 OpenClaw 的部分 workflow)

**推荐的 Workflows**:

#### ci.yml (持续集成)

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # v1 代码检查
  v1-lint:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22.x
          cache: npm
          cache-dependency-path: skill/package-lock.json

      - name: Install dependencies
        working-directory: ./skill
        run: npm ci

      - name: Run linter (if exists)
        working-directory: ./skill
        run: npm run lint || echo "No lint script found"
        continue-on-error: true

  # v2 代码检查
  v2-type-check:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22.x

      - name: Install pnpm
        run: corepack enable && corepack prepare pnpm@latest --activate

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: TypeScript type check
        run: pnpm tsc --noEmit

  # 测试（如果有）
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22.x

      - name: Install pnpm
        run: corepack enable && corepack prepare pnpm@latest --activate

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test || echo "No tests found"
        continue-on-error: true
```

#### labeler.yml (自动标签)

```yaml
name: Labeler

on:
  pull_request:
    types: [opened, edited, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  labeler:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Run Labeler
        uses: actions/labeler@v5
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          configuration-path: .github/labeler.yml
          sync-labels: true
```

#### workflow-sanity.yml (Workflow 检查)

```yaml
name: Workflow Sanity

on:
  push:
    paths:
      - '.github/workflows/**'
  pull_request:
    paths:
      - '.github/workflows/**'

jobs:
  actionlint:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Download actionlint
        run: |
          curl -sLO https://github.com/rhysd/actionlint/releases/latest/download/actionlint_linux_amd64.tar.gz
          tar xvzf actionlint_linux_amd64.tar.gz

      - name: Run actionlint
        run: ./actionlint -config .github/actionlint.yaml
```

---

## 📋 实施清单

### 优先级 P0（必须）

- [ ] 创建 `.github/ISSUE_TEMPLATE/` 目录和 3 个模板
- [ ] 创建 `.github/labeler.yml`（精简版）
- [ ] 创建 `.github/dependabot.yml`
- [ ] 创建 `.github/workflows/ci.yml`

### 优先级 P1（高优先级）

- [ ] 创建 `.github/workflows/labeler.yml`
- [ ] 创建 `.github/workflows/workflow-sanity.yml`
- [ ] 创建 `.github/actionlint.yaml`
- [ ] （可选）创建 `.github/FUNDING.yml`

### 优先级 P2（低优先级）

- [ ] 创建更多 workflows（docker-image、release 等）
- [ ] 配置 GitHub Actions 的权限和 secrets
- [ ] 设置 branch protection rules

---

## 🎯 快速开始

### 方案 A：完整复制（推荐）

```bash
# 1. 在本地创建 .github 目录
mkdir -p .github/{ISSUE_TEMPLATE,workflows}

# 2. 复制 OpenClaw 的配置（稍后修改）
# (需要手动下载文件)

# 3. 按照本文档的改造方案修改配置
```

### 方案 B：使用本分析文档中的配置

我已经在上面提供了完整的改造后配置，你可以直接复制使用。

---

## 📚 参考资源

- [Dependabot 官方文档](https://docs.github.com/en/code-security/dependabot)
- [GitHub Actions Labeler](https://github.com/actions/labeler)
- [Actionlint 文档](https://github.com/rhysd/actionlint/blob/main/docs/config.md)
- [Issue Template 文档](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms)

---

**总结**: OpenClaw 的 `.github` 配置非常完善，但对于 self-evolution-system 项目来说，需要大幅精简和改造。核心的 CI/CD、自动标签、依赖更新等功能都可以复用，但需要根据项目特点定制。
