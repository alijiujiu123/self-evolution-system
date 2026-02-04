# Self-Evolution System v2 - GitHub Issues

本文档包含 v2 架构重构的所有 GitHub Issues，按 Phase 组织，每个 Issue 都是独立可执行的最小单元。

## Phase 0：共识与安全底座

### Issue #1: 【Doc】明确 Tool / Skill / Agent Core 抽象定义

**优先级**: P0 (必须)
**复杂度**: 低
**预估工时**: 2h

#### 目标
在 v2 架构中明确定义三个核心概念，确保团队对抽象层有统一认识。

#### 任务清单
- [ ] 在 `docs/v2/architecture.md` 中创建"核心概念"章节
- [ ] 定义 **Tool**：外部世界 I/O 的抽象，权限边界
- [ ] 定义 **Skill**：Tool 的编排封装，可版本化、可淘汰
- [ ] 定义 **Agent Core**：决策、调度、风控、反思的操作系统
- [ ] 为每个概念提供代码示例（TypeScript）
- [ ] 绘制三者的关系图（使用 Mermaid）

#### 验收标准
- [ ] 文档清晰区分三者的职责边界
- [ ] 有具体的 TypeScript interface 定义
- [ ] 包含至少 3 个实际使用场景示例

#### 依赖
无

---

### Issue #2: 【Config】引入全局 policy.yaml（禁止自动高危操作）

**优先级**: P0 (必须)
**复杂度**: 低
**预估工时**: 4h

#### 目标
创建全局安全策略配置，防止 Agent 自动执行高危操作。

#### 任务清单
- [ ] 创建 `agent/config/policy.yaml`
- [ ] 定义危险操作白名单/黑名单（如 `rm -rf`、`git push --force`）
- [ ] 实现 Policy Checker (`agent/core/policy.ts`)
- [ ] 集成到现有 skill 的执行流程中
- [ ] 添加单元测试

#### 验收标准
- [ ] policy.yaml 包含至少 10 种危险命令模式
- [ ] Policy Checker 能拦截黑名单操作
- [ ] 高风险操作需要人工确认机制
- [ ] 测试覆盖率达到 80%+

#### 依赖
- #1 (需要先明确抽象定义)

---

## Phase 1：Skill 基础设施

### Issue #3: 【Skill】定义 Skill 基类接口

**优先级**: P0 (必须)
**复杂度**: 中
**预估工时**: 6h

#### 目标
创建 TypeScript Skill 基类，定义所有 Skill 必须实现的接口。

#### 任务清单
- [ ] 创建 `agent/skills/base.ts`
- [ ] 定义 `Skill` interface（包含 `execute()`, `metadata`, `validate()` 等方法）
- [ ] 创建 `AbstractSkill` 抽象类
- [ ] 定义 `SkillContext` 类型（包含 input、tools、memory 等上下文）
- [ ] 定义 `SkillResult` 类型（包含 success、data、error、cost 等）
- [ ] 实现 2-3 个示例 Skill（改造现有 skill）

#### 验收标准
- [ ] Skill interface 包含所有必需方法
- [ ] TypeScript 类型定义完整，无 any 类型
- [ ] 示例 Skill 能成功执行
- [ ] 有完整的 JSDoc 文档

#### 依赖
- #1

---

### Issue #4: 【Skill】引入 skill metadata（meta.json）规范

**优先级**: P0 (必须)
**复杂度**: 中
**预估工时**: 4h

#### 目标
为每个 Skill 定义元数据规范，支持版本管理和能力比较。

#### 任务清单
- [ ] 设计 `meta.json` schema（使用 JSON Schema）
- [ ] 定义必需字段：`name`, `version`, `intent`, `author`, `created_at`
- [ ] 定义可选字段：`description`, `tags`, `dependencies`, `cost_estimate`, `success_threshold`
- [ ] 创建 `agent/skills/validator.ts` 验证 metadata
- [ ] 为现有 skill 创建 meta.json
- [ ] 添加 JSON Schema 编译检查（pre-commit hook）

#### 验收标准
- [ ] JSON Schema 定义完整
- [ ] validator 能检测无效的 meta.json
- [ ] 至少 3 个现有 skill 有完整的 meta.json
- [ ] pre-commit hook 正确阻止无效提交

#### 依赖
- #3

---

### Issue #5: 【Skill】实现 Skill Registry

**优先级**: P0 (必须)
**复杂度**: 中
**预估工时**: 8h

#### 目标
创建 Skill 注册表，支持动态加载、查询和比较 Skills。

#### 任务清单
- [ ] 创建 `agent/skills/registry.ts`
- [ ] 实现 `register()` 方法（注册 skill）
- [ ] 实现 `list()` 方法（按 intent、tags 过滤）
- [ ] 实现 `get()` 方法（获取 skill 实例）
- [ ] 实现 `compare()` 方法（比较两个同 intent skill 的元数据）
- [ ] 支持从文件系统自动发现 skills（扫描 `experimental/`, `production/` 目录）
- [ ] 添加单元测试

#### 验收标准
- [ ] Registry 能正确加载所有带 meta.json 的 skill
- [ ] `list("code-review")` 能返回所有 code-review intent 的 skills
- [ ] `compare(skillA, skillB)` 能基于 metadata 返回推荐结果
- [ ] 测试覆盖率 80%+
- [ ] 性能：加载 100 个 skills < 1s

#### 依赖
- #3, #4

---

## Phase 2：生命周期与评估

### Issue #6: 【Eval】定义 skill 评估指标（metrics）

**优先级**: P1 (高)
**复杂度**: 中
**预估工时**: 6h

#### 目标
定义可量化的 Skill 评估指标，支持数据驱动的晋升/淘汰决策。

#### 任务清单
- [ ] 创建 `agent/evaluation/metrics.ts`
- [ ] 定义核心指标类型：
  - `success_rate`: 成功率（0-1）
  - `avg_cost`: 平均成本（元）
  - `avg_latency`: 平均延迟（ms）
  - `rollback_rate`: 回滚率
  - `stability_score`: 稳定性分数（方差）
- [ ] 定义 `SkillMetrics` interface
- [ ] 创建 `metrics.yaml` 配置文件（定义阈值）
- [ ] 实现指标收集逻辑（在 Skill 执行时自动记录）

#### 验收标准
- [ ] 至少定义 5 个核心指标
- [ ] 每个指标有明确的计算公式（在文档中）
- [ ] metrics.yaml 包含默认阈值
- [ ] 有单元测试验证指标计算正确性

#### 依赖
- #3, #4

---

### Issue #7: 【Eval】实现 Skill Scorer

**优先级**: P1 (高)
**复杂度**: 中
**预估工时**: 8h

#### 目标
实现评分系统，根据多个指标综合评估 Skill 质量。

#### 任务清单
- [ ] 创建 `agent/evaluation/scorer.ts`
- [ ] 实现 `ScoreWeights` 配置（各指标权重）
- [ ] 实现 `calculateScore()` 方法（加权综合评分）
- [ ] 实现 `compareScores()` 方法（判断 skillA 是否优于 skillB）
- [ ] 支持自定义评分算法（策略模式）
- [ ] 添加单元测试

#### 验收标准
- [ ] 评分算法可配置
- [ ] 支持至少 3 种评分策略（保守、平衡、激进）
- [ ] 测试覆盖边界情况（无数据、异常值）
- [ ] 文档说明评分逻辑和权重选择

#### 依赖
- #6

---

### Issue #8: 【Lifecycle】实现 promote / retire 机制

**优先级**: P1 (高)
**复杂度**: 高
**预估工时**: 12h

#### 目标
实现 Skill 生命周期管理，自动将实验性 Skill 晋升为生产，或淘汰低质量 Skill。

#### 任务清单
- [ ] 创建 `agent/skills/lifecycle.ts`
- [ ] 实现 `promote()` 方法：
  - 检查评分是否达到阈值
  - 将 skill 从 `experimental/` 移动到 `production/`
  - 更新 metadata 状态
  - 记录晋升日志
- [ ] 实现 `retire()` 方法：
  - 将 skill 移动到 `retired/` 目录
  - 标记为 deprecated
  - 保留历史数据
- [ ] 实现 `autoPromote()` 方法（基于评分自动晋升）
- [ ] 实现 `autoRetire()` 方法（基于评分自动淘汰）
- [ ] 实现回滚机制（从 production 回退到上一个版本）
- [ ] 添加集成测试

#### 验收标准
- [ ] promote/retire 操作正确移动文件
- [ ] 不会晋升评分低于阈值的 skill
- [ ] 退休的 skill 不再被 registry 查询到
- [ ] 有完整的日志记录
- [ ] 测试包含回滚场景

#### 依赖
- #5, #7

---

## Phase 3：Sandbox 与风控

### Issue #9: 【Sandbox】实现 sandbox executor

**优先级**: P1 (高)
**复杂度**: 高
**预估工时**: 16h

#### 目标
创建沙箱执行环境，限制 Skill 的权限和资源使用。

#### 任务清单
- [ ] 创建 `agent/sandbox/executor.ts`
- [ ] 实现 `dry-run` 模式（只模拟，不执行）
- [ ] 实现 `read-only` 模式（只读文件系统）
- [ ] 实现资源限制：
  - CPU 时间限制（使用 `ulimit` 或 cgroup）
  - 内存限制
  - 网络访问限制
- [ ] 实现执行超时机制
- [ ] 实现文件系统隔离（chroot 或容器）
- [ ] 添加单元测试和集成测试

#### 验收标准
- [ ] dry-run 模式不修改任何文件
- [ ] 超时的 skill 被正确终止
- [ ] 超出资源限制的 skill 被中止
- [ ] 测试包含恶意 skill 的场景

#### 依赖
- #2, #3

---

### Issue #10: 【Sandbox】权限配置（permissions.yaml）

**优先级**: P1 (高)
**复杂度**: 中
**预估工时**: 6h

#### 目标
为不同 Skill 定义细粒度权限控制。

#### 任务清单
- [ ] 创建 `agent/sandbox/permissions.yaml`
- [ ] 定义权限类型：
  - `file_system`: 读/写路径限制
  - `network`: 允许/拒绝的域名
  - `commands`: 允许执行的命令模式
  - `environment`: 可访问的环境变量
- [ ] 实现权限检查器（`agent/sandbox/permissions.ts`）
- [ ] 为每个 skill 关联权限配置（在 meta.json 中引用）
- [ ] 实现权限继承机制（skill 继承 tool 的权限）
- [ ] 添加单元测试

#### 验收标准
- [ ] permissions.yaml 包含至少 3 种权限模板
- [ ] 权限检查器能拒绝越权操作
- [ ] 测试覆盖权限继承场景

#### 依赖
- #9

---

## Phase 4：Agent Core 解耦

### Issue #11: 【Core】拆分 planner / scheduler / policy / reflection

**优先级**: P0 (必须)
**复杂度**: 高
**预估工时**: 16h

#### 目标
将现有的 skill/index.cjs 拆分为独立的 Agent Core 模块，职责单一。

#### 任务清单
- [ ] 创建 `agent/core/planner.ts`：
  - `decompose(goal)` 方法：将目标拆解为任务
  - 支持 LLM 辅助规划
  - 输出结构化的任务列表
- [ ] 创建 `agent/core/scheduler.ts`：
  - `schedule(tasks)` 方法：任务调度和优先级排序
  - 支持依赖管理（DAG）
  - 支持重试机制
- [ ] 创建 `agent/core/policy.ts`（如果 #2 未完成）：
  - `allow(skill, task)` 方法：检查是否允许执行
  - 集成 `permissions.yaml`
- [ ] 创建 `agent/core/reflection.ts`：
  - `observe(skill, result)` 方法：观察执行结果
  - `analyze()` 方法：分析模式和问题
  - `suggest()` 方法：生成改进建议
- [ ] 重构现有代码，使用新模块

#### 验收标准
- [ ] 每个模块职责单一，接口清晰
- [ ] planner 能生成可执行的任务列表
- [ ] scheduler 能处理任务依赖关系
- [ ] policy 能拦截危险操作
- [ ] reflection 能生成有价值的分析报告
- [ ] 有单元测试

#### 依赖
- #2, #9, #10

---

### Issue #12: 【Core】重写 agent 主循环

**优先级**: P0 (必须)
**复杂度**: 高
**预估工时**: 12h

#### 目标
实现 Agent 的主循环，整合所有模块。

#### 任务清单
- [ ] 创建 `agent/core/agent.ts`
- [ ] 实现主循环逻辑：
  ```typescript
  while (true) {
    goal = getGoal();
    plan = planner.decompose(goal);

    for (task of scheduler.schedule(plan)) {
      skills = registry.list(task.intent);
      best = selectBest(skills, memory.skillStats);

      if (policy.allow(best, task)) {
        result = sandbox.run(best, task);
        reflection.observe(best, result);
      }
    }

    lifecycle.tick();
  }
  ```
- [ ] 实现 `selectBest()` 方法（基于历史数据选择最佳 skill）
- [ ] 实现优雅退出机制
- [ ] 添加健康检查
- [ ] 添加集成测试

#### 验收标准
- [ ] 主循环能完整运行
- [ ] 正确整合所有模块
- [ ] 支持 Ctrl+C 优雅退出
- [ ] 有完整的日志记录
- [ ] 测试覆盖完整流程

#### 依赖
- #5, #8, #11

---

## Phase 5：Memory & 演化闭环

### Issue #13: 【Memory】实现 skill_stats 持久化

**优先级**: P1 (高)
**复杂度**: 中
**预估工时**: 8h

#### 目标
创建 Memory 层，持久化 Skill 执行统计，支持数据驱动决策。

#### 任务清单
- [ ] 创建 `agent/memory/skill-stats.ts`
- [ ] 定义 `SkillStats` 数据模型：
  - skill_id
  - execution_count
  - success_count
  - total_cost
  - total_latency
  - last_execution_at
- [ ] 实现存储层（扩展现有的 SQLite）
- [ ] 实现 `record()` 方法（记录执行结果）
- [ ] 实现 `getStats()` 方法（查询统计）
- [ ] 实现 `getHistory()` 方法（查询历史趋势）
- [ ] 添加数据聚合功能（按天/周/月）
- [ ] 添加单元测试

#### 验收标准
- [ ] 数据正确写入 SQLite
- [ ] 支持并发写入（使用队列）
- [ ] 查询性能 < 100ms（1000 条记录）
- [ ] 测试覆盖数据一致性

#### 依赖
- #6

---

### Issue #14: 【Reflection】将结果写回评估系统

**优先级**: P1 (高)
**复杂度**: 中
**预估工时**: 8h

#### 目标
实现 Reflection 模块与评估系统的集成，形成演化闭环。

#### 任务清单
- [ ] 扩展 `agent/core/reflection.ts`
- [ ] 实现 `recordToEvaluation()` 方法：
  - 将执行结果写入 skill_stats
  - 触发评分更新
  - 检查是否达到晋升/淘汰阈值
- [ ] 实现 `generateReport()` 方法：
  - 生成周期性报告（日报/周报）
  - 包含 top skills、问题分析、改进建议
- [ ] 实现 `triggerLifecycle()` 方法：
  - 自动触发 promote/retire
  - 发送通知
- [ ] 集成到主循环
- [ ] 添加集成测试

#### 验收标准
- [ ] 每个 skill 执行后自动更新统计
- [ ] 报告包含可操作的洞察
- [ ] 达到阈值的 skill 自动触发生命周期事件
- [ ] 测试覆盖完整闭环

#### 依赖
- #8, #13

---

## Phase 6：首个真实演化 Demo

### Issue #15: 【Demo】两个同 intent skill A/B

**优先级**: P2 (中)
**复杂度**: 中
**预估工时**: 8h

#### 目标
创建两个相同 intent 的不同 skill 实现，演示 A/B 测试能力。

#### 任务清单
- [ ] 选择一个简单 intent（如 `summarize-text`）
- [ ] 实现 Skill A：使用 LLM 方式
- [ ] 实现 Skill B：使用提取式摘要
- [ ] 为两个 skill 创建完整的 meta.json
- [ ] 注册到 registry
- [ ] 运行测试集，收集指标
- [ ] 对比两个 skill 的表现
- [ ] 创建 Demo 文档

#### 验收标准
- [ ] 两个 skill 实现不同但 intent 相同
- [ ] meta.json 完整且准确
- [ ] 能生成对比报告
- [ ] Demo 文档清晰展示 A/B 测试流程

#### 依赖
- #5, #7, #13

---

### Issue #16: 【Demo】自动淘汰劣势 skill

**优先级**: P2 (中)
**复杂度**: 中
**预估工时**: 6h

#### 目标
演示完整的演化闭环：创建新 skill → 评估 → 淘汰旧 skill。

#### 任务清单
- [ ] 基于 Issue #15 的 A/B 测试结果
- [ ] 配置自动晋升/淘汰阈值
- [ ] 运行演化流程：
  1. 低分 skill 自动退休
  2. 高分 skill 晋升为 production
  3. 生成报告
- [ ] 录制演示视频
- [ ] 创建教程文档

#### 验收标准
- [ ] 演示完整的自动淘汰流程
- [ ] 有清晰的 before/after 对比
- [ ] 教程文档能指导用户复现
- [ ] 视频展示关键步骤

#### 依赖
- #15

---

## 总结

- **总 Issue 数**: 16
- **预估总工时**: 124 小时（约 15.5 个工作日）
- **关键路径**: #1 → #2 → #3 → #4 → #5 → #7 → #8 → #11 → #12 → #14
- **可并行任务**: Phase 2 可与 Phase 1 后半部分并行

## 里程碑

- **Milestone 1**: Phase 0-1 完成（Issue #1-5）
  - 交付：核心抽象定义 + Skill 基础设施
  - 时间：约 5 天

- **Milestone 2**: Phase 2-3 完成（Issue #6-10）
  - 交付：评估系统 + 沙箱风控
  - 时间：约 6 天

- **Milestone 3**: Phase 4-5 完成（Issue #11-14）
  - 交付：完整的 Agent Core + 演化闭环
  - 时间：约 5 天

- **Milestone 4**: Phase 6 完成（Issue #15-16）
  - 交付：可演示的演化系统
  - 时间：约 2 天
