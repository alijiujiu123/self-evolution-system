/**
 * Skill Registry
 *
 * Skill 注册表，负责管理、查询和比较 Skills。
 * 支持动态加载、查询和从文件系统自动发现 Skills。
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

import type {
  Skill,
  SkillMetadata,
  SkillMetrics,
  ValidationResult
} from './base.js';
import { validateMetaData } from './validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Skill 注册表查询选项
 */
export interface RegistryQueryOptions {
  /** 按 intent 过滤 */
  intent?: string;
  /** 按状态过滤 */
  status?: 'experimental' | 'production' | 'retired';
  /** 按作者过滤 */
  author?: string;
  /** 按标签过滤（匹配任一标签） */
  tag?: string;
  /** 按名称过滤（模糊匹配） */
  name?: string;
  /** 按版本过滤 */
  version?: string;
}

/**
 * Skill 注册项
 */
export interface SkillEntry {
  /** Skill 实例 */
  skill: Skill;
  /** Skill 元数据 */
  metadata: SkillMetadata;
  /** Skill 目录路径 */
  path: string;
  /** Skill 状态：experimental | production | retired */
  status: 'experimental' | 'production' | 'retired';
}

/**
 * Skill 比较结果
 */
export interface SkillComparison {
  /** skill A 相对于 skill B 的优势 */
  aVsB: {
    /** cost: A 成本更低为正，否则为负 */
    cost: number;
    /** latency: A 延迟更低为正，否则为负 */
    latency: number;
    /** success_rate: A 成功率更高为正，否则为负 */
    success_rate: number;
  };
  /** 综合评分（A 相对于 B） */
  overallScore: number;
  /** 推荐结果 */
  recommendation: 'A' | 'B' | 'TIE';
}

/**
 * Skill 注册表类
 */
export class SkillRegistry {
  /** 存储 skills 的 Map，key 为 skill name */
  private skills: Map<string, SkillEntry> = new Map();
  /** 存储按 intent 索引的 skills */
  private intentIndex: Map<string, Set<string>> = new Map();
  /** 存储按状态索引的 skills */
  private statusIndex: Map<'experimental' | 'production' | 'retired', Set<string>> = new Map();

  /**
   * 注册 Skill
   *
   * @param skill Skill 实例
   * @param status Skill 状态，默认为 'experimental'
   * @param path Skill 目录路径，可选
   * @returns 是否成功注册
   */
  register(skill: Skill, status: 'experimental' | 'production' | 'retired' = 'experimental', path?: string): boolean {
    // 验证 skill 元数据
    const validation = validateMetaData(skill.metadata);
    if (!validation.valid) {
      throw new Error(`Invalid skill metadata: ${validation.errors.join(', ')}`);
    }

    const { name, intent } = skill.metadata;

    // 检查是否已存在同名 skill
    if (this.skills.has(name)) {
      throw new Error(`Skill "${name}" is already registered`);
    }

    // 创建 entry
    const entry: SkillEntry = {
      skill,
      metadata: skill.metadata,
      path: path || '',
      status
    };

    // 存储到主表
    this.skills.set(name, entry);

    // 更新 intent 索引
    if (!this.intentIndex.has(intent)) {
      this.intentIndex.set(intent, new Set());
    }
    this.intentIndex.get(intent)!.add(name);

    // 更新 status 索引
    if (!this.statusIndex.has(status)) {
      this.statusIndex.set(status, new Set());
    }
    this.statusIndex.get(status)!.add(name);

    return true;
  }

  /**
   * 批量注册 Skills
   *
   * @param skills Skill 实例数组
   * @param status Skill 状态，默认为 'experimental'
   * @returns 成功注册的数量
   */
  registerBatch(skills: Skill[], status: 'experimental' | 'production' | 'retired' = 'experimental'): number {
    let count = 0;
    for (const skill of skills) {
      try {
        this.register(skill, status);
        count++;
      } catch (error) {
        console.error(`Failed to register skill "${skill.metadata.name}":`, error);
      }
    }
    return count;
  }

  /**
   * 列出 Skills
   *
   * @param options 查询选项
   * @returns Skill 实例数组
   */
  list(options?: RegistryQueryOptions): Skill[] {
    let results: Skill[] = [];

    if (!options) {
      // 返回所有 skills
      results = Array.from(this.skills.values()).map(entry => entry.skill);
    } else {
      // 应用过滤条件
      results = Array.from(this.skills.values())
        .filter(entry => this.matchesQuery(entry, options))
        .map(entry => entry.skill);
    }

    return results;
  }

  /**
   * 列出 Skill 元数据
   *
   * @param options 查询选项
   * @returns Skill 元数据数组
   */
  listMetadata(options?: RegistryQueryOptions): SkillMetadata[] {
    let results: SkillMetadata[] = [];

    if (!options) {
      results = Array.from(this.skills.values()).map(entry => entry.metadata);
    } else {
      results = Array.from(this.skills.values())
        .filter(entry => this.matchesQuery(entry, options))
        .map(entry => entry.metadata);
    }

    return results;
  }

  /**
   * 获取指定名称的 Skill
   *
   * @param name Skill 名称
   * @returns Skill 实例，如果不存在则返回 undefined
   */
  get(name: string): Skill | undefined {
    const entry = this.skills.get(name);
    return entry?.skill;
  }

  /**
   * 获取指定名称的 Skill 元数据
   *
   * @param name Skill 名称
   * @returns Skill 元数据，如果不存在则返回 undefined
   */
  getMetadata(name: string): SkillMetadata | undefined {
    const entry = this.skills.get(name);
    return entry?.metadata;
  }

  /**
   * 获取指定名称的 Skill Entry
   *
   * @param name Skill 名称
   * @returns Skill Entry，如果不存在则返回 undefined
   */
  getEntry(name: string): SkillEntry | undefined {
    return this.skills.get(name);
  }

  /**
   * 检查 Skill 是否存在
   *
   * @param name Skill 名称
   * @returns 是否存在
   */
  has(name: string): boolean {
    return this.skills.has(name);
  }

  /**
   * 注销 Skill
   *
   * @param name Skill 名称
   * @returns 是否成功注销
   */
  unregister(name: string): boolean {
    const entry = this.skills.get(name);
    if (!entry) {
      return false;
    }

    // 从索引中移除
    const { intent, status } = entry.metadata;
    const intentSet = this.intentIndex.get(intent);
    if (intentSet) {
      intentSet.delete(name);
    }

    const statusSet = this.statusIndex.get(status || 'experimental');
    if (statusSet) {
      statusSet.delete(name);
    }

    // 从主表中移除
    return this.skills.delete(name);
  }

  /**
   * 比较 两个 Skills
   *
   * @param nameA 第一个 Skill 的名称
   * @param nameB 第二个 Skill 的名称
   * @param metricsA Skill A 的指标（可选，用于比较）
   * @param metricsB Skill B 的指标（可选，用于比较）
   * @returns 比较结果
   */
  compare(nameA: string, nameB: string, metricsA?: SkillMetrics, metricsB?: SkillMetrics): SkillComparison {
    const entryA = this.skills.get(nameA);
    const entryB = this.skills.get(nameB);

    if (!entryA) {
      throw new Error(`Skill "${nameA}" not found`);
    }
    if (!entryB) {
      throw new Error(`Skill "${nameB}" not found`);
    }

    // 比较元数据
    const costA = entryA.metadata.cost_estimate || 0;
    const costB = entryB.metadata.cost_estimate || 0;

    const thresholdA = entryA.metadata.success_threshold || 0.8;
    const thresholdB = entryB.metadata.success_threshold || 0.8;

    // 如果提供了实际指标，使用实际指标比较
    let successRateA = thresholdA;
    let successRateB = thresholdB;
    let latencyA = 0;
    let latencyB = 0;
    let avgCostA = costA;
    let avgCostB = costB;

    if (metricsA) {
      successRateA = metricsA.success_rate;
      latencyA = metricsA.avg_latency;
      avgCostA = metricsA.avg_cost;
    }

    if (metricsB) {
      successRateB = metricsB.success_rate;
      latencyB = metricsB.avg_latency;
      avgCostB = metricsB.avg_cost;
    }

    // 计算差值
    const costDiff = avgCostB - avgCostA; // 正数表示 A 更便宜
    const latencyDiff = latencyB - latencyA; // 正数表示 A 更快
    const successRateDiff = successRateA - successRateB; // 正数表示 A 成功率更高

    // 归一化到 [-1, 1] 范围
    const normalizedCost = costDiff / (avgCostA + avgCostB + 0.001) * 2; // *2 放大差异
    const normalizedLatency = latencyDiff / (latencyA + latencyB + 1) * 2;
    const normalizedSuccessRate = successRateDiff * 2; // 已经在 [0,1] 范围

    // 计算综合评分（权重：成功率 40%，成本 30%，延迟 30%）
    const overallScore =
      normalizedSuccessRate * 0.4 +
      normalizedCost * 0.3 +
      normalizedLatency * 0.3;

    // 推荐结果
    let recommendation: 'A' | 'B' | 'TIE' = 'TIE';
    if (overallScore > 0.1) {
      recommendation = 'A';
    } else if (overallScore < -0.1) {
      recommendation = 'B';
    }

    return {
      aVsB: {
        cost: costDiff,
        latency: latencyDiff,
        success_rate: successRateDiff
      },
      overallScore,
      recommendation
    };
  }

  /**
   * 获取统计信息
   *
   * @returns 注册表统计
   */
  getStats(): {
    total: number;
    byStatus: Record<'experimental' | 'production' | 'retired', number>;
    byIntent: Record<string, number>;
  } {
    const byStatus: Record<'experimental' | 'production' | 'retired', number> = {
      experimental: 0,
      production: 0,
      retired: 0
    };
    const byIntent: Record<string, number> = {};

    for (const entry of this.skills.values()) {
      byStatus[entry.status]++;
      byIntent[entry.metadata.intent] = (byIntent[entry.metadata.intent] || 0) + 1;
    }

    return {
      total: this.skills.size,
      byStatus,
      byIntent
    };
  }

  /**
   * 从文件系统自动发现并加载 Skills
   *
   * @param rootPath 根路径（默认为 agent/skills）
   * @param reload 是否重新加载（默认为 false）
   * @returns 加载的 Skills 数量
   */
  async loadFromDisk(rootPath: string = join(__dirname)): Promise<number> {
    let loadedCount = 0;

    // 扫描 experimental、production、retired 目录
    const subdirs = ['experimental', 'production', 'retired'];

    for (const subdir of subdirs) {
      const dirPath = join(rootPath, subdir);
      if (!existsSync(dirPath)) {
        continue;
      }

      // 读取目录内容
      const entries = readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const skillPath = join(dirPath, entry.name);
        const metaJsonPath = join(skillPath, `${entry.name}.meta.json`);
        const indexTsPath = join(skillPath, 'index.ts');

        // 检查是否有 meta.json 和 index.ts
        if (!existsSync(metaJsonPath) || !existsSync(indexTsPath)) {
          // 尝试查找其他可能的文件名
          const altMetaPath = join(skillPath, 'meta.json');
          if (!existsSync(altMetaPath)) {
            continue;
          }
        }

        try {
          // 读取 meta.json
          const metaPath = existsSync(metaJsonPath) ? metaJsonPath : join(skillPath, 'meta.json');
          const metaContent = readFileSync(metaPath, 'utf-8');
          const metadata: SkillMetadata = JSON.parse(metaContent);

          // 验证 metadata
          const validation = validateMetaData(metadata);
          if (!validation.valid) {
            console.warn(`Skipping ${entry.name}: ${validation.errors.join(', ')}`);
            continue;
          }

          // 动态导入 skill 实现
          const skillModule = await import(`file://${indexTsPath}`);
          const SkillClass = skillModule.default || skillModule[metadata.name];

          if (!SkillClass || typeof SkillClass !== 'function') {
            console.warn(`Skipping ${entry.name}: no valid export found`);
            continue;
          }

          // 实例化 skill
          const skillInstance = new SkillClass();

          // 注册到 registry
          this.register(skillInstance, subdir as 'experimental' | 'production' | 'retired', skillPath);
          loadedCount++;

          console.log(`✓ Loaded skill: ${metadata.name} (${subdir})`);
        } catch (error) {
          console.error(`Failed to load skill ${entry.name}:`, error);
        }
      }
    }

    console.log(`\nLoaded ${loadedCount} skills from disk`);
    console.log(this.getStats());

    return loadedCount;
  }

  /**
   * 清空注册表
   */
  clear(): void {
    this.skills.clear();
    this.intentIndex.clear();
    this.statusIndex.clear();
  }

  /**
   * 判断 entry 是否匹配查询条件
   */
  private matchesQuery(entry: SkillEntry, options: RegistryQueryOptions): boolean {
    const { metadata, status } = entry;

    // 按 intent 过滤
    if (options.intent && metadata.intent !== options.intent) {
      return false;
    }

    // 按状态过滤
    if (options.status && status !== options.status) {
      return false;
    }

    // 按作者过滤
    if (options.author && metadata.author !== options.author) {
      return false;
    }

    // 按标签过滤
    if (options.tag && metadata.tags && !metadata.tags.includes(options.tag)) {
      return false;
    }

    // 按名称模糊匹配
    if (options.name && !metadata.name.includes(options.name)) {
      return false;
    }

    // 按版本过滤
    if (options.version && metadata.version !== options.version) {
      return false;
    }

    return true;
  }
}

/**
 * 全局单例实例
 */
let globalRegistry: SkillRegistry | null = null;

/**
 * 获取全局 Skill Registry 实例
 *
 * @returns Skill Registry 实例
 */
export function getRegistry(): SkillRegistry {
  if (!globalRegistry) {
    globalRegistry = new SkillRegistry();
  }
  return globalRegistry;
}

/**
 * 重置全局 Skill Registry 实例（主要用于测试）
 */
export function resetRegistry(): void {
  globalRegistry = null;
}

/**
 * 便捷函数：从文件系统加载 Skills
 *
 * @param rootPath 根路径
 * @returns 加载的 Skills 数量
 */
export async function loadSkills(rootPath?: string): Promise<number> {
  const registry = getRegistry();
  return await registry.loadFromDisk(rootPath);
}

/**
 * 便捷函数：注册 Skill
 *
 * @param skill Skill 实例
 * @param status Skill 状态
 * @returns 是否成功
 */
export function registerSkill(
  skill: Skill,
  status?: 'experimental' | 'production' | 'retired'
): boolean {
  const registry = getRegistry();
  return registry.register(skill, status);
}

/**
 * 便捷函数：列出 Skills
 *
 * @param options 查询选项
 * @returns Skill 数组
 */
export function listSkills(options?: RegistryQueryOptions): Skill[] {
  const registry = getRegistry();
  return registry.list(options);
}

/**
 * 便捷函数：获取 Skill
 *
 * @param name Skill 名称
 * @returns Skill 实例
 */
export function getSkill(name: string): Skill | undefined {
  const registry = getRegistry();
  return registry.get(name);
}

/**
 * 便捷函数：比较 Skills
 *
 * @param nameA Skill A 名称
 * @param nameB Skill B 名称
 * @returns 比较结果
 */
export function compareSkills(nameA: string, nameB: string): SkillComparison {
  const registry = getRegistry();
  return registry.compare(nameA, nameB);
}
