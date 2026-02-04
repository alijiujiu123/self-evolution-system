# Policy Checker - 全局安全策略模块

## 概述

Policy Checker 是 OpenClaw Self-Evolution System 的安全策略检查器，用于防止 Agent 自动执行高危操作。

## 功能特性

- ✅ **危险命令黑名单**: 自动识别并阻止 10+ 种危险命令模式
- ✅ **人工确认机制**: 高风险操作需要人工批准
- ✅ **执行限制**: 支持成本、次数、延迟等多维度限制
- ✅ **灵活配置**: 通过 YAML 文件自定义策略
- ✅ **警告系统**: 对中等风险操作发出警告
- ✅ **统计追踪**: 记录执行历史和成本
- ✅ **通知集成**: 支持多种通知渠道

## 安装

```bash
# Policy Checker 是 agent/core 的一部分
# 无需额外安装，直接使用即可

# 确保安装了依赖
npm install js-yaml
```

## 快速开始

### 1. 基本使用

```typescript
import { PolicyChecker } from './agent/core/policy';

// 创建 Policy Checker 实例
const policyChecker = new PolicyChecker('agent/config/policy.yaml');

// 检查操作是否允许
const result = await policyChecker.check({
  skill_name: 'my-skill',
  task_id: 'task-123',
  command: 'git push --force',
  estimated_cost: 0.5
});

if (result.allowed) {
  console.log('操作允许');
} else {
  if (result.requires_approval) {
    console.log('需要人工确认:', result.reason);
  } else {
    console.log('操作被阻止:', result.reason);
  }
}
```

### 2. 处理人工确认

```typescript
// 1. 检查操作
const result = await policyChecker.check({
  command: 'git push --force'
});

// 2. 如果需要确认，获取确认请求
if (result.requires_approval) {
  const pending = policyChecker.getPendingApprovals();
  const requestId = pending[0].id;

  // 3. 通知用户并等待响应
  console.log(`请批准操作: ${requestId}`);
  // ... 等待用户输入 ...

  // 4. 处理确认
  const approved = await policyChecker.approve(requestId, true);
  if (approved) {
    console.log('操作已批准，继续执行...');
  }
}
```

## 配置文件

配置文件位置: `agent/config/policy.yaml`

### 配置结构

```yaml
# 危险命令黑名单
dangerous_commands:
  - pattern: "rm -rf"
    severity: "critical"
    action: "block"
    description: "递归删除目录"

# 权限模板
permissions:
  read_only:
    file_system: ["read:/**"]
    commands: ["cat", "ls"]

# 执行限制
limits:
  max_cost_per_day: 50
  max_executions_per_hour: 100
  timeout_default: 10000

# 策略规则
rules:
  low_risk:
    patterns: ["git status", "cat"]
    action: "allow"

# 通知配置
notifications:
  on_block:
    enabled: true
    channels: ["console"]
```

### 危险命令配置

每个危险命令包含以下字段:

- `pattern`: 命令模式（支持正则表达式）
- `severity`: 严重等级 (`critical` | `high` | `medium` | `low`)
- `action`: 行动类型
  - `block`: 直接阻止
  - `require_approval`: 需要人工确认
  - `warn`: 记录警告但允许
- `description`: 描述信息

示例:

```yaml
- pattern: "rm -rf"
  severity: "critical"
  action: "block"
  description: "递归删除目录，极易造成数据丢失"
```

## 集成到现有 Skill

### 方式 1: 直接集成

```typescript
import { PolicyChecker } from './agent/core/policy';

async function executeSkill(input: any) {
  const policyChecker = new PolicyChecker();

  // 检查策略
  const result = await policyChecker.check({
    skill_name: 'my-skill',
    command: input.command,
    estimated_cost: input.estimatedCost
  });

  if (!result.allowed) {
    throw new Error(result.reason);
  }

  // 执行实际操作
  return await doWork(input);
}
```

### 方式 2: 使用基类

```typescript
import { PolicyAwareSkill } from './agent/core/policy-integration-example';

class MySkill extends PolicyAwareSkill {
  constructor() {
    super('my-skill');
  }

  protected async executeInternal(context: SkillContext): Promise<any> {
    // 实际执行逻辑
    return await doWork(context);
  }
}

// 使用
const skill = new MySkill();
const result = await skill.execute(context);
```

### 方式 3: 中间件集成

```typescript
function withPolicyCheck(policyChecker: PolicyChecker) {
  return async (req: any, res: any, next: any) => {
    const result = await policyChecker.check({
      command: req.body.command
    });

    if (!result.allowed) {
      return res.status(403).json({ error: result.reason });
    }

    next();
  };
}

// Express 中间件
app.use(withPolicyCheck(new PolicyChecker()));
```

## API 参考

### PolicyChecker 类

#### 构造函数

```typescript
constructor(configPath?: string)
```

- `configPath`: 配置文件路径（默认: `agent/config/policy.yaml`）

#### 方法

##### check()

```typescript
async check(request: PolicyCheckRequest): Promise<PolicyCheckResult>
```

检查操作是否允许执行。

**参数:**
- `request`: 检查请求
  - `skill_name`: Skill 名称
  - `task_id`: 任务 ID
  - `intent`: 操作意图
  - `input`: 输入内容
  - `command`: 命令字符串
  - `estimated_cost`: 估算成本

**返回:**
- `PolicyCheckResult`: 检查结果
  - `allowed`: 是否允许
  - `reason`: 拒绝原因
  - `action_taken`: 采取的行动
  - `dangerous_command`: 匹配的危险命令
  - `requires_approval`: 是否需要确认
  - `warnings`: 警告列表

##### approve()

```typescript
async approve(requestId: string, approved: boolean): Promise<boolean>
```

处理人工确认请求。

**参数:**
- `requestId`: 请求 ID
- `approved`: 是否批准

**返回:**
- `boolean`: 是否成功处理

##### getStats()

```typescript
getStats(): {
  hourly: { count: number; cost: number };
  daily: { count: number; cost: number };
  pending_approvals: number;
}
```

获取执行统计信息。

##### getPendingApprovals()

```typescript
getPendingApprovals(): ApprovalRequest[]
```

获取待确认的请求列表。

##### cleanupExpiredApprovals()

```typescript
cleanupExpiredApprovals(): void
```

清理过期的确认请求。

##### reloadConfig()

```typescript
reloadConfig(): void
```

重新加载配置文件。

## 预定义的危险命令

Policy Checker 预定义了以下危险命令:

1. `rm -rf` - 递归删除目录（critical, block）
2. `rm -f` - 强制删除文件（high, require_approval）
3. `git push --force` - 强制推送（high, require_approval）
4. `chmod 777` - 开放所有权限（high, block）
5. `shutdown` - 关闭系统（critical, block）
6. `DROP DATABASE` - 删除数据库（critical, block）
7. `mkfs` - 格式化磁盘（critical, block）
8. `iptables -F` - 清空防火墙（high, require_approval）
9. `userdel -r` - 删除用户（high, require_approval）
10. `dd if=/dev/zero` - 覆盖磁盘（critical, block）

## 测试

```bash
# 运行测试
npm test -- agent/core/__tests__/policy.test.ts

# 或使用 vitest
npx vitest run agent/core/__tests__/policy.test.ts

# 查看覆盖率
npm test -- --coverage agent/core/__tests__/policy.test.ts
```

## 最佳实践

### 1. 始终检查策略

```typescript
// ✅ 好的做法
const result = await policyChecker.check({ command });
if (!result.allowed) {
  return { success: false, error: result.reason };
}

// ❌ 不好的做法
// 跳过策略检查直接执行
```

### 2. 提供准确的成本估算

```typescript
// ✅ 好的做法
const result = await policyChecker.check({
  command,
  estimated_cost: calculateActualCost(command)
});

// ❌ 不好的做法
const result = await policyChecker.check({
  command,
  estimated_cost: 0  // 永远不超限
});
```

### 3. 处理确认请求

```typescript
// ✅ 好的做法
if (result.requires_approval) {
  const approved = await promptUserApproval();
  if (!approved) {
    return { success: false, error: '用户拒绝' };
  }
}

// ❌ 不好的做法
if (result.requires_approval) {
  // 直接继续执行，忽略确认
}
```

### 4. 记录警告

```typescript
// ✅ 好的做法
if (result.warnings.length > 0) {
  logger.warn('操作警告:', result.warnings);
}

// ❌ 不好的做法
// 忽略警告
```

### 5. 监控统计信息

```typescript
// ✅ 好的做法
setInterval(() => {
  const stats = policyChecker.getStats();
  if (stats.hourly.count > limit) {
    logger.warn('接近每小时执行次数限制');
  }
}, 60000);

// ❌ 不好的做法
// 从不检查统计信息
```

## 故障排查

### 问题: 配置文件加载失败

**解决方案:**
- 确保配置文件路径正确
- 检查 YAML 语法是否正确
- 确保文件有读取权限

### 问题: 危险命令未被识别

**解决方案:**
- 检查命令模式是否正确
- 尝试使用正则表达式
- 确保命令格式与配置匹配

### 问题: 确认请求过期

**解决方案:**
- 增加 `approval_timeout` 配置
- 使用 `cleanupExpiredApprovals()` 定期清理
- 实现更高效的通知机制

## 扩展

### 自定义通知渠道

```typescript
class CustomPolicyChecker extends PolicyChecker {
  private notify(type: string, data: any): void {
    // 调用自定义通知服务
    customNotificationService.send({
      type,
      data,
      timestamp: Date.now()
    });

    // 调用父类方法
    super.notify(type, data);
  }
}
```

### 自定义成本估算

```typescript
interface CostEstimator {
  estimate(command: string): number;
}

class SmartPolicyChecker extends PolicyChecker {
  private costEstimator: CostEstimator;

  async check(request: PolicyCheckRequest): Promise<PolicyCheckResult> {
    // 自动估算成本
    if (!request.estimated_cost) {
      request.estimated_cost = this.costEstimator.estimate(
        request.command || ''
      );
    }

    return super.check(request);
  }
}
```

## 相关文档

- [v2 架构设计](../../docs/v2/architecture.md)
- [Policy Checker 集成示例](./policy-integration-example.ts)
- [Issue #2: 【Config】引入全局 policy.yaml](../../docs/github-issues-v2.md)

## 许可证

MIT
