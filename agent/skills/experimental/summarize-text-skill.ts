/**
 * 文本摘要 Skill
 *
 * 使用 LLM 对长文本生成摘要，提取关键信息。
 */

import {
  AbstractSkill,
  SkillMetadata,
  SkillContext,
  InternalSkillResult,
  ToolResult
} from '../base';

/**
 * 文本摘要输入
 */
interface SummarizeInput {
  /** 要摘要的文本 */
  text: string;
  /** 摘要长度：short | medium | long */
  length?: 'short' | 'medium' | 'long';
  /** 摘要风格：bullet | paragraph | key-points */
  style?: 'bullet' | 'paragraph' | 'key-points';
  /** 最大摘要长度（字符数） */
  maxLength?: number;
}

/**
 * 文本摘要结果
 */
interface SummarizeOutput {
  /** 原始文本长度 */
  originalLength: number;
  /** 摘要文本 */
  summary: string;
  /** 摘要长度 */
  summaryLength: number;
  /** 压缩比例 */
  compressionRatio: number;
  /** 关键词列表 */
  keywords: string[];
}

/**
 * 文本摘要 Skill
 */
export class SummarizeTextSkill extends AbstractSkill {
  metadata: SkillMetadata = {
    name: 'llm-text-summarizer',
    version: '1.0.0',
    intent: 'summarize-text',
    author: 'agent',
    created_at: new Date().toISOString(),
    description: '使用 LLM 对长文本生成摘要，提取关键信息',
    tags: ['llm', 'text', 'summarization', 'nlp'],
    dependencies: ['llm'],
    cost_estimate: 0.05,
    success_threshold: 0.85,
    status: 'experimental'
  };

  /**
   * 验证输入
   */
  validate(input: unknown): boolean {
    if (!super.validate(input)) {
      return false;
    }

    const typed = input as SummarizeInput;
    return (
      typeof typed.text === 'string' &&
      typed.text.length > 0 &&
      (typed.length === undefined || ['short', 'medium', 'long'].includes(typed.length)) &&
      (typed.style === undefined || ['bullet', 'paragraph', 'key-points'].includes(typed.style)) &&
      (typed.maxLength === undefined || (typeof typed.maxLength === 'number' && typed.maxLength > 0))
    );
  }

  /**
   * 执行文本摘要
   */
  protected async doExecute(context: SkillContext): Promise<InternalSkillResult> {
    const input = context.input as SummarizeInput;
    const length = input.length || 'medium';
    const style = input.style || 'paragraph';
    const maxLength = input.maxLength || this.getDefaultMaxLength(length);

    // 获取 LLM Tool
    const llmTool = this.getTool(context, 'llm');

    // 构建提示词
    const prompt = this.buildSummarizePrompt(input.text, length, style, maxLength);

    // 调用 LLM
    const result = await llmTool.execute({
      prompt,
      model: 'claude-haiku-4',
      maxTokens: Math.min(maxLength * 2, 2000),
      temperature: 0.5
    }) as ToolResult;

    if (!result.success || !result.data) {
      throw new Error(`Failed to summarize text: ${result.error?.message}`);
    }

    // 解析输出
    const summaryData = this.parseSummaryOutput(result.data as string, input.text);

    return {
      data: summaryData,
      cost: result.metrics?.cost || 0,
      tokens_used: result.metrics?.tokens_used
    };
  }

  /**
   * 获取默认最大长度
   */
  private getDefaultMaxLength(length: string): number {
    const defaults: Record<string, number> = {
      short: 200,
      medium: 500,
      long: 1000
    };
    return defaults[length] || 500;
  }

  /**
   * 构建摘要提示词
   */
  private buildSummarizePrompt(
    text: string,
    length: string,
    style: string,
    maxLength: number
  ): string {
    const lengthInstructions: Record<string, string> = {
      short: '简短摘要（约150-200字）',
      medium: '中等长度摘要（约400-500字）',
      long: '详细摘要（约800-1000字）'
    };

    const styleInstructions: Record<string, string> = {
      bullet: '使用项目符号列表（bullet points）',
      paragraph: '使用段落形式',
      'key-points': '提取关键要点，每行一个要点'
    };

    return `请对以下文本生成摘要。

要求：
1. ${lengthInstructions[length]}
2. ${styleInstructions[style]}
3. 最大长度不超过 ${maxLength} 字符
4. 提取并列出5-10个关键词

原文：
${text}

请以 JSON 格式返回，包含以下字段：
{
  "summary": "摘要文本",
  "keywords": ["关键词1", "关键词2", ...]
}`;
  }

  /**
   * 解析摘要输出
   */
  private parseSummaryOutput(output: string, originalText: string): SummarizeOutput {
    try {
      // 尝试提取 JSON 部分
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        return {
          originalLength: originalText.length,
          summary: parsed.summary || output.slice(0, 500),
          summaryLength: (parsed.summary || output).length,
          compressionRatio: originalText.length / (parsed.summary || output).length,
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords : []
        };
      }

      // 如果没有找到 JSON，返回基本结构
      return {
        originalLength: originalText.length,
        summary: output.slice(0, 500),
        summaryLength: Math.min(output.length, 500),
        compressionRatio: originalText.length / Math.min(output.length, 500),
        keywords: []
      };
    } catch (error) {
      throw new Error(`Failed to parse summary output: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
