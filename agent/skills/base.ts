/**
 * Skill 基类接口
 *
 * 定义了 Skill 的核心类型和抽象类，所有 Skill 都应该实现或继承这些类型。
 */

/**
 * Skill 元数据
 */
export interface SkillMetadata {
  /** Skill 名称，全局唯一 */
  name: string;
  /** 版本号，遵循语义化版本 (semantic versioning) */
  version: string;
  /** 核心意图，用于 Skill 发现和分类 (如 "code-review", "summarize-text") */
  intent: string;
  /** 作者，可以是 "agent" 或具体的人名 */
  author: string;
  /** 创建时间 (ISO 8601 格式) */
  created_at: string;
  /** 简短描述 (可选) */
  description?: string;
  /** 标签列表，用于分类和检索 (可选) */
  tags?: string[];
  /** 依赖的其他 Skills 或 Tools (可选) */
  dependencies?: string[];
  /** 预估单次执行成本（元）(可选) */
  cost_estimate?: number;
  /** 成功率阈值（0-1），低于此值可能被淘汰 (可选) */
  success_threshold?: number;
  /** Skill 状态：experimental | production | retired (可选) */
  status?: 'experimental' | 'production' | 'retired';
  /** 晋升到 production 的时间 (可选) */
  promoted_at?: string;
  /** 淘汰时间 (可选) */
  retired_at?: string;
}

/**
 * 执行上下文
 */
export interface SkillContext {
  /** 输入数据 */
  input: unknown;
  /** 可用的工具集合 */
  tools: Map<string, Tool>;
  /** 记忆访问接口 */
  memory: Memory;
  /** 额外的配置项 */
  config: Record<string, unknown>;
}

/**
 * Tool 接口（简化版）
 */
export interface Tool {
  /** Tool 名称 */
  name: string;
  /** Tool 描述 */
  description: string;
  /** 执行工具 */
  execute(input: unknown): Promise<ToolResult>;
}

/**
 * Tool 执行结果
 */
export interface ToolResult {
  /** 是否成功 */
  success: boolean;
  /** 返回数据 */
  data?: unknown;
  /** 错误信息 */
  error?: Error;
  /** 执行成本（元） */
  cost?: number;
  /** 执行延迟（毫秒） */
  latency?: number;
  /** 执行指标 */
  metrics?: {
    cost?: number;
    latency?: number;
    tokens_used?: number;
  };
}

/**
 * Memory 接口（简化版）
 */
export interface Memory {
  /** 获取统计数据 */
  getStats(skillName: string): Promise<SkillMetrics | undefined>;
  /** 记录执行结果 */
  record(skillName: string, result: SkillResult): Promise<void>;
}

/**
 * Skill 统计指标
 */
export interface SkillMetrics {
  /** 成功率 (0-1) */
  success_rate: number;
  /** 平均成本（元） */
  avg_cost: number;
  /** 平均延迟（毫秒） */
  avg_latency: number;
  /** 回滚率 (0-1) */
  rollback_rate: number;
  /** 稳定性分数（方差倒数） */
  stability_score: number;
  /** 执行次数 */
  execution_count: number;
  /** 最后执行时间 */
  last_execution_at: string;
}

/**
 * Skill 执行结果
 */
export interface SkillResult {
  /** 是否成功 */
  success: boolean;
  /** 返回数据 */
  data?: unknown;
  /** 错误信息 */
  error?: Error;
  /** 性能指标 */
  metrics: SkillResultMetrics;
}

/**
 * Skill 执行指标
 */
export interface SkillResultMetrics {
  /** 执行成本（元） */
  cost: number;
  /** 执行延迟（毫秒） */
  latency: number;
  /** 使用的 token 数量（可选） */
  tokens_used?: number;
}

/**
 * Skill 接口
 *
 * 所有 Skill 都必须实现此接口。
 */
export interface Skill {
  /** 元数据 */
  metadata: SkillMetadata;

  /**
   * 执行 Skill 逻辑
   *
   * @param context 执行上下文
   * @returns 执行结果
   */
  execute(context: SkillContext): Promise<SkillResult>;

  /**
   * 验证输入数据是否合法
   *
   * @param input 输入数据
   * @returns 是否通过验证
   */
  validate(input: unknown): boolean;
}

/**
 * AbstractSkill 抽象类
 *
 * 提供了 Skill 接口的默认实现，子类可以继承并覆盖特定方法。
 */
export abstract class AbstractSkill implements Skill {
  /** 元数据，由子类提供 */
  abstract metadata: SkillMetadata;

  /**
   * 执行 Skill 逻辑
   *
   * 默认实现包含错误处理和指标记录，子类应覆盖此方法实现具体逻辑。
   *
   * @param context 执行上下文
   * @returns 执行结果
   */
  async execute(context: SkillContext): Promise<SkillResult> {
    const startTime = Date.now();

    try {
      // 调用子类实现的执行逻辑
      const result = await this.doExecute(context);

      const latency = Date.now() - startTime;

      return {
        success: true,
        data: result.data,
        metrics: {
          cost: result.cost || 0,
          latency,
          tokens_used: result.tokens_used
        }
      };
    } catch (error) {
      const latency = Date.now() - startTime;

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        metrics: {
          cost: 0,
          latency
        }
      };
    }
  }

  /**
   * 实际执行逻辑，由子类实现
   *
   * @param context 执行上下文
   * @returns 执行结果
   */
  protected abstract doExecute(context: SkillContext): Promise<InternalSkillResult>;

  /**
   * 验证输入数据
   *
   * 默认实现检查 input 是否为非空对象，子类可以覆盖以实现更复杂的验证逻辑。
   *
   * @param input 输入数据
   * @returns 是否通过验证
   */
  validate(input: unknown): boolean {
    return typeof input === 'object' && input !== null;
  }

  /**
   * 获取可用的 Tool
   *
   * 从 context 中获取指定名称的 Tool，如果不存在则抛出错误。
   *
   * @param context 执行上下文
   * @param toolName Tool 名称
   * @returns Tool 实例
   * @throws Error 如果 Tool 不存在
   */
  protected getTool(context: SkillContext, toolName: string): Tool {
    const tool = context.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool "${toolName}" not found in context`);
    }
    return tool;
  }
}

/**
 * 内部 Skill 执行结果（用于 doExecute 方法）
 */
export interface InternalSkillResult {
  data?: unknown;
  cost?: number;
  tokens_used?: number;
}

/**
 * Skill 验证器
 *
 * 用于验证 Skill 元数据和实现的合法性。
 */
export class SkillValidator {
  /**
   * 验证 Skill 元数据
   *
   * @param metadata 元数据
   * @returns 验证结果
   */
  static validateMetadata(metadata: SkillMetadata): ValidationResult {
    const errors: string[] = [];

    // 检查必需字段
    if (!metadata.name || typeof metadata.name !== 'string') {
      errors.push('name is required and must be a string');
    }

    if (!metadata.version || typeof metadata.version !== 'string') {
      errors.push('version is required and must be a string');
    } else if (!/^\d+\.\d+\.\d+/.test(metadata.version)) {
      errors.push('version must follow semantic versioning (e.g., 1.0.0)');
    }

    if (!metadata.intent || typeof metadata.intent !== 'string') {
      errors.push('intent is required and must be a string');
    }

    if (!metadata.author || typeof metadata.author !== 'string') {
      errors.push('author is required and must be a string');
    }

    if (!metadata.created_at || typeof metadata.created_at !== 'string') {
      errors.push('created_at is required and must be a string');
    } else if (isNaN(Date.parse(metadata.created_at))) {
      errors.push('created_at must be a valid ISO 8601 date string');
    }

    // 检查可选字段的类型
    if (metadata.description && typeof metadata.description !== 'string') {
      errors.push('description must be a string if provided');
    }

    if (metadata.tags && !Array.isArray(metadata.tags)) {
      errors.push('tags must be an array if provided');
    }

    if (metadata.dependencies && !Array.isArray(metadata.dependencies)) {
      errors.push('dependencies must be an array if provided');
    }

    if (metadata.cost_estimate !== undefined && typeof metadata.cost_estimate !== 'number') {
      errors.push('cost_estimate must be a number if provided');
    }

    if (metadata.success_threshold !== undefined) {
      if (typeof metadata.success_threshold !== 'number') {
        errors.push('success_threshold must be a number if provided');
      } else if (metadata.success_threshold < 0 || metadata.success_threshold > 1) {
        errors.push('success_threshold must be between 0 and 1');
      }
    }

    if (metadata.status && !['experimental', 'production', 'retired'].includes(metadata.status)) {
      errors.push('status must be one of: experimental, production, retired');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证 Skill 实现
   *
   * @param skill Skill 实例
   * @returns 验证结果
   */
  static validateSkill(skill: Skill): ValidationResult {
    const errors: string[] = [];

    // 验证元数据
    const metadataValidation = this.validateMetadata(skill.metadata);
    if (!metadataValidation.valid) {
      errors.push(...metadataValidation.errors.map(e => `metadata: ${e}`));
    }

    // 验证方法是否存在
    if (typeof skill.execute !== 'function') {
      errors.push('execute method is required');
    }

    if (typeof skill.validate !== 'function') {
      errors.push('validate method is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否通过验证 */
  valid: boolean;
  /** 错误信息列表 */
  errors: string[];
}
