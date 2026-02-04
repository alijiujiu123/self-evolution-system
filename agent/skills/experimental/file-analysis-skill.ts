/**
 * 文件分析 Skill
 *
 * 分析文件内容，识别文件类型、统计信息、潜在问题等。
 */

import {
  AbstractSkill,
  SkillMetadata,
  SkillContext,
  InternalSkillResult,
  ToolResult
} from '../base';

/**
 * 文件分析输入
 */
interface FileAnalysisInput {
  /** 文件路径 */
  filePath: string;
  /** 分析选项 */
  options?: {
    /** 是否进行语法检查 */
    checkSyntax?: boolean;
    /** 是否分析代码复杂度 */
    analyzeComplexity?: boolean;
    /** 是否检查安全问题 */
    checkSecurity?: boolean;
  };
}

/**
 * 文件信息
 */
interface FileInfo {
  /** 文件路径 */
  path: string;
  /** 文件大小（字节） */
  size: number;
  /** 文件类型 */
  type: string;
  /** 语言（如果是代码文件） */
  language?: string;
  /** 编码 */
  encoding?: string;
  /** 最后修改时间 */
  lastModified: string;
}

/**
 * 代码复杂度指标
 */
interface ComplexityMetrics {
  /** 圈复杂度 */
  cyclomaticComplexity: number;
  /** 函数数量 */
  functionCount: number;
  /** 最大函数长度 */
  maxFunctionLength: number;
  /** 平均函数长度 */
  avgFunctionLength: number;
}

/**
 * 安全问题
 */
interface SecurityIssue {
  /** 严重程度 */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** 问题类型 */
  type: string;
  /** 位置 */
  location: string;
  /** 描述 */
  description: string;
}

/**
 * 文件分析结果
 */
interface FileAnalysisOutput {
  /** 文件信息 */
  info: FileInfo;
  /** 内容摘要（前500字符） */
  contentPreview: string;
  /** 代码复杂度（如果是代码文件） */
  complexity?: ComplexityMetrics;
  /** 发现的安全问题 */
  securityIssues: SecurityIssue[];
  /** 其他指标 */
  metrics: {
    /** 行数 */
    lines: number;
    /** 空行数 */
    emptyLines: number;
    /** 代码行数 */
    codeLines: number;
    /** 注释行数 */
    commentLines: number;
  };
}

/**
 * 文件分析 Skill
 */
export class FileAnalysisSkill extends AbstractSkill {
  metadata: SkillMetadata = {
    name: 'file-analyzer',
    version: '1.0.0',
    intent: 'analyze-file',
    author: 'agent',
    created_at: new Date().toISOString(),
    description: '分析文件内容，识别文件类型、统计信息、潜在问题等',
    tags: ['file', 'analysis', 'code', 'security'],
    dependencies: ['shell', 'llm'],
    cost_estimate: 0.02,
    success_threshold: 0.9,
    status: 'experimental'
  };

  /**
   * 验证输入
   */
  validate(input: unknown): boolean {
    if (!super.validate(input)) {
      return false;
    }

    const typed = input as FileAnalysisInput;
    return (
      typeof typed.filePath === 'string' &&
      typed.filePath.length > 0 &&
      (typed.options === undefined || typeof typed.options === 'object')
    );
  }

  /**
   * 执行文件分析
   */
  protected async doExecute(context: SkillContext): Promise<InternalSkillResult> {
    const input = context.input as FileAnalysisInput;
    const options = input.options || {};

    // 1. 获取 Shell Tool 读取文件
    const shellTool = this.getTool(context, 'shell');

    // 2. 获取文件信息
    const fileInfoResult = await shellTool.execute({
      command: `stat -c "%s %Y" "${input.filePath}"`
    }) as ToolResult;

    if (!fileInfoResult.success) {
      throw new Error(`Failed to get file info: ${fileInfoResult.error?.message}`);
    }

    const fileStats = this.parseFileStats(fileInfoResult.data as string, input.filePath);

    // 3. 读取文件内容
    const fileContentResult = await shellTool.execute({
      command: `head -c 2000 "${input.filePath}"`
    }) as ToolResult;

    if (!fileContentResult.success) {
      throw new Error(`Failed to read file content: ${fileContentResult.error?.message}`);
    }

    const content = fileContentResult.data as string;

    // 4. 分析文件类型和语言
    const fileType = this.detectFileType(input.filePath, content);

    // 5. 计算基本指标
    const metrics = this.calculateMetrics(content);

    // 6. 如果是代码文件，进行深度分析
    let complexity: ComplexityMetrics | undefined;
    let securityIssues: SecurityIssue[] = [];

    if (fileType.language && options.checkSyntax) {
      const codeAnalysis = await this.analyzeCode(content, fileType.language, context);
      complexity = codeAnalysis.complexity;
      securityIssues = codeAnalysis.securityIssues;
    }

    const shellCost = (fileInfoResult.metrics?.cost || 0) + (fileContentResult.metrics?.cost || 0);

    return {
      data: {
        info: fileStats,
        contentPreview: content.slice(0, 500),
        complexity,
        securityIssues,
        metrics
      },
      cost: shellCost,
      tokens_used: 0
    };
  }

  /**
   * 解析文件统计信息
   */
  private parseFileStats(output: string, filePath: string): FileInfo {
    try {
      const parts = output.trim().split(/\s+/);
      const size = parseInt(parts[0], 10);
      const timestamp = parseInt(parts[1], 10) * 1000; // 转换为毫秒

      return {
        path: filePath,
        size,
        type: 'file',
        lastModified: new Date(timestamp).toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to parse file stats: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 检测文件类型和语言
   */
  private detectFileType(filePath: string, content: string): { type: string; language?: string } {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const extToLanguage: Record<string, string> = {
      'ts': 'typescript',
      'js': 'javascript',
      'py': 'python',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'c': 'c',
      'cpp': 'cpp',
      'h': 'c',
      'hpp': 'cpp',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'sh': 'shell',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'md': 'markdown',
      'sql': 'sql'
    };

    const language = ext && extToLanguage[ext];

    if (language) {
      return { type: 'code', language };
    }

    return { type: 'text' };
  }

  /**
   * 计算基本指标
   */
  private calculateMetrics(content: string): FileAnalysisOutput['metrics'] {
    const lines = content.split('\n');

    const emptyLines = lines.filter(line => line.trim() === '').length;

    // 简单判断：以 // 或 # 开头的行是注释
    const commentLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*');
    }).length;

    return {
      lines: lines.length,
      emptyLines,
      codeLines: lines.length - emptyLines - commentLines,
      commentLines
    };
  }

  /**
   * 分析代码
   */
  private async analyzeCode(
    code: string,
    language: string,
    context: SkillContext
  ): Promise<{ complexity: ComplexityMetrics; securityIssues: SecurityIssue[] }> {
    // 这里简化处理，实际应该使用 LLM 进行深度分析
    const llmTool = this.getTool(context, 'llm');

    const prompt = `分析以下 ${language} 代码的复杂度和安全问题。

代码：
\`\`\`${language}
${code.slice(0, 3000)}
\`\`\`

请以 JSON 格式返回：
{
  "complexity": {
    "cyclomaticComplexity": 数字,
    "functionCount": 数字,
    "maxFunctionLength": 数字,
    "avgFunctionLength": 数字
  },
  "securityIssues": [
    {
      "severity": "low|medium|high|critical",
      "type": "问题类型",
      "location": "位置描述",
      "description": "问题描述"
    }
  ]
}`;

    const result = await llmTool.execute({
      prompt,
      model: 'claude-haiku-4',
      maxTokens: 1000,
      temperature: 0.3
    }) as ToolResult;

    if (!result.success || !result.data) {
      // 返回默认值
      return {
        complexity: {
          cyclomaticComplexity: 1,
          functionCount: 1,
          maxFunctionLength: code.length,
          avgFunctionLength: code.length
        },
        securityIssues: []
      };
    }

    try {
      const jsonMatch = (result.data as string).match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      // 忽略解析错误，返回默认值
    }

    return {
      complexity: {
        cyclomaticComplexity: 1,
        functionCount: 1,
        maxFunctionLength: code.length,
        avgFunctionLength: code.length
      },
      securityIssues: []
    };
  }
}
