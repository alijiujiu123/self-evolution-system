/**
 * Skill Metadata Validator
 *
 * 验证 meta.json 文件是否符合 JSON Schema 规范。
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
 * 加载 JSON Schema
 */
function loadSchema(): object {
  const schemaPath = join(__dirname, 'meta-schema.json');
  if (!existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }
  const schemaContent = readFileSync(schemaPath, 'utf-8');
  return JSON.parse(schemaContent);
}

/**
 * 简单的 JSON Schema 验证器
 *
 * 注意：这是一个简化版本的验证器，用于在没有外部依赖的情况下进行基本验证。
 * 在生产环境中，建议使用完整的 JSON Schema 验证库如 ajv。
 */
class SimpleSchemaValidator {
  private schema: any;

  constructor(schema: any) {
    this.schema = schema;
  }

  /**
   * 验证数据是否符合 schema
   */
  validate(data: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 必须是对象
    if (typeof data !== 'object' || data === null) {
      errors.push('Data must be an object');
      return { valid: false, errors, warnings };
    }

    const obj = data as Record<string, unknown>;

    // 检查必需字段
    if (this.schema.required) {
      for (const field of this.schema.required) {
        if (!(field in obj) || obj[field] === undefined || obj[field] === null) {
          errors.push(`Required field '${field}' is missing`);
        }
      }
    }

    // 检查属性定义
    if (this.schema.properties) {
      for (const [key, propSchema] of Object.entries(this.schema.properties) as [string, any][]) {
        const value = obj[key];

        // 检查已定义字段的类型
        if (value !== undefined && value !== null) {
          const typeError = this.validateType(key, value, propSchema);
          if (typeError) {
            errors.push(typeError);
          }

          // 检查字符串模式
          if (typeof value === 'string' && propSchema.pattern) {
            const regex = new RegExp(propSchema.pattern);
            if (!regex.test(value)) {
              errors.push(`Field '${key}' does not match pattern: ${propSchema.pattern}`);
            }
          }

          // 检查数组
          if (Array.isArray(value) && propSchema.items) {
            for (let i = 0; i < value.length; i++) {
              const itemError = this.validateType(`${key}[${i}]`, value[i], propSchema.items);
              if (itemError) {
                errors.push(itemError);
              }
            }
          }

          // 检查数值范围
          if (typeof value === 'number') {
            if (propSchema.minimum !== undefined && value < propSchema.minimum) {
              errors.push(`Field '${key}' must be >= ${propSchema.minimum}`);
            }
            if (propSchema.maximum !== undefined && value > propSchema.maximum) {
              errors.push(`Field '${key}' must be <= ${propSchema.maximum}`);
            }
          }

          // 检查枚举值
          if (propSchema.enum && !propSchema.enum.includes(value)) {
            errors.push(`Field '${key}' must be one of: ${propSchema.enum.join(', ')}`);
          }
        }

        // 检查默认值
        if (value === undefined && 'default' in propSchema) {
          warnings.push(`Field '${key}' is missing but has default value: ${propSchema.default}`);
        }
      }
    }

    // 检查不允许的额外属性
    if (this.schema.additionalProperties === false && this.schema.properties) {
      const allowedKeys = new Set(Object.keys(this.schema.properties));
      for (const key of Object.keys(obj)) {
        if (!allowedKeys.has(key)) {
          errors.push(`Additional property '${key}' is not allowed`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证类型
   */
  private validateType(field: string, value: unknown, schema: any): string | null {
    if (!schema.type) return null;

    const expectedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (!expectedTypes.includes(actualType)) {
      return `Field '${field}' must be ${expectedTypes.join(' or ')}, got ${actualType}`;
    }

    // 字符串最小长度
    if (typeof value === 'string' && schema.minLength && value.length < schema.minLength) {
      return `Field '${field}' must be at least ${schema.minLength} characters`;
    }

    // 数组唯一性
    if (Array.isArray(value) && schema.uniqueItems) {
      const unique = new Set(value);
      if (unique.size !== value.length) {
        return `Field '${field}' must contain unique items`;
      }
    }

    return null;
  }
}

/**
 * Skill Metadata 验证器类
 */
export class MetaValidator {
  private validator: SimpleSchemaValidator;

  constructor() {
    const schema = loadSchema();
    this.validator = new SimpleSchemaValidator(schema);
  }

  /**
   * 验证 meta.json 文件
   *
   * @param metaPath meta.json 文件路径
   * @returns 验证结果
   */
  validateFile(metaPath: string): ValidationResult {
    if (!existsSync(metaPath)) {
      return {
        valid: false,
        errors: [`File not found: ${metaPath}`],
        warnings: []
      };
    }

    try {
      const content = readFileSync(metaPath, 'utf-8');
      const data = JSON.parse(content);
      return this.validateData(data);
    } catch (error) {
      return {
        valid: false,
        errors: [`Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`],
        warnings: []
      };
    }
  }

  /**
   * 验证 meta.json 数据
   *
   * @param data meta.json 数据对象
   * @returns 验证结果
   */
  validateData(data: unknown): ValidationResult {
    return this.validator.validate(data);
  }

  /**
   * 验证并打印结果
   *
   * @param metaPath meta.json 文件路径
   * @returns 是否通过验证
   */
  validateAndReport(metaPath: string): boolean {
    const result = this.validateFile(metaPath);

    console.log(`\nValidating: ${metaPath}`);
    console.log('='.repeat(60));

    if (result.valid) {
      console.log('✅ Validation passed');
    } else {
      console.log('❌ Validation failed');
    }

    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }

    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach((warning, i) => {
        console.log(`  ${i + 1}. ${warning}`);
      });
    }

    console.log('='.repeat(60));

    return result.valid;
  }
}

/**
 * 便捷函数：验证 meta.json 文件
 *
 * @param metaPath meta.json 文件路径
 * @returns 验证结果
 */
export function validateMetaFile(metaPath: string): ValidationResult {
  const validator = new MetaValidator();
  return validator.validateFile(metaPath);
}

/**
 * 便捷函数：验证 meta.json 数据
 *
 * @param data meta.json 数据对象
 * @returns 验证结果
 */
export function validateMetaData(data: unknown): ValidationResult {
  const validator = new MetaValidator();
  return validator.validateData(data);
}
