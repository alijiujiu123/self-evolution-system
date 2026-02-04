/**
 * Skill 基础类型定义
 *
 * 定义了 Skill 系统的核心类型，包括 Skill 接口、元数据、上下文、结果等。
 */

/**
 * Skill 元数据接口
 */
export interface SkillMetadata {
  /** Skill 名称（唯一标识符） */
  name: string;
  /** 版本号（遵循语义化版本） */
  version: string;
  /** Intent（技能意图，用于路由和分类） */
  intent: string;
  /** 作者 */
  author: string;
  /** 创建时间（ISO 8601 格式） */
  created_at: string;
  /** 描述（可选） */
  description?: string;
  /** 标签数组（可选） */
  tags?: string[];
  /** 成本估算（元，可选） */
  cost_estimate?: number;
  /** 成功阈值（0-1，可选） */
  success_threshold?: number;
  /** 状态（可选，默认为 experimental） */
  status?: 'experimental' | 'production' | 'retired';
}

/**
 * Skill 执行上下文
 */
export interface SkillContext {
  /** 输入数据 */
  input: unknown;
  /** 用户 ID（可选） */
  userId?: string;
  /** 会话 ID（可选） */
  sessionId?: string;
  /** 额外的上下文数据（可选） */
  extra?: Record<string, unknown>;
}

/**
 * 执行指标
 */
export interface ExecutionMetrics {
  /** 执行成本（元） */
  cost: number;
  /** 执行延迟（毫秒） */
  latency: number;
  /** 使用的 token 数量（可选） */
  tokens_used?: number;
}

/**
 * Skill 执行结果
 */
export interface SkillResult {
  /** 是否成功 */
  success: boolean;
  /** 返回数据（可选） */
  data?: unknown;
  /** 错误信息（可选） */
  error?: Error;
  /** 执行指标（可选） */
  metrics?: ExecutionMetrics;
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
  /** 稳定性分数（方差倒数，0-1） */
  stability_score: number;
  /** 执行次数 */
  execution_count: number;
  /** 最后执行时间（ISO 8601 格式） */
  last_execution_at: string;
}

/**
 * Skill 接口
 *
 * 所有 Skill 必须实现此接口
 */
export interface Skill {
  /** Skill 元数据 */
  metadata: SkillMetadata;

  /** 执行 Skill */
  execute(context: SkillContext): Promise<SkillResult>;

  /** 验证输入 */
  validate(input: unknown): boolean;
}

/**
 * Skill 评分权重
 */
export interface ScoreWeights {
  /** 成功率权重 */
  success: number;
  /** 成本权重 */
  cost: number;
  /** 延迟权重 */
  latency: number;
  /** 回滚率权重 */
  rollback: number;
  /** 稳定性权重 */
  stability: number;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  /** 是否通过验证 */
  valid: boolean;
  /** 错误信息列表 */
  errors: string[];
  /** 警告信息列表 */
  warnings: string[];
}

/**
 * 配置阈值接口
 */
export interface Thresholds {
  /** 晋升阈值 */
  promote: {
    /** 最小评分 */
    min_score: number;
    /** 最小执行次数 */
    min_executions: number;
    /** 最小成功率 */
    min_success_rate: number;
  };
  /** 淘汰阈值 */
  retire: {
    /** 最大评分 */
    max_score: number;
    /** 最大执行次数 */
    max_executions: number;
    /** 最大回滚率 */
    max_rollback_rate: number;
  };
}

/**
 * Metrics 配置接口
 */
export interface MetricsConfig {
  /** 阈值配置 */
  thresholds: Thresholds;
  /** 权重配置 */
  weights: {
    /** 平衡型权重 */
    balanced: ScoreWeights;
    /** 激进型权重 */
    aggressive: ScoreWeights;
    /** 保守型权重 */
    conservative: ScoreWeights;
  };
}
