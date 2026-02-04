/**
 * Policy Checker 集成示例
 *
 * 本文件展示如何将 Policy Checker 集成到现有的 skill 执行流程中。
 */

import { PolicyChecker, PolicyCheckRequest } from './policy';

/**
 * 示例 1: 基本集成 - 在执行 Shell 命令前检查策略
 */
export async function executeCommandWithPolicy(
  command: string,
  skillName: string = 'shell-skill'
): Promise<{ success: boolean; output?: string; error?: string }> {
  // 1. 创建 Policy Checker 实例
  const policyChecker = new PolicyChecker();

  // 2. 执行策略检查
  const checkRequest: PolicyCheckRequest = {
    skill_name: skillName,
    task_id: `cmd_${Date.now()}`,
    command: command,
    estimated_cost: 0.01  // 假设每个命令成本为 0.01 元
  };

  const checkResult = await policyChecker.check(checkRequest);

  // 3. 处理检查结果
  if (!checkResult.allowed) {
    if (checkResult.requires_approval) {
      // 需要人工确认
      console.log('操作需要人工确认:', checkResult.reason);
      console.log('等待确认中...');

      // 在实际应用中，这里应该等待用户输入或通知系统
      // 这里只是示例，直接返回
      return {
        success: false,
        error: `操作需要人工确认: ${checkResult.reason}`
      };
    } else {
      // 直接被阻止
      console.error('操作被阻止:', checkResult.reason);

      if (checkResult.warnings.length > 0) {
        console.warn('警告:', checkResult.warnings);
      }

      return {
        success: false,
        error: checkResult.reason
      };
    }
  }

  // 4. 输出警告（如果有）
  if (checkResult.warnings.length > 0) {
    console.warn('警告:', checkResult.warnings);
  }

  // 5. 执行命令
  try {
    const { exec } = require('child_process');
    const output = await new Promise<string>((resolve, reject) => {
      exec(command, (error: any, stdout: string, stderr: string) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout || stderr);
        }
      });
    });

    console.log('命令执行成功:', output);
    return {
      success: true,
      output
    };
  } catch (error: any) {
    console.error('命令执行失败:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 示例 2: 集成到 Skill 执行流程中
 */
export interface SkillContext {
  input: any;
  tools: Map<string, any>;
  memory: any;
  config: any;
}

export interface SkillResult {
  success: boolean;
  data?: any;
  error?: Error;
  metrics: {
    cost: number;
    latency: number;
  };
}

export abstract class PolicyAwareSkill {
  protected policyChecker: PolicyChecker;
  protected skillName: string;

  constructor(skillName: string) {
    this.skillName = skillName;
    this.policyChecker = new PolicyChecker();
  }

  /**
   * 执行 Skill，自动进行策略检查
   */
  async execute(context: SkillContext): Promise<SkillResult> {
    const startTime = Date.now();

    try {
      // 1. 检查策略
      const checkResult = await this.checkPolicy(context);

      if (!checkResult.allowed) {
        if (checkResult.requires_approval) {
          // 等待人工确认
          const approved = await this.waitForApproval(checkResult);
          if (!approved) {
            return {
              success: false,
              error: new Error('操作未获批准'),
              metrics: { cost: 0, latency: Date.now() - startTime }
            };
          }
        } else {
          return {
            success: false,
            error: new Error(checkResult.reason),
            metrics: { cost: 0, latency: Date.now() - startTime }
          };
        }
      }

      // 2. 执行实际逻辑
      const result = await this.executeInternal(context);

      return {
        success: true,
        data: result,
        metrics: {
          cost: this.estimateCost(context),
          latency: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error,
        metrics: {
          cost: 0,
          latency: Date.now() - startTime
        }
      };
    }
  }

  /**
   * 检查策略（子类可覆盖）
   */
  protected async checkPolicy(context: SkillContext) {
    // 默认检查上下文中的 command 字段
    const command = this.extractCommand(context);

    return await this.policyChecker.check({
      skill_name: this.skillName,
      task_id: context.input.taskId || 'unknown',
      command: command,
      estimated_cost: this.estimateCost(context)
    });
  }

  /**
   * 等待人工确认
   */
  protected async waitForApproval(checkResult: any): Promise<boolean> {
    const pendingApprovals = this.policyChecker.getPendingApprovals();
    if (pendingApprovals.length === 0) {
      return false;
    }

    const requestId = pendingApprovals[0].id;

    // 在实际应用中，这里应该通知用户并等待响应
    console.log('需要人工确认:', checkResult.reason);
    console.log('请求 ID:', requestId);
    console.log('请使用 approve() 方法确认或拒绝');

    // 这里只是示例，实际应用中应该有更好的机制
    return false;
  }

  /**
   * 提取命令（子类可覆盖）
   */
  protected extractCommand(context: SkillContext): string {
    return context.input.command || context.input.cmd || '';
  }

  /**
   * 估算成本（子类应实现）
   */
  protected estimateCost(context: SkillContext): number {
    return 0.1; // 默认成本
  }

  /**
   * 执行实际逻辑（子类必须实现）
   */
  protected abstract executeInternal(context: SkillContext): Promise<any>;
}

/**
 * 示例 3: 具体的 Skill 实现
 */
export class ShellSkill extends PolicyAwareSkill {
  constructor() {
    super('shell-skill');
  }

  protected async executeInternal(context: SkillContext): Promise<string> {
    const { exec } = require('child_process');
    const command = context.input.command;

    return await new Promise<string>((resolve, reject) => {
      exec(command, (error: any, stdout: string, stderr: string) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout || stderr);
        }
      });
    });
  }

  protected extractCommand(context: SkillContext): string {
    return context.input.command || '';
  }

  protected estimateCost(context: SkillContext): number {
    // 根据命令类型估算成本
    const command = context.input.command || '';
    if (command.includes('git')) return 0.02;
    if (command.includes('npm')) return 0.05;
    return 0.01;
  }
}

/**
 * 示例 4: Git 操作 Skill
 */
export class GitSkill extends PolicyAwareSkill {
  constructor() {
    super('git-skill');
  }

  protected async executeInternal(context: SkillContext): Promise<string> {
    const { execSync } = require('child_process');
    const action = context.input.action;
    const args = context.input.args || [];

    const command = `git ${action} ${args.join(' ')}`;
    return execSync(command, { encoding: 'utf-8' });
  }

  protected extractCommand(context: SkillContext): string {
    const action = context.input.action || '';
    const args = context.input.args || [];
    return `git ${action} ${args.join(' ')}`;
  }

  protected estimateCost(context: SkillContext): number {
    const action = context.input.action || '';
    if (action === 'push') return 0.1;
    if (action === 'clone') return 0.2;
    return 0.02;
  }
}

/**
 * 示例 5: 使用示例
 */
export async function exampleUsage() {
  console.log('=== Policy Checker 集成示例 ===\n');

  // 示例 1: 直接执行命令
  console.log('1. 执行安全命令:');
  const result1 = await executeCommandWithPolicy('ls -la');
  console.log('结果:', result1.success ? '成功' : result1.error);

  console.log('\n2. 尝试执行危险命令:');
  const result2 = await executeCommandWithPolicy('rm -rf /tmp/test');
  console.log('结果:', result2.success ? '成功' : result2.error);

  // 示例 2: 使用 Skill
  console.log('\n3. 使用 Shell Skill:');
  const shellSkill = new ShellSkill();
  const skillResult1 = await shellSkill.execute({
    input: { command: 'cat README.md' },
    tools: new Map(),
    memory: null,
    config: {}
  });
  console.log('结果:', skillResult1.success ? '成功' : skillResult1.error?.message);

  console.log('\n4. 使用 Git Skill (尝试强制推送):');
  const gitSkill = new GitSkill();
  const skillResult2 = await gitSkill.execute({
    input: { action: 'push', args: ['--force', 'origin', 'main'] },
    tools: new Map(),
    memory: null,
    config: {}
  });
  console.log('结果:', skillResult2.success ? '成功' : skillResult2.error?.message);

  // 示例 3: 查看统计信息
  console.log('\n5. 策略检查统计:');
  const stats = new PolicyChecker().getStats();
  console.log('每小时执行次数:', stats.hourly.count);
  console.log('每日执行次数:', stats.daily.count);
  console.log('待确认请求:', stats.pending_approvals);
}

// 如果直接运行此文件，执行示例
if (require.main === module) {
  exampleUsage().catch(console.error);
}
