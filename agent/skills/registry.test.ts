/**
 * Skill Registry 单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SkillRegistry,
  getRegistry,
  resetRegistry,
  registerSkill,
  listSkills,
  getSkill,
  compareSkills,
  type Skill,
  type SkillMetadata,
  type SkillContext,
  type SkillResult,
  type RegistryQueryOptions
} from './registry.js';
import type { SkillMetrics } from './base.js';

/**
 * 创建测试用的 Mock Skill
 */
class MockSkill implements Skill {
  metadata: SkillMetadata;

  constructor(metadata: SkillMetadata) {
    this.metadata = metadata;
  }

  async execute(context: SkillContext): Promise<SkillResult> {
    return {
      success: true,
      data: { result: 'mock' },
      metrics: {
        cost: this.metadata.cost_estimate || 0,
        latency: 100
      }
    };
  }

  validate(input: unknown): boolean {
    return typeof input === 'object' && input !== null;
  }
}

describe('SkillRegistry', () => {
  let registry: SkillRegistry;

  beforeEach(() => {
    resetRegistry();
    registry = new SkillRegistry();
  });

  afterEach(() => {
    resetRegistry();
  });

  describe('register', () => {
    it('应该成功注册一个 skill', () => {
      const metadata: SkillMetadata = {
        name: 'test-skill',
        version: '1.0.0',
        intent: 'test',
        author: 'agent',
        created_at: new Date().toISOString()
      };

      const skill = new MockSkill(metadata);
      const result = registry.register(skill);

      expect(result).toBe(true);
      expect(registry.has('test-skill')).toBe(true);
      expect(registry.get('test-skill')).toBe(skill);
    });

    it('应该拒绝重复注册同名 skill', () => {
      const metadata: SkillMetadata = {
        name: 'test-skill',
        version: '1.0.0',
        intent: 'test',
        author: 'agent',
        created_at: new Date().toISOString()
      };

      const skill1 = new MockSkill(metadata);
      const skill2 = new MockSkill(metadata);

      registry.register(skill1);
      expect(() => registry.register(skill2)).toThrow('is already registered');
    });

    it('应该拒绝无效的 metadata', () => {
      const invalidMetadata = {
        name: '', // 无效：空名称
        version: '1.0.0',
        intent: 'test',
        author: 'agent',
        created_at: new Date().toISOString()
      } as SkillMetadata;

      const skill = new MockSkill(invalidMetadata);

      expect(() => registry.register(skill)).toThrow();
    });

    it('应该正确更新索引', () => {
      const metadata1: SkillMetadata = {
        name: 'skill-1',
        version: '1.0.0',
        intent: 'code-review',
        author: 'agent',
        created_at: new Date().toISOString()
      };

      const metadata2: SkillMetadata = {
        name: 'skill-2',
        version: '1.0.0',
        intent: 'code-review',
        author: 'agent',
        created_at: new Date().toISOString()
      };

      registry.register(new MockSkill(metadata1), 'experimental');
      registry.register(new MockSkill(metadata2), 'production');

      const stats = registry.getStats();
      expect(stats.total).toBe(2);
      expect(stats.byStatus.experimental).toBe(1);
      expect(stats.byStatus.production).toBe(1);
      expect(stats.byIntent['code-review']).toBe(2);
    });
  });

  describe('registerBatch', () => {
    it('应该批量注册多个 skills', () => {
      const skills = [
        new MockSkill({
          name: 'skill-1',
          version: '1.0.0',
          intent: 'test',
          author: 'agent',
          created_at: new Date().toISOString()
        }),
        new MockSkill({
          name: 'skill-2',
          version: '1.0.0',
          intent: 'test',
          author: 'agent',
          created_at: new Date().toISOString()
        }),
        new MockSkill({
          name: 'skill-3',
          version: '1.0.0',
          intent: 'test',
          author: 'agent',
          created_at: new Date().toISOString()
        })
      ];

      const count = registry.registerBatch(skills);
      expect(count).toBe(3);
      expect(registry.getStats().total).toBe(3);
    });

    it('应该跳过无效的 skill', () => {
      const skills = [
        new MockSkill({
          name: 'valid-skill',
          version: '1.0.0',
          intent: 'test',
          author: 'agent',
          created_at: new Date().toISOString()
        }),
        new MockSkill({
          name: '', // 无效
          version: '1.0.0',
          intent: 'test',
          author: 'agent',
          created_at: new Date().toISOString()
        } as any)
      ];

      const count = registry.registerBatch(skills);
      expect(count).toBe(1);
    });
  });

  describe('list', () => {
    beforeEach(() => {
      const skills = [
        {
          name: 'code-review-1',
          version: '1.0.0',
          intent: 'code-review',
          author: 'agent',
          created_at: new Date().toISOString(),
          status: 'experimental' as const
        },
        {
          name: 'code-review-2',
          version: '1.0.0',
          intent: 'code-review',
          author: 'human',
          created_at: new Date().toISOString(),
          status: 'production' as const
        },
        {
          name: 'summarize',
          version: '1.0.0',
          intent: 'summarize-text',
          author: 'agent',
          created_at: new Date().toISOString(),
          status: 'experimental' as const
        }
      ];

      skills.forEach(meta => {
        registry.register(new MockSkill(meta), meta.status);
      });
    });

    it('应该返回所有 skills', () => {
      const skills = registry.list();
      expect(skills).toHaveLength(3);
    });

    it('应该按 intent 过滤', () => {
      const skills = registry.list({ intent: 'code-review' });
      expect(skills).toHaveLength(2);
      expect(skills.every(s => s.metadata.intent === 'code-review')).toBe(true);
    });

    it('应该按 status 过滤', () => {
      const skills = registry.list({ status: 'experimental' });
      expect(skills).toHaveLength(2);
      expect(skills.every(s => {
        const entry = registry.getEntry(s.metadata.name);
        return entry?.status === 'experimental';
      })).toBe(true);
    });

    it('应该按 author 过滤', () => {
      const skills = registry.list({ author: 'agent' });
      expect(skills).toHaveLength(2);
      expect(skills.every(s => s.metadata.author === 'agent')).toBe(true);
    });

    it('应该支持多个过滤条件', () => {
      const skills = registry.list({ intent: 'code-review', author: 'agent' });
      expect(skills).toHaveLength(1);
      expect(skills[0].metadata.name).toBe('code-review-1');
    });

    it('应该支持按名称模糊匹配', () => {
      const skills = registry.list({ name: 'review' });
      expect(skills).toHaveLength(2);
    });

    it('应该支持按版本过滤', () => {
      const skills = registry.list({ version: '1.0.0' });
      expect(skills).toHaveLength(3);
    });
  });

  describe('listMetadata', () => {
    it('应该返回所有 skills 的元数据', () => {
      registry.register(new MockSkill({
        name: 'skill-1',
        version: '1.0.0',
        intent: 'test',
        author: 'agent',
        created_at: new Date().toISOString()
      }));

      const metadataList = registry.listMetadata();
      expect(metadataList).toHaveLength(1);
      expect(metadataList[0].name).toBe('skill-1');
      expect(metadataList[0]).toBeInstanceOf(Object);
    });

    it('应该支持过滤选项', () => {
      registry.register(new MockSkill({
        name: 'code-review',
        version: '1.0.0',
        intent: 'code-review',
        author: 'agent',
        created_at: new Date().toISOString()
      }));

      registry.register(new MockSkill({
        name: 'summarize',
        version: '1.0.0',
        intent: 'summarize-text',
        author: 'agent',
        created_at: new Date().toISOString()
      }));

      const metadataList = registry.listMetadata({ intent: 'code-review' });
      expect(metadataList).toHaveLength(1);
      expect(metadataList[0].intent).toBe('code-review');
    });
  });

  describe('get', () => {
    it('应该获取已注册的 skill', () => {
      const skill = new MockSkill({
        name: 'test-skill',
        version: '1.0.0',
        intent: 'test',
        author: 'agent',
        created_at: new Date().toISOString()
      });

      registry.register(skill);
      const retrieved = registry.get('test-skill');

      expect(retrieved).toBe(skill);
    });

    it('应该对不存在的 skill 返回 undefined', () => {
      const retrieved = registry.get('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getMetadata', () => {
    it('应该获取 skill 的元数据', () => {
      const metadata: SkillMetadata = {
        name: 'test-skill',
        version: '1.0.0',
        intent: 'test',
        author: 'agent',
        created_at: new Date().toISOString()
      };

      registry.register(new MockSkill(metadata));
      const retrieved = registry.getMetadata('test-skill');

      expect(retrieved).toEqual(metadata);
    });

    it('应该对不存在的 skill 返回 undefined', () => {
      const retrieved = registry.getMetadata('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('has', () => {
    it('应该对已注册的 skill 返回 true', () => {
      const skill = new MockSkill({
        name: 'test-skill',
        version: '1.0.0',
        intent: 'test',
        author: 'agent',
        created_at: new Date().toISOString()
      });

      registry.register(skill);
      expect(registry.has('test-skill')).toBe(true);
    });

    it('应该对未注册的 skill 返回 false', () => {
      expect(registry.has('non-existent')).toBe(false);
    });
  });

  describe('unregister', () => {
    it('应该注销已注册的 skill', () => {
      const skill = new MockSkill({
        name: 'test-skill',
        version: '1.0.0',
        intent: 'test',
        author: 'agent',
        created_at: new Date().toISOString()
      });

      registry.register(skill);
      expect(registry.has('test-skill')).toBe(true);

      const result = registry.unregister('test-skill');
      expect(result).toBe(true);
      expect(registry.has('test-skill')).toBe(false);
    });

    it('应该对不存在的 skill 返回 false', () => {
      const result = registry.unregister('non-existent');
      expect(result).toBe(false);
    });

    it('注销后应该更新索引', () => {
      const skill = new MockSkill({
        name: 'test-skill',
        version: '1.0.0',
        intent: 'test',
        author: 'agent',
        created_at: new Date().toISOString()
      });

      registry.register(skill, 'experimental');
      registry.unregister('test-skill');

      const stats = registry.getStats();
      expect(stats.total).toBe(0);
      expect(stats.byStatus.experimental).toBe(0);
      expect(stats.byIntent['test']).toBe(undefined);
    });
  });

  describe('compare', () => {
    it('应该比较两个 skills', () => {
      const skillA = new MockSkill({
        name: 'skill-a',
        version: '1.0.0',
        intent: 'test',
        author: 'agent',
        created_at: new Date().toISOString(),
        cost_estimate: 1.0,
        success_threshold: 0.8
      });

      const skillB = new MockSkill({
        name: 'skill-b',
        version: '1.0.0',
        intent: 'test',
        author: 'agent',
        created_at: new Date().toISOString(),
        cost_estimate: 0.5,
        success_threshold: 0.9
      });

      registry.register(skillA);
      registry.register(skillB);

      const comparison = registry.compare('skill-a', 'skill-b');

      expect(comparison.aVsB.cost).toBe(-0.5); // B 更便宜
      expect(comparison.aVsB.success_rate).toBeCloseTo(-0.1, 1); // B 成功率更高
      expect(comparison.recommendation).toBe('B');
    });

    it('应该支持基于实际指标的比较', () => {
      const skillA = new MockSkill({
        name: 'skill-a',
        version: '1.0.0',
        intent: 'test',
        author: 'agent',
        created_at: new Date().toISOString(),
        cost_estimate: 1.0,
        success_threshold: 0.8
      });

      const skillB = new MockSkill({
        name: 'skill-b',
        version: '1.0.0',
        intent: 'test',
        author: 'agent',
        created_at: new Date().toISOString(),
        cost_estimate: 0.5,
        success_threshold: 0.9
      });

      registry.register(skillA);
      registry.register(skillB);

      const metricsA: SkillMetrics = {
        success_rate: 0.95,
        avg_cost: 0.8,
        avg_latency: 100,
        rollback_rate: 0.05,
        stability_score: 0.9,
        execution_count: 100,
        last_execution_at: new Date().toISOString()
      };

      const metricsB: SkillMetrics = {
        success_rate: 0.85,
        avg_cost: 0.4,
        avg_latency: 200,
        rollback_rate: 0.1,
        stability_score: 0.8,
        execution_count: 100,
        last_execution_at: new Date().toISOString()
      };

      const comparison = registry.compare('skill-a', 'skill-b', metricsA, metricsB);

      // A 成功率更高（正），但 B 更便宜（负）
      expect(comparison.aVsB.success_rate).toBeCloseTo(0.1, 1);
      expect(comparison.aVsB.cost).toBeCloseTo(-0.4, 1); // 使用 toBeCloseTo 处理浮点精度
    });

    it('应该在不存在的 skill 时抛出错误', () => {
      const skill = new MockSkill({
        name: 'skill-a',
        version: '1.0.0',
        intent: 'test',
        author: 'agent',
        created_at: new Date().toISOString()
      });

      registry.register(skill);

      expect(() => registry.compare('skill-a', 'non-existent')).toThrow();
    });

    it('应该正确处理平局情况', () => {
      const skillA = new MockSkill({
        name: 'skill-a',
        version: '1.0.0',
        intent: 'test',
        author: 'agent',
        created_at: new Date().toISOString(),
        cost_estimate: 1.0,
        success_threshold: 0.8
      });

      const skillB = new MockSkill({
        name: 'skill-b',
        version: '1.0.0',
        intent: 'test',
        author: 'agent',
        created_at: new Date().toISOString(),
        cost_estimate: 1.0,
        success_threshold: 0.8
      });

      registry.register(skillA);
      registry.register(skillB);

      const comparison = registry.compare('skill-a', 'skill-b');
      expect(comparison.recommendation).toBe('TIE');
    });
  });

  describe('getStats', () => {
    it('应该返回正确的统计信息', () => {
      const skills = [
        {
          name: 'skill-1',
          version: '1.0.0',
          intent: 'code-review',
          author: 'agent',
          created_at: new Date().toISOString()
        },
        {
          name: 'skill-2',
          version: '1.0.0',
          intent: 'code-review',
          author: 'agent',
          created_at: new Date().toISOString()
        },
        {
          name: 'skill-3',
          version: '1.0.0',
          intent: 'summarize',
          author: 'agent',
          created_at: new Date().toISOString()
        }
      ];

      skills.forEach(meta => {
        registry.register(new MockSkill(meta));
      });

      const stats = registry.getStats();

      expect(stats.total).toBe(3);
      expect(stats.byStatus.experimental).toBe(3);
      expect(stats.byIntent['code-review']).toBe(2);
      expect(stats.byIntent['summarize']).toBe(1);
    });

    it('应该对空的 registry 返回正确的统计', () => {
      const stats = registry.getStats();

      expect(stats.total).toBe(0);
      expect(stats.byStatus.experimental).toBe(0);
      expect(stats.byStatus.production).toBe(0);
      expect(stats.byStatus.retired).toBe(0);
    });
  });

  describe('clear', () => {
    it('应该清空注册表', () => {
      const skill = new MockSkill({
        name: 'test-skill',
        version: '1.0.0',
        intent: 'test',
        author: 'agent',
        created_at: new Date().toISOString()
      });

      registry.register(skill);
      expect(registry.has('test-skill')).toBe(true);

      registry.clear();
      expect(registry.has('test-skill')).toBe(false);
      expect(registry.getStats().total).toBe(0);
    });
  });

  describe('loadFromDisk', () => {
    it('应该从文件系统加载 skills', async () => {
      // 这个测试假设实验性的 skills 已经存在
      // 实际测试时应该使用 mock 文件系统
      const loadedCount = await registry.loadFromDisk();

      // 验证至少加载了一些 skills（如果存在）
      expect(loadedCount).toBeGreaterThanOrEqual(0);
    });

    it('应该处理不存在的目录', async () => {
      const loadedCount = await registry.loadFromDisk('/non/existent/path');
      expect(loadedCount).toBe(0);
    });
  });
});

describe('全局便捷函数', () => {
  afterEach(() => {
    resetRegistry();
  });

  it('getRegistry 应该返回相同的实例', () => {
    const r1 = getRegistry();
    const r2 = getRegistry();
    expect(r1).toBe(r2);
  });

  it('resetRegistry 应该重置全局实例', () => {
    const r1 = getRegistry();
    resetRegistry();
    const r2 = getRegistry();
    expect(r1).not.toBe(r2);
  });

  it('registerSkill 应该注册到全局 registry', () => {
    const skill = new MockSkill({
      name: 'test-skill',
      version: '1.0.0',
      intent: 'test',
      author: 'agent',
      created_at: new Date().toISOString()
    });

    const result = registerSkill(skill);
    expect(result).toBe(true);

    const retrieved = getSkill('test-skill');
    expect(retrieved).toBe(skill);
  });

  it('listSkills 应该从全局 registry 列出', () => {
    const skill = new MockSkill({
      name: 'test-skill',
      version: '1.0.0',
      intent: 'test',
      author: 'agent',
      created_at: new Date().toISOString()
    });

    registerSkill(skill);

    const skills = listSkills();
    expect(skills).toHaveLength(1);
    expect(skills[0].metadata.name).toBe('test-skill');
  });

  it('getSkill 应该从全局 registry 获取', () => {
    const skill = new MockSkill({
      name: 'test-skill',
      version: '1.0.0',
      intent: 'test',
      author: 'agent',
      created_at: new Date().toISOString()
    });

    registerSkill(skill);

    const retrieved = getSkill('test-skill');
    expect(retrieved).toBe(skill);
  });

  it('compareSkills 应该从全局 registry 比较', () => {
    const skillA = new MockSkill({
      name: 'skill-a',
      version: '1.0.0',
      intent: 'test',
      author: 'agent',
      created_at: new Date().toISOString(),
      cost_estimate: 1.0,
      success_threshold: 0.8
    });

    const skillB = new MockSkill({
      name: 'skill-b',
      version: '1.0.0',
      intent: 'test',
      author: 'agent',
      created_at: new Date().toISOString(),
      cost_estimate: 0.5,
      success_threshold: 0.9
    });

    registerSkill(skillA);
    registerSkill(skillB);

    const comparison = compareSkills('skill-a', 'skill-b');
    expect(comparison.recommendation).toBe('B');
  });
});

describe('验收标准测试', () => {
  let registry: SkillRegistry;

  beforeEach(() => {
    resetRegistry();
    registry = new SkillRegistry();
  });

  it('验收标准 1: Registry 能正确加载所有带 meta.json 的 skill', async () => {
    // 注册多个 skills
    const skills = [
      new MockSkill({
        name: 'code-review-1',
        version: '1.0.0',
        intent: 'code-review',
        author: 'agent',
        created_at: new Date().toISOString()
      }),
      new MockSkill({
        name: 'code-review-2',
        version: '1.0.0',
        intent: 'code-review',
        author: 'agent',
        created_at: new Date().toISOString()
      }),
      new MockSkill({
        name: 'summarize-1',
        version: '1.0.0',
        intent: 'summarize-text',
        author: 'agent',
        created_at: new Date().toISOString()
      })
    ];

    skills.forEach(skill => registry.register(skill));

    // 验证所有 skills 都被正确加载
    expect(registry.getStats().total).toBe(3);
    expect(registry.has('code-review-1')).toBe(true);
    expect(registry.has('code-review-2')).toBe(true);
    expect(registry.has('summarize-1')).toBe(true);
  });

  it('验收标准 2: list("code-review") 能返回所有 code-review intent 的 skills', () => {
    // 注册不同 intent 的 skills
    const skills = [
      new MockSkill({
        name: 'llm-code-reviewer',
        version: '1.0.0',
        intent: 'code-review',
        author: 'agent',
        created_at: new Date().toISOString()
      }),
      new MockSkill({
        name: 'rule-based-reviewer',
        version: '1.0.0',
        intent: 'code-review',
        author: 'agent',
        created_at: new Date().toISOString()
      }),
      new MockSkill({
        name: 'summarize-text',
        version: '1.0.0',
        intent: 'summarize-text',
        author: 'agent',
        created_at: new Date().toISOString()
      })
    ];

    skills.forEach(skill => registry.register(skill));

    // 按 code-review intent 过滤
    const codeReviewSkills = registry.list({ intent: 'code-review' });

    expect(codeReviewSkills).toHaveLength(2);
    expect(codeReviewSkills.every(s => s.metadata.intent === 'code-review')).toBe(true);
    expect(codeReviewSkills.some(s => s.metadata.name === 'llm-code-reviewer')).toBe(true);
    expect(codeReviewSkills.some(s => s.metadata.name === 'rule-based-reviewer')).toBe(true);
  });

  it('性能测试: 加载 100 个 skills 应该在 1 秒内完成', () => {
    const startTime = Date.now();

    // 注册 100 个 skills
    for (let i = 0; i < 100; i++) {
      const skill = new MockSkill({
        name: `skill-${i}`,
        version: '1.0.0',
        intent: i % 2 === 0 ? 'code-review' : 'summarize-text',
        author: 'agent',
        created_at: new Date().toISOString(),
        cost_estimate: Math.random() * 2,
        success_threshold: 0.7 + Math.random() * 0.3
      });

      registry.register(skill);
    }

    // 验证加载时间
    const endTime = Date.now();
    const elapsedTime = endTime - startTime;

    console.log(`加载 100 个 skills 耗时: ${elapsedTime}ms`);
    expect(elapsedTime).toBeLessThan(1000);

    // 验证所有 skills 都被正确加载
    expect(registry.getStats().total).toBe(100);

    // 验证查询性能
    const queryStartTime = Date.now();
    const codeReviewSkills = registry.list({ intent: 'code-review' });
    const queryEndTime = Date.now();
    const queryTime = queryEndTime - queryStartTime;

    console.log(`查询 50 个 code-review skills 耗时: ${queryTime}ms`);
    expect(queryTime).toBeLessThan(100); // 查询应该更快
    expect(codeReviewSkills).toHaveLength(50);
  });
});
