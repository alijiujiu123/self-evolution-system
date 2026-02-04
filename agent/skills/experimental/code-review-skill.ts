/**
 * 代码审查 Skill
 *
 * 使用 LLM 对代码变更进行审查，提供改进建议。
 */

import {
  AbstractSkill,
  SkillMetadata,
  SkillContext,
  InternalSkillResult,
  ToolResult
} from '../base';

/**
 * 代码审查输入
 */
interface CodeReviewInput {
  /** PR 编号 */
  prNumber: number;
  /** 审查级别：basic | detailed | strict */
  level?: 'basic' | 'detailed' | 'strict';
}

/**
 * 代码审查结果
 */
interface CodeReviewOutput {
  /** 审查摘要 */
  summary: string;
  /** 发现的问题列表 */
  issues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    file: string;
    line: number;
    description: string;
    suggestion?: string;
  }>;
  /** 总体评分（0-100） */
  score: number;
}

/**
 * 代码审查 Skill
 */
export class CodeReviewSkill extends AbstractSkill {
  metadata: SkillMetadata = {
    name: 'llm-code-reviewer',
    version: '1.0.0',
    intent: 'code-review',
    author: 'agent',
    created_at: new Date().toISOString(),
    description: '使用 LLM 对 GitHub PR 进行代码审查，提供改进建议',
    tags: ['llm', 'code', 'review', 'quality', 'github'],
    dependencies: ['github', 'llm'],
    cost_estimate: 0.5,
    success_threshold: 0.8,
    status: 'experimental'
  };

  /**
   * 验证输入
   */
  validate(input: unknown): boolean {
    if (!super.validate(input)) {
      return false;
    }

    const typed = input as CodeReviewInput;
    return (
      typeof typed.prNumber === 'number' &&
      typed.prNumber > 0 &&
      (typed.level === undefined || ['basic', 'detailed', 'strict'].includes(typed.level))
    );
  }

  /**
   * 执行代码审查
   */
  protected async doExecute(context: SkillContext): Promise<InternalSkillResult> {
    const input = context.input as CodeReviewInput;
    const level = input.level || 'detailed';

    // 1. 获取 GitHub Tool
    const githubTool = this.getTool(context, 'github');

    // 2. 获取 PR diff
    const diffResult = await githubTool.execute({
      action: 'get-pr-diff',
      prNumber: input.prNumber
    }) as ToolResult;

    if (!diffResult.success || !diffResult.data) {
      throw new Error(`Failed to get PR diff: ${diffResult.error?.message}`);
    }

    const diff = diffResult.data as string;
    const diffCost = diffResult.metrics?.cost || 0;

    // 3. 使用 LLM 分析代码
    const llmTool = this.getTool(context, 'llm');

    const prompt = this.buildReviewPrompt(diff, level);

    const llmResult = await llmTool.execute({
      prompt,
      model: 'claude-sonnet-4',
      maxTokens: 4000,
      temperature: 0.3
    }) as ToolResult;

    if (!llmResult.success || !llmResult.data) {
      throw new Error(`Failed to review code: ${llmResult.error?.message}`);
    }

    const reviewData = this.parseReviewOutput(llmResult.data as string);
    const llmCost = llmResult.metrics?.cost || 0;

    return {
      data: reviewData,
      cost: diffCost + llmCost,
      tokens_used: llmResult.metrics?.tokens_used
    };
  }

  /**
   * 构建审查提示词
   */
  private buildReviewPrompt(diff: string, level: string): string {
    const levelInstructions: Record<string, string> = {
      basic: '只检查语法错误和明显的逻辑问题',
      detailed: '检查代码质量、可维护性、潜在bug、性能问题、安全漏洞',
      strict: '详细检查所有代码问题，包括最佳实践、设计模式、命名规范、文档完整性'
    };

    return `请审查以下代码变更。

审查级别：${level}
${levelInstructions[level]}

代码差异：
\`\`\`diff
${diff}
\`\`\`

请以 JSON 格式返回审查结果，包含以下字段：
{
  "summary": "审查摘要（1-2句话）",
  "issues": [
    {
      "severity": "low|medium|high|critical",
      "file": "文件路径",
      "line": 行号,
      "description": "问题描述",
      "suggestion": "改进建议（可选）"
    }
  ],
  "score": 总体评分（0-100整数）
}`;
  }

  /**
   * 解析 LLM 输出
   */
  private parseReviewOutput(output: string): CodeReviewOutput {
    try {
      // 尝试提取 JSON 部分
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // 如果没有找到 JSON，返回基本结构
      return {
        summary: output.slice(0, 200),
        issues: [],
        score: 70
      };
    } catch (error) {
      throw new Error(`Failed to parse review output: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
