/**
 * Meta Validator 测试
 */

import { describe, it, expect } from 'vitest';
import { MetaValidator, validateMetaFile, validateMetaData } from './validator';

describe('MetaValidator', () => {
  describe('validateData', () => {
    it('should validate a valid meta.json', () => {
      const validator = new MetaValidator();
      const data = {
        name: 'test-skill',
        version: '1.0.0',
        intent: 'test',
        author: 'test-author',
        created_at: '2026-02-04T00:00:00.000Z',
        description: 'Test skill',
        tags: ['test', 'example'],
        dependencies: ['tool1'],
        cost_estimate: 0.1,
        success_threshold: 0.9,
        status: 'experimental'
      };

      const result = validator.validateData(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing required fields', () => {
      const validator = new MetaValidator();
      const data = {
        name: 'test-skill',
        version: '1.0.0',
        intent: 'test'
        // Missing: author, created_at
      };

      const result = validator.validateData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('author'))).toBe(true);
      expect(result.errors.some(e => e.includes('created_at'))).toBe(true);
    });

    it('should reject invalid version format', () => {
      const validator = new MetaValidator();
      const data = {
        name: 'test-skill',
        version: 'invalid',
        intent: 'test',
        author: 'test-author',
        created_at: '2026-02-04T00:00:00.000Z'
      };

      const result = validator.validateData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('version'))).toBe(true);
    });

    it('should reject invalid success_threshold range', () => {
      const validator = new MetaValidator();
      const data = {
        name: 'test-skill',
        version: '1.0.0',
        intent: 'test',
        author: 'test-author',
        created_at: '2026-02-04T00:00:00.000Z',
        success_threshold: 1.5
      };

      const result = validator.validateData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('success_threshold'))).toBe(true);
    });

    it('should reject invalid status value', () => {
      const validator = new MetaValidator();
      const data = {
        name: 'test-skill',
        version: '1.0.0',
        intent: 'test',
        author: 'test-author',
        created_at: '2026-02-04T00:00:00.000Z',
        status: 'invalid-status'
      };

      const result = validator.validateData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('status'))).toBe(true);
    });

    it('should reject additional properties', () => {
      const validator = new MetaValidator();
      const data = {
        name: 'test-skill',
        version: '1.0.0',
        intent: 'test',
        author: 'test-author',
        created_at: '2026-02-04T00:00:00.000Z',
        extra_property: 'not allowed'
      };

      const result = validator.validateData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Additional property'))).toBe(true);
    });

    it('should require name to match pattern', () => {
      const validator = new MetaValidator();
      const data = {
        name: 'Invalid_Name',  // Contains uppercase and underscore
        version: '1.0.0',
        intent: 'test',
        author: 'test-author',
        created_at: '2026-02-04T00:00:00.000Z'
      };

      const result = validator.validateData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('name') && e.includes('pattern'))).toBe(true);
    });

    it('should validate semantic versioning', () => {
      const validator = new MetaValidator();

      // Valid versions
      const validVersions = ['1.0.0', '2.1.3', '1.0.0-alpha', '1.0.0-beta.2'];
      validVersions.forEach(version => {
        const data = {
          name: 'test-skill',
          version,
          intent: 'test',
          author: 'test-author',
          created_at: '2026-02-04T00:00:00.000Z'
        };
        const result = validator.validateData(data);
        expect(result.valid).toBe(true);
      });
    });

    it('should detect duplicate items in tags array', () => {
      const validator = new MetaValidator();
      const data = {
        name: 'test-skill',
        version: '1.0.0',
        intent: 'test',
        author: 'test-author',
        created_at: '2026-02-04T00:00:00.000Z',
        tags: ['test', 'test', 'duplicate']
      };

      const result = validator.validateData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('tags') && e.includes('unique'))).toBe(true);
    });

    it('should reject negative cost_estimate', () => {
      const validator = new MetaValidator();
      const data = {
        name: 'test-skill',
        version: '1.0.0',
        intent: 'test',
        author: 'test-author',
        created_at: '2026-02-04T00:00:00.000Z',
        cost_estimate: -0.5
      };

      const result = validator.validateData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('cost_estimate'))).toBe(true);
    });
  });

  describe('validateFile', () => {
    it('should validate existing meta.json files', () => {
      const result = validateMetaFile('agent/skills/experimental/code-review-skill.meta.json');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for non-existent file', () => {
      const result = validateMetaFile('non-existent-file.meta.json');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('not found');
    });

    it('should return error for invalid JSON', () => {
      // Create a temporary invalid JSON file
      const fs = require('fs');
      const path = require('path');
      const tempFile = path.join('agent/skills/experimental', 'temp-invalid.meta.json');
      fs.writeFileSync(tempFile, '{ invalid json }');

      const result = validateMetaFile(tempFile);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('parse') || e.includes('JSON'))).toBe(true);

      // Clean up
      fs.unlinkSync(tempFile);
    });
  });

  describe('validateMetaData convenience function', () => {
    it('should validate valid data', () => {
      const data = {
        name: 'test-skill',
        version: '1.0.0',
        intent: 'test',
        author: 'test-author',
        created_at: '2026-02-04T00:00:00.000Z'
      };

      const result = validateMetaData(data);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid data', () => {
      const data = {
        name: 'test-skill'
        // Missing other required fields
      };

      const result = validateMetaData(data);
      expect(result.valid).toBe(false);
    });
  });
});
