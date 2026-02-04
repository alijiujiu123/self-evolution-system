/**
 * Skill 评估指标模块
 *
 * 定义核心评估指标的计算公式和收集逻辑，支持数据驱动的晋升/淘汰决策。
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import type {
  SkillMetrics,
  ScoreWeights,
  MetricsConfig,
  Thresholds
} from '../skills/base.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 执行记录
 */
export interface ExecutionRecord {
  /** 执行结果 */
  success: boolean;
  /** 执行成本（元） */
  cost: number;
  /** 执行延迟（毫秒） */
  latency: number;
  /** 是否回滚 */
  rolled_back: boolean;
  /** 执行时间（ISO 8601 格式） */
  timestamp: string;
}

/**
 * 指标收集器
 *
 * 负责收集、存储和计算 Skill 的评估指标
 */
export class MetricsCollector {
  /** 存储 Skill 执行记录的 Map，key 为 skill name，value 为记录数组 */
  private records: Map<string, ExecutionRecord[]> = new Map();

  /**
   * 记录执行结果
   *
   * @param skillName Skill 名称
   * @param record 执行记录
   */
  recordExecution(skillName: string, record: ExecutionRecord): void {
    if (!this.records.has(skillName)) {
      this.records.set(skillName, []);
    }
    this.records.get(skillName)!.push(record);
  }

  /**
   * 获取 Skill 的所有执行记录
   *
   * @param skillName Skill 名称
   * @returns 执行记录数组
   */
  getRecords(skillName: string): ExecutionRecord[] {
    return this.records.get(skillName) || [];
  }

  /**
   * 计算指定 Skill 的指标
   *
   * @param skillName Skill 名称
   * @returns Skill 指标
   */
  calculateMetrics(skillName: string): SkillMetrics {
    const records = this.getRecords(skillName);

    if (records.length === 0) {
      return {
        success_rate: 0,
        avg_cost: 0,
        avg_latency: 0,
        rollback_rate: 0,
        stability_score: 0,
        execution_count: 0,
        last_execution_at: new Date().toISOString()
      };
    }

    // 计算执行次数
    const executionCount = records.length;

    // 计算成功率：成功次数 / 总执行次数
    const successCount = records.filter(r => r.success).length;
    const successRate = successCount / executionCount;

    // 计算平均成本：所有执行成本之和 / 执行次数
    const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
    const avgCost = totalCost / executionCount;

    // 计算平均延迟：所有执行延迟之和 / 执行次数
    const totalLatency = records.reduce((sum, r) => sum + r.latency, 0);
    const avgLatency = totalLatency / executionCount;

    // 计算回滚率：回滚次数 / 总执行次数
    const rollbackCount = records.filter(r => r.rolled_back).length;
    const rollbackRate = rollbackCount / executionCount;

    // 计算稳定性分数：成功率的方差倒数（归一化到 0-1）
    // 使用成功率的时间方差：越稳定，方差越小，分数越高
    const stabilityScore = this.calculateStabilityScore(records);

    // 获取最后执行时间
    const lastExecutionAt = records[records.length - 1].timestamp;

    return {
      success_rate: successRate,
      avg_cost: avgCost,
      avg_latency: avgLatency,
      rollback_rate: rollbackRate,
      stability_score: stabilityScore,
      execution_count: executionCount,
      last_execution_at: lastExecutionAt
    };
  }

  /**
   * 计算稳定性分数
   *
   * 计算公式：1 - (成功率标准差 / sqrt(样本数))
   *
   * @param records 执行记录数组
   * @returns 稳定性分数 (0-1)
   */
  private calculateStabilityScore(records: ExecutionRecord[]): number {
    if (records.length === 0) {
      return 0;
    }

    if (records.length === 1) {
      // 只有一条记录，假设完全稳定
      return 1;
    }

    // 计算成功率的移动平均（使用窗口大小）
    const windowSize = Math.min(10, records.length);
    const successRates: number[] = [];

    for (let i = windowSize - 1; i < records.length; i++) {
      const window = records.slice(i - windowSize + 1, i + 1);
      const successCount = window.filter(r => r.success).length;
      successRates.push(successCount / windowSize);
    }

    // 计算平均值
    const mean = successRates.reduce((sum, r) => sum + r, 0) / successRates.length;

    // 计算标准差
    const variance = successRates.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / successRates.length;
    const stdDev = Math.sqrt(variance);

    // 稳定性分数：1 - 标准差（归一化）
    const stabilityScore = Math.max(0, Math.min(1, 1 - stdDev));

    return stabilityScore;
  }

  /**
   * 清空指定 Skill 的记录
   *
   * @param skillName Skill 名称
   */
  clearRecords(skillName: string): void {
    this.records.delete(skillName);
  }

  /**
   * 清空所有记录
   */
  clearAllRecords(): void {
    this.records.clear();
  }

  /**
   * 获取所有 Skill 名称
   *
   * @returns Skill 名称数组
   */
  getSkillNames(): string[] {
    return Array.from(this.records.keys());
  }
}

/**
 * 指标评分器
 *
 * 根据权重配置计算综合评分
 */
export class MetricsScorer {
  private config: MetricsConfig;

  constructor(config: MetricsConfig) {
    this.config = config;
  }

  /**
   * 计算综合评分
   *
   * 计算公式：
   * score = success_rate * weights.success
   *       + (1 - avg_cost / MAX_COST) * weights.cost
   *       + (1 - avg_latency / MAX_LATENCY) * weights.latency
   *       + (1 - rollback_rate) * weights.rollback
   *       + stability_score * weights.stability
   *
   * @param metrics Skill 指标
   * @param weights 评分权重
   * @param maxCost 最大成本（用于归一化，默认 10 元）
   * @param maxLatency 最大延迟（用于归一化，默认 10000 毫秒）
   * @returns 综合评分 (0-1)
   */
  calculateScore(
    metrics: SkillMetrics,
    weights: ScoreWeights,
    maxCost: number = 10,
    maxLatency: number = 10000
  ): number {
    const score =
      metrics.success_rate * weights.success +
      Math.max(0, 1 - metrics.avg_cost / maxCost) * weights.cost +
      Math.max(0, 1 - metrics.avg_latency / maxLatency) * weights.latency +
      (1 - metrics.rollback_rate) * weights.rollback +
      metrics.stability_score * weights.stability;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * 判断是否可以晋升
   *
   * @param metrics Skill 指标
   * @param weights 评分权重
   * @returns 是否可以晋升
   */
  canPromote(metrics: SkillMetrics, weights: ScoreWeights): boolean {
    const score = this.calculateScore(metrics, weights);
    const thresholds = this.config.thresholds.promote;

    return (
      score >= thresholds.min_score &&
      metrics.execution_count >= thresholds.min_executions &&
      metrics.success_rate >= thresholds.min_success_rate
    );
  }

  /**
   * 判断是否应该淘汰
   *
   * @param metrics Skill 指标
   * @param weights 评分权重
   * @returns 是否应该淘汰
   */
  shouldRetire(metrics: SkillMetrics, weights: ScoreWeights): boolean {
    const score = this.calculateScore(metrics, weights);
    const thresholds = this.config.thresholds.retire;

    return (
      score <= thresholds.max_score &&
      metrics.execution_count >= thresholds.max_executions &&
      metrics.rollback_rate >= thresholds.max_rollback_rate
    );
  }

  /**
   * 更新配置
   *
   * @param config 新配置
   */
  updateConfig(config: MetricsConfig): void {
    this.config = config;
  }

  /**
   * 获取配置
   *
   * @returns 当前配置
   */
  getConfig(): MetricsConfig {
    return this.config;
  }
}

/**
 * 加载配置文件
 *
 * @param configPath 配置文件路径
 * @returns 配置对象
 */
export function loadConfig(configPath: string): MetricsConfig {
  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  const content = readFileSync(configPath, 'utf-8');
  const config = JSON.parse(content) as MetricsConfig;
  return config;
}

/**
 * 保存配置文件
 *
 * @param configPath 配置文件路径
 * @param config 配置对象
 */
export function saveConfig(configPath: string, config: MetricsConfig): void {
  const content = JSON.stringify(config, null, 2);
  writeFileSync(configPath, content, 'utf-8');
}

/**
 * 获取默认配置
 *
 * @returns 默认配置
 */
export function getDefaultConfig(): MetricsConfig {
  return {
    thresholds: {
      promote: {
        min_score: 0.8,
        min_executions: 10,
        min_success_rate: 0.85
      },
      retire: {
        max_score: 0.5,
        max_executions: 20,
        max_rollback_rate: 0.3
      }
    },
    weights: {
      balanced: {
        success: 0.4,
        cost: 0.2,
        latency: 0.15,
        rollback: 0.15,
        stability: 0.1
      },
      aggressive: {
        success: 0.6,
        cost: 0.1,
        latency: 0.1,
        rollback: 0.1,
        stability: 0.1
      },
      conservative: {
        success: 0.2,
        cost: 0.3,
        latency: 0.2,
        rollback: 0.2,
        stability: 0.1
      }
    }
  };
}

/**
 * 从 YAML 文件加载配置
 *
 * 注意：需要安装 js-yaml 依赖
 *
 * @param yamlPath YAML 文件路径
 * @returns 配置对象
 */
export async function loadYamlConfig(yamlPath: string): Promise<MetricsConfig> {
  if (!existsSync(yamlPath)) {
    throw new Error(`YAML config file not found: ${yamlPath}`);
  }

  try {
    // 尝试动态导入 js-yaml
    const yaml = await import('js-yaml');
    const content = readFileSync(yamlPath, 'utf-8');
    const config = yaml.load(content) as MetricsConfig;
    return config;
  } catch (error) {
    throw new Error(`Failed to load YAML config: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 保存配置到 YAML 文件
 *
 * 注意：需要安装 js-yaml 依赖
 *
 * @param yamlPath YAML 文件路径
 * @param config 配置对象
 */
export async function saveYamlConfig(yamlPath: string, config: MetricsConfig): Promise<void> {
  try {
    // 尝试动态导入 js-yaml
    const yaml = await import('js-yaml');
    const content = yaml.dump(config, { indent: 2 });
    writeFileSync(yamlPath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to save YAML config: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 全局单例实例
 */
let globalCollector: MetricsCollector | null = null;
let globalScorer: MetricsScorer | null = null;

/**
 * 获取全局 MetricsCollector 实例
 *
 * @returns MetricsCollector 实例
 */
export function getCollector(): MetricsCollector {
  if (!globalCollector) {
    globalCollector = new MetricsCollector();
  }
  return globalCollector;
}

/**
 * 获取全局 MetricsScorer 实例
 *
 * @param config 配置对象（可选）
 * @returns MetricsScorer 实例
 */
export function getScorer(config?: MetricsConfig): MetricsScorer {
  if (!globalScorer) {
    const cfg = config || getDefaultConfig();
    globalScorer = new MetricsScorer(cfg);
  }
  return globalScorer;
}

/**
 * 重置全局单例（主要用于测试）
 */
export function resetMetrics(): void {
  globalCollector = null;
  globalScorer = null;
}
