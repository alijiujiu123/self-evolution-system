/**
 * Policy Checker - 安全策略检查器
 *
 * 本模块负责检查操作是否符合安全策略，防止 Agent 自动执行高危操作。
 *
 * 主要功能：
 * 1. 检查危险命令黑名单
 * 2. 验证权限是否符合模板
 * 3. 检查执行限制（成本、次数、延迟等）
 * 4. 处理人工确认流程
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// ============================================
// 类型定义
// ============================================

/**
 * 危险命令配置
 */
export interface DangerousCommand {
  pattern: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  action: 'block' | 'require_approval' | 'warn';
  description: string;
}

/**
 * 权限规则
 */
export interface PermissionRule {
  file_system?: string[];
  network?: string[];
  commands?: string[];
}

/**
 * 权限模板
 */
export interface PermissionTemplates {
  [key: string]: PermissionRule;
}

/**
 * 执行限制
 */
export interface Limits {
  max_cost_per_day: number;
  max_cost_per_hour: number;
  max_cost_per_task: number;
  max_executions_per_hour: number;
  max_executions_per_day: number;
  max_latency_per_task: number;
  timeout_default: number;
  timeout_long: number;
  max_memory_per_task: string;
  max_cpu_time_per_task: number;
  approval_timeout: number;
}

/**
 * 策略规则
 */
export interface StrategyRule {
  patterns: string[];
  action: 'allow' | 'log_only' | 'require_approval' | 'block';
}

/**
 * 策略规则集合
 */
export interface StrategyRules {
  low_risk?: StrategyRule;
  medium_risk?: StrategyRule;
  high_risk?: StrategyRule;
  forbidden?: StrategyRule;
}

/**
 * 通知配置
 */
export interface NotificationConfig {
  enabled: boolean;
  channels: string[];
}

/**
 * 通知配置集合
 */
export interface Notifications {
  on_block: NotificationConfig;
  on_approval_request: NotificationConfig;
  on_success: NotificationConfig;
}

/**
 * 沙箱配置
 */
export interface SandboxConfig {
  default_mode: 'dry-run' | 'read-only' | 'limited' | 'full';
  isolation: {
    enabled: boolean;
    chroot_enabled: boolean;
    network_namespace: boolean;
  };
  resource_limits: {
    cpu_shares: number;
    memory_limit: string;
    disk_quota: string;
  };
}

/**
 * 策略配置
 */
export interface PolicyConfig {
  dangerous_commands: DangerousCommand[];
  permissions: PermissionTemplates;
  limits: Limits;
  rules: StrategyRules;
  notifications: Notifications;
  sandbox: SandboxConfig;
}

/**
 * 检查请求
 */
export interface PolicyCheckRequest {
  skill_name?: string;
  task_id?: string;
  intent?: string;
  input?: string;
  command?: string;
  estimated_cost?: number;
}

/**
 * 检查结果
 */
export interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
  action_taken: string;
  dangerous_command?: DangerousCommand;
  requires_approval: boolean;
  warnings: string[];
}

/**
 * 人工确认请求
 */
export interface ApprovalRequest {
  id: string;
  skill_name: string;
  task_id: string;
  command: string;
  reason: string;
  timestamp: number;
  expires_at: number;
}

/**
 * 策略检查器
 */
export class PolicyChecker {
  private config: PolicyConfig;
  private configPath: string;
  private pendingApprovals: Map<string, ApprovalRequest>;
  private executionStats: {
    hourly: { count: number; timestamp: number };
    daily: { count: number; timestamp: number };
    cost: { hourly: number; daily: number };
  };

  constructor(configPath: string = 'agent/config/policy.yaml') {
    this.configPath = path.resolve(configPath);
    this.config = this.loadConfig();
    this.pendingApprovals = new Map();
    this.executionStats = {
      hourly: { count: 0, timestamp: Date.now() },
      daily: { count: 0, timestamp: Date.now() },
      cost: { hourly: 0, daily: 0 }
    };
  }

  /**
   * 加载策略配置文件
   */
  private loadConfig(): PolicyConfig {
    try {
      const content = fs.readFileSync(this.configPath, 'utf-8');
      return yaml.load(content) as PolicyConfig;
    } catch (error) {
      console.error(`[PolicyChecker] 加载配置文件失败: ${this.configPath}`, error);
      throw error;
    }
  }

  /**
   * 重新加载配置
   */
  public reloadConfig(): void {
    this.config = this.loadConfig();
    console.log('[PolicyChecker] 配置已重新加载');
  }

  /**
   * 检查是否允许执行某个操作
   */
  public async check(request: PolicyCheckRequest): Promise<PolicyCheckResult> {
    const warnings: string[] = [];
    const command = request.command || request.input || '';

    // 1. 检查危险命令
    const dangerousCommand = this.checkDangerousCommand(command);
    if (dangerousCommand) {
      if (dangerousCommand.action === 'block') {
        this.notify('on_block', {
          type: 'block',
          pattern: dangerousCommand.pattern,
          description: dangerousCommand.description
        });
        return {
          allowed: false,
          reason: `危险命令被阻止: ${dangerousCommand.pattern} - ${dangerousCommand.description}`,
          action_taken: 'block',
          dangerous_command: dangerousCommand,
          requires_approval: false,
          warnings
        };
      }

      if (dangerousCommand.action === 'require_approval') {
        const approval = this.createApprovalRequest(request, dangerousCommand);
        this.pendingApprovals.set(approval.id, approval);

        this.notify('on_approval_request', approval);

        return {
          allowed: false,
          reason: `危险命令需要人工确认: ${dangerousCommand.pattern}`,
          action_taken: 'require_approval',
          dangerous_command: dangerousCommand,
          requires_approval: true,
          warnings: [`危险命令: ${dangerousCommand.description}`]
        };
      }

      if (dangerousCommand.action === 'warn') {
        warnings.push(`警告: ${dangerousCommand.pattern} - ${dangerousCommand.description}`);
      }
    }

    // 2. 检查执行限制
    const limitCheck = this.checkLimits(request);
    if (!limitCheck.allowed) {
      return {
        allowed: false,
        reason: limitCheck.reason,
        action_taken: 'block',
        requires_approval: false,
        warnings
      };
    }

    // 3. 所有检查通过
    this.recordExecution(request);

    return {
      allowed: true,
      action_taken: 'allow',
      requires_approval: false,
      warnings
    };
  }

  /**
   * 检查命令是否在危险命令黑名单中
   */
  private checkDangerousCommand(command: string): DangerousCommand | null {
    for (const dangerous of this.config.dangerous_commands) {
      try {
        const pattern = new RegExp(dangerous.pattern, 'i');
        if (pattern.test(command)) {
          return dangerous;
        }
      } catch (error) {
        // 如果正则表达式无效，使用简单的字符串匹配
        if (command.toLowerCase().includes(dangerous.pattern.toLowerCase())) {
          return dangerous;
        }
      }
    }
    return null;
  }

  /**
   * 检查执行限制
   */
  private checkLimits(request: PolicyCheckRequest): { allowed: boolean; reason?: string } {
    const now = Date.now();

    // 更新时间窗口
    this.updateTimeWindows(now);

    // 检查每日执行次数
    if (this.executionStats.daily.count >= this.config.limits.max_executions_per_day) {
      return {
        allowed: false,
        reason: `已达到每日执行次数限制: ${this.config.limits.max_executions_per_day}`
      };
    }

    // 检查每小时执行次数
    if (this.executionStats.hourly.count >= this.config.limits.max_executions_per_hour) {
      return {
        allowed: false,
        reason: `已达到每小时执行次数限制: ${this.config.limits.max_executions_per_hour}`
      };
    }

    // 检查每日成本
    if (this.executionStats.cost.daily >= this.config.limits.max_cost_per_day) {
      return {
        allowed: false,
        reason: `已达到每日成本限制: ${this.config.limits.max_cost_per_day}元`
      };
    }

    // 检查每小时成本
    if (this.executionStats.cost.hourly >= this.config.limits.max_cost_per_hour) {
      return {
        allowed: false,
        reason: `已达到每小时成本限制: ${this.config.limits.max_cost_per_hour}元`
      };
    }

    // 检查单个任务成本
    if (request.estimated_cost && request.estimated_cost > this.config.limits.max_cost_per_task) {
      return {
        allowed: false,
        reason: `单个任务成本超过限制: ${request.estimated_cost} > ${this.config.limits.max_cost_per_task}元`
      };
    }

    return { allowed: true };
  }

  /**
   * 更新时间窗口
   */
  private updateTimeWindows(now: number): void {
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * 60 * 60 * 1000;

    // 更新每小时统计
    if (now - this.executionStats.hourly.timestamp > oneHour) {
      this.executionStats.hourly = { count: 0, timestamp: now };
      this.executionStats.cost.hourly = 0;
    }

    // 更新每日统计
    if (now - this.executionStats.daily.timestamp > oneDay) {
      this.executionStats.daily = { count: 0, timestamp: now };
      this.executionStats.cost.daily = 0;
    }
  }

  /**
   * 记录执行
   */
  private recordExecution(request: PolicyCheckRequest): void {
    this.executionStats.hourly.count++;
    this.executionStats.daily.count++;

    if (request.estimated_cost) {
      this.executionStats.cost.hourly += request.estimated_cost;
      this.executionStats.cost.daily += request.estimated_cost;
    }
  }

  /**
   * 创建人工确认请求
   */
  private createApprovalRequest(
    request: PolicyCheckRequest,
    dangerousCommand: DangerousCommand
  ): ApprovalRequest {
    return {
      id: this.generateRequestId(),
      skill_name: request.skill_name || 'unknown',
      task_id: request.task_id || 'unknown',
      command: request.command || request.input || '',
      reason: dangerousCommand.description,
      timestamp: Date.now(),
      expires_at: Date.now() + this.config.limits.approval_timeout
    };
  }

  /**
   * 生成请求 ID
   */
  private generateRequestId(): string {
    return `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 处理人工确认
   */
  public async approve(requestId: string, approved: boolean): Promise<boolean> {
    const approval = this.pendingApprovals.get(requestId);

    if (!approval) {
      console.error(`[PolicyChecker] 未找到确认请求: ${requestId}`);
      return false;
    }

    // 检查是否过期
    if (Date.now() > approval.expires_at) {
      console.error(`[PolicyChecker] 确认请求已过期: ${requestId}`);
      this.pendingApprovals.delete(requestId);
      return false;
    }

    if (approved) {
      console.log(`[PolicyChecker] 操作已批准: ${requestId}`);
      this.pendingApprovals.delete(requestId);
      return true;
    } else {
      console.log(`[PolicyChecker] 操作已拒绝: ${requestId}`);
      this.pendingApprovals.delete(requestId);
      return false;
    }
  }

  /**
   * 发送通知
   */
  private notify(type: keyof Notifications, data: any): void {
    const config = this.config.notifications[type];
    if (!config.enabled) {
      return;
    }

    for (const channel of config.channels) {
      switch (channel) {
        case 'console':
          console.log(`[PolicyChecker:${type}]`, JSON.stringify(data, null, 2));
          break;
        case 'log':
          // 这里应该调用日志模块
          console.log(`[PolicyChecker:LOG] [${type}]`, JSON.stringify(data));
          break;
        case 'telegram':
          // 这里应该调用 Telegram 通知模块
          console.log(`[PolicyChecker:Telegram] [${type}]`, JSON.stringify(data));
          break;
        default:
          console.warn(`[PolicyChecker] 未知的通知渠道: ${channel}`);
      }
    }
  }

  /**
   * 获取当前执行统计
   */
  public getStats(): {
    hourly: { count: number; cost: number };
    daily: { count: number; cost: number };
    pending_approvals: number;
  } {
    return {
      hourly: {
        count: this.executionStats.hourly.count,
        cost: this.executionStats.cost.hourly
      },
      daily: {
        count: this.executionStats.daily.count,
        cost: this.executionStats.cost.daily
      },
      pending_approvals: this.pendingApprovals.size
    };
  }

  /**
   * 获取待确认的请求列表
   */
  public getPendingApprovals(): ApprovalRequest[] {
    return Array.from(this.pendingApprovals.values());
  }

  /**
   * 清理过期的确认请求
   */
  public cleanupExpiredApprovals(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [id, approval] of this.pendingApprovals.entries()) {
      if (now > approval.expires_at) {
        expired.push(id);
      }
    }

    for (const id of expired) {
      console.log(`[PolicyChecker] 清理过期确认请求: ${id}`);
      this.pendingApprovals.delete(id);
    }
  }
}

// ============================================
// 导出
// ============================================

export default PolicyChecker;
