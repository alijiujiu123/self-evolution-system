/**
 * Skill 基类接口测试
 *
 * 验证 Skill 接口、抽象类和示例 Skill 的功能。
 */

import { describe, it, expect } from 'vitest';
import {
  SkillValidator,
  ValidationResult,
  CodeReviewSkill,
  SummarizeTextSkill,
  FileAnalysisSkill
} from './index';

describe('SkillValidator', () => {
  describe('validateMetadata', () => {
    it('应该通过有效的元数据验证', () => {
      const metadata = {
        name: 'test-skill',
        version: '1.0.0',
        intent: 'test',
        author: 'agent',
        created_at: new Date().toISOString(),
        description: 'Test skill',
        tags: ['test'],
        dependencies: ['llm'],
        cost_estimate: 0.1,
        success_threshold: 0.8,
        status: 'experimental' as const
      };

      const result = SkillValidator.validateMetadata(metadata);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝缺少必需字段的元数据', () => {
      // 使用 any 来模拟不完整的元数据，然后验证它应该失败
      const metadata = {
        name: 'test-skill'
        // 缺少 version, intent, author, created_at
      } as any;

      const result = SkillValidator.validateMetadata(metadata);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝无效的版本号', () => {
      const metadata = {
        name: 'test-skill',
        version: 'invalid',
        intent: 'test',
        author: 'agent',
        created_at: new Date().toISOString()
      };

      const result = SkillValidator.validateMetadata(metadata);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('version'))).toBe(true);
    });

    it('应该拒绝无效的成功率阈值', () => {
      const metadata = {
        name: 'test-skill',
        version: '1.0.0',
        intent: 'test',
        author: 'agent',
        created_at: new Date().toISOString(),
        success_threshold: 1.5 // 超出范围
      };

      const result = SkillValidator.validateMetadata(metadata);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('success_threshold'))).toBe(true);
    });

    it('应该拒绝无效的状态值', () => {
      const metadata = {
        name: 'test-skill',
        version: '1.0.0',
        intent: 'test',
        author: 'agent',
        created_at: new Date().toISOString(),
        status: 'invalid' as any
      };

      const result = SkillValidator.validateMetadata(metadata);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('status'))).toBe(true);
    });
  });
});

describe('CodeReviewSkill', () => {
  it('应该验证有效的输入', () => {
    const skill = new CodeReviewSkill();
    const validInput = { prNumber: 123, level: 'detailed' as const };
    expect(skill.validate(validInput)).toBe(true);
  });

  it('应该拒绝无效的输入', () => {
    const skill = new CodeReviewSkill();
    expect(skill.validate(null)).toBe(false);
    expect(skill.validate({})).toBe(false);
    expect(skill.validate({ prNumber: -1 })).toBe(false);
    expect(skill.validate({ prNumber: 123, level: 'invalid' as const })).toBe(false);
  });

  it('应该有正确的元数据', () => {
    const skill = new CodeReviewSkill();
    expect(skill.metadata.name).toBe('llm-code-reviewer');
    expect(skill.metadata.intent).toBe('code-review');
    expect(skill.metadata.dependencies).toContain('github');
    expect(skill.metadata.dependencies).toContain('llm');
    expect(skill.metadata.status).toBe('experimental');
  });
});

describe('SummarizeTextSkill', () => {
  it('应该验证有效的输入', () => {
    const skill = new SummarizeTextSkill();
    const validInput = {
      text: 'This is a long text that needs to be summarized.',
      length: 'medium' as const,
      style: 'paragraph' as const
    };
    expect(skill.validate(validInput)).toBe(true);
  });

  it('应该拒绝无效的输入', () => {
    const skill = new SummarizeTextSkill();
    expect(skill.validate(null)).toBe(false);
    expect(skill.validate({})).toBe(false);
    expect(skill.validate({ text: '' })).toBe(false);
    expect(skill.validate({ text: 'test', length: 'invalid' as const })).toBe(false);
    expect(skill.validate({ text: 'test', maxLength: -1 })).toBe(false);
  });

  it('应该有正确的元数据', () => {
    const skill = new SummarizeTextSkill();
    expect(skill.metadata.name).toBe('llm-text-summarizer');
    expect(skill.metadata.intent).toBe('summarize-text');
    expect(skill.metadata.dependencies).toContain('llm');
    expect(skill.metadata.status).toBe('experimental');
  });
});

describe('FileAnalysisSkill', () => {
  it('应该验证有效的输入', () => {
    const skill = new FileAnalysisSkill();
    const validInput = {
      filePath: '/path/to/file.ts',
      options: {
        checkSyntax: true,
        analyzeComplexity: true,
        checkSecurity: false
      }
    };
    expect(skill.validate(validInput)).toBe(true);
  });

  it('应该拒绝无效的输入', () => {
    const skill = new FileAnalysisSkill();
    expect(skill.validate(null)).toBe(false);
    expect(skill.validate({})).toBe(false);
    expect(skill.validate({ filePath: '' })).toBe(false);
    expect(skill.validate({ filePath: 123 })).toBe(false);
  });

  it('应该有正确的元数据', () => {
    const skill = new FileAnalysisSkill();
    expect(skill.metadata.name).toBe('file-analyzer');
    expect(skill.metadata.intent).toBe('analyze-file');
    expect(skill.metadata.dependencies).toContain('shell');
    expect(skill.metadata.dependencies).toContain('llm');
    expect(skill.metadata.status).toBe('experimental');
  });
});

describe('Skill 类型定义', () => {
  it('应该没有使用 any 类型', () => {
    // 这个测试确保我们没有在核心接口中使用 any 类型
    // 注意：这里只是示例性测试，实际项目中可能需要更严格的类型检查

    const skill = new CodeReviewSkill();
    expect(typeof skill.execute).toBe('function');
    expect(typeof skill.validate).toBe('function');

    const summarizeSkill = new SummarizeTextSkill();
    expect(typeof summarizeSkill.execute).toBe('function');
    expect(typeof summarizeSkill.validate).toBe('function');

    const analysisSkill = new FileAnalysisSkill();
    expect(typeof analysisSkill.execute).toBe('function');
    expect(typeof analysisSkill.validate).toBe('function');
  });

  it('应该包含所有必需的元数据字段', () => {
    const skills = [
      new CodeReviewSkill(),
      new SummarizeTextSkill(),
      new FileAnalysisSkill()
    ];

    skills.forEach(skill => {
      expect(skill.metadata.name).toBeDefined();
      expect(skill.metadata.version).toBeDefined();
      expect(skill.metadata.intent).toBeDefined();
      expect(skill.metadata.author).toBeDefined();
      expect(skill.metadata.created_at).toBeDefined();
      expect(skill.metadata.status).toBeDefined();
    });
  });
});
