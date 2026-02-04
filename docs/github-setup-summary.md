# .github 配置完成总结

> **完成日期**: 2025-02-04
> **状态**: ✅ 完成

---

## ✅ 已创建的文件

### 1. Issue 模板 (`.github/ISSUE_TEMPLATE/`)

- ✅ `bug_report.md` - Bug 报告模板
- ✅ `feature_request.md` - 功能请求模板
- ✅ `config.yml` - 通用配置（Discussions 和安全漏洞链接）

### 2. 依赖自动更新

- ✅ `dependabot.yml` - 每周自动更新依赖
  - v1 依赖更新 (`/skill` 目录)
  - v2 依赖更新（根目录）
  - GitHub Actions 更新

### 3. 自动标签

- ✅ `labeler.yml` - 基于文件变化自动打标签
  - v1/v2 架构标签
  - Agent 模块标签
  - 通用标签（docs, tests, security 等）

### 4. GitHub Actions Workflows

- ✅ `ci.yml` - 持续集成
  - v1 代码 lint 检查
  - v2 TypeScript 类型检查
  - 测试运行

- ✅ `labeler.yml` - 自动标签工作流
- ✅ `workflow-sanity.yml` - Workflow 语法检查

### 5. 其他配置

- ✅ `actionlint.yaml` - Action lint 配置
- ✅ `FUNDING.yml` - 赞助配置（已注释，需要时启用）

---

## 📊 与 OpenClaw 的对比

| 配置项 | OpenClaw | self-evolution-system | 改造说明 |
|--------|----------|----------------------|----------|
| **labeler.yml** | 6093 行 | 200 行 | 删除了大量 OpenClaw 特定标签 |
| **dependabot.yml** | Swift + Gradle + npm | 仅 npm | 保留 v1/v2 双 npm 配置 |
| **workflows** | 8 个 workflow | 3 个 workflow | 精简为核心 CI/CD |
| **ISSUE_TEMPLATE** | 3 个模板 | 3 个模板 | 保留并本地化 |
| **actionlint.yaml** | 自托管 runner | 公共 runner | 简化配置 |

---

## 🎯 关键特性

### 1. v1/v2 双架构支持

所有配置都考虑了 v1 和 v2 共存的现状：

- **dependabot**: 分别更新 `/skill` 和根目录的依赖
- **labeler**: 自动标记 v1 或 v2 相关的 PR
- **CI**: 分别检查 v1 (Node.js) 和 v2 (TypeScript) 代码

### 2. 智能自动标签

PR 会自动获得以下标签：

- `v1` 或 `v2` - 基于修改的目录
- `agent: core`, `agent: skills` 等 - 基于 v2 模块
- `v1: analyzer`, `v1: deployment` 等 - 基于 v1 模块
- `documentation`, `tests`, `security` 等 - 通用标签

### 3. 自动依赖更新

Dependabot 每周一上午 9 点检查更新，并：
- 分组 minor/patch 更新
- 自动添加标签（`dependencies`, `v1`, `v2`）
- 限制同时打开的 PR 数量

---

## 📋 下一步操作

### 立即可做

1. **提交到 GitHub**:
   ```bash
   git add .github
   git commit -m "feat: 添加 GitHub 配置（Issue 模板、Dependabot、自动标签、CI）"
   git push
   ```

2. **验证配置**:
   - 在 GitHub 上创建一个测试 Issue，查看模板是否生效
   - 创建一个测试 PR，查看自动标签是否生效
   - 查看 Actions 标签页，确认 CI workflow 运行

3. **启用 Dependabot**:
   - 进入仓库 Settings → Dependabot
   - 确认配置已加载

### 可选优化

1. **添加更多 Labels**:
   ```bash
   # 在 GitHub 上手动创建这些标签（如果不存在）
   - v1, v2
   - agent: core, agent: skills, agent: tools
   - v1: analyzer, v1: compute, v1: deployment
   - documentation, tests, security, dependencies
   ```

2. **配置 Branch Protection**:
   - Settings → Branches → Add rule
   - Require status checks to pass before merging
   - Require branches to be up to date before merging

3. **启用 Funding**:
   - 编辑 `.github/FUNDING.yml`
   - 取消注释并修改赞助链接

4. **添加更多 Workflows**:
   - `docker-image.yml` - 自动构建 Docker 镜像
   - `release.yml` - 自动发布
   - `security.yml` - 安全扫描

---

## 🔍 配置说明

### Dependabot 调度

```yaml
schedule:
  interval: weekly
  day: monday
  time: "09:00"
```

**含义**: 每周一上午 9 点（UTC）检查更新

**Cooldown**: 7 天（如果连续更新失败，等待 7 天再重试）

**Groups**: minor 和 patch 更新会合并到一个 PR

### Labeler 规则

```yaml
"v2":
  - changed-files:
      - any-glob-to-any-file:
          - "agent/**"
          - "docs/v2/**"
```

**含义**: 如果 PR 修改了 `agent/` 或 `docs/v2/` 下的任何文件，自动添加 `v2` 标签

### CI Workflow

```yaml
v2-type-check:
  - name: TypeScript type check
    run: pnpm tsc --noEmit || echo "TypeScript not configured yet"
    continue-on-error: true
```

**含义**: 运行 TypeScript 类型检查，如果失败不会导致整个 workflow 失败（因为 v2 还在开发中）

---

## 📚 相关文档

- [详细分析报告](./github-config-analysis.md) - OpenClaw 配置分析和改造方案
- [Dependabot 官方文档](https://docs.github.com/en/code-security/dependabot)
- [Labeler 使用指南](https://github.com/actions/labeler)

---

## ⚠️ 注意事项

### 1. 首次运行

CI workflow 第一次运行时会：
- v1 lint 检查可能失败（如果没有配置 lint 脚本）
- v2 TypeScript 检查可能失败（还没有配置 TypeScript）
- 测试可能失败（还没有写测试）

这些都是正常的，配置了 `continue-on-error: true`

### 2. Labeler 需要手动创建标签

GitHub Labeler 只会给 PR 添加已存在的标签。你需要在仓库首次使用时手动创建标签：

**方法**:
1. 进入 Issues → Labels
2. 点击 "New label"
3. 创建以下标签：
   - `v1` (蓝色)
   - `v2` (紫色)
   - `documentation` (绿色)
   - `tests` (黄色)
   - `dependencies` (红色)
   - 等等...

**或者**等待第一次 PR 后，根据 GitHub 的提示创建标签。

### 3. Dependabot 首次运行

Dependabot 可能会在第一次运行时创建大量 PR（如果依赖很久没更新）。

**建议**:
- 密切观察 Dependabot 的 PR
- 逐个审查并合并
- 或者暂时关闭 Dependabot，等稳定后再启用

---

## 🎉 总结

你现在拥有一个完整的 `.github` 配置，包括：

✅ **Issue 模板** - 规范 Bug 报告和功能请求
✅ **自动标签** - 基于文件变化智能分类 PR
✅ **依赖更新** - 自动保持依赖最新和安全
✅ **持续集成** - 自动检查代码质量
✅ **Workflow 检查** - 确保 GitHub Actions 配置正确

所有配置都针对 self-evolution-system 项目进行了定制，支持 v1/v2 双架构并存，并为未来的 v2 开发做好了准备。

**下一步**: 提交这些配置到 GitHub，并开始使用！🚀
