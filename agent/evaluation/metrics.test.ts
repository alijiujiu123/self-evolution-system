/**
 * Metrics 模块单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  MetricsCollector,
  MetricsScorer,
  loadConfig,
  saveConfig,
  getDefaultConfig,
  loadYamlConfig,
  saveYamlConfig,
  getCollector,
  getScorer,
  resetMetrics,
  type ExecutionRecord
} from './metrics.js';
import type { SkillMetrics } from '../skills/base.js';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    resetMetrics();
    collector = getCollector();
  });

  afterEach(() => {
    resetMetrics();
  });

  describe('recordExecution', () => {
    it('应该能够记录执行结果', () => {
      const record: ExecutionRecord = {
        success: true,
        cost: 1.0,
        latency: 100,
        rolled_back: false,
        timestamp: new Date().toISOString()
      };

      collector.recordExecution('test-skill', record);
      const records = collector.getRecords('test-skill');

      expect(records).toHaveLength(1);
      expect(records[0]).toEqual(record);
    });

    it('应该能够记录多次执行结果', () => {
      for (let i = 0; i < 5; i++) {
        collector.recordExecution('test-skill', {
          success: i < 4,
          cost: 1.0,
          latency: 100,
          rolled_back: i === 0,
          timestamp: new Date().toISOString()
        });
      }

      const records = collector.getRecords('test-skill');
      expect(records).toHaveLength(5);
    });
  });

  describe('calculateMetrics', () => {
    it('应该正确计算成功率', () => {
      for (let i = 0; i < 10; i++) {
        collector.recordExecution('test-skill', {
          success: i < 8,
          cost: 1.0,
          latency: 100,
          rolled_back: false,
          timestamp: new Date().toISOString()
        });
      }

      const metrics = collector.calculateMetrics('test-skill');
      expect(metrics.success_rate).toBe(0.8);
    });

    it('应该正确计算平均成本', () => {
      collector.recordExecution('test-skill', {
        success: true,
        cost: 1.0,
        latency: 100,
        rolled_back: false,
        timestamp: new Date().toISOString()
      });
      collector.recordExecution('test-skill', {
        success: true,
        cost: 2.0,
        latency: 100,
        rolled_back: false,
        timestamp: new Date().toISOString()
      });

      const metrics = collector.calculateMetrics('test-skill');
      expect(metrics.avg_cost).toBe(1.5);
    });

    it('应该正确计算平均延迟', () => {
      collector.recordExecution('test-skill', {
        success: true,
        cost: 1.0,
        latency: 100,
        rolled_back: false,
        timestamp: new Date().toISOString()
      });
      collector.recordExecution('test-skill', {
        success: true,
        cost: 1.0,
        latency: 200,
        rolled_back: false,
        timestamp: new Date().toISOString()
      });

      const metrics = collector.calculateMetrics('test-skill');
      expect(metrics.avg_latency).toBe(150);
    });

    it('应该正确计算回滚率', () => {
      for (let i = 0; i < 10; i++) {
        collector.recordExecution('test-skill', {
          success: true,
          cost: 1.0,
          latency: 100,
          rolled_back: i < 2,
          timestamp: new Date().toISOString()
        });
      }

      const metrics = collector.calculateMetrics('test-skill');
      expect(metrics.rollback_rate).toBe(0.2);
    });

    it('应该正确计算执行次数', () => {
      for (let i = 0; i < 5; i++) {
        collector.recordExecution('test-skill', {
          success: true,
          cost: 1.0,
          latency: 100,
          rolled_back: false,
          timestamp: new Date().toISOString()
        });
      }

      const metrics = collector.calculateMetrics('test-skill');
      expect(metrics.execution_count).toBe(5);
    });

    it('应该正确计算稳定性分数（完全稳定）', () => {
      for (let i = 0; i < 20; i++) {
        collector.recordExecution('test-skill', {
          success: true,
          cost: 1.0,
          latency: 100,
          rolled_back: false,
          timestamp: new Date().toISOString()
        });
      }

      const metrics = collector.calculateMetrics('test-skill');
      expect(metrics.stability_score).toBeGreaterThan(0.9);
    });

    it('应该正确计算稳定性分数（不稳定）', () => {
      const successPattern = [true, false, true, false, true, false, true, false, true, false];
      for (let i = 0; i < 20; i++) {
        collector.recordExecution('test-skill', {
          success: successPattern[i % 10],
          cost: 1.0,
          latency: 100,
          rolled_back: false,
          timestamp: new Date().toISOString()
        });
      }

      const metrics = collector.calculateMetrics('test-skill');
      expect(metrics.stability_score).toBeLessThan(0.9);
    });

    it('应该返回零值当没有执行记录时', () => {
      const metrics = collector.calculateMetrics('non-existent-skill');

      expect(metrics.success_rate).toBe(0);
      expect(metrics.avg_cost).toBe(0);
      expect(metrics.avg_latency).toBe(0);
      expect(metrics.rollback_rate).toBe(0);
      expect(metrics.stability_score).toBe(0);
      expect(metrics.execution_count).toBe(0);
    });
  });

  describe('clearRecords', () => {
    it('应该能够清空指定 Skill 的记录', () => {
      collector.recordExecution('test-skill', {
        success: true,
        cost: 1.0,
        latency: 100,
        rolled_back: false,
        timestamp: new Date().toISOString()
      });

      collector.clearRecords('test-skill');
      const records = collector.getRecords('test-skill');

      expect(records).toHaveLength(0);
    });
  });

  describe('clearAllRecords', () => {
    it('应该能够清空所有记录', () => {
      collector.recordExecution('skill-a', {
        success: true,
        cost: 1.0,
        latency: 100,
        rolled_back: false,
        timestamp: new Date().toISOString()
      });
      collector.recordExecution('skill-b', {
        success: true,
        cost: 1.0,
        latency: 100,
        rolled_back: false,
        timestamp: new Date().toISOString()
      });

      collector.clearAllRecords();

      expect(collector.getSkillNames()).toHaveLength(0);
    });
  });
});

describe('MetricsScorer', () => {
  let scorer: MetricsScorer;
  let config: ReturnType<typeof getDefaultConfig>;

  beforeEach(() => {
    resetMetrics();
    config = getDefaultConfig();
    scorer = getScorer(config);
  });

  afterEach(() => {
    resetMetrics();
  });

  describe('calculateScore', () => {
    it('应该正确计算综合评分', () => {
      const metrics: SkillMetrics = {
        success_rate: 0.9,
        avg_cost: 1.0,
        avg_latency: 100,
        rollback_rate: 0.05,
        stability_score: 0.95,
        execution_count: 100,
        last_execution_at: new Date().toISOString()
      };

      const weights = config.weights.balanced;
      const score = scorer.calculateScore(metrics, weights);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('应该使用平衡型权重计算评分', () => {
      const metrics: SkillMetrics = {
        success_rate: 0.8,
        avg_cost: 2.0,
        avg_latency: 500,
        rollback_rate: 0.1,
        stability_score: 0.8,
        execution_count: 50,
        last_execution_at: new Date().toISOString()
      };

      const weights = config.weights.balanced;
      const score = scorer.calculateScore(metrics, weights);

      // 平衡型权重：成功率 40%，成本 20%，延迟 15%，回滚 15%，稳定性 10%
      const expectedScore =
        0.8 * 0.4 +        // success_rate
        (1 - 2.0 / 10) * 0.2 +  // cost
        (1 - 500 / 10000) * 0.15 +  // latency
        (1 - 0.1) * 0.15 +   // rollback
        0.8 * 0.1;         // stability

      expect(score).toBeCloseTo(expectedScore, 5);
    });

    it('应该能够处理高成本指标', () => {
      const metrics: SkillMetrics = {
        success_rate: 0.9,
        avg_cost: 100.0,
        avg_latency: 100,
        rollback_rate: 0.05,
        stability_score: 0.95,
        execution_count: 100,
        last_execution_at: new Date().toISOString()
      };

      const weights = config.weights.balanced;
      const score = scorer.calculateScore(metrics, weights, 100, 10000);

      // 高成本应该降低评分
      expect(score).toBeLessThan(0.9);
    });
  });

  describe('canPromote', () => {
    it('应该返回 true 当满足晋升条件', () => {
      const metrics: SkillMetrics = {
        success_rate: 0.9,
        avg_cost: 1.0,
        avg_latency: 100,
        rollback_rate: 0.05,
        stability_score: 0.95,
        execution_count: 10,
        last_execution_at: new Date().toISOString()
      };

      const weights = config.weights.balanced;
      const canPromote = scorer.canPromote(metrics, weights);

      expect(canPromote).toBe(true);
    });

    it('应该返回 false 当评分低于阈值', () => {
      const metrics: SkillMetrics = {
        success_rate: 0.5,
        avg_cost: 5.0,
        avg_latency: 1000,
        rollback_rate: 0.2,
        stability_score: 0.5,
        execution_count: 10,
        last_execution_at: new Date().toISOString()
      };

      const weights = config.weights.balanced;
      const canPromote = scorer.canPromote(metrics, weights);

      expect(canPromote).toBe(false);
    });

    it('应该返回 false 当执行次数不足', () => {
      const metrics: SkillMetrics = {
        success_rate: 0.9,
        avg_cost: 1.0,
        avg_latency: 100,
        rollback_rate: 0.05,
        stability_score: 0.95,
        execution_count: 5,  // 低于 min_executions
        last_execution_at: new Date().toISOString()
      };

      const weights = config.weights.balanced;
      const canPromote = scorer.canPromote(metrics, weights);

      expect(canPromote).toBe(false);
    });

    it('应该返回 false 当成功率不足', () => {
      const metrics: SkillMetrics = {
        success_rate: 0.7,  // 低于 min_success_rate
        avg_cost: 1.0,
        avg_latency: 100,
        rollback_rate: 0.05,
        stability_score: 0.95,
        execution_count: 10,
        last_execution_at: new Date().toISOString()
      };

      const weights = config.weights.balanced;
      const canPromote = scorer.canPromote(metrics, weights);

      expect(canPromote).toBe(false);
    });
  });

  describe('shouldRetire', () => {
    it('应该返回 true 当满足淘汰条件', () => {
      const metrics: SkillMetrics = {
        success_rate: 0.3,
        avg_cost: 5.0,
        avg_latency: 2000,
        rollback_rate: 0.4,
        stability_score: 0.3,
        execution_count: 20,
        last_execution_at: new Date().toISOString()
      };

      const weights = config.weights.balanced;
      const shouldRetire = scorer.shouldRetire(metrics, weights);

      expect(shouldRetire).toBe(true);
    });

    it('应该返回 false 当评分高于阈值', () => {
      const metrics: SkillMetrics = {
        success_rate: 0.9,
        avg_cost: 1.0,
        avg_latency: 100,
        rollback_rate: 0.05,
        stability_score: 0.95,
        execution_count: 20,
        last_execution_at: new Date().toISOString()
      };

      const weights = config.weights.balanced;
      const shouldRetire = scorer.shouldRetire(metrics, weights);

      expect(shouldRetire).toBe(false);
    });

    it('应该返回 false 当执行次数不足', () => {
      const metrics: SkillMetrics = {
        success_rate: 0.3,
        avg_cost: 5.0,
        avg_latency: 2000,
        rollback_rate: 0.4,
        stability_score: 0.3,
        execution_count: 10,  // 低于 max_executions
        last_execution_at: new Date().toISOString()
      };

      const weights = config.weights.balanced;
      const shouldRetire = scorer.shouldRetire(metrics, weights);

      expect(shouldRetire).toBe(false);
    });
  });
});

describe('getDefaultConfig', () => {
  it('应该返回有效的默认配置', () => {
    const config = getDefaultConfig();

    expect(config).toBeDefined();
    expect(config.thresholds).toBeDefined();
    expect(config.weights).toBeDefined();
    expect(config.thresholds.promote.min_score).toBe(0.8);
    expect(config.weights.balanced).toBeDefined();
  });
});
